from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from backend.config import settings
from database.connection import get_db
from database.models.postgres_models import User, UserProfile
from backend.utils.response_formatter import success_response, error_response
from backend.services.gamification import GamificationService

router = APIRouter()

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    course: str
    subjects: list[str]
    current_level: str  # Beginner, Intermediate, Advanced
    exam_target: str
    exam_timeline: str

class LoginRequest(BaseModel):
    email: str
    password: str

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    """Register a new user with profile information and persist to PostgreSQL."""

    normalized_email = user.email.strip().lower()
    try:
        existing_user = db.query(User).filter(User.email == normalized_email).first()
    except SQLAlchemyError:
        db.rollback()
        return error_response("Database unavailable. Please try again in a moment.", "Registration Failed")

    if existing_user:
        return error_response("User with this email already exists", "Registration Failed")

    hashed_password = pwd_context.hash(user.password.strip())

    new_user = User(
        email=normalized_email,
        hashed_password=hashed_password,
        full_name=user.full_name.strip(),
    )

    profile = UserProfile(
        course=user.course.strip(),
        subjects=user.subjects,
        current_level=user.current_level,
        exam_target=user.exam_target.strip(),
        exam_timeline=user.exam_timeline,
        streak_count=1,
    )

    try:
        db.add(new_user)
        db.flush()  # populate new_user.id
        profile.user_id = new_user.id
        db.add(profile)
        db.commit()
    except IntegrityError:
        db.rollback()
        return error_response("Could not create user", "Registration Failed")
    except SQLAlchemyError:
        db.rollback()
        return error_response("Database unavailable. Please try again in a moment.", "Registration Failed")

    access_token = create_access_token(data={"sub": new_user.email})
    
    # Return standard envelope format
    user_data = {
        "user_id": new_user.id,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "token": access_token
    }
    return success_response(data=user_data, message="User registered successfully")

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user credentials, update streak logic, and return a JWT."""

    email = payload.email.strip().lower()
    try:
        user = db.query(User).filter(User.email == email).first()
    except SQLAlchemyError:
        db.rollback()
        return error_response("Database unavailable. Please try again in a moment.", "Login Failed")

    if not user or not verify_password(payload.password, user.hashed_password):
        return error_response("Incorrect email or password", "Login Failed")

    # Call gamification service to handle streak and last active date
    if user.profile:
        GamificationService.update_streak_on_login(db, user.profile)

    access_token = create_access_token(data={"sub": user.email})
    
    user_data = {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "streak_count": user.profile.streak_count if user.profile else 0,
        "token": access_token
    }
    
    return success_response(data=user_data, message="Login successful")

@router.get("/me")
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Return the authenticated user profile summary."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return error_response("Invalid authentication credentials", "Unauthorized")
    except JWTError:
        return error_response("Invalid authentication credentials", "Unauthorized")
    
    try:
        user = db.query(User).filter(User.email == email).first()
    except SQLAlchemyError:
        return error_response("Database connection failed", "Unauthorized")

    if not user:
        return error_response("User not found", "Unauthorized")

    profile = user.profile

    user_data = {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "course": profile.course if profile else None,
        "subjects": profile.subjects if profile else [],
        "current_level": profile.current_level if profile else None,
        "exam_target": profile.exam_target if profile else None,
        "exam_timeline": profile.exam_timeline if profile else None,
        "streak_count": profile.streak_count if profile else 0,
        "last_active_date": profile.last_active_date if profile else None
    }
    
    return success_response(data=user_data, message="Profile fetched successfully")
