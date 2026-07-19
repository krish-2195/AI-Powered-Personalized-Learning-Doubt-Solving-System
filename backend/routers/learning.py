from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models.postgres_models import QuizAttempt as DBQuizAttempt, PerformanceRecord, Topic
from ml.services.ml_service import ml_service
from backend.routers.auth import get_current_user
from backend.utils.response_formatter import success_response, error_response

router = APIRouter()

class VideoProgress(BaseModel):
    user_id: str
    content_id: str
    progress: float  # completion percentage (0 - 100)
    watch_duration: int
    completed: bool
    last_position: int

class QuizAttempt(BaseModel):
    user_id: str
    quiz_id: str
    topic: str
    questions_count: int
    correct_answers: int
    time_taken_seconds: int
    attempt_number: int
    difficulty: str | None = None
    topic_id: int | None = None
    avg_time_per_question: float | None = None

class DoubtQuery(BaseModel):
    user_id: str
    question: str
    topic: Optional[str] = None

class NextStep(BaseModel):
    topic: str
    rationale: str
    confidence: float
    prerequisites_met: bool
    recommended_resources: List[str]
    estimated_time_minutes: int
    path: List[str]

from database.models.postgres_models import LearningLog, TopicPerformance, Content

@router.get("/video-progress/{user_id}/{content_id}")
def get_video_progress(user_id: str, content_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Get the latest playback progress/resume position for a video content
    """
    try:
        user_id_int = int(user_id) if str(user_id).isdigit() else 1
    except ValueError:
        user_id_int = 1
        
    log = db.query(LearningLog).filter(
        LearningLog.user_id == user_id_int,
        LearningLog.activity_type == "video",
        LearningLog.resource_id == str(content_id)
    ).order_by(LearningLog.timestamp.desc()).first()
    
    if log:
        return {
            "progress": log.completion_percentage or 0.0,
            "completed": log.completed or False,
            "last_position": log.last_position or 0
        }
    return {
        "progress": 0.0,
        "completed": False,
        "last_position": 0
    }

@router.post("/video-progress")
def track_video_progress(progress_data: VideoProgress, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Track or update video watching progress in PostgreSQL (avoiding duplicate writes in same session)
    """
    from datetime import timedelta
    try:
        user_id_int = int(progress_data.user_id) if str(progress_data.user_id).isdigit() else 1
    except ValueError:
        user_id_int = 1
        
    # Get content details to retrieve topic_id
    content_item = db.query(Content).filter(Content.id == int(progress_data.content_id) if str(progress_data.content_id).isdigit() else Content.id == 0).first()
    topic_id = content_item.topic_id if content_item else None
    
    # Mark as completed if progress is >= 80%
    is_completed = progress_data.completed or (progress_data.progress >= 80.0)
    
    # Check if a recent log exists for this session (within 4 hours)
    four_hours_ago = datetime.utcnow() - timedelta(hours=4)
    log = db.query(LearningLog).filter(
        LearningLog.user_id == user_id_int,
        LearningLog.activity_type == "video",
        LearningLog.resource_id == str(progress_data.content_id),
        LearningLog.timestamp >= four_hours_ago
    ).order_by(LearningLog.timestamp.desc()).first()
    
    if log:
        # Update existing log
        log.duration_seconds = max(log.duration_seconds or 0, progress_data.watch_duration)
        log.watch_duration = max(log.watch_duration or 0, progress_data.watch_duration)
        log.completion_percentage = max(log.completion_percentage or 0.0, progress_data.progress)
        log.last_position = progress_data.last_position
        log.timestamp = datetime.utcnow()
        if is_completed:
            log.completed = True
        new_log = log
    else:
        # Create new log
        new_log = LearningLog(
            user_id=user_id_int,
            activity_type="video",
            resource_id=str(progress_data.content_id),
            topic_id=topic_id,
            duration_seconds=progress_data.watch_duration,
            completed=is_completed,
            started_at=datetime.utcnow(),
            ended_at=datetime.utcnow(),
            watch_duration=progress_data.watch_duration,
            completion_percentage=progress_data.progress,
            last_position=progress_data.last_position
        )
        db.add(new_log)
        
    db.commit()
    
    # If newly completed in this request, check streak updates
    if is_completed:
        from database.models.postgres_models import UserProfile
        from backend.services.gamification import GamificationService
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id_int).first()
        if profile:
            try:
                GamificationService.update_streak_on_login(db, profile)
                db.commit()
            except Exception as e:
                db.rollback()
                print("Failed to update streak:", e)
                
    return {
        "message": "Video progress tracked successfully",
        "completed": is_completed,
        "progress": new_log.completion_percentage
    }

