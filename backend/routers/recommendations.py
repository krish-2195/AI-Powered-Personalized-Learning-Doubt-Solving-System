from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.connection import get_db
from ml.services.recommendation import recommendation_service
from backend.utils.response_formatter import success_response, error_response
from backend.routers.auth import verify_user_ownership

router = APIRouter()

@router.get("/personalized/{user_id}")
def get_personalized_recommendations(user_id: int, top_n: int = 10, db: Session = Depends(get_db), current_user = Depends(verify_user_ownership)):
    """
    Get personalized learning recommendations using TF-IDF + SVD hybrid filtering,
    adjusted dynamically by Knowledge Graph dependencies.
    """
    try:
        recommended_content = recommendation_service.get_recommendations(db, user_id, top_n)
        
        from backend.utils.course_mapping import CourseMappingService
        results = []
        for rec in recommended_content:
            c = rec["content"]
            subject_name = c.topic.subject.name if c.topic and c.topic.subject else None
            user_subject = CourseMappingService.CSV_TO_USER_SUBJECT.get(subject_name, subject_name) if subject_name else None
            
            results.append({
                "resource_id": c.id,
                "type": c.content_type,
                "title": c.title,
                "topic": c.topic.name if c.topic else "General",
                "subject": user_subject,
                "difficulty": c.difficulty,
                "estimated_time_minutes": c.duration_minutes,
                "url": c.url,
                "match_score": rec["match_score"],
                "reason": rec["reason"]
            })
            
        return success_response(data=results, message="Recommendations generated successfully")
        
    except Exception as e:
        return error_response(str(e), "Failed to generate recommendations")

from database.models.postgres_models import RecommendationFeedback
from pydantic import BaseModel
from datetime import datetime

class RecommendationFeedbackPayload(BaseModel):
    user_id: int
    content_id: int
    clicked: bool = True
    time_spent: int = 0

@router.post("/feedback")
def record_recommendation_feedback(payload: RecommendationFeedbackPayload, db: Session = Depends(get_db), current_user = Depends(verify_user_ownership)):
    """
    Record feedback on recommendations (e.g. clicks) to tune SVD weights.
    """
    try:
        feedback = RecommendationFeedback(
            user_id=payload.user_id,
            content_id=payload.content_id,
            clicked=payload.clicked,
            opened_at=datetime.utcnow() if payload.clicked else None,
            time_spent=payload.time_spent
        )
        db.add(feedback)
        
        # Also update the tracking table for the Admin Portal
        if payload.clicked:
            from database.models.postgres_models import Recommendation
            rec_log = db.query(Recommendation).filter_by(
                user_id=payload.user_id, 
                resource_id=str(payload.content_id)
            ).first()
            if rec_log:
                rec_log.interacted = True
                rec_log.interacted_at = datetime.utcnow()
        db.commit()
        return success_response(message="Feedback recorded")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to record feedback")
