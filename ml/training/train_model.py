import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import warnings
import os

warnings.filterwarnings('ignore')

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_PATH = BASE_DIR / "datasets" / "ai_learn_performance_dataset.csv"
MODELS_DIR = BASE_DIR / "models"
os.makedirs(MODELS_DIR, exist_ok=True)

print(f"Reading dataset from {DATASET_PATH}")
df = pd.read_csv(DATASET_PATH)
print(f'Shape: {df.shape}')

before = len(df)
df = df.drop_duplicates()
df = df.dropna()
print(f'Rows before: {before}  |  after: {len(df)}  |  removed: {before - len(df)}')

difficulty_encoder = LabelEncoder()
df['question_difficulty_enc'] = difficulty_encoder.fit_transform(df['question_difficulty'])
print('Difficulty mapping:', dict(zip(difficulty_encoder.classes_, difficulty_encoder.transform(difficulty_encoder.classes_))))

FEATURE_COLUMNS = [
    'topic_id',
    'quiz_accuracy',
    'avg_time_per_question',
    'total_attempts',
    'question_difficulty_enc',
    'videos_watched',
    'articles_read',
    'chatbot_questions',
    'study_duration',
    'daily_streak',
    'ewma_accuracy',
    'prerequisite_mastery',
    'previous_attempt_accuracy',
]

X = df[FEATURE_COLUMNS]
y = df['label']

print(f'\nX shape: {X.shape}')
print(f'y shape: {y.shape}')

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f'Train size: {X_train.shape[0]}  |  Test size: {X_test.shape[0]}')

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    random_state=42,
    class_weight='balanced'
)
model.fit(X_train, y_train)
print('Model trained')

predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)

print(f'\nAccuracy: {accuracy * 100:.2f}%')
print('\n--- Classification Report ---')
print(classification_report(y_test, predictions, labels=['Weak','Moderate','Strong']))

joblib.dump(model, MODELS_DIR / 'production.pkl')
joblib.dump(difficulty_encoder, MODELS_DIR / 'difficulty_label_encoder.pkl')
joblib.dump(FEATURE_COLUMNS, MODELS_DIR / 'feature_columns.pkl')

print('Saved models to ml/models/ directory')
