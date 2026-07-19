from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from backend.config import settings
from database.connection import get_db
from database.models.postgres_models import User, UserProfile, InvitationToken
from backend.utils.response_formatter import success_response, error_response
from backend.services.gamification import GamificationService

from backend.services.auth import TokenService, PasswordService, EmailService, OAuthService, SessionService
from backend.limiter import limiter

router = APIRouter()
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

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class GoogleLoginRequest(BaseModel):
    token: str

class OAuthRegisterRequest(BaseModel):
    email: str
    full_name: str
    provider: str
    provider_user_id: str
    profile_picture: str | None = None
    course: str
    subjects: list[str]
    current_level: str
    exam_target: str
    exam_timeline: str

class AcceptInviteRequest(BaseModel):
    token: str
    full_name: str
    password: str

@router.post("/register")
@limiter.limit("5/minute")
def register(request: Request, user: UserRegister, db: Session = Depends(get_db)):
    """Register a new user, send verification email, and persist to PostgreSQL."""
    from backend.utils.course_mapping import CourseMappingService
    if not CourseMappingService.validate_course_subject(user.course.strip(), user.subjects):
        return error_response("Invalid subjects selected for the chosen course", "Registration Failed")

    normalized_email = user.email.strip().lower()
    try:
        existing_user = db.query(User).filter(User.email == normalized_email).first()
    except SQLAlchemyError:
        db.rollback()
        return error_response("Database unavailable. Please try again in a moment.", "Registration Failed")

    if existing_user:
        return error_response("User with this email already exists", "Registration Failed")

    hashed_password = PasswordService.hash_password(user.password.strip())

    new_user = User(
        email=normalized_email,
        hashed_password=hashed_password,
        full_name=user.full_name.strip(),
        provider="email",
        email_verified=False
    )

    profile = UserProfile(
        course=user.course.strip(),
        subjects=user.subjects,
        current_level=user.current_level,
        exam_target=user.exam_target.strip(),
        exam_timeline=user.exam_timeline,
        streak_count=1,
        longest_streak=1,
        last_check_in=datetime.utcnow(),
    )

    try:
        db.add(new_user)
        db.flush()
        profile.user_id = new_user.id
        db.add(profile)
        db.commit()
    except IntegrityError:
        db.rollback()
        return error_response("Could not create user", "Registration Failed")
    except SQLAlchemyError:
        db.rollback()
        return error_response("Database unavailable. Please try again in a moment.", "Registration Failed")

    # Send verification email
    verify_token = EmailService.generate_verification_token(db, new_user.id)
    EmailService.send_verification_email(new_user.email, verify_token)

    # Note: Still returning access token for backwards compatibility if needed, 
    # but the frontend will now tell them to verify their email.
    access_token = TokenService.create_access_token(new_user.id, new_user.email, new_user.role)
    
    user_data = {
        "user_id": new_user.id,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role,
        "email_verified": new_user.email_verified,
        "token": access_token
    }
    return success_response(data=user_data, message="User registered successfully. Please verify your email.")

@router.post("/accept-invite")
def accept_invite(payload: AcceptInviteRequest, response: Response, db: Session = Depends(get_db)):
    """Accept an invitation and create an account with the invited role."""
    # Validate the invitation token
    invitation = db.query(InvitationToken).filter(
        InvitationToken.token == payload.token,
        InvitationToken.used == False,
    ).first()
    
    if not invitation:
        return error_response("Invalid or already used invitation token", "Invalid Token")
    
    if invitation.expires_at < datetime.utcnow():
        return error_response("This invitation has expired. Please ask your admin to send a new one.", "Expired")
    
    # Check if email already registered
    existing = db.query(User).filter(User.email == invitation.email).first()
    if existing:
        return error_response("An account with this email already exists", "Conflict")
    
    try:
        # Create the user with the invited role
        hashed_password = PasswordService.hash_password(payload.password)
        new_user = User(
            email=invitation.email,
            hashed_password=hashed_password,
            full_name=payload.full_name.strip(),
            role=invitation.role,
            provider="email",
            email_verified=True,  # Auto-verified since they received the invitation email
            is_active=True
        )
        db.add(new_user)
        db.flush()
        
        # Create a basic profile (instructors/admins don't need gamification fields)
        profile = UserProfile(
            user_id=new_user.id,
            course="N/A",
            subjects=[],
            current_level="N/A",
            exam_target="N/A",
            exam_timeline="N/A",
            streak_count=0,
            longest_streak=0
        )
        db.add(profile)
        
        # Mark invitation as used
        invitation.used = True
        db.commit()
        
        # Generate tokens and log them in
        access_token = TokenService.create_access_token(new_user.id, new_user.email, new_user.role)
        refresh_token = SessionService.create_session(db, new_user.id, device="Invitation Accept")
        
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=7 * 24 * 3600,
            path="/api/auth"
        )
        
        user_data = {
            "user_id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "token": access_token
        }
        return success_response(data=user_data, message=f"Welcome! Your {invitation.role} account has been created.")
        
    except IntegrityError:
        db.rollback()
        return error_response("An account with this email already exists", "Registration Failed")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Registration Failed")

