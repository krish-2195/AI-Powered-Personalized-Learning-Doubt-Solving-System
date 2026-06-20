from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.connection import get_db
from backend.services.recommendation import recommendation_engine
from backend.utils.response_formatter import success_response, error_response

router = APIRouter()

@router.get("/personalized/{user_id}")
async def get_personalized_recommendations(user_id: int, top_n: int = 10, db: Session = Depends(get_db)):
    """
    Get personalized learning recommendations using TF-IDF + SVD hybrid filtering,
    adjusted dynamically by Knowledge Graph dependencies.
    """
    try:
        recommended_content = recommendation_engine.get_recommendations(db, user_id, top_n)
        
        results = []
        for c in recommended_content:
            results.append({
                "resource_id": c.id,
                "type": c.content_type,
                "title": c.title,
                "topic": c.topic.name if c.topic else "General",
                "difficulty": c.difficulty,
                "estimated_time_minutes": c.duration_minutes,
                "url": c.url
            })
            
        return success_response(data=results, message="Recommendations generated successfully")
        
    except Exception as e:
        return error_response(str(e), "Failed to generate recommendations")

@router.post("/feedback")
async def record_recommendation_feedback():
    """
    Placeholder for capturing feedback on recommendations (e.g. clicks) to tune SVD weights.
    """
    return success_response(message="Feedback recorded")
