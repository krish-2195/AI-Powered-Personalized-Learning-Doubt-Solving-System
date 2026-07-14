import os
import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta

from database.connection import get_db
from database.models.postgres_models import User, UserProfile, Topic, QuestionBank, Content, QuizAttempt, PredictionHistory, Recommendation, ExamReadiness
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
        for v in videos:
            topic_name = v.topic.name if v.topic else "Uncategorized"
            data.append({
                "id": v.id,
                "title": v.title,
                "topic": topic_name,
                "difficulty": v.difficulty,
                "duration": v.duration_minutes or 0
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
        for a in materials:
            topic_name = a.topic.name if a.topic else "Uncategorized"
            data.append({
                "id": a.id,
                "title": a.title,
                "topic": topic_name,
                "difficulty": a.difficulty,
                "duration": a.duration_minutes or 0
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

class SystemSettingsRequest(BaseModel):
    maintenance_mode: bool
    openai_api_key: str
    gemini_api_key: str
    ai_tutor_strictness: str  # e.g., "lenient", "strict"

# In a real app, this should be in the DB. We mock it for the demo.
_SYSTEM_SETTINGS = {
    "maintenance_mode": False,
    "openai_api_key": "sk-... (hidden)",
    "gemini_api_key": "AIza... (hidden)",
    "ai_tutor_strictness": "standard"
}

@router.get("/settings")
def get_system_settings(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Only super_admin can get system settings."""
    user = _get_user_from_token(token, db)
    if not user or user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin privileges required")
    
    return success_response(data=_SYSTEM_SETTINGS)

@router.patch("/settings")
def update_system_settings(payload: SystemSettingsRequest, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Only super_admin can update system settings."""
    user = _get_user_from_token(token, db)
    if not user or user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin privileges required")
    
    _SYSTEM_SETTINGS["maintenance_mode"] = payload.maintenance_mode
    # Update keys only if they are not the placeholder strings
    if payload.openai_api_key and not payload.openai_api_key.endswith("(hidden)"):
        _SYSTEM_SETTINGS["openai_api_key"] = payload.openai_api_key
    if payload.gemini_api_key and not payload.gemini_api_key.endswith("(hidden)"):
        _SYSTEM_SETTINGS["gemini_api_key"] = payload.gemini_api_key
    _SYSTEM_SETTINGS["ai_tutor_strictness"] = payload.ai_tutor_strictness

    return success_response(message="System settings updated successfully", data=_SYSTEM_SETTINGS)
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