@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not PasswordService.verify_password(payload.password, user.hashed_password):
        return error_response("Incorrect email or password", "Login Failed")

    if not user.email_verified:
        return error_response("Please verify your email address before logging in.", "Email Not Verified")

    if user.profile:
        GamificationService.update_streak_on_login(db, user.profile)
        
    user.last_login = datetime.utcnow()
    db.commit()

    access_token = TokenService.create_access_token(user.id, user.email, user.role)
    
    # Create session and set refresh token cookie
    device = request.headers.get("User-Agent")
    ip_address = request.client.host if request.client else None
    refresh_token = SessionService.create_session(db, user.id, device=device, ip_address=ip_address)
    
    response.set_cookie(
        key="refresh_token", 
        value=refresh_token, 
        httponly=True, 
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    user_data = {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "email_verified": user.email_verified,
        "streak_count": user.profile.streak_count if user.profile else 0,
        "longest_streak": user.profile.longest_streak if user.profile else 0,
        "last_check_in": user.profile.last_check_in if user.profile else None,
        "token": access_token
    }
    return success_response(data=user_data, message="Login successful")

@router.post("/refresh")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")
        
    user_id = SessionService.validate_session(db, refresh_token)
    if not user_id:
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=401, detail="Invalid or expired session")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User is inactive or deleted")
        
    access_token = TokenService.create_access_token(user.id, user.email, user.role)
    return success_response(data={"token": access_token}, message="Token refreshed")

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        SessionService.revoke_session(db, refresh_token)
    response.delete_cookie("refresh_token")
    return success_response(message="Logged out successfully")

