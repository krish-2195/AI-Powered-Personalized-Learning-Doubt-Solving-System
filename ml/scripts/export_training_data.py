import os
import csv
from sqlalchemy.orm import Session
from database.connection import SessionLocal
from database.models.postgres_models import (
    PerformanceRecord, TopicPerformance, QuizAttempt, LearningLog, UserProfile, Topic
)

def export_training_data():
    """
    Connects to PostgreSQL, extracts user learning and performance data,
    and formats it into the 17-column schema expected by the Random Forest model.
    Saves to ml/datasets/real_student_dataset.csv.
    """
    db: Session = SessionLocal()
    
    # We will export one row per User-Topic pair
    perfs = db.query(PerformanceRecord).all()
    
    output_rows = []
    
    for perf in perfs:
        topic_perf = db.query(TopicPerformance).filter(
            TopicPerformance.user_id == perf.user_id,
            TopicPerformance.topic_id == perf.topic_id
        ).first()
        
        topic = db.query(Topic).filter(Topic.id == perf.topic_id).first()
        profile = db.query(UserProfile).filter(UserProfile.user_id == perf.user_id).first()
        
        # Calculate derived metrics from LearningLog
        logs = db.query(LearningLog).filter(
            LearningLog.user_id == perf.user_id,
            LearningLog.topic_id == perf.topic_id
        ).all()
        
        videos_watched = sum(1 for log in logs if log.activity_type == 'video')
        articles_read = sum(1 for log in logs if log.activity_type == 'article')
        chatbot_questions = sum(1 for log in logs if log.activity_type == 'chat')
        study_duration = sum(log.duration_seconds for log in logs) / 60.0 # in minutes
        
        # Calculate previous attempt accuracy from QuizAttempt
        quiz_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.user_id == perf.user_id,
            QuizAttempt.topic_id == perf.topic_id
        ).order_by(QuizAttempt.timestamp.desc()).all()
        
        prev_acc = 0.0
        if len(quiz_attempts) > 1:
            prev_acc = quiz_attempts[1].accuracy
            
        avg_time = perf.avg_time_seconds if perf.avg_time_seconds else 60.0
        
        row = {
            'user_id': f"U{perf.user_id}",
            'topic_id': perf.topic_id,
            'topic': topic.name if topic else "Unknown",
            'subject': topic.subject.name if topic and topic.subject else "Unknown",
            'quiz_accuracy': perf.accuracy,
            'avg_time_per_question': avg_time,
            'total_attempts': perf.total_attempts,
            'question_difficulty': 'Medium', # Could be derived from QuestionBank if needed
            'videos_watched': videos_watched,
            'articles_read': articles_read,
            'chatbot_questions': chatbot_questions,
            'study_duration': study_duration,
            'daily_streak': profile.streak_count if profile else 0,
            'ewma_accuracy': topic_perf.ewma_accuracy if topic_perf else perf.accuracy,
            'prerequisite_mastery': 50.0, # Defaulted; would calculate based on KG prerequisites in real system
            'previous_attempt_accuracy': prev_acc,
            'label': topic_perf.mastery_level if topic_perf else "Moderate"
        }
        output_rows.append(row)
        
    db.close()
    
    output_path = os.path.join(os.path.dirname(__file__), '../datasets/real_student_dataset.csv')
    
    headers = [
        'user_id', 'topic_id', 'topic', 'subject', 'quiz_accuracy', 'avg_time_per_question',
        'total_attempts', 'question_difficulty', 'videos_watched', 'articles_read',
        'chatbot_questions', 'study_duration', 'daily_streak', 'ewma_accuracy',
        'prerequisite_mastery', 'previous_attempt_accuracy', 'label'
    ]
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for r in output_rows:
            writer.writerow(r)
            
    print(f"Successfully exported {len(output_rows)} records to {output_path}")

if __name__ == "__main__":
    export_training_data()
