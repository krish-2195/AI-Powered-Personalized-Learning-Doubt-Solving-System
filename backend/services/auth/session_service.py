from datetime import datetime, timedelta
from sqlalchemy.orm import Session as DbSession
from database.models.postgres_models import Session
from backend.services.auth.token_service import TokenService
from backend.config import settings

class SessionService:
    @staticmethod
    def create_session(db: DbSession, user_id: int, device: str = None, browser: str = None, ip_address: str = None) -> str:
        refresh_token = TokenService.generate_refresh_token()
        expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        session = Session(
            user_id=user_id,
            refresh_token=refresh_token,
            device=device,
            browser=browser,
            ip_address=ip_address,
            expires_at=expires_at
        )
        db.add(session)
        db.commit()
        return refresh_token

    @staticmethod
    def validate_session(db: DbSession, refresh_token: str) -> int:
        """Validates a refresh token and returns user_id, or None if invalid."""
        session = db.query(Session).filter(
            Session.refresh_token == refresh_token,
            Session.expires_at > datetime.utcnow()
        ).first()
        
        if not session:
            return None
            
        session.last_active = datetime.utcnow()
        db.commit()
        return session.user_id

    @staticmethod
    def revoke_session(db: DbSession, refresh_token: str):
        db.query(Session).filter(Session.refresh_token == refresh_token).delete()
        db.commit()
