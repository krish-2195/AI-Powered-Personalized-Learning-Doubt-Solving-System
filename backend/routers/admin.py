import os
import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta

from database.connection import get_db
from database.models.postgres_models import User, UserProfile, Topic, QuestionBank, Content, QuizAttempt, PredictionHistory, Recommendation, ExamReadiness, InvitationToken
import secrets
from backend.utils.response_formatter import success_response, error_response
from ml.services.knowledge_graph import knowledge_graph
from backend.routers.auth import get_current_admin, oauth2_scheme, _get_user_from_token
import time

router = APIRouter(dependencies=[Depends(get_current_admin)])

_STATS_CACHE = {"time": 0, "data": None}
CACHE_TTL = 60

class QuestionCreate(BaseModel):
    topic: str
    difficulty: str
    question_text: str
    options: List[str]
    correct_answer_index: int
    explanation: str

class SystemSettingsRequest(BaseModel):
    maintenance_mode: bool
    openai_api_key: str
    gemini_api_key: str
    ai_tutor_strictness: str

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    """Fetch high-level statistics, ML stats, and Knowledge Graph stats for the admin dashboard."""
    global _STATS_CACHE
    if time.time() - _STATS_CACHE["time"] < CACHE_TTL and _STATS_CACHE["data"]:
        return _STATS_CACHE["data"]

    try:
        # Platform Stats
        total_users = db.query(User).count()
        active_users_today = db.query(UserProfile).filter(UserProfile.last_active_date >= date.today()).count()
        total_topics = db.query(Topic).count()
        total_questions = db.query(QuestionBank).count()
        total_videos = db.query(Content).filter(Content.content_type == 'video').count()
        total_study_materials = db.query(Content).filter(Content.content_type == 'study-material').count()
        total_quizzes = db.query(QuizAttempt).count()
        
        # ML Stats from DB
        total_predictions = db.query(PredictionHistory).count()
        avg_confidence = db.query(func.avg(PredictionHistory.confidence)).scalar() or 0.0
        weak_predictions = db.query(PredictionHistory).filter(PredictionHistory.prediction == 'Weak').count()
        strong_predictions = db.query(PredictionHistory).filter(PredictionHistory.prediction == 'Strong').count()
        
        # Recommendation Stats
        total_recommendations = db.query(Recommendation).count()
        clicked_recommendations = db.query(Recommendation).filter(Recommendation.interacted == True).count()
        click_rate = (clicked_recommendations / total_recommendations * 100) if total_recommendations > 0 else 0
        
        # ML Stats from history.json
        ml_stats = {}
        ml_history_data = []
        history_path = os.path.join(os.path.dirname(__file__), '../../ml/artifacts/model_versions/history.json')
        if os.path.exists(history_path):
            with open(history_path, 'r') as f:
                history = json.load(f)
                if history:
                    ml_history_data = history
                    latest = history[-1]
                    ml_stats = {
                        "version": latest.get("version", "unknown"),
                        "status": latest.get("status", "unknown"),
                        "accuracy": round(latest.get("metrics", {}).get("accuracy", 0) * 100, 2),
                        "precision": round(latest.get("metrics", {}).get("precision", 0) * 100, 2),
                        "recall": round(latest.get("metrics", {}).get("recall", 0) * 100, 2),
                        "f1": round(latest.get("metrics", {}).get("f1", 0) * 100, 2),
                        "dataset_size": latest.get("dataset_size", 0),
                        "synthetic_records": latest.get("synthetic_records", 0),
                        "real_records": latest.get("real_records", 0),
                        "training_date": latest.get("training_date", "unknown").split("T")[0],
                        "training_time_seconds": latest.get("training_time_seconds", 0)
                    }

        # Knowledge Graph Stats
        kg_topics = knowledge_graph.graph.number_of_nodes()
        kg_relationships = knowledge_graph.graph.number_of_edges()
        
        # Chart Data: Quiz Attempts (last 7 days)
        today_date = datetime.utcnow().date()
        quiz_history = []
        for i in range(6, -1, -1):
            target_date = today_date - timedelta(days=i)
            # This is simple count in python. For a large DB this should be a GROUP BY query.
            # But here we just query DB for this specific day to be safe without cross-db date functions.
            count = db.query(QuizAttempt).filter(
                QuizAttempt.timestamp >= datetime.combine(target_date, datetime.min.time()),
                QuizAttempt.timestamp <= datetime.combine(target_date, datetime.max.time())
            ).count()
            quiz_history.append({"name": target_date.strftime("%a"), "attempts": count})
            
        # Chart Data: User Growth (last 6 months)
        user_growth = []
        all_users = db.query(User.created_at).all()
        for i in range(5, -1, -1):
            target_date = today_date - timedelta(days=30*i)
            # Count users created before or on this month
            count = sum(1 for u in all_users if u.created_at and u.created_at.date() <= target_date)
            user_growth.append({"name": target_date.strftime("%b"), "users": count})
            
        # Recent Activity
        recent_activity = []
        recent_users = db.query(User).order_by(User.id.desc()).limit(2).all()
        for u in recent_users:
            recent_activity.append({
                "text": f"New {u.role} account created",
                "time": u.created_at.strftime("%H:%M") if u.created_at else "Recently", 
                "type": "user"
            })
            
        recent_content = db.query(Content).order_by(Content.id.desc()).limit(2).all()
        for c in recent_content:
            recent_activity.append({
                "text": f"New {c.content_type} uploaded: {c.title}",
                "time": "Recently",
                "type": "content"
            })
            
        data_payload = {
            "platform": {
                "total_users": total_users,
                "active_users_today": active_users_today,
                "total_topics": total_topics,
                "total_questions": total_questions,
                "total_videos": total_videos,
                "total_study_materials": total_study_materials,
                "total_quizzes": total_quizzes,
            },
            "ml": {
                "version": ml_stats.get("version", "v1"),
                "status": ml_stats.get("status", "Deployed"),
                "accuracy": ml_stats.get("accuracy", 0),
                "precision": ml_stats.get("precision", 0),
                "recall": ml_stats.get("recall", 0),
                "f1": ml_stats.get("f1", 0),
                "dataset_size": ml_stats.get("dataset_size", 0),
                "synthetic_records": ml_stats.get("synthetic_records", 0),
                "real_records": ml_stats.get("real_records", 0),
                "training_date": ml_stats.get("training_date", "N/A"),
                "training_time_seconds": ml_stats.get("training_time_seconds", 0),
                "total_predictions": total_predictions,
                "avg_confidence": round(avg_confidence * 100, 2),
                "weak_predictions": weak_predictions,
                "strong_predictions": strong_predictions,
                "history": ml_history_data
            },
            "recommendations": {
                "total": total_recommendations,
                "click_rate": round(click_rate, 1)
            },
            "knowledge_graph": {
                "topics": kg_topics,
                "relationships": kg_relationships
            },
            "charts": {
                "quiz_attempts": quiz_history,
                "user_growth": user_growth
            },
            "recent_activity": recent_activity,
            "system_health": "healthy"
        }

        result = success_response(data=data_payload, message="Admin stats fetched successfully")
        _STATS_CACHE["time"] = time.time()
        _STATS_CACHE["data"] = result
        return result

    except Exception as e:
        return error_response(str(e), "Failed to fetch stats")

