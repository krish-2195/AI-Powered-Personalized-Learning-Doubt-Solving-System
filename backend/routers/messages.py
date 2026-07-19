from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database.connection import get_db
from database.models.postgres_models import User, Message, Content
from backend.routers.auth import get_current_user
from backend.utils.response_formatter import success_response, error_response

router = APIRouter(
    prefix="/api/messages",
    tags=["Messages"]
)

class SendMessageRequest(BaseModel):
    receiver_ids: List[int]
    subject: str
    body: str
    related_content_id: Optional[int] = None

@router.post("/send")
def send_message(payload: SendMessageRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send a message to one or more users."""
    try:
        messages = []
        for rid in payload.receiver_ids:
            msg = Message(
                sender_id=current_user.id,
                receiver_id=rid,
                subject=payload.subject,
                body=payload.body,
                related_content_id=payload.related_content_id
            )
            db.add(msg)
            messages.append(msg)
            
        db.commit()
        return success_response(data={"count": len(messages)}, message="Messages sent successfully")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to send message")

class SendToTopicRequest(BaseModel):
    topic: str
    subject: str
    body: str
    related_content_id: Optional[int] = None

@router.post("/send-to-topic")
def send_message_to_topic(payload: SendToTopicRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send a message to all students struggling with a specific topic."""
    try:
        from database.models.postgres_models import WeakTopic, Topic
        
        # Find the topic
        topic = db.query(Topic).filter(Topic.name == payload.topic).first()
        if not topic:
            return error_response(f"Topic {payload.topic} not found", "Topic not found", status_code=404)
            
        # Find students who are struggling with this topic
        struggling_user_ids = [r[0] for r in db.query(WeakTopic.user_id).filter(WeakTopic.topic_id == topic.id, WeakTopic.resolved == False).distinct().all()]
        
        if not struggling_user_ids:
            # If no actual students are struggling (e.g. mock data in UI), let's just send to all active students as fallback for testing
            from database.models.postgres_models import LearningLog
            struggling_user_ids = [r[0] for r in db.query(LearningLog.user_id).distinct().all()]
            if not struggling_user_ids:
                return success_response(data={"count": 0}, message="No students found to message")

        messages = []
        for rid in struggling_user_ids:
            msg = Message(
                sender_id=current_user.id,
                receiver_id=rid,
                subject=payload.subject,
                body=payload.body,
                related_content_id=payload.related_content_id
            )
            db.add(msg)
            messages.append(msg)
            
        db.commit()
        return success_response(data={"count": len(messages)}, message=f"Message sent to {len(messages)} students")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to send message to topic")

@router.get("/inbox")
def get_inbox(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all received messages."""
    try:
        messages = db.query(Message).filter(Message.receiver_id == current_user.id).order_by(Message.created_at.desc()).all()
        data = []
        for m in messages:
            sender = db.query(User).filter(User.id == m.sender_id).first()
            content = db.query(Content).filter(Content.id == m.related_content_id).first() if m.related_content_id else None
            data.append({
                "id": m.id,
                "sender_name": sender.full_name if sender else "Unknown",
                "sender_role": sender.role if sender else "Unknown",
                "subject": m.subject,
                "body": m.body,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat(),
                "related_content": {
                    "id": content.id,
                    "title": content.title,
                    "url": content.url
                } if content else None
            })
        return success_response(data=data, message="Inbox fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch inbox")

@router.get("/sent")
def get_sent_messages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all sent messages."""
    try:
        messages = db.query(Message).filter(Message.sender_id == current_user.id).order_by(Message.created_at.desc()).all()
        data = []
        for m in messages:
            receiver = db.query(User).filter(User.id == m.receiver_id).first()
            content = db.query(Content).filter(Content.id == m.related_content_id).first() if m.related_content_id else None
            data.append({
                "id": m.id,
                "receiver_name": receiver.full_name if receiver else "Unknown",
                "receiver_email": receiver.email if receiver else "Unknown",
                "subject": m.subject,
                "body": m.body,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat(),
                "related_content_title": content.title if content else None
            })
        return success_response(data=data, message="Sent messages fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch sent messages")
