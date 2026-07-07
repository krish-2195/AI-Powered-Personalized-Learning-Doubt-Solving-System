from datetime import datetime, date
from sqlalchemy.orm import Session
from database.models.postgres_models import UserProfile

class GamificationService:
    @staticmethod
    def update_streak_on_login(db: Session, profile: UserProfile):
        """
        Updates the user's streak count based on their last active date.
        Call this during the login flow.
        """
        today = datetime.utcnow().date()
        
        if profile.last_active_date is None:
            # First time logging in after registration
            profile.streak_count = 1
        else:
            last_active = profile.last_active_date.date()
            delta_days = (today - last_active).days
            
            if delta_days == 1:
                # Logged in yesterday -> increment
                profile.streak_count += 1
            elif delta_days > 1:
                # Missed a day -> reset
                profile.streak_count = 1
            # If delta_days == 0, logged in today already, no change to streak
            
        # Update last active date to now
        profile.last_active_date = datetime.utcnow()
        
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
        return profile
