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
from backend.routers.auth import verify_user_ownership

router = APIRouter()

import asyncio

@router.get("/prediction/")
async def get_prediction(user_id: int, db: Session = Depends(get_db), current_user = Depends(verify_user_ownership)):
    """
    Returns the user's overall ML prediction status.
    Used by ChatPage sidebar to display prediction badge.
    """
    from ml.services.ml_service import ml_service
    res = await asyncio.to_thread(ml_service.predict_overall_performance, db, user_id)
    return success_response(data=res)
