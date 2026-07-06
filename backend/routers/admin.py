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
from backend.routers.auth import get_current_admin

router = APIRouter(dependencies=[Depends(get_current_admin)])

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
            
        return success_response(data={
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
        }, message="Admin stats fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch stats")

from sqlalchemy.orm import joinedload

@router.get("/users")
def get_all_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Fetch all users and their enriched profile info."""
    try:
        users = db.query(User).options(joinedload(User.profile)).offset(skip).limit(limit).all()
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
                "user_id": u.id,
                "name": u.full_name or "Unknown",
                "email": u.email,
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
            
        # Add a mock system event to show model deployment
        feed.append({
            "id": "sys_1",
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Model v8 deployed successfully based on 4007 training records.",
            "type": "system"
        })
        
        # Sort feed descending
        feed.sort(key=lambda x: x["timestamp"], reverse=True)
        return success_response(data=feed[:10], message="Activity feed fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch activity")
