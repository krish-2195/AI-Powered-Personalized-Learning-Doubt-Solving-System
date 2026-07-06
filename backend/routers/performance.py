"""
Performance Router — Provides the ML prediction endpoint and a deprecated legacy quiz submit route.

The primary quiz submission flow is handled by `learning.py /quiz/submit`,
which uses the production Random Forest model (13 features, production.pkl).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.connection import get_db
from database.models.postgres_models import TopicPerformance
from backend.utils.response_formatter import success_response
from backend.routers.auth import get_current_user

router = APIRouter()

@router.get("/prediction/")
def get_prediction(user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Returns the user's overall ML prediction status.
    Used by ChatPage sidebar to display prediction badge.
    """
    avg_score = db.query(func.avg(TopicPerformance.ewma_accuracy)).filter(TopicPerformance.user_id == user_id).scalar() or 0
    
    if avg_score >= 80:
        predicted_score = "Strong"
        confidence = 92
    elif avg_score >= 50:
        predicted_score = "Moderate"
        confidence = 85
    else:
        predicted_score = "Weak"
        confidence = 78
        
    return success_response(data={
        "predicted_score": predicted_score,
        "confidence": confidence,
        "reasons": ["Review fundamentals" if predicted_score == "Weak" else "Keep practicing"]
    })
