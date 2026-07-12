from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from backend.routers.auth import get_current_user
from backend.services.gamification import GamificationService
from backend.utils.response_formatter import success_response, error_response
from database.models.postgres_models import User

router = APIRouter()

@router.post("/check-in")
def daily_check_in(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Endpoint for daily learning check-in.
    Updates streak and returns updated streak information.
    """
    if current_user.get("status") != "success" or "data" not in current_user:
        return error_response("Invalid user data", "Unauthorized")
    
    user_id = current_user["data"].get("user_id")
    if not user_id:
        return error_response("User ID missing in token", "Unauthorized")
        
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not user.profile:
        return error_response("User profile not found", "Not Found")
    
    updated_profile = GamificationService.update_streak_on_login(db, user.profile)
    
    return success_response(
        data={
            "streak_count": updated_profile.streak_count,
            "longest_streak": updated_profile.longest_streak,
            "last_check_in": updated_profile.last_check_in
        },
        message="Daily check-in successful"
    )
