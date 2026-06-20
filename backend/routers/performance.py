from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from database.connection import get_db
from database.models.postgres_models import PerformanceRecord, TopicPerformance, QuizAttempt, Topic
from backend.services.ml_service import weak_topic_detector
from backend.utils.response_formatter import success_response, error_response

router = APIRouter()

class AnswerItem(BaseModel):
    question_id: str
    selected_answer: str
    time_taken_seconds: int
    is_correct: bool  # Backend ideally checks this against DB, mocked for now

class QuizSubmitPayload(BaseModel):
    user_id: int
    quiz_id: str
    topic_id: int
    answers: List[AnswerItem]
    difficulty_weight: float = 2.0  # 1=easy, 2=med, 3=hard

def process_quiz_submission_async(db: Session, user_id: int, topic_id: int, accuracy: float, avg_time: float, attempt_count: int, diff_weight: float):
    """
    Background task to run ML model and update TopicPerformance
    """
    features = {
        "accuracy": accuracy,
        "avg_time_seconds": avg_time,
        "total_attempts": attempt_count,
        "difficulty_weight": diff_weight
    }
    
    # 1. Random Forest prediction
    status = weak_topic_detector.predict_topic_status(features)
    
    # 2. Save the PerformanceRecord
    perf_record = PerformanceRecord(
        user_id=user_id,
        topic_id=topic_id,
        accuracy=accuracy,
        avg_time_seconds=avg_time,
        total_attempts=attempt_count,
        status=status,
        weakness_score=1.0 - accuracy if status == "Weak" else 0.0
    )
    db.add(perf_record)
    
    # 3. Update or Create TopicPerformance for EWMA
    topic_perf = db.query(TopicPerformance).filter(
        TopicPerformance.user_id == user_id, 
        TopicPerformance.topic_id == topic_id
    ).first()
    
    if not topic_perf:
        topic_perf = TopicPerformance(user_id=user_id, topic_id=topic_id, ewma_accuracy=accuracy)
        db.add(topic_perf)
    else:
        old_ewma = topic_perf.ewma_accuracy
        new_ewma = (0.8 * old_ewma) + (0.2 * accuracy)
        topic_perf.ewma_accuracy = new_ewma
        
        # Update mastery level based on EWMA
        if new_ewma >= 0.8:
            topic_perf.mastery_level = "Expert"
        elif new_ewma >= 0.5:
            topic_perf.mastery_level = "Intermediate"
        else:
            topic_perf.mastery_level = "Beginner"
            
    db.commit()

@router.post("/submit")
async def submit_quiz(payload: QuizSubmitPayload, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Submit quiz answers, calculate score, and trigger async ML weak topic detection.
    """
    total_q = len(payload.answers)
    if total_q == 0:
        return error_response("No answers submitted")
        
    correct_q = sum(1 for a in payload.answers if a.is_correct)
    accuracy = correct_q / total_q
    
    total_time = sum(a.time_taken_seconds for a in payload.answers)
    avg_time = total_time / total_q
    
    # Save Quiz Attempt
    attempt = QuizAttempt(
        user_id=payload.user_id,
        quiz_id=payload.quiz_id,
        topic_id=payload.topic_id,
        questions_count=total_q,
        correct_answers=correct_q,
        accuracy=accuracy,
        time_taken_seconds=total_time,
        answers_data=[a.dict() for a in payload.answers]
    )
    db.add(attempt)
    db.commit()
    
    # Count previous attempts for this topic
    attempt_count = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == payload.user_id,
        QuizAttempt.topic_id == payload.topic_id
    ).count()
    
    # Fire off background task to run Random Forest and update EWMA
    background_tasks.add_task(
        process_quiz_submission_async, 
        db, payload.user_id, payload.topic_id, accuracy, avg_time, attempt_count, payload.difficulty_weight
    )
    
    return success_response(data={
        "score": correct_q,
        "total": total_q,
        "accuracy": accuracy * 100,
        "message": "Quiz submitted successfully. Performance stats are updating in the background."
    })