import asyncio

@router.post("/quiz/submit")
async def submit_quiz(quiz_data: QuizAttempt, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Submit quiz attempt, store in QuizAttempt, update PerformanceRecord,
    and soon trigger ML prediction.
    """
    accuracy = (quiz_data.correct_answers / quiz_data.questions_count) * 100 if quiz_data.questions_count > 0 else 0
    
    # 1. Resolve Topic ID
    topic = db.query(Topic).filter(Topic.name.ilike(quiz_data.topic.strip())).first()
    topic_id = topic.id if topic else None

    # Handle string user_ids passed from the frontend mockup
    user_id_int = int(quiz_data.user_id) if str(quiz_data.user_id).isdigit() else 1

    # 2. Save QuizAttempt
    new_attempt = DBQuizAttempt(
        user_id=user_id_int,
        quiz_id=quiz_data.quiz_id,
        topic_id=topic_id,
        questions_count=quiz_data.questions_count,
        correct_answers=quiz_data.correct_answers,
        accuracy=accuracy,
        time_taken_seconds=quiz_data.time_taken_seconds,
        attempt_number=quiz_data.attempt_number
    )
    db.add(new_attempt)
    
    ml_prediction = None
    if topic_id:
        # 3. Update PerformanceRecord
        perf = db.query(PerformanceRecord).filter(
            PerformanceRecord.user_id == user_id_int,
            PerformanceRecord.topic_id == topic_id
        ).first()
        
        if not perf:
            perf = PerformanceRecord(
                user_id=user_id_int,
                topic_id=topic_id,
                accuracy=accuracy,
                avg_time_seconds=quiz_data.time_taken_seconds,
                total_attempts=1,
                status="pending" # ML service will update this next
            )
            db.add(perf)
        else:
            # Update running averages
            perf.accuracy = ((perf.accuracy * perf.total_attempts) + accuracy) / (perf.total_attempts + 1)
            perf.avg_time_seconds = ((perf.avg_time_seconds * perf.total_attempts) + quiz_data.time_taken_seconds) / (perf.total_attempts + 1)
            perf.total_attempts += 1
            
        db.commit()
        
        # 4. Trigger ML Service (Run in a separate thread so it doesn't block the async event loop)
        ml_prediction = await asyncio.to_thread(ml_service.predict_weakness, db, user_id_int, topic_id)
    else:
        db.commit()
        
    return {
        "message": "Quiz submitted and recorded successfully",
        "ml_prediction": ml_prediction,
        "accuracy": accuracy,
        "score": quiz_data.correct_answers,
        "total": quiz_data.questions_count,
        "time_taken": quiz_data.time_taken_seconds,
        "performance_category": "good" if accuracy >= 70 else "needs_improvement",
        "recorded_in_db": True
    }

@router.get("/history/{user_id}")
def get_learning_history(user_id: str, limit: int = 50, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Get user's learning activity history from PostgreSQL LearningLogs and QuizAttempts
    """
    try:
        uid = int(user_id)
    except ValueError:
        uid = 1
        
    logs = db.query(LearningLog).filter(LearningLog.user_id == uid).order_by(LearningLog.timestamp.desc()).limit(limit).all()
    
    activities = []
    for log in logs:
        topic_name = "Unknown"
        if log.topic_id:
            topic = db.query(Topic).filter(Topic.id == log.topic_id).first()
            if topic:
                topic_name = topic.name
                
        activities.append({
            "type": log.activity_type,
            "topic": topic_name,
            "timestamp": log.timestamp.isoformat(),
            "completed": log.completed
        })
        
    return {
        "user_id": str(uid),
        "activities": activities,
        "total_count": len(activities)
    }

@router.get("/next-steps/{user_id}", response_model=List[NextStep])
def get_next_steps(user_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Suggest next steps using live ML Recommendation Engine
    """
    from ml.services.recommendation import recommendation_service
    
    try:
        uid = int(user_id)
    except ValueError:
        uid = 1
        
    # Get live recommendations from our PostgreSQL + Knowledge Graph engine
    recommendations = recommendation_service.get_recommendations(db, uid)
    
    next_steps = []
    for rec in recommendations:
        content_obj = rec["content"]
        topic_name = content_obj.topic.name if content_obj.topic else "Unknown"
        next_steps.append(
            NextStep(
                topic=topic_name,
                rationale=rec["reason"],
                confidence=rec["match_score"] / 100.0,
                prerequisites_met=True,
                recommended_resources=[content_obj.title],
                estimated_time_minutes=content_obj.duration_minutes or 15,
                path=[]
            )
        )
        
    return next_steps

@router.get("/knowledge-graph")
def get_knowledge_graph(current_user = Depends(get_current_user)):
    """
    Exposes the Knowledge Graph hierarchy (nodes and directed edges)
    representing topic prerequisites and syllabus dependencies.
    """
    from ml.services.knowledge_graph import knowledge_graph
    from backend.utils.response_formatter import success_response
    nodes = list(knowledge_graph.graph.nodes)
    edges = [{"source": u, "target": v} for u, v in knowledge_graph.graph.edges]
    return success_response(data={"nodes": nodes, "edges": edges})

from database.models.postgres_models import Bookmark, Note

class BookmarkCreate(BaseModel):
    user_id: str
    content_id: str
    timestamp: float
    note: Optional[str] = ""

@router.post("/bookmarks")
async def add_bookmark(bookmark: BookmarkCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Save a new video bookmark or timestamp revision note in PostgreSQL."""
    uid = int(bookmark.user_id) if str(bookmark.user_id).isdigit() else 1
    cid = int(bookmark.content_id) if str(bookmark.content_id).isdigit() else 1
    
    new_doc = Bookmark(
        user_id=uid,
        content_id=cid,
        timestamp=bookmark.timestamp,
        note=bookmark.note
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    return {"message": "Bookmark created successfully", "bookmark": {"id": new_doc.id, "timestamp": new_doc.timestamp, "note": new_doc.note}}

@router.get("/bookmarks/{user_id}/{content_id}")
async def get_bookmarks(user_id: str, content_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get all bookmarks/timestamp markers for a user and content ID from PostgreSQL."""
    uid = int(user_id) if str(user_id).isdigit() else 1
    cid = int(content_id) if str(content_id).isdigit() else 1
    
    db_bookmarks = db.query(Bookmark).filter(Bookmark.user_id == uid, Bookmark.content_id == cid).order_by(Bookmark.timestamp.asc()).all()
    
    bookmarks = []
    for b in db_bookmarks:
        bookmarks.append({
            "id": b.id,
            "timestamp": b.timestamp,
            "note": b.note,
            "created_at": b.created_at.isoformat() if b.created_at else None
        })
    return {"bookmarks": bookmarks}

@router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Delete a bookmark/timestamp note by its PostgreSQL ID."""
    try:
        bid = int(bookmark_id)
        res = db.query(Bookmark).filter(Bookmark.id == bid).delete()
        db.commit()
        if res > 0:
            return {"message": "Bookmark deleted successfully"}
        return {"message": "Bookmark not found", "error": True}
    except Exception as e:
        return {"message": f"Failed to delete bookmark: {str(e)}", "error": True}

class NoteCreate(BaseModel):
    title: str
    note_text: str
    course_id: Optional[int] = None
    subject_id: Optional[int] = None
    topic_id: Optional[int] = None
    content_id: Optional[int] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    note_text: Optional[str] = None

@router.post("/notes")
async def create_note(note: NoteCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Create a new note in PostgreSQL."""
    new_note = Note(
        user_id=current_user.id,
        title=note.title,
        note_text=note.note_text,
        course_id=note.course_id,
        subject_id=note.subject_id,
        topic_id=note.topic_id,
        content_id=note.content_id
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return success_response(data={"note_id": new_note.id}, message="Note created successfully")

@router.get("/notes")
async def get_notes(
    course_id: Optional[int] = None, 
    subject_id: Optional[int] = None, 
    topic_id: Optional[int] = None, 
    content_id: Optional[int] = None,
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """Retrieve notes for the current user, optionally filtered by course, subject, topic, or content."""
    query = db.query(Note).filter(Note.user_id == current_user.id)
    if course_id:
        query = query.filter(Note.course_id == course_id)
    if subject_id:
        query = query.filter(Note.subject_id == subject_id)
    if topic_id:
        query = query.filter(Note.topic_id == topic_id)
    if content_id:
        query = query.filter(Note.content_id == content_id)
        
    notes = query.order_by(Note.updated_at.desc()).all()
    
    result = []
    for n in notes:
        result.append({
            "id": n.id,
            "title": n.title,
            "note_text": n.note_text,
            "course_id": n.course_id,
            "subject_id": n.subject_id,
            "topic_id": n.topic_id,
            "content_id": n.content_id,
            "updated_at": n.updated_at.isoformat() if n.updated_at else None
        })
    return success_response(data={"notes": result})

@router.put("/notes/{note_id}")
async def update_note(note_id: int, note_update: NoteUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Update an existing note."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        return error_response("Note not found or unauthorized", "Not Found")
        
    if note_update.title is not None:
        note.title = note_update.title
    if note_update.note_text is not None:
        note.note_text = note_update.note_text
        
    db.commit()
    return success_response(message="Note updated successfully")

@router.delete("/notes/{note_id}")
async def delete_note(note_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Delete a note."""
    res = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).delete()
    db.commit()
    if res > 0:
        return success_response(message="Note deleted successfully")
    return error_response("Note not found or unauthorized", "Not Found")

@router.get("/next-steps/{user_id}")
def get_next_steps(user_id: int, db: Session = Depends(get_db)):
    """Generate 3 intelligent actionable next steps based on user's weak topics."""
    try:
        from ml.services.ml_service import ml_service
        from ml.services.knowledge_graph import knowledge_graph
        
        # Get overall prediction to find weak topics
        pred = ml_service.predict_overall_performance(db, user_id)
        
        weak_topics = []
        if pred and pred.get("topic_details"):
            for t in pred["topic_details"]:
                if t.get("mastery") == "Weak":
                    weak_topics.append(t["topic"])
                    
        # Fallback to general topics if no weak topics found
        if not weak_topics:
            weak_topics = ["Arrays", "Linked Lists", "Trees"]
            
        target_topic = weak_topics[0]
        prereqs = knowledge_graph.get_prerequisites(target_topic)
        prereq_str = " -> ".join(prereqs[:2]) if prereqs else "Fundamentals"
        
        steps = [
            {
                "topic": target_topic,
                "action": "Watch Video",
                "title": f"Review {target_topic} Concepts",
                "rationale": f"Your mastery in {target_topic} is currently weak.",
                "estimated_time_minutes": 15
            },
            {
                "topic": target_topic,
                "action": "Take Quiz",
                "title": f"Practice {target_topic}",
                "rationale": "Test your knowledge after reviewing the video.",
                "estimated_time_minutes": 10
            },
            {
                "topic": prereqs[0] if prereqs else "Fundamentals",
                "action": "Review Prerequisite",
                "title": f"Brush up on {prereq_str}",
                "rationale": f"Understanding this is required for {target_topic}.",
                "estimated_time_minutes": 20
            }
        ]
        
        return success_response(data=steps, message="Next steps generated successfully")
    except Exception as e:
        return error_response(str(e), "Failed to generate next steps")

@router.get("/topic/{topic_name}/prerequisites")
def get_topic_prerequisites(topic_name: str):
    """Get prerequisites for a topic from the Knowledge Graph."""
    try:
        from ml.services.knowledge_graph import knowledge_graph
        prereqs = knowledge_graph.get_prerequisites(topic_name)
        return success_response(data={"prerequisites": prereqs}, message="Prerequisites fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch prerequisites")
