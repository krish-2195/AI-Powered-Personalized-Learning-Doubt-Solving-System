from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from database.connection import get_db, get_activity_logs_collection, get_daily_quests_collection
from database.models.postgres_models import UserProfile, TopicPerformance, QuizAttempt, Topic, LearningLog
from ml.services.recommendation import recommendation_service
from backend.utils.response_formatter import success_response, error_response

router = APIRouter()

def calculate_exam_readiness(avg_score: float, mastered: int, total: int, engagement: float) -> dict:
    """
    Custom formula to calculate exam readiness.
    Readiness = (0.5 * avg_score) + (0.3 * mastery_ratio) + (0.2 * engagement)
    """
    if total == 0: 
        return {"score": 0.0, "label": "Not enough data"}
        
    mastery_ratio = (mastered / total) * 100
    
    # If the user hasn't started anything, exam readiness should be 0, not 15% (from base engagement)
    if avg_score == 0 and mastery_ratio == 0:
        return {"score": 0.0, "label": "Not enough data"}
        
    score = (0.5 * avg_score) + (0.3 * mastery_ratio) + (0.2 * engagement)
    
    if score >= 80:
        label = "High readiness"
    elif score >= 60:
        label = "Moderate readiness"
    else:
        label = "Needs improvement"
        
    return {"score": round(score, 1), "label": label}

@router.get("/")
async def get_dashboard(user_id: int, db: Session = Depends(get_db)):
    """
    Aggregates data from PostgreSQL and MongoDB to power the student's main dashboard.
    """
    try:
        # 1. Fetch User Profile for Streak
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if not profile:
            return error_response("User profile not found", "Dashboard Error")
            
        # 2. Fetch Daily Quest from MongoDB
        quests_coll = get_daily_quests_collection()
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        quest = await quests_coll.find_one({"user_id": user_id, "date": today_str})
        
        if quest:
            quest_data = {"description": quest.get("quest_description"), "completed": quest.get("completed")}
        else:
            quest_data = {"description": "Complete 1 quiz to maintain your streak!", "completed": False}

        # 3. Aggregate Performance Stats from PostgreSQL
        quiz_attempts_count = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).count()
        is_new_user = quiz_attempts_count == 0
        
        avg_score_query = db.query(func.avg(QuizAttempt.accuracy)).filter(QuizAttempt.user_id == user_id).scalar()
        avg_score = (avg_score_query * 100) if avg_score_query else 0.0
        
        topics_mastered = db.query(TopicPerformance).filter(
            TopicPerformance.user_id == user_id, 
            TopicPerformance.mastery_level == "Expert"
        ).count()
        
        total_topics = db.query(Topic).count()
        if total_topics == 0: total_topics = 1 # avoid div by zero
        
        # Calculate Videos Watched
        videos_watched = db.query(LearningLog).filter(
            LearningLog.user_id == user_id,
            LearningLog.activity_type == 'video',
            LearningLog.completed == True
        ).count()
        
        # Calculate Study Hours (sum of duration_seconds from LearningLogs and QuizAttempts)
        logs_duration = db.query(func.sum(LearningLog.duration_seconds)).filter(LearningLog.user_id == user_id).scalar() or 0
        quiz_duration = db.query(func.sum(QuizAttempt.time_taken_seconds)).filter(QuizAttempt.user_id == user_id).scalar() or 0
        study_hours = round((logs_duration + quiz_duration) / 3600, 1)

        # 4. Identify Today's Focus (Top 2 weakest topics)
        weak_topics = db.query(TopicPerformance).filter(TopicPerformance.user_id == user_id)\
            .order_by(TopicPerformance.ewma_accuracy.asc()).limit(2).all()
            
        if weak_topics:
            today_focus = " & ".join([wt.topic.name for wt in weak_topics if wt.topic])
        else:
            today_focus = "General Review"

        # 5. Fetch Recent Activity from MongoDB
        act_coll = get_activity_logs_collection()
        activities_cursor = act_coll.find({"user_id": user_id}).sort("timestamp", -1).limit(5)
        activities = await activities_cursor.to_list(length=5)
        
        recent_activity = []
        for a in activities:
            recent_activity.append({
                "type": a.get("action", "activity"),
                "details": a.get("metadata", {}),
                "timestamp": a.get("timestamp")
            })

        # 6. Calculate Exam Readiness
        # (Assuming generic engagement score of 75.0 for the MVP)
        readiness = calculate_exam_readiness(avg_score, topics_mastered, total_topics, engagement=75.0)

        # 7. Recommendations
        try:
            recs_objects = recommendation_service.get_recommendations(db, user_id, 3)
            recs = [
                {
                    "type": r.content_type,
                    "title": r.title,
                    "topic": r.topic.name if r.topic else "General",
                    "time": r.duration_minutes
                }
                for r in recs_objects
            ]
        except Exception:
            recs = []

        # Assemble final payload
        dashboard_payload = {
            "is_new_user": is_new_user,
            "streak": profile.streak_count,
            "dailyQuest": quest_data,
            "accuracyBoostTarget": "+5%" if avg_score < 85.0 else "+2%",
            "todayFocus": today_focus,
            "stats": {
                "averageScore": round(avg_score, 1), 
                "topicsMastered": topics_mastered,
                "videosWatched": videos_watched,
                "studyHours": study_hours
            },
            "recentActivity": recent_activity,
            "examReadiness": readiness,
            "recommendations": recs
        }
        
        return success_response(data=dashboard_payload, message="Dashboard loaded successfully")
        
    except Exception as e:
        return error_response(str(e), "Failed to load dashboard")
