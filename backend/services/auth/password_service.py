from passlib.context import CryptContext
import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database.models.postgres_models import PasswordResetToken

pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto")

class PasswordService:
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        if not hashed_password:
            return False
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def generate_reset_token(db: Session, user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        db_token = PasswordResetToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
        db.add(db_token)
        db.commit()
        
        return token

    @staticmethod
    def validate_reset_token(db: Session, token: str) -> int:
        """Validates token and returns user_id, or None if invalid."""
        db_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.utcnow()
        ).first()
        
        if not db_token:
            return None
        return db_token.user_id

    @staticmethod
    def consume_reset_token(db: Session, token: str):
        db_token = db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()
        if db_token:
            db_token.used = True
            db.commit()
