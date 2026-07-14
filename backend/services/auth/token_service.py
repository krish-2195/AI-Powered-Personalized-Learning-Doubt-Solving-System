from datetime import datetime, timedelta
from jose import JWTError, jwt
import secrets
from backend.config import settings

class TokenService:
    @staticmethod
    def create_access_token(user_id: int, email: str, role: str) -> str:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode = {
            "sub": email,
            "user_id": user_id,
            "role": role,
            "exp": expire,
            "type": "access"
        }
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def generate_refresh_token() -> str:
        """Generate a secure random string for a refresh token."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def decode_access_token(token: str) -> dict:
        """Decode and validate an access token, returning the payload."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            if payload.get("type") != "access":
                raise JWTError("Invalid token type")
            return payload
        except JWTError as e:
            raise e
