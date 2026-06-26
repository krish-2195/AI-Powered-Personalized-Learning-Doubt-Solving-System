from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.connection import get_db
from database.models.postgres_models import User, UserProfile, Topic, QuestionBank
from backend.utils.response_formatter import success_response, error_response

router = APIRouter()

class QuestionCreate(BaseModel):
    topic: str
    difficulty: str
    question_text: str
    options: List[str]
    correct_answer_index: int
    explanation: str

@router.get("/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    """Fetch high-level statistics for the admin dashboard."""
    try:
        total_users = db.query(User).count()
        total_topics = db.query(Topic).count()
        total_questions = db.query(QuestionBank).count()
        
        return success_response(data={
            "total_users": total_users,
            "total_topics": total_topics,
            "total_questions": total_questions,
            "system_health": "healthy"
        }, message="Admin stats fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch stats")

@router.get("/users")
async def get_all_users(db: Session = Depends(get_db)):
    """Fetch all users and their basic profile info."""
    try:
        users = db.query(User).all()
        user_list = []
        for u in users:
            profile = u.profile
            user_list.append({
                "user_id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "course": profile.course if profile else "N/A",
                "streak_count": profile.streak_count if profile else 0,
                "last_active_date": profile.last_active_date.strftime("%Y-%m-%d") if profile and profile.last_active_date else "Never"
            })
        return success_response(data=user_list, message="Users fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch users")

@router.post("/question")
async def add_question(payload: QuestionCreate, db: Session = Depends(get_db)):
    """Add a new question manually to the Question Bank."""
    try:
        if len(payload.options) != 4:
            return error_response("Questions must have exactly 4 options.", "Invalid Options")
            
        new_q = QuestionBank(
            topic=payload.topic,
            difficulty=payload.difficulty,
            question_text=payload.question_text,
            options=payload.options,
            correct_answer_index=payload.correct_answer_index,
            explanation=payload.explanation
        )
        db.add(new_q)
        db.commit()
        
        return success_response(data={"question_id": new_q.id}, message="Question added to bank successfully")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to add question")
