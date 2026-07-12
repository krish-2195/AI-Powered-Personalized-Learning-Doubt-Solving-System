import os
import json
import joblib
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.models.postgres_models import PerformanceRecord, TopicPerformance, PredictionHistory, Topic, LearningLog, UserProfile
from ml.services.knowledge_graph import knowledge_graph

class MLService:
    # LabelEncoder sorts alphabetically: Moderate=0, Strong=1, Weak=2
    LABEL_MAP = {0: "Moderate", 1: "Strong", 2: "Weak", "0": "Moderate", "1": "Strong", "2": "Weak"}
    
    def __init__(self):
        models_dir = os.path.join(os.path.dirname(__file__), '../models')
        self.model_path = os.path.join(models_dir, 'production.pkl')
        self.features_path = os.path.join(models_dir, 'feature_columns.pkl')
        
        self.model = None
        self.feature_columns = None
        
        self._load_model()
        
    def _load_model(self):
        if os.path.exists(self.model_path) and os.path.exists(self.features_path):
            self.model = joblib.load(self.model_path)
            self.feature_columns = joblib.load(self.features_path)
            
            # Read version from history
            self.active_version = "production"
            history_path = os.path.join(os.path.dirname(__file__), '../artifacts/model_versions/history.json')
            if os.path.exists(history_path):
                try:
                    with open(history_path, 'r') as f:
                        history = json.load(f)
                        if history:
                            self.active_version = history[-1].get("version", "production")
                except Exception:
                    pass
            print(f"Loaded {self.active_version} from production.pkl successfully.")
        else:
            print("Warning: ML model files not found. Predictions will run in fallback mode.")
            
    def predict_weakness(self, db: Session, user_id: int, topic_id: int) -> dict:
        """
        Uses the Random Forest model to predict user's topic mastery and confidence.
        Updates TopicPerformance and PredictionHistory.
        """
        # 1. Get raw performance data
        perf = db.query(PerformanceRecord).filter(
            PerformanceRecord.user_id == user_id,
            PerformanceRecord.topic_id == topic_id
        ).first()
        
        if not perf:
            return {"status": "error", "message": "No performance data found to make prediction"}
            
        prediction_class = "Moderate"
        confidence = 0.65
        
        if self.model and self.feature_columns:
            # Fetch contextual data for features
            topic = db.query(Topic).get(topic_id)
            topic_name = topic.name if topic else ""
            
            # Prerequisite Mastery calculation
            prereqs = knowledge_graph.get_prerequisites(topic_name)
            prereq_mastery = 50.0 # Default if none
            if prereqs:
                prereq_tps = db.query(TopicPerformance).join(Topic).filter(
                    TopicPerformance.user_id == user_id,
                    Topic.name.in_(prereqs)
                ).all()
                if prereq_tps:
                    prereq_mastery = sum(tp.ewma_accuracy for tp in prereq_tps) / len(prereq_tps)
            
            # Additional features
            user_prof = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
            streak = user_prof.streak_count if user_prof else 0
            
            logs = db.query(LearningLog).filter(LearningLog.user_id == user_id).all()
            videos = sum(1 for l in logs if l.activity_type == 'video' and l.completed)
            articles = sum(1 for l in logs if l.activity_type == 'article' and l.completed)
            chatbots = sum(1 for l in logs if l.activity_type == 'chat')
            study_dur = sum(l.duration_seconds for l in logs) / 3600.0 if logs else 0.0
            
            tp_current = db.query(TopicPerformance).filter(
                TopicPerformance.user_id == user_id, TopicPerformance.topic_id == topic_id
            ).first()
            ewma = tp_current.ewma_accuracy if tp_current else perf.accuracy
            
            # Construct feature DataFrame mapping
            features = {col: 0 for col in self.feature_columns}
            if 'quiz_accuracy' in features: features['quiz_accuracy'] = perf.accuracy
            if 'total_attempts' in features: features['total_attempts'] = perf.total_attempts
            if 'prerequisite_mastery' in features: features['prerequisite_mastery'] = prereq_mastery
            if 'videos_watched' in features: features['videos_watched'] = videos
            if 'articles_read' in features: features['articles_read'] = articles
            if 'chatbot_questions' in features: features['chatbot_questions'] = chatbots
            if 'study_duration' in features: features['study_duration'] = study_dur
            if 'daily_streak' in features: features['daily_streak'] = streak
            if 'ewma_accuracy' in features: features['ewma_accuracy'] = ewma
            if 'avg_time_per_question' in features: features['avg_time_per_question'] = perf.avg_time_seconds or 60.0
                
            df = pd.DataFrame([features])
            
            # 2. Extract Prediction & Confidence Score
            try:
                preds = self.model.predict(df)
                raw_pred = preds[0]
                prediction_class = self.LABEL_MAP.get(raw_pred, self.LABEL_MAP.get(str(raw_pred), str(raw_pred)))
                
                if hasattr(self.model, "predict_proba"):
                    probs = self.model.predict_proba(df)
                    confidence = float(max(probs[0]))
                    
                # Confidence Threshold Guardrail
                if confidence < 0.60:
                    prediction_class = "Moderate" # Default to Moderate to prevent aggressive personalization
                
                # Explainability: Determine reasons for the prediction
                reasons = []
                if features.get('quiz_accuracy', 100) < 60:
                    reasons.append("Low quiz accuracy")
                if features.get('prerequisite_mastery', 100) < 60:
                    reasons.append("Poor prerequisite mastery")
                if features.get('avg_time_per_question', 0) > 120:
                    reasons.append("High response time")
                if features.get('total_attempts', 0) > 3 and features.get('quiz_accuracy', 100) < 70:
                    reasons.append("Struggling after multiple attempts")
                    
                if not reasons and prediction_class == "Weak":
                    reasons.append("Pattern identified by ML model")
                    
            except Exception as e:
                print(f"Prediction failed: {e}")
        else:
            # Fallback rules engine if pkl hasn't been placed yet
            if perf.accuracy >= 75:
                prediction_class = "Strong"
                confidence = 0.82
            elif perf.accuracy >= 50:
                prediction_class = "Moderate"
                confidence = 0.68
            else:
                prediction_class = "Weak"
                confidence = 0.91
                
        # Override to guarantee weak topic detection if quiz score is low (< 60%)
        if perf.accuracy < 60.0 or ewma < 60.0:
            prediction_class = "Weak"

        # 3. Update PerformanceRecord Status
        perf.status = prediction_class.lower()
        
        # 4. Update TopicPerformance (EWMA)
        tp = db.query(TopicPerformance).filter(
            TopicPerformance.user_id == user_id,
            TopicPerformance.topic_id == topic_id
        ).first()
        
        if not tp:
            tp = TopicPerformance(
                user_id=user_id,
                topic_id=topic_id,
                ewma_accuracy=perf.accuracy,
                mastery_level=prediction_class
            )
            db.add(tp)
        else:
            tp.ewma_accuracy = (0.2 * perf.accuracy) + (0.8 * tp.ewma_accuracy)
            tp.mastery_level = prediction_class
            
        # 5. Save exactly what you requested: PredictionHistory
        history = PredictionHistory(
            user_id=user_id,
            topic_id=topic_id,
            prediction=prediction_class,
            confidence=confidence,
            model_version=self.active_version if self.model else "heuristic_fallback"
        )
        db.add(history)
        
        db.commit()
        
        return {
            "prediction": prediction_class,
            "confidence": round(confidence, 2),
            "model_version": history.model_version,
            "reasons": reasons if 'reasons' in locals() else []
        }

ml_service = MLService()
