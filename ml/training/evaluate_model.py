import os
import json
import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(base_dir, 'artifacts', 'model_versions', 'random_forest_v8.pkl')
    dataset_path = os.path.join(base_dir, 'datasets', 'ai_learn_performance_dataset.csv')
    real_dataset_path = os.path.join(base_dir, 'datasets', 'real_student_dataset.csv')
    output_path = os.path.join(base_dir, 'artifacts', 'evaluation_report.json')

    # Load model
    print(f"Loading model from {model_path}...")
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}")
        return
        
    model = joblib.load(model_path)

    # Load data
    print(f"Loading synthetic dataset from {dataset_path}...")
    df_synth = pd.read_csv(dataset_path)
    df_real = pd.read_csv(real_dataset_path)
    
    # Combine datasets like in training
    df = pd.concat([df_synth, df_real], ignore_index=True)
    
    print("Making predictions...")
    if hasattr(model, 'feature_names_in_'):
        features = list(model.feature_names_in_)
    else:
        features = [
            'quiz_accuracy', 'ewma_accuracy', 'prerequisite_mastery', 
            'avg_time_per_question', 'previous_attempt_accuracy', 'total_attempts', 
            'chatbot_questions', 'study_duration', 'videos_watched', 'articles_read'
        ]
        
    # Handle categorical question_difficulty
    if 'question_difficulty' in df.columns and 'question_difficulty_enc' in features:
        df['question_difficulty_enc'] = df['question_difficulty'].map({'Easy': 0, 'Medium': 1, 'Hard': 2})

    # Drop NaNs
    df = df.dropna(subset=features + ['label'])
    
    # Filter to only valid labels
    valid_labels = ['Weak', 'Moderate', 'Strong']
    df = df[df['label'].isin(valid_labels)]
    
    X = df[features]
    y = df['label'].map({'Moderate': 0, 'Strong': 1, 'Weak': 2}).astype(int)
    
    y_pred = model.predict(X)

    print("Model features:", features)
    print("X head:\n", X.head(2))

    # Calculate metrics
    accuracy = accuracy_score(y, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(y, y_pred, average=None, labels=[0, 1, 2])
    
    # Confusion Matrix
    cm = confusion_matrix(y, y_pred, labels=[0, 1, 2])
    
    # Feature Importance (from model if available)
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
        feature_importance = [{"feature": f, "importance": float(i)} for f, i in zip(features, importances)]
        # Sort by importance
        feature_importance = sorted(feature_importance, key=lambda x: x['importance'], reverse=True)
    else:
        feature_importance = []

    # Format report
    report = {
        "model_version": "Random Forest v8",
        "dataset_size": len(df),
        "overall_metrics": {
            "accuracy": accuracy,
            "weighted_f1": precision_recall_fscore_support(y, y_pred, average='weighted')[2]
        },
        "classification_report": {
            "Moderate": {"precision": precision[0], "recall": recall[0], "f1": f1[0], "support": int(support[0])},
            "Strong": {"precision": precision[1], "recall": recall[1], "f1": f1[1], "support": int(support[1])},
            "Weak": {"precision": precision[2], "recall": recall[2], "f1": f1[2], "support": int(support[2])}
        },
        "confusion_matrix": {
            "labels": ["Moderate", "Strong", "Weak"],
            "matrix": cm.tolist()
        },
        "feature_importance": feature_importance
    }

    with open(output_path, 'w') as f:
        json.dump(report, f, indent=4)
        
    print(f"Evaluation complete. Report saved to {output_path}")
    print("\nOverall Accuracy:", round(accuracy * 100, 2), "%")

if __name__ == "__main__":
    main()
