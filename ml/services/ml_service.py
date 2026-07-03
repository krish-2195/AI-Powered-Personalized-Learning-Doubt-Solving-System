import os
import joblib
import pandas as pd
from sqlalchemy.orm import Session
from database.models.postgres_models import PerformanceRecord, TopicPerformance, PredictionHistory

class MLService:
    def __init__(self):
        models_dir = os.path.join(os.path.dirname(__file__), '../models')
        self.model_path = os.path.join(models_dir, 'random_forest_v2.pkl')
        self.features_path = os.path.join(models_dir, 'feature_columns.pkl')
        
        self.model = None
        self.feature_columns = None
        
        self._load_model()
        
    def _load_model(self):
        if os.path.exists(self.model_path) and os.path.exists(self.features_path):
            self.model = joblib.load(self.model_path)
            self.feature_columns = joblib.load(self.features_path)
            print("Loaded Random Forest v2 and feature columns successfully.")
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
            # Construct feature DataFrame mapping
            features = {col: 0 for col in self.feature_columns}
            if 'quiz_accuracy' in features:
                features['quiz_accuracy'] = perf.accuracy
            if 'total_attempts' in features:
                features['total_attempts'] = perf.total_attempts
                
            df = pd.DataFrame([features])
            
            # 2. Extract Prediction & Confidence Score
            try:
                preds = self.model.predict(df)
                prediction_class = str(preds[0])
                
                if hasattr(self.model, "predict_proba"):
                    probs = self.model.predict_proba(df)
                    confidence = float(max(probs[0]))
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
            model_version="random_forest_v2" if self.model else "heuristic_fallback"
        )
        db.add(history)
        
        db.commit()
        
        return {
            "prediction": prediction_class,
            "confidence": round(confidence, 2),
            "model_version": history.model_version
        }

ml_service = MLService()
