from datetime import datetime, date
from sqlalchemy.orm import Session
from database.models.postgres_models import UserProfile

class GamificationService:
    @staticmethod
    def update_streak_on_login(db: Session, profile: UserProfile):
        """
        Updates the user's streak count based on their last check in date.
        Call this during the login flow or explicit check-ins.
        """
        now = datetime.utcnow()
        today = now.date()
        
        if profile.last_check_in is None:
            # First check-in
            profile.streak_count = 1
        else:
            last_check_in_date = profile.last_check_in.date()
            delta_days = (today - last_check_in_date).days
            
            if delta_days == 1:
                # Checked in yesterday -> increment
                profile.streak_count += 1
            elif delta_days > 1:
                # Missed a day -> reset
                profile.streak_count = 1
            # If delta_days == 0, already checked in today, no change to streak
            
        # Update longest streak if applicable
        if profile.streak_count > (profile.longest_streak or 0):
            profile.longest_streak = profile.streak_count
            
        # Update dates
        profile.last_check_in = now
        profile.last_active_date = now  # Keep general active date updated as well
        
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
        return profile
