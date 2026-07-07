from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models.postgres_models import QuizAttempt as DBQuizAttempt, PerformanceRecord, Topic
from ml.services.ml_service import ml_service
from backend.routers.auth import get_current_user

router = APIRouter()

class VideoWatch(BaseModel):
    user_id: str
    video_id: str
    topic: str
    duration_seconds: int
    completed: bool

class QuizAttempt(BaseModel):
    user_id: str
    quiz_id: str
    topic: str
    questions_count: int
    correct_answers: int
    time_taken_seconds: int
    attempt_number: int
    difficulty: str | None = None
    topic_id: int | None = None
    avg_time_per_question: float | None = None

class DoubtQuery(BaseModel):
    user_id: str
    question: str
    topic: Optional[str] = None

class NextStep(BaseModel):
    topic: str
    rationale: str
    confidence: float
    prerequisites_met: bool
    recommended_resources: List[str]
    estimated_time_minutes: int
    path: List[str]

from database.models.postgres_models import LearningLog, TopicPerformance

@router.post("/video/track")
def track_video_watch(watch_data: VideoWatch, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Track video watching activity in PostgreSQL
    """
    try:
        user_id_int = int(watch_data.user_id) if str(watch_data.user_id).isdigit() else 1
    except ValueError:
        user_id_int = 1
        
    topic = db.query(Topic).filter(Topic.name == watch_data.topic).first()
    topic_id = topic.id if topic else None
    
    new_log = LearningLog(
        user_id=user_id_int,
        activity_type="video",
        resource_id=watch_data.video_id,
        topic_id=topic_id,
        duration_seconds=watch_data.duration_seconds,
        completed=watch_data.completed
    )
    
    db.add(new_log)
    db.commit()
    
    return {
        "message": "Video watch tracked in PostgreSQL",
        "timestamp": datetime.utcnow(),
        "progress_updated": True
    }

@router.post("/quiz/submit")
def submit_quiz(quiz_data: QuizAttempt, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Submit quiz attempt, store in QuizAttempt, update PerformanceRecord,
    and soon trigger ML prediction.
    """
    accuracy = (quiz_data.correct_answers / quiz_data.questions_count) * 100 if quiz_data.questions_count > 0 else 0
    
    # 1. Resolve Topic ID
    topic = db.query(Topic).filter(Topic.name == quiz_data.topic).first()
    topic_id = topic.id if topic else None

    # Handle string user_ids passed from the frontend mockup
    user_id_int = int(quiz_data.user_id) if str(quiz_data.user_id).isdigit() else 1

    # 2. Save QuizAttempt
    new_attempt = DBQuizAttempt(
        user_id=user_id_int,
        quiz_id=quiz_data.quiz_id,
        topic_id=topic_id,
        questions_count=quiz_data.questions_count,
        correct_answers=quiz_data.correct_answers,
        accuracy=accuracy,
        time_taken_seconds=quiz_data.time_taken_seconds,
        attempt_number=quiz_data.attempt_number
    )
    db.add(new_attempt)
    
    # 3. Update PerformanceRecord
    perf = db.query(PerformanceRecord).filter(
        PerformanceRecord.user_id == user_id_int,
        PerformanceRecord.topic_id == topic_id
    ).first()
    
    if not perf:
        perf = PerformanceRecord(
            user_id=user_id_int,
            topic_id=topic_id,
            accuracy=accuracy,
            avg_time_seconds=quiz_data.time_taken_seconds,
            total_attempts=1,
            status="pending" # ML service will update this next
        )
        db.add(perf)
    else:
        # Update running averages
        perf.accuracy = ((perf.accuracy * perf.total_attempts) + accuracy) / (perf.total_attempts + 1)
        perf.avg_time_seconds = ((perf.avg_time_seconds * perf.total_attempts) + quiz_data.time_taken_seconds) / (perf.total_attempts + 1)
        perf.total_attempts += 1
        
    db.commit()
    
    # 4. Trigger ML Service
    ml_prediction = ml_service.predict_weakness(db, user_id_int, topic_id)
    
    return {
        "message": "Quiz submitted and recorded successfully",
        "ml_prediction": ml_prediction,
        "accuracy": accuracy,
        "score": quiz_data.correct_answers,
        "total": quiz_data.questions_count,
        "time_taken": quiz_data.time_taken_seconds,
        "performance_category": "good" if accuracy >= 70 else "needs_improvement",
        "recorded_in_db": True
    }

@router.get("/history/{user_id}")
def get_learning_history(user_id: str, limit: int = 50, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Get user's learning activity history from PostgreSQL LearningLogs and QuizAttempts
    """
    try:
        uid = int(user_id)
    except ValueError:
        uid = 1
        
    logs = db.query(LearningLog).filter(LearningLog.user_id == uid).order_by(LearningLog.timestamp.desc()).limit(limit).all()
    
    activities = []
    for log in logs:
        topic_name = "Unknown"
        if log.topic_id:
            topic = db.query(Topic).filter(Topic.id == log.topic_id).first()
            if topic:
                topic_name = topic.name
                
        activities.append({
            "type": log.activity_type,
            "topic": topic_name,
            "timestamp": log.timestamp.isoformat(),
            "completed": log.completed
        })
        
    return {
        "user_id": str(uid),
        "activities": activities,
        "total_count": len(activities)
    }

@router.get("/next-steps/{user_id}", response_model=List[NextStep])
def get_next_steps(user_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Suggest next steps using live ML Recommendation Engine
    """
    from ml.services.recommendation import recommendation_service
    
    try:
        uid = int(user_id)
    except ValueError:
        uid = 1
        
    # Get live recommendations from our PostgreSQL + Knowledge Graph engine
    recommendations = recommendation_service.get_recommendations(db, uid)
    
    next_steps = []
    for rec in recommendations:
        content_obj = rec["content"]
        topic_name = content_obj.topic.name if content_obj.topic else "Unknown"
        next_steps.append(
            NextStep(
                topic=topic_name,
                rationale=rec["reason"],
                confidence=rec["match_score"] / 100.0,
                prerequisites_met=True,
                recommended_resources=[content_obj.title],
                estimated_time_minutes=content_obj.duration_minutes or 15,
                path=[]
            )
        )
        
    return next_steps
