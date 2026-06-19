from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class UserProfile(BaseModel):
    user_id: str
    email: str
    full_name: str
    course: str
    subjects: list[str]
    current_level: str
    exam_target: str
    exam_timeline: str

class UpdateProfile(BaseModel):
    full_name: Optional[str] = None
    course: Optional[str] = None
    subjects: Optional[list[str]] = None
    current_level: Optional[str] = None
    exam_target: Optional[str] = None
    exam_timeline: Optional[str] = None

@router.get("/profile/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str):
    """
    Get user profile and learning preferences
    """
    # TODO: Fetch from database
    return {
        "user_id": user_id,
        "email": "student@example.com",
        "full_name": "Student Name",
        "course": "Computer Science",
        "subjects": ["Data Structures", "Algorithms"],
        "current_level": "Intermediate",
        "exam_target": "Final Exam",
        "exam_timeline": "3 months"
    }

@router.put("/profile/{user_id}")
async def update_user_profile(user_id: str, profile: UpdateProfile):
    """
    Update user profile information
    """
    # TODO: Update in database
    return {"message": "Profile updated successfully", "user_id": user_id}

@router.get("/stats/{user_id}")
async def get_user_stats(user_id: str):
    """
    Get user learning statistics
    """
    # TODO: Aggregate from database
    return {
        "total_videos_watched": 45,
        "total_quizzes_completed": 30,
        "average_score": 78.5,
        "time_spent_hours": 120,
        "topics_mastered": 12,
        "weak_topics": 5
    }
