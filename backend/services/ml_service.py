import numpy as np
from sklearn.ensemble import RandomForestClassifier
from typing import Dict, Any

class WeakTopicDetector:
    def __init__(self):
        # In a real production system, this model would be loaded from a saved .pkl file
        # trained on historical student data.
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.is_trained = False
        
        # We'll initialize it with some dummy data to make it usable immediately
        self._initialize_dummy_model()

    def _initialize_dummy_model(self):
        """
        Trains a basic model on dummy data so the inference pipeline works end-to-end.
        Features: [accuracy, avg_time_seconds, total_attempts, difficulty_weight]
        Classes: 0=Weak, 1=Moderate, 2=Strong
        """
        # Features: [accuracy (0-1), time(s), attempts, difficulty(1-3)]
        X_dummy = np.array([
            [0.2, 120, 1, 3],  # Low accuracy, high time, hard -> Weak (0)
            [0.4, 90, 2, 2],   # Low accuracy -> Weak (0)
            [0.65, 60, 3, 2],  # Med accuracy -> Moderate (1)
            [0.75, 45, 2, 1],  # Med accuracy, fast -> Moderate (1)
            [0.9, 30, 1, 2],   # High accuracy, fast -> Strong (2)
            [1.0, 20, 2, 3]    # Perfect, very fast, hard -> Strong (2)
        ])
        y_dummy = np.array([0, 0, 1, 1, 2, 2])
        self.model.fit(X_dummy, y_dummy)
        self.is_trained = True

    def predict_topic_status(self, features: Dict[str, float]) -> str:
        """
        Predicts whether a topic is Weak, Moderate, or Strong.
        Expects features dict:
        {
            "accuracy": float (0.0 to 1.0),
            "avg_time_seconds": float,
            "total_attempts": int,
            "difficulty_weight": float (1=easy, 2=med, 3=hard)
        }
        """
        if not self.is_trained:
            return "Moderate" # safe default
            
        x_input = np.array([[
            features.get("accuracy", 0.0),
            features.get("avg_time_seconds", 60.0),
            features.get("total_attempts", 1.0),
            features.get("difficulty_weight", 2.0)
        ]])
        
        prediction = self.model.predict(x_input)[0]
        
        # Map class index to string label
        class_mapping = {0: "Weak", 1: "Moderate", 2: "Strong"}
        return class_mapping.get(prediction, "Moderate")

# Singleton instance
weak_topic_detector = WeakTopicDetector()