@router.post("/verify-email")
def verify_email(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Using ResetPasswordRequest as a generic token payload for simplicity here
    token = payload.token
    user_id = EmailService.validate_verification_token(db, token)
    if not user_id:
        return error_response("Invalid or expired verification token", "Verification Failed")
        
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.email_verified = True
        EmailService.consume_verification_token(db, token)
        db.commit()
        return success_response(message="Email verified successfully. You can now log in.")
    return error_response("User not found", "Verification Failed")

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if user:
        # Don't reveal if user exists or not for security, just send if they do
        token = PasswordService.generate_reset_token(db, user.id)
        EmailService.send_password_reset_email(user.email, token)
    return success_response(message="If that email is registered, a password reset link has been sent.")

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user_id = PasswordService.validate_reset_token(db, payload.token)
    if not user_id:
        return error_response("Invalid or expired reset token", "Reset Failed")
        
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.hashed_password = PasswordService.hash_password(payload.new_password)
        PasswordService.consume_reset_token(db, payload.token)
        db.commit()
        return success_response(message="Password reset successfully. You can now log in.")
    return error_response("User not found", "Reset Failed")

@router.post("/google")
async def google_login(payload: GoogleLoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    try:
        provider = OAuthService.get_provider("google")
        user_info = await provider.verify_id_token(payload.token)
    except Exception as e:
        return error_response(f"Google login failed: {str(e)}", "Login Failed")
        
    return _handle_oauth_login(user_info, response, request, db)

@router.get("/github/url")
def github_url():
    provider = OAuthService.get_provider("github")
    return success_response(data={"url": provider.get_authorization_url()})

@router.get("/github/callback")
async def github_callback(code: str, response: Response, request: Request, db: Session = Depends(get_db)):
    try:
        provider = OAuthService.get_provider("github")
        user_info = await provider.exchange_code_for_user(code)
    except Exception as e:
        return error_response(f"GitHub login failed: {str(e)}", "Login Failed")
        
    return _handle_oauth_login(user_info, response, request, db)

@router.get("/microsoft/url")
def microsoft_url():
    provider = OAuthService.get_provider("microsoft")
    return success_response(data={"url": provider.get_authorization_url()})

@router.get("/microsoft/callback")
async def microsoft_callback(code: str, response: Response, request: Request, db: Session = Depends(get_db)):
    try:
        provider = OAuthService.get_provider("microsoft")
        user_info = await provider.exchange_code_for_user(code)
    except Exception as e:
        return error_response(f"Microsoft login failed: {str(e)}", "Login Failed")
        
    return _handle_oauth_login(user_info, response, request, db)

@router.get("/apple/url")
def apple_url():
    provider = OAuthService.get_provider("apple")
    return success_response(data={"url": provider.get_authorization_url()})

@router.post("/apple/callback")
async def apple_callback(code: str, response: Response, request: Request, db: Session = Depends(get_db)):
    # Apple uses POST for its callback (form_post)
    try:
        provider = OAuthService.get_provider("apple")
        user_info = await provider.exchange_code_for_user(code)
    except Exception as e:
        return error_response(f"Apple login failed: {str(e)}", "Login Failed")
        
    return _handle_oauth_login(user_info, response, request, db)

@router.post("/register/oauth")
def register_oauth(payload: OAuthRegisterRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    """Register a new user who signed up via Google/GitHub and completed onboarding."""
    from backend.utils.course_mapping import CourseMappingService
    if not CourseMappingService.validate_course_subject(payload.course.strip(), payload.subjects):
        return error_response("Invalid subjects selected for the chosen course", "Registration Failed")

    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        return error_response("User already exists", "Registration Failed")

    new_user = User(
        email=payload.email.lower(),
        hashed_password=None, # No password
        full_name=payload.full_name.strip(),
        provider=payload.provider,
        provider_user_id=payload.provider_user_id,
        email_verified=True, # Pre-verified
        profile_picture=payload.profile_picture
    )

    profile = UserProfile(
        course=payload.course.strip(),
        subjects=payload.subjects,
        current_level=payload.current_level,
        exam_target=payload.exam_target.strip(),
        exam_timeline=payload.exam_timeline,
        streak_count=1,
        longest_streak=1,
        last_check_in=datetime.utcnow(),
    )

    try:
        db.add(new_user)
        db.flush()
        profile.user_id = new_user.id
        db.add(profile)
        db.commit()
    except IntegrityError:
        db.rollback()
        return error_response("Could not create user", "Registration Failed")
    except SQLAlchemyError:
        db.rollback()
        return error_response("Database unavailable", "Registration Failed")

    access_token = TokenService.create_access_token(new_user.id, new_user.email, new_user.role)
    device = request.headers.get("User-Agent")
    ip_address = request.client.host if request.client else None
    refresh_token = SessionService.create_session(db, new_user.id, device=device, ip_address=ip_address)
    
    response.set_cookie(
        key="refresh_token", 
        value=refresh_token, 
        httponly=True, 
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    user_data = {
        "user_id": new_user.id,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role,
        "email_verified": new_user.email_verified,
        "streak_count": profile.streak_count,
        "longest_streak": profile.longest_streak,
        "token": access_token
    }
    return success_response(data=user_data, message="Registration and login successful")

def _handle_oauth_login(user_info, response: Response, request: Request, db: Session):
    user = db.query(User).filter(User.email == user_info.email).first()
    
    if not user:
        oauth_data = {
            "email": user_info.email,
            "full_name": user_info.name,
            "provider": user_info.provider,
            "provider_user_id": user_info.provider_user_id,
            "profile_picture": user_info.picture
        }
        return success_response(
            data={"needs_onboarding": True, "oauth_data": oauth_data}, 
            message="Please complete your profile to finish registration."
        )
    else:
        # Update existing user if needed
        if not user.provider_user_id and user.provider == "email":
            # Link accounts (optional logic, just updating for now)
            user.provider = user_info.provider
            user.provider_user_id = user_info.provider_user_id
            user.email_verified = True
            
        if user.profile:
            GamificationService.update_streak_on_login(db, user.profile)
            
        user.last_login = datetime.utcnow()
        db.commit()

    access_token = TokenService.create_access_token(user.id, user.email, user.role)
    
    device = request.headers.get("User-Agent")
    ip_address = request.client.host if request.client else None
    refresh_token = SessionService.create_session(db, user.id, device=device, ip_address=ip_address)
    
    response.set_cookie(
        key="refresh_token", 
        value=refresh_token, 
        httponly=True, 
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    user_data = {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "email_verified": user.email_verified,
        "streak_count": user.profile.streak_count if user.profile else 0,
        "longest_streak": user.profile.longest_streak if user.profile else 0,
        "token": access_token
    }
    return success_response(data=user_data, message="Login successful")

@router.get("/me")
def get_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Return the authenticated user profile summary."""
    try:
        payload = TokenService.decode_access_token(token)
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

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
        "longest_streak": profile.longest_streak if profile else 0,
        "last_check_in": profile.last_check_in if profile else None,
        "last_active_date": profile.last_active_date if profile else None,
        "role": user.role,
        "provider": user.provider,
        "email_verified": user.email_verified,
        "profile_picture": user.profile_picture
    }
    
    return success_response(data=user_data, message="Profile fetched successfully")

def _get_user_from_token(token: str, db: Session) -> User:
    try:
        payload = TokenService.decode_access_token(token)
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    return user

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency to get the current authenticated user."""
    return _get_user_from_token(token, db)

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Return the authenticated admin user or raise 403."""
    user = _get_user_from_token(token, db)
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Access Denied")
    return user


def _get_user_from_token(token: str, db: Session) -> User:
    """Extract and return the authenticated user from a JWT token."""
    try:
        payload = TokenService.decode_access_token(token)
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    return user


def require_role(*allowed_roles):
    """Dependency factory that checks if the authenticated user has one of the allowed roles.
    
    Usage:
        @router.get("/endpoint")
        def my_endpoint(user: User = require_role("instructor", "admin", "super_admin")):
            ...
    """
    def dependency(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
        user = _get_user_from_token(token, db)
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return Depends(dependency)

