from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.connection import get_db
from database.models.postgres_models import User, UserProfile as DBUserProfile, LearningLog, QuizAttempt, TopicPerformance
from backend.utils.response_formatter import success_response, error_response
from backend.routers.auth import get_current_user

router = APIRouter()

class UserProfileResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    course: str
    subjects: List[str]
    current_level: str
    exam_target: str
    exam_timeline: str

class UpdateProfile(BaseModel):
    full_name: Optional[str] = None
    course: Optional[str] = None
    subjects: Optional[List[str]] = None
    current_level: Optional[str] = None
    exam_target: Optional[str] = None
    exam_timeline: Optional[str] = None

@router.get("/profile/{user_id}", response_model=UserProfileResponse)
def get_user_profile(user_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Get user profile and learning preferences from PostgreSQL
    """
    try:
        uid = int(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")
        
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    profile = db.query(DBUserProfile).filter(DBUserProfile.user_id == uid).first()
    
    return UserProfileResponse(
        user_id=str(uid),
        email=user.email,
        full_name=user.full_name or "Student",
        course=profile.course if profile and profile.course else "",
        subjects=profile.subjects if profile and profile.subjects else [],
        current_level=profile.current_level if profile and profile.current_level else "Beginner",
        exam_target=profile.exam_target if profile and profile.exam_target else "",
        exam_timeline=profile.exam_timeline if profile and profile.exam_timeline else ""
    )

@router.put("/profile/{user_id}")
def update_user_profile(user_id: str, profile_data: UpdateProfile, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Update user profile information in PostgreSQL
    """
    try:
        uid = int(user_id)
    except ValueError:
        return error_response("Invalid user_id format", "Invalid ID")
        
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        return error_response("User not found", "Not Found")
        
    if profile_data.full_name is not None:
        user.full_name = profile_data.full_name
        
    profile = db.query(DBUserProfile).filter(DBUserProfile.user_id == uid).first()
    if not profile:
        profile = DBUserProfile(user_id=uid)
        db.add(profile)
        
    if profile_data.course is not None: profile.course = profile_data.course
    if profile_data.subjects is not None: profile.subjects = profile_data.subjects
    if profile_data.current_level is not None: profile.current_level = profile_data.current_level
    if profile_data.exam_target is not None: profile.exam_target = profile_data.exam_target
    if profile_data.exam_timeline is not None: profile.exam_timeline = profile_data.exam_timeline
    
    db.commit()
    
    return success_response(data={"user_id": str(uid)}, message="Profile updated successfully")

@router.get("/stats/{user_id}")
def get_user_stats(user_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Get user learning statistics by aggregating PostgreSQL records
    """
    try:
        uid = int(user_id)
    except ValueError:
        return error_response("Invalid user_id format", "Invalid ID")
        
    from backend.services.student_stats import student_stats_service
    shared_stats = student_stats_service.get_student_stats(db, int(uid))
    
    return success_response(data={
        "total_videos_watched": shared_stats["videos_watched"],
        "total_quizzes_completed": shared_stats["quiz_count"],
        "average_score": shared_stats["avg_accuracy"],
        "time_spent_hours": shared_stats["study_hours"],
        "topics_mastered": shared_stats["topics_mastered"],
        "weak_topics": shared_stats["weak_topics_count"]
    }, message="Stats loaded successfully")
