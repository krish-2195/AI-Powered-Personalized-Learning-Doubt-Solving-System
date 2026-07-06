from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, literal
from datetime import datetime
from starlette.concurrency import run_in_threadpool

from database.connection import get_db, get_activity_logs_collection, get_daily_quests_collection
from database.models.postgres_models import UserProfile, TopicPerformance, QuizAttempt, Topic, LearningLog
from backend.routers.auth import get_current_user
from ml.services.recommendation import recommendation_service
from backend.utils.response_formatter import success_response, error_response

router = APIRouter()

def calculate_exam_readiness(quizzes: list, tp_counts: dict, study_sessions: int, total_topics: int) -> dict:
    """
    Optimized exam readiness using pre-fetched data (no additional DB queries).
    """
    if total_topics == 0: 
        total_topics = 1

    quiz_count = len(quizzes)
    
    if quiz_count == 0:
        return {
            "score": 0.0, 
            "label": "Not enough data", 
            "confidence": "Low Confidence", 
            "reason": "No quizzes taken yet. Complete at least 5 quizzes for a reliable prediction.",
            "metrics": {"quiz_count": 0, "unique_topics": 0, "study_sessions": 0}
        }
        
    avg_accuracy = sum(q.accuracy for q in quizzes) / quiz_count
    
    # 2. Consistency (Standard Deviation)
    if quiz_count < 2:
        consistency = 50.0
    else:
        variance = sum((q.accuracy - avg_accuracy) ** 2 for q in quizzes) / quiz_count
        std_dev = variance ** 0.5
        consistency = max(0.0, 100.0 - (std_dev * 2))
        
    # 3. Curriculum Coverage (Unique topics attempted)
    unique_topics_attempted = len(set(q.topic_id for q in quizzes if q.topic_id))
    coverage = (unique_topics_attempted / total_topics) * 100
    
    # 4. Mastery Ratio — use pre-fetched tp_counts
    topics_mastered = tp_counts.get("strong", 0)
    mastery_ratio = (topics_mastered / total_topics) * 100
    
    # 5. Weak Topic Ratio — use pre-fetched tp_counts
    weak_topics_count = tp_counts.get("weak", 0)
    attempted_topics_count = tp_counts.get("total", 1) or 1
    
    weak_ratio = weak_topics_count / attempted_topics_count
    weak_topic_score = max(0.0, 100.0 - (weak_ratio * 100))
    
    # 6. Engagement (Dynamic) — use pre-fetched study_sessions
    engagement = min(100.0, (study_sessions * 5) + (quiz_count * 5))
    if engagement == 0:
        engagement = 75.0 # fallback

    # Calculate final score
    score = (
        (0.30 * avg_accuracy) +
        (0.25 * mastery_ratio) +
        (0.20 * coverage) +
        (0.10 * consistency) +
        (0.10 * engagement) +
        (0.05 * weak_topic_score)
    )
    
    if score >= 80:
        label = "High readiness"
    elif score >= 60:
        label = "Moderate readiness"
    else:
        label = "Needs improvement"

    # Evidence Score & Confidence
    evidence_score = (
        (min(quiz_count, 10) / 10) * 40 +
        (min(unique_topics_attempted, 5) / 5) * 30 +
        (min(study_sessions, 5) / 5) * 30
    )
    
    if evidence_score < 50:
        confidence = "Low Confidence"
        reason = f"Complete more quizzes for a reliable prediction."
    elif evidence_score < 80:
        confidence = "Medium Confidence"
        reason = f"Keep practicing to reach high confidence."
    else:
        confidence = "High Confidence"
        reason = f"Highly reliable prediction."

    return {
        "score": round(score, 1),
        "label": label,
        "confidence": confidence,
        "reason": reason,
        "metrics": {
            "quiz_count": quiz_count,
            "unique_topics": unique_topics_attempted,
            "study_sessions": study_sessions
        }
    }