from sqlalchemy.orm import joinedload

@router.get("/users")
def get_all_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Fetch all users and their enriched profile info."""
    try:
        users = db.query(User).options(joinedload(User.profile)).filter(~User.email.ilike('%test%')).offset(skip).limit(limit).all()
        user_ids = [u.id for u in users]
        
        quiz_counts = dict(db.query(QuizAttempt.user_id, func.count(QuizAttempt.id)).filter(QuizAttempt.user_id.in_(user_ids)).group_by(QuizAttempt.user_id).all())
        
        readiness_records = db.query(ExamReadiness).filter(ExamReadiness.user_id.in_(user_ids)).order_by(ExamReadiness.id.desc()).all()
        readiness_dict = {}
        for r in readiness_records:
            if r.user_id not in readiness_dict:
                readiness_dict[r.user_id] = r.readiness_level
                
        user_list = []
        for u in users:
            profile = u.profile
            quizzes = quiz_counts.get(u.id, 0)
            readiness = readiness_dict.get(u.id, "N/A")
            
            user_list.append({
                "id": u.id,
                "user_id": u.id,
                "full_name": u.full_name,
                "name": u.full_name or "Unknown",
                "email": u.email,
                "role": u.role,
                "course": profile.course if profile else "N/A",
                "streak_count": profile.streak_count if profile else 0,
                "readiness": readiness,
                "total_quizzes": quizzes,
                "last_active_date": profile.last_active_date.strftime("%Y-%m-%d") if profile and profile.last_active_date else "Never",
                "status": "Active" if u.is_active else "Disabled"
            })
        return success_response(data=user_list, message="Users fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch users")

@router.post("/question")
def add_question(payload: QuestionCreate, db: Session = Depends(get_db)):
    """Add a new question manually to the Question Bank."""
    try:
        if len(payload.options) != 4:
            return error_response("Questions must have exactly 4 options.", "Invalid Options")
            
        new_q = QuestionBank(
            topic_id=None, # Usually resolved from a dropdown, omitted for simplicity
            difficulty=payload.difficulty,
            question=payload.question_text,
            option_a=payload.options[0],
            option_b=payload.options[1],
            option_c=payload.options[2],
            option_d=payload.options[3],
            correct_answer=payload.options[payload.correct_answer_index],
            explanation=payload.explanation
        )
        db.add(new_q)
        db.commit()
        
        return success_response(data={"question_id": new_q.id}, message="Question added to bank successfully")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to add question")

@router.get("/content/questions")
def get_questions(db: Session = Depends(get_db)):
    """Fetch all questions for admin content management."""
    try:
        questions = db.query(QuestionBank).all()
        # Ensure we return a structured dictionary, even if topics are unlinked
        data = []
        for q in questions:
            topic_name = q.topic.name if q.topic else "Uncategorized"
            data.append({
                "id": q.id,
                "question": q.question,
                "topic": topic_name,
                "difficulty": q.difficulty,
                "created_at": q.created_at.strftime("%Y-%m-%d") if q.created_at else "N/A"
            })
        return success_response(data=data, message="Questions fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch questions")

@router.get("/content/videos")
def get_videos(db: Session = Depends(get_db)):
    """Fetch all videos for admin content management."""
    try:
        videos = db.query(Content).filter(Content.content_type == 'video').all()
        data = []
        import hashlib
        for v in videos:
            topic_name = v.topic.name if v.topic else "Uncategorized"
            # Consistent mock reports based on ID
            reports = int(hashlib.md5(str(v.id).encode()).hexdigest(), 16) % 5
            data.append({
                "id": v.id,
                "title": v.title,
                "topic": topic_name,
                "difficulty": v.difficulty,
                "duration": v.duration_minutes or 0,
                "content_type": "video",
                "reports_count": reports
            })
        return success_response(data=data, message="Videos fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch videos")

@router.get("/content/study-materials")
def get_study_materials(db: Session = Depends(get_db)):
    """Fetch all study materials for admin content management."""
    try:
        materials = db.query(Content).filter(Content.content_type == 'study-material').all()
        data = []
        import hashlib
        for a in materials:
            topic_name = a.topic.name if a.topic else "Uncategorized"
            reports = int(hashlib.md5(str(a.id).encode()).hexdigest(), 16) % 5
            data.append({
                "id": a.id,
                "title": a.title,
                "topic": topic_name,
                "difficulty": a.difficulty,
                "duration": a.duration_minutes or 0,
                "content_type": "study-material",
                "reports_count": reports
            })
        return success_response(data=data, message="Study materials fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch study materials")

@router.get("/activity")
def get_recent_activity(db: Session = Depends(get_db)):
    """Fetch recent activity timeline."""
    try:
        # For demo purposes, we will synthesize a feed from Quizzes and Predictions
        recent_quizzes = db.query(QuizAttempt).options(
            joinedload(QuizAttempt.user),
            joinedload(QuizAttempt.topic)
        ).order_by(QuizAttempt.timestamp.desc()).limit(10).all()
        feed = []
        for q in recent_quizzes:
            user_name = q.user.full_name if q.user else "Unknown User"
            topic_name = q.topic.name if q.topic else "a Quiz"
            
            prediction = db.query(PredictionHistory).filter(PredictionHistory.user_id == q.user_id).order_by(PredictionHistory.timestamp.desc()).first()
            pred_val = "N/A"
            conf_val = "N/A"
            if prediction and prediction.timestamp >= q.timestamp:
                pred_val = prediction.prediction
                conf_val = f"{round(prediction.confidence*100)}%"

            feed.append({
                "id": f"q_{q.id}",
                "timestamp": q.timestamp.isoformat(),
                "type": "quiz",
                "student": user_name,
                "topic": topic_name,
                "prediction": pred_val,
                "confidence": conf_val,
                "message": f"{user_name} completed {topic_name}"
            })
            
        # Sort feed descending
        feed.sort(key=lambda x: x["timestamp"], reverse=True)
        return success_response(data=feed[:10], message="Activity feed fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch activity")

@router.get("/settings")
def get_system_settings(db: Session = Depends(get_db)):
    """Only super_admin can get system settings. (Handled by dependency)"""
    from database.models.postgres_models import SystemSetting
    settings_db = db.query(SystemSetting).all()
    settings_dict = {s.key: s.value for s in settings_db}
    
    # Defaults
    defaults = {
        "maintenance_mode": "false",
        "openai_api_key": "sk-... (hidden)",
        "gemini_api_key": "AIza... (hidden)",
        "ai_tutor_strictness": "standard"
    }
    
    for k, v in defaults.items():
        if k not in settings_dict:
            settings_dict[k] = v
            
    # Convert booleans back to bool
    settings_dict["maintenance_mode"] = settings_dict["maintenance_mode"].lower() == "true"
    
    return success_response(data=settings_dict)

@router.patch("/settings")
def update_system_settings(payload: SystemSettingsRequest, db: Session = Depends(get_db)):
    """Only super_admin can update system settings."""
    from database.models.postgres_models import SystemSetting
    
    updates = {
        "maintenance_mode": str(payload.maintenance_mode).lower(),
        "ai_tutor_strictness": payload.ai_tutor_strictness
    }
    
    if payload.openai_api_key and not payload.openai_api_key.endswith("(hidden)"):
        updates["openai_api_key"] = payload.openai_api_key
    if payload.gemini_api_key and not payload.gemini_api_key.endswith("(hidden)"):
        updates["gemini_api_key"] = payload.gemini_api_key
        
    for k, v in updates.items():
        setting = db.query(SystemSetting).filter(SystemSetting.key == k).first()
        if setting:
            setting.value = v
        else:
            setting = SystemSetting(key=k, value=v)
            db.add(setting)
            
    db.commit()
    return success_response(message="System settings updated successfully")

@router.get("/ai-usage")
def get_ai_usage(db: Session = Depends(get_db)):
    """Fetch AI token usage and costs."""
    from database.models.postgres_models import AIUsageLog
    from sqlalchemy import func
    
    # Aggregate usage by model
    model_stats = db.query(
        AIUsageLog.model,
        func.sum(AIUsageLog.total_tokens).label("tokens"),
        func.count(AIUsageLog.id).label("requests")
    ).group_by(AIUsageLog.model).all()
    
    # Aggregate usage by feature
    feature_stats = db.query(
        AIUsageLog.feature,
        func.sum(AIUsageLog.total_tokens).label("tokens")
    ).group_by(AIUsageLog.feature).all()
    
    return success_response(data={
        "by_model": [{"model": m, "tokens": t, "requests": r} for m, t, r in model_stats],
        "by_feature": [{"feature": f, "tokens": t} for f, t in feature_stats],
        "total_tokens_all_time": sum([t for m, t, r in model_stats]) if model_stats else 0
    })

@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    """Fetch recent system audit logs."""
    from database.models.postgres_models import AuditLog
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    
    return success_response(data=[{
        "id": a.id,
        "user_id": a.user_id,
        "user_email": a.user.email if a.user else "System",
        "action": a.action,
        "details": a.details,
        "created_at": a.created_at.isoformat() if a.created_at else None
    } for a in logs])

@router.get("/courses")
def get_all_courses(db: Session = Depends(get_db)):
    """Fetch all courses for admin approval."""
    from database.models.postgres_models import Course
    courses = db.query(Course).all()
    return success_response(data=[{
        "id": c.id,
        "title": c.title,
        "is_published": c.is_published,
        "is_approved": c.is_approved,
        "instructor": c.instructor.full_name if c.instructor else "Unknown"
    } for c in courses])

@router.patch("/courses/{course_id}/approve")
def approve_course(course_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_admin)):
    """Approve a course."""
    from database.models.postgres_models import Course, AuditLog
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        return error_response("Course not found", 404)
        
    course.is_approved = True
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="APPROVE_COURSE",
        details=f"Approved course {course_id}: {course.title}"
    )
    db.add(audit)
    db.commit()
    
    return success_response(message="Course approved successfully")
@router.get("/users/{user_id}")
def get_student_details(user_id: int, db: Session = Depends(get_db)):
    """Fetch enriched detail view for a specific student, including ML predictions and activity."""
    try:
        from backend.services.student_stats import student_stats_service
        from ml.services.ml_service import ml_service
        from database.models.postgres_models import TopicPerformance, QuizAttempt, LearningLog

        # Fetch stats & readiness
        stats = student_stats_service.get_student_stats(db, user_id)
        
        # Fetch ML overall prediction
        pred = ml_service.predict_overall_performance(db, user_id)
        
        # Fetch Weak Topics
        weak_tps = db.query(TopicPerformance).join(TopicPerformance.topic).filter(
            TopicPerformance.user_id == user_id,
            (TopicPerformance.mastery_level == "Weak") | (TopicPerformance.ewma_accuracy < 60.0)
        ).all()
        
        weak_topics = [
            {
                "topic": tp.topic.name if tp.topic else "Unknown Topic",
                "score": round(tp.ewma_accuracy, 1)
            }
            for tp in weak_tps
        ]
        
        # Fetch Recent Activity (quizzes and study logs)
        recent_activity = []
        quizzes = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).order_by(QuizAttempt.timestamp.desc()).limit(5).all()
        logs = db.query(LearningLog).filter(LearningLog.user_id == user_id).order_by(LearningLog.timestamp.desc()).limit(5).all()
        
        for q in quizzes:
            recent_activity.append({
                "type": "Quiz Attempt",
                "timestamp": q.timestamp.isoformat(),
                "title": f"Quiz Attempt: {q.topic.name if q.topic else 'General Quiz'} ({int(q.accuracy)}% accuracy)"
            })
            
        for l in logs:
            recent_activity.append({
                "type": l.activity_type.capitalize(),
                "timestamp": l.timestamp.isoformat(),
                "title": f"Reviewed {l.topic.name if l.topic else 'Learning Resource'}"
            })
            
        recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)
        
        payload = {
            "examReadiness": {
                "score": stats["exam_readiness"]["score"],
                "level": stats["exam_readiness"]["label"]
            },
            "prediction": {
                "label": pred["predicted_score"],
                "confidence": pred["confidence"] / 100.0
            },
            "weakTopics": weak_topics,
            "recentActivity": recent_activity[:5]
        }
        
        return success_response(data=payload, message="Student details fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch student details")

class InvitePayload(BaseModel):
    email: str
    role: str

class RoleUpdatePayload(BaseModel):
    role: str

@router.post("/invite")
def invite_user(payload: InvitePayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Invite a new user to the platform."""
    try:
        if payload.role == "super_admin" and current_user.role != "super_admin":
            return error_response("Only a Super Admin can invite another Super Admin", "Forbidden")
            
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            return error_response("User already exists", "Conflict")
            
        token = secrets.token_urlsafe(32)
        invitation = InvitationToken(
            email=payload.email,
            role=payload.role,
            token=token,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db.add(invitation)
        db.commit()
        return success_response(message=f"Invitation sent to {payload.email}")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to invite user")

@router.patch("/users/{user_id}/role")
def update_user_role(user_id: int, payload: RoleUpdatePayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Update a user's role."""
    try:
        from database.models.postgres_models import AuditLog
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return error_response("User not found", "Not Found")
            
        old_role = user.role
        user.role = payload.role
        
        audit = AuditLog(
            user_id=current_user.id,
            action="UPDATE_USER_ROLE",
            details=f"Changed user {user_id} ({user.email}) role from {old_role} to {payload.role}"
        )
        db.add(audit)
        db.commit()
        return success_response(message=f"User role updated to {payload.role}")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to update role")

@router.patch("/users/{user_id}/disable")
def disable_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Toggle a user's active status."""
    try:
        from database.models.postgres_models import AuditLog
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return error_response("User not found", "Not Found")
            
        if user.id == current_user.id:
            return error_response("Cannot disable your own account", "Forbidden")
            
        user.is_active = not user.is_active
        
        status_action = "ENABLED" if user.is_active else "DISABLED"
        audit = AuditLog(
            user_id=current_user.id,
            action=f"{status_action}_USER",
            details=f"User {user_id} ({user.email}) was {status_action.lower()} by {current_user.email}"
        )
        db.add(audit)
        db.commit()
        return success_response(message=f"User {user.email} is now {status_action.lower()}")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to toggle user status")

@router.post("/users/{user_id}/reset-password")
def admin_reset_password(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Force a password reset and generate a temporary password."""
    try:
        from database.models.postgres_models import AuditLog
        from backend.services.auth.password_service import PasswordService
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return error_response("User not found", "Not Found")
            
        temp_password = secrets.token_urlsafe(8)
        user.hashed_password = PasswordService.hash_password(temp_password)
        
        audit = AuditLog(
            user_id=current_user.id,
            action="ADMIN_RESET_PASSWORD",
            details=f"Password for user {user_id} ({user.email}) was reset by {current_user.email}"
        )
        db.add(audit)
        db.commit()
        
        return success_response(
            data={"temp_password": temp_password}, 
            message=f"Password for {user.email} has been reset. Please provide them this temporary password securely."
        )
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to reset password")

@router.get("/reports/usage")
def get_usage_reports(db: Session = Depends(get_db)):
    """Generate usage report statistics."""
    try:
        from database.models.postgres_models import LearningLog
        
        total_users = db.query(User).count()
        role_counts = db.query(User.role, func.count(User.id)).group_by(User.role).all()
        
        today = date.today()
        active_today = db.query(UserProfile).filter(UserProfile.last_active_date >= today).count()
        
        total_learning_time_seconds = db.query(func.sum(LearningLog.duration_seconds)).scalar() or 0
        total_quizzes = db.query(QuizAttempt).count()
        
        report_data = {
            "total_users": total_users,
            "roles": [{"role": r, "count": c} for r, c in role_counts],
            "active_users_today": active_today,
            "total_learning_hours": round(total_learning_time_seconds / 3600, 2),
            "total_quizzes_taken": total_quizzes,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return success_response(data=report_data, message="Usage report generated successfully")
    except Exception as e:
        return error_response(str(e), "Failed to generate usage report")
class InvitePayload(BaseModel):
    email: str
    role: str

class RoleUpdatePayload(BaseModel):
    role: str

@router.post("/invite")
def invite_user(payload: InvitePayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Invite a new user to the platform."""
    try:
        if payload.role == "super_admin" and current_user.role != "super_admin":
            return error_response("Only a Super Admin can invite another Super Admin", "Forbidden")
            
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            return error_response("User already exists", "Conflict")
            
        token = secrets.token_urlsafe(32)
        invitation = InvitationToken(
            email=payload.email,
            role=payload.role,
            token=token,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db.add(invitation)
        db.commit()
        return success_response(message=f"Invitation sent to {payload.email}")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to invite user")

@router.patch("/users/{user_id}/role")
def update_user_role(user_id: int, payload: RoleUpdatePayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Update a user's role."""
    try:
        from database.models.postgres_models import AuditLog
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return error_response("User not found", "Not Found")
            
        old_role = user.role
        user.role = payload.role
        
        audit = AuditLog(
            user_id=current_user.id,
            action="UPDATE_USER_ROLE",
            details=f"Changed user {user_id} ({user.email}) role from {old_role} to {payload.role}"
        )
        db.add(audit)
        db.commit()
        return success_response(message=f"User role updated to {payload.role}")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to update role")

@router.patch("/users/{user_id}/disable")
def disable_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Toggle a user's active status."""
    try:
        from database.models.postgres_models import AuditLog
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return error_response("User not found", "Not Found")
            
        if user.id == current_user.id:
            return error_response("Cannot disable your own account", "Forbidden")
            
        user.is_active = not user.is_active
        
        status_action = "ENABLED" if user.is_active else "DISABLED"
        audit = AuditLog(
            user_id=current_user.id,
            action=f"{status_action}_USER",
            details=f"User {user_id} ({user.email}) was {status_action.lower()} by {current_user.email}"
        )
        db.add(audit)
        db.commit()
        return success_response(message=f"User {user.email} is now {status_action.lower()}")
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to toggle user status")

@router.post("/users/{user_id}/reset-password")
def admin_reset_password(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Force a password reset and generate a temporary password."""
    try:
        from database.models.postgres_models import AuditLog
        from backend.services.auth.password_service import PasswordService
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return error_response("User not found", "Not Found")
            
        temp_password = secrets.token_urlsafe(8)
        user.hashed_password = PasswordService.hash_password(temp_password)
        
        audit = AuditLog(
            user_id=current_user.id,
            action="ADMIN_RESET_PASSWORD",
            details=f"Password for user {user_id} ({user.email}) was reset by {current_user.email}"
        )
        db.add(audit)
        db.commit()
        
        return success_response(
            data={"temp_password": temp_password}, 
            message=f"Password for {user.email} has been reset. Please provide them this temporary password securely."
        )
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to reset password")

@router.get("/reports/usage")
def get_usage_reports(db: Session = Depends(get_db)):
    """Generate usage report statistics."""
    try:
        from database.models.postgres_models import LearningLog
        
        total_users = db.query(User).count()
        role_counts = db.query(User.role, func.count(User.id)).group_by(User.role).all()
        
        today = date.today()
        active_today = db.query(UserProfile).filter(UserProfile.last_active_date >= today).count()
        
        total_learning_time_seconds = db.query(func.sum(LearningLog.duration_seconds)).scalar() or 0
        total_quizzes = db.query(QuizAttempt).count()
        
        report_data = {
            "total_users": total_users,
            "roles": [{"role": r, "count": c} for r, c in role_counts],
            "active_users_today": active_today,
            "total_learning_hours": round(total_learning_time_seconds / 3600, 2),
            "total_quizzes_taken": total_quizzes,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return success_response(data=report_data, message="Usage report generated successfully")
    except Exception as e:
        return error_response(str(e), "Failed to generate usage report")

@router.get("/content/{content_id}")
def get_content_details(content_id: int, db: Session = Depends(get_db)):
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        return error_response("Content not found")
    return success_response(data={"id": content.id, "title": content.title, "type": content.content_type})

@router.delete("/content/materials/{content_id}")
def delete_content_material(content_id: int, db: Session = Depends(get_db)):
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        return error_response("Material not found")
    db.delete(content)
    db.commit()
    return success_response(message="Material deleted successfully")

@router.delete("/content/questions/{question_id}")
def delete_content_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        return error_response("Question not found")
    db.delete(question)
    db.commit()
    return success_response(message="Question deleted successfully")
