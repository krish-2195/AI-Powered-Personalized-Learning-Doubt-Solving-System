import os
import json
import pandas as pd
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.preprocessing import LabelEncoder
import joblib

def retrain_model():
    """
    Retrains the Random Forest model by combining synthetic data and real collected data.
    Versions the model and tracks metrics in history.json.
    """
    datasets_dir = os.path.join(os.path.dirname(__file__), '../datasets')
    models_dir = os.path.join(os.path.dirname(__file__), '../models')
    artifacts_dir = os.path.join(os.path.dirname(__file__), '../artifacts/model_versions')
    
    os.makedirs(artifacts_dir, exist_ok=True)
    
    synthetic_path = os.path.join(datasets_dir, 'ai_learn_performance_dataset.csv')
    real_path = os.path.join(datasets_dir, 'real_student_dataset.csv')
    
    if not os.path.exists(synthetic_path):
        print(f"Error: Base dataset not found at {synthetic_path}")
        return
        
    df_synth = pd.read_csv(synthetic_path)
    
    df_real = pd.DataFrame()
    if os.path.exists(real_path):
        df_real = pd.read_csv(real_path)
        print(f"Loaded {len(df_real)} real student records.")
    
    df_combined = pd.concat([df_synth, df_real], ignore_index=True)
    
    print(f"Total dataset size for retraining: {len(df_combined)}")
    
    # Preprocessing
    feature_columns = [
        'quiz_accuracy', 'avg_time_per_question', 'total_attempts', 
        'videos_watched', 'articles_read', 'chatbot_questions', 
        'study_duration', 'daily_streak', 'ewma_accuracy', 
        'prerequisite_mastery', 'previous_attempt_accuracy'
    ]
    
    X = df_combined[feature_columns].fillna(0)
    y = df_combined['label']
    
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    # Train
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    
    print(f"Accuracy: {accuracy:.4f}")
    
    # Versioning
    history_path = os.path.join(artifacts_dir, 'history.json')
    history = []
    if os.path.exists(history_path):
        with open(history_path, 'r', encoding='utf-8') as f:
            history = json.load(f)
            
    new_version = f"v{len(history) + 2}" # Assuming current is v2
    
    # Save artifacts
    model_path = os.path.join(models_dir, f'random_forest_{new_version}.pkl')
    joblib.dump(model, model_path)
    joblib.dump(label_encoder, os.path.join(models_dir, 'difficulty_label_encoder.pkl'))
    joblib.dump(feature_columns, os.path.join(models_dir, 'feature_columns.pkl'))
    
    # Record history
    metrics = {
        "version": new_version,
        "dataset_used": "Combined (Synthetic + Real)",
        "dataset_size": len(df_combined),
        "training_date": datetime.utcnow().isoformat(),
        "metrics": {
            "accuracy": float(accuracy),
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1)
        }
    }
    
    history.append(metrics)
    with open(history_path, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=4)
        
    print(f"Model saved to {model_path} and history updated.")

if __name__ == "__main__":
    retrain_model()
