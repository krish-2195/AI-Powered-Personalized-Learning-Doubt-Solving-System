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
            
            # Correct EWMA: Calculate using latest quiz attempt accuracy
            from database.models.postgres_models import QuizAttempt
            latest_attempt = db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.topic_id == topic_id
            ).order_by(QuizAttempt.timestamp.desc()).first()
            latest_accuracy = latest_attempt.accuracy if latest_attempt else perf.accuracy
            
            if tp_current:
                ALPHA = 0.3
                ewma = (ALPHA * latest_accuracy) + ((1 - ALPHA) * tp_current.ewma_accuracy)
            else:
                ewma = latest_accuracy
            
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
                
            if 'previous_attempt_accuracy' in features:
                prev_attempt = db.query(QuizAttempt).filter(
                    QuizAttempt.user_id == user_id,
                    QuizAttempt.topic_id == topic_id
                ).order_by(QuizAttempt.timestamp.desc()).offset(1).first()
                features['previous_attempt_accuracy'] = prev_attempt.accuracy if prev_attempt else perf.accuracy

            if 'question_difficulty_enc' in features:
                diff_map = {"Easy": 0, "Medium": 1, "Hard": 2}
                difficulty = latest_attempt.difficulty if (latest_attempt and hasattr(latest_attempt, 'difficulty')) else "Medium"
                features['question_difficulty_enc'] = diff_map.get(difficulty, 1)
                
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
                ewma_accuracy=ewma,
                mastery_level=prediction_class
            )
            db.add(tp)
        else:
            tp.ewma_accuracy = ewma
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

    def predict_overall_performance(self, db: Session, user_id: int) -> dict:
        """
        Uses the Random Forest model to predict user's overall performance category.
        Aggregates features across all attempted topics.
        """
        # Fetch all performance records for this user
        perfs = db.query(PerformanceRecord).filter(PerformanceRecord.user_id == user_id).all()
        if not perfs:
            return {
                "predicted_score": "Moderate",
                "confidence": 70,
                "reasons": ["No performance records found. Start practicing to update prediction."]
            }
            
        # Average quiz accuracy and attempts
        avg_accuracy = sum(p.accuracy for p in perfs) / len(perfs)
        avg_attempts = sum(p.total_attempts for p in perfs) / len(perfs)
        avg_time = sum(p.avg_time_seconds or 60.0 for p in perfs) / len(perfs)
        
        # Topic performances (EWMA)
        tps = db.query(TopicPerformance).filter(TopicPerformance.user_id == user_id).all()
        avg_ewma = sum(tp.ewma_accuracy for tp in tps) / len(tps) if tps else avg_accuracy
        
        # User profile streak
        user_prof = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        streak = user_prof.streak_count if user_prof else 0
        
        # Logs totals
        logs = db.query(LearningLog).filter(LearningLog.user_id == user_id).all()
        videos = sum(1 for l in logs if l.activity_type == 'video' and l.completed)
        articles = sum(1 for l in logs if l.activity_type == 'article' and l.completed)
        chatbots = sum(1 for l in logs if l.activity_type == 'chat')
        study_dur = sum(l.duration_seconds for l in logs) / 3600.0 if logs else 0.0
        
        # Prerequisite mastery (average across topics)
        prereq_mastery_list = []
        for p in perfs:
            topic = db.query(Topic).get(p.topic_id)
            if topic:
                prereqs = knowledge_graph.get_prerequisites(topic.name)
                if prereqs:
                    prereq_tps = db.query(TopicPerformance).join(Topic).filter(
                        TopicPerformance.user_id == user_id,
                        Topic.name.in_(prereqs)
                    ).all()
                    if prereq_tps:
                        prereq_mastery_list.append(sum(tp.ewma_accuracy for tp in prereq_tps) / len(prereq_tps))
        prereq_mastery = sum(prereq_mastery_list) / len(prereq_mastery_list) if prereq_mastery_list else 50.0
        
        predicted_score = "Moderate"
        confidence = 0.70
        
        import pandas as pd
        if self.model and self.feature_columns:
            features = {col: 0 for col in self.feature_columns}
            if 'quiz_accuracy' in features: features['quiz_accuracy'] = avg_accuracy
            if 'total_attempts' in features: features['total_attempts'] = avg_attempts
            if 'prerequisite_mastery' in features: features['prerequisite_mastery'] = prereq_mastery
            if 'videos_watched' in features: features['videos_watched'] = videos
            if 'articles_read' in features: features['articles_read'] = articles
            if 'chatbot_questions' in features: features['chatbot_questions'] = chatbots
            if 'study_duration' in features: features['study_duration'] = study_dur
            if 'daily_streak' in features: features['daily_streak'] = streak
            if 'ewma_accuracy' in features: features['ewma_accuracy'] = avg_ewma
            if 'avg_time_per_question' in features: features['avg_time_per_question'] = avg_time
            
            df = pd.DataFrame([features])
            try:
                preds = self.model.predict(df)
                raw_pred = preds[0]
                predicted_score = self.LABEL_MAP.get(raw_pred, self.LABEL_MAP.get(str(raw_pred), str(raw_pred)))
                
                if hasattr(self.model, "predict_proba"):
                    probs = self.model.predict_proba(df)
                    confidence = float(max(probs[0]))
                
                if confidence < 0.60:
                    predicted_score = "Moderate"
            except Exception as e:
                print(f"Overall prediction failed: {e}")
        else:
            # Fallback heuristic
            if avg_ewma >= 80:
                predicted_score = "Strong"
                confidence = 0.92
            elif avg_ewma >= 50:
                predicted_score = "Moderate"
                confidence = 0.85
            else:
                predicted_score = "Weak"
                confidence = 0.78
                
        reasons = []
        if avg_accuracy < 60:
            reasons.append("Low quiz accuracy")
        if prereq_mastery < 60:
            reasons.append("Prerequisite gaps identified")
        if avg_time > 120:
            reasons.append("High average response time")
            
        if not reasons:
            reasons.append("Consistent performance" if predicted_score == "Strong" else "Continue regular revisions")
            
        return {
            "predicted_score": predicted_score,
            "confidence": round(confidence * 100),
            "reasons": reasons
        }

ml_service = MLService()