def _fetch_postgres_data(user_id: int, db: Session, total_topics: int):
    # ── QUERY 5: Today's Focus (weak topics, limit 2) ──
    weak_topics = db.query(TopicPerformance).options(joinedload(TopicPerformance.topic)).filter(TopicPerformance.user_id == user_id)\
        .order_by(TopicPerformance.ewma_accuracy.asc()).limit(2).all()
        
    prerequisite_path = []
    if weak_topics:
        weak_names = [wt.topic.name for wt in weak_topics if wt.topic]
        today_focus = " & ".join(weak_names)
        
        from ml.services.knowledge_graph import knowledge_graph
        # Find foundational gaps
        gaps = knowledge_graph.identify_foundational_gaps(weak_names)
        if gaps:
            prerequisite_path = gaps
        else:
            # Just use their immediate prereqs
            for wn in weak_names:
                prerequisite_path.extend(knowledge_graph.get_prerequisites(wn))
            # Remove duplicates while preserving order
            prerequisite_path = list(dict.fromkeys(prerequisite_path))
    else:
        today_focus = "General Review"

    # ── QUERY 6: Recent Activity (2 queries with eager loading) ──
    recent_activity = []
    recent_quizzes = db.query(QuizAttempt).options(joinedload(QuizAttempt.topic)).filter(QuizAttempt.user_id == user_id).order_by(QuizAttempt.timestamp.desc()).limit(5).all()
    recent_logs = db.query(LearningLog).options(joinedload(LearningLog.topic)).filter(LearningLog.user_id == user_id).order_by(LearningLog.timestamp.desc()).limit(5).all()
    
    for q in recent_quizzes:
        recent_activity.append({
            "type": "quiz_attempt",
            "timestamp": q.timestamp.isoformat(),
            "details": {
                "topic": q.topic.name if q.topic else "Quiz",
                "score": f"{int(q.accuracy * 100)}%"
            }
        })
        
    for l in recent_logs:
        recent_activity.append({
            "type": l.activity_type,
            "timestamp": l.timestamp.isoformat(),
            "details": {
                "topic": l.topic.name if l.topic else "Learning Resource"
            }
        })
        
    recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)
    recent_activity = recent_activity[:5]

    # ── Recommendations ──
    try:
        recs_objects = recommendation_service.get_recommendations(db, user_id, 3)
        recs = [
            {
                "resource_id": r["content"].id,
                "type": r["content"].content_type,
                "title": r["content"].title,
                "topic": r["content"].topic.name if r["content"].topic else "General",
                "time": r["content"].duration_minutes,
                "match_score": r["match_score"],
                "reason": r["reason"]
            }
            for r in recs_objects
        ]
    except Exception:
        recs = []

    from backend.services.student_stats import student_stats_service
    shared_stats = student_stats_service.get_student_stats(db, user_id)

    return {
        "profile_streak": shared_stats["profile_streak"],
        "is_new_user": shared_stats["quiz_count"] == 0,
        "avg_score": shared_stats["avg_accuracy"],
        "topics_mastered": shared_stats["topics_mastered"],
        "videos_watched": shared_stats["videos_watched"],
        "study_hours": shared_stats["study_hours"],
        "today_focus": today_focus,
        "recent_activity": recent_activity,
        "readiness": shared_stats["exam_readiness"],
        "recs": recs,
        "prerequisite_path": prerequisite_path
    }

@router.get("/")
async def get_dashboard(user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Aggregates data from PostgreSQL and MongoDB to power the student's main dashboard.
    """
    try:
        total_topics = await run_in_threadpool(lambda: db.query(Topic).count() or 1)
        pg_data = await run_in_threadpool(_fetch_postgres_data, user_id, db, total_topics)
            
        quests_coll = get_daily_quests_collection()
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        quest = await quests_coll.find_one({"user_id": user_id, "date": today_str})
        
        if quest:
            quest_data = {"description": quest.get("quest_description"), "completed": quest.get("completed")}
        else:
            quest_data = {"description": "Complete 1 quiz to maintain your streak!", "completed": False}

        dashboard_payload = {
            "is_new_user": pg_data["is_new_user"],
            "streak": pg_data["profile_streak"],
            "dailyQuest": quest_data,
            "accuracyBoostTarget": "+5%" if pg_data["avg_score"] < 85.0 else "+2%",
            "todayFocus": pg_data["today_focus"],
            "stats": {
                "averageScore": round(pg_data["avg_score"], 1), 
                "topicsMastered": pg_data["topics_mastered"],
                "videosWatched": pg_data["videos_watched"],
                "studyHours": pg_data["study_hours"]
            },
            "recentActivity": pg_data["recent_activity"],
            "examReadiness": pg_data["readiness"],
            "recommendations": pg_data["recs"],
            "prerequisitePath": pg_data.get("prerequisite_path", [])
        }
        
        return success_response(data=dashboard_payload, message="Dashboard loaded successfully")
        
    except Exception as e:
        return error_response(str(e), "Failed to load dashboard")
