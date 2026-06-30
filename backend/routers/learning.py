from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models.postgres_models import QuizAttempt as DBQuizAttempt, PerformanceRecord, Topic

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

@router.post("/video/track")
async def track_video_watch(watch_data: VideoWatch):
    """
    Track video watching activity
    """
    # TODO: Save to database with timestamp
    # TODO: Update user progress
    return {
        "message": "Video watch tracked",
        "timestamp": datetime.utcnow(),
        "progress_updated": True
    }

@router.post("/quiz/submit")
async def submit_quiz(quiz_data: QuizAttempt, db: Session = Depends(get_db)):
    """
    Submit quiz attempt, store in QuizAttempt, update PerformanceRecord,
    and soon trigger ML prediction.
    """
    accuracy = (quiz_data.correct_answers / quiz_data.questions_count) * 100 if quiz_data.questions_count > 0 else 0
    
    # 1. Resolve Topic ID
    topic = db.query(Topic).filter(Topic.name == quiz_data.topic).first()
    topic_id = topic.id if topic else None

    # Handle string user_ids passed from the frontend mockup
    user_id_int = int(quiz_data.user_id) if quiz_data.user_id.isdigit() else 1

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
    
    # 4. Trigger ML Service (Step 8 will hook in right here)
    # ml_prediction = ml_service.predict_weakness(...)
    
    return {
        "message": "Quiz submitted and recorded successfully",
        "accuracy": accuracy,
        "score": quiz_data.correct_answers,
        "total": quiz_data.questions_count,
        "time_taken": quiz_data.time_taken_seconds,
        "performance_category": "good" if accuracy >= 70 else "needs_improvement",
        "recorded_in_db": True
    }

@router.post("/doubt/ask")
async def ask_doubt(doubt: DoubtQuery):
    """
    Record student doubt query
    """
    # TODO: Save to database
    # TODO: Forward to AI chat system
    return {
        "message": "Doubt recorded",
        "doubt_id": "DOUBT_" + str(datetime.utcnow().timestamp()),
        "status": "pending_response"
    }

@router.get("/history/{user_id}")
async def get_learning_history(user_id: str, limit: int = 50):
    """
    Get user's learning activity history
    """
    # TODO: Fetch from database
    return {
        "user_id": user_id,
        "activities": [
            {
                "type": "video",
                "topic": "Linked Lists",
                "timestamp": "2026-01-04T10:30:00",
                "completed": True
            },
            {
                "type": "quiz",
                "topic": "Binary Trees",
                "score": 8,
                "total": 10,
                "timestamp": "2026-01-04T11:15:00"
            }
        ],
        "total_count": 2
    }


@router.get("/next-steps/{user_id}", response_model=List[NextStep])
async def get_next_steps(user_id: str):
    """
    Suggest next steps using knowledge graph prerequisites and recent performance signals.
    """
    # TODO: Pull user progress, weak topics, and knowledge graph relations
    return [
        NextStep(
            topic="Binary Search Trees",
            rationale="You completed Trees with high accuracy; BST is the next prerequisite-aligned step.",
            confidence=0.82,
            prerequisites_met=True,
            recommended_resources=["VIDEO_BST_INTRO", "QUIZ_BST_01"],
            estimated_time_minutes=35,
            path=["Trees", "Binary Search Trees", "AVL Trees"],
        ),
        NextStep(
            topic="Recursion Practice",
            rationale="Recursion speed is below cohort; reinforces DP prerequisites.",
            confidence=0.76,
            prerequisites_met=True,
            recommended_resources=["QUIZ_REC_SPEED", "PRACTICE_REC_MED"],
            estimated_time_minutes=25,
            path=["Recursion", "Memoization", "Dynamic Programming"],
        ),
    ]
