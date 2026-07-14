import resend
from backend.config import settings
from sqlalchemy.orm import Session
from database.models.postgres_models import EmailVerificationToken
import secrets
from datetime import datetime, timedelta
import logging

resend.api_key = settings.RESEND_API_KEY
logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def generate_verification_token(db: Session, user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        db_token = EmailVerificationToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
        db.add(db_token)
        db.commit()
        return token
        
    @staticmethod
    def validate_verification_token(db: Session, token: str) -> int:
        db_token = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.token == token,
            EmailVerificationToken.used == False,
            EmailVerificationToken.expires_at > datetime.utcnow()
        ).first()
        
        if not db_token:
            return None
        return db_token.user_id
        
    @staticmethod
    def consume_verification_token(db: Session, token: str):
        db_token = db.query(EmailVerificationToken).filter(EmailVerificationToken.token == token).first()
        if db_token:
            db_token.used = True
            db.commit()

    @staticmethod
    def send_verification_email(email: str, token: str):
        if not settings.RESEND_API_KEY:
            logger.warning(f"No RESEND_API_KEY. Would send verification to {email} with token {token}")
            return
            
        url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Verify your AI Learn account</h2>
            <p>Thanks for signing up! Please verify your email address to get started.</p>
            <a href="{url}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
            <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
        """
        try:
            resend.Emails.send({
                "from": settings.EMAIL_FROM,
                "to": email,
                "subject": "Verify your AI Learn account",
                "html": html
            })
        except Exception as e:
            logger.error(f"Failed to send email to {email}: {e}")

    @staticmethod
    def send_password_reset_email(email: str, token: str):
        if not settings.RESEND_API_KEY:
            logger.warning(f"No RESEND_API_KEY. Would send reset to {email} with token {token}")
            return
            
        url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Reset your password</h2>
            <p>We received a request to reset the password for your AI Learn account.</p>
            <a href="{url}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
        """
        try:
            resend.Emails.send({
                "from": settings.EMAIL_FROM,
                "to": email,
                "subject": "Reset your AI Learn password",
                "html": html
            })
        except Exception as e:
            logger.error(f"Failed to send reset email to {email}: {e}")

    @staticmethod
    def send_invitation_email(email: str, role: str, token: str, inviter_name: str):
        if not settings.RESEND_API_KEY:
            logger.warning(f"No RESEND_API_KEY. Would send invitation to {email} as {role}")
            return
            
        url = f"{settings.FRONTEND_URL}/accept-invite?token={token}"
        role_display = role.capitalize()
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>You've been invited to AI Learn</h2>
            <p><strong>{inviter_name}</strong> has invited you to join AI Learn as an <strong>{role_display}</strong>.</p>
            <p>Click the button below to create your account and get started:</p>
            <a href="{url}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold;">Accept Invitation</a>
            <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
            <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
        """
        try:
            resend.Emails.send({
                "from": settings.EMAIL_FROM,
                "to": email,
                "subject": f"You're invited to join AI Learn as {role_display}",
                "html": html
            })
        except Exception as e:
            logger.error(f"Failed to send invitation email to {email}: {e}")

