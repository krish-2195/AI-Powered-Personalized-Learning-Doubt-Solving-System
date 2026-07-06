from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from datetime import datetime

from database.models.postgres_models import UserProfile, TopicPerformance, QuizAttempt, Topic, LearningLog

class StudentStatisticsService:
    @staticmethod
    def get_student_stats(db: Session, user_id: int):
        """
        Consolidates core statistical calculations (Study Hours, Exam Readiness, Average Score)
        into a single service. Guarantees consistency across Dashboard, Profile, Analytics, and Admin.
        """
        # ── QUERY 1: User Profile ──
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        streak = profile.streak_count if profile else 0

        # ── QUERY 2: Quiz Aggregates ──
        quiz_stats = db.query(
            func.count(QuizAttempt.id).label("count"),
            func.coalesce(func.avg(QuizAttempt.accuracy), 0).label("avg_accuracy"),
            func.coalesce(func.sum(QuizAttempt.time_taken_seconds), 0).label("total_time")
        ).filter(QuizAttempt.user_id == user_id).first()
        
        quiz_count = quiz_stats.count or 0
        avg_accuracy = float(quiz_stats.avg_accuracy)
        quiz_duration = int(quiz_stats.total_time)

        # ── QUERY 3: Topic Performance Aggregates ──
        tp_stats = db.query(
            func.count(TopicPerformance.id).label("total"),
            func.sum(case((TopicPerformance.mastery_level == "Strong", 1), else_=0)).label("strong"),
            func.sum(case((TopicPerformance.mastery_level == "Weak", 1), else_=0)).label("weak")
        ).filter(TopicPerformance.user_id == user_id).first()
        
        tp_counts = {
            "strong": int(tp_stats.strong or 0),
            "weak": int(tp_stats.weak or 0),
            "total": int(tp_stats.total or 0)
        }

        # ── QUERY 4: LearningLog Aggregates ──
        log_stats = db.query(
            func.count(LearningLog.id).label("session_count"),
            func.coalesce(func.sum(LearningLog.duration_seconds), 0).label("total_duration"),
            func.sum(case(
                ((LearningLog.activity_type == 'video') & (LearningLog.completed == True), 1),
                else_=0
            )).label("videos_watched")
        ).filter(LearningLog.user_id == user_id).first()
        
        videos_watched = int(log_stats.videos_watched or 0)
        logs_duration = int(log_stats.total_duration or 0)
        study_sessions = int(log_stats.session_count or 0)
        
        # Consistent Study Hours Calculation (Quiz Time + Video Time)
        study_hours = round((logs_duration + quiz_duration) / 3600, 1)

        # ── Exam Readiness ──
        # Fetch all quizzes for this user (required for std_dev consistency calculation)
        all_quizzes = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).all()
        total_topics = db.query(Topic).count() or 1
        
        readiness_data = StudentStatisticsService._calculate_exam_readiness(
            quizzes=all_quizzes,
            tp_counts=tp_counts,
            study_sessions=study_sessions,
            total_topics=total_topics
        )

        return {
            "profile_streak": streak,
            "quiz_count": quiz_count,
            "avg_accuracy": avg_accuracy,
            "study_hours": study_hours,
            "videos_watched": videos_watched,
            "topics_mastered": tp_counts["strong"],
            "weak_topics_count": tp_counts["weak"],
            "total_topics_attempted": tp_counts["total"],
            "exam_readiness": readiness_data
        }

    @staticmethod
    def _calculate_exam_readiness(quizzes: list, tp_counts: dict, study_sessions: int, total_topics: int) -> dict:
        quiz_count = len(quizzes)
        
        if quiz_count < 3: # COLD START DETECTION: Require 3 quizzes
            return {
                "score": 0.0, 
                "label": "Not enough data", 
                "confidence": "Low", 
                "reason": "Complete at least 3 quizzes to unlock predictions.",
                "metrics": {
                    "accuracy": 0, "coverage": 0, "consistency": 0, 
                    "engagement": 0, "weak_penalty": 0
                }
            }
            
        avg_accuracy = sum(q.accuracy for q in quizzes) / quiz_count
        
        # Consistency
        variance = sum((q.accuracy - avg_accuracy) ** 2 for q in quizzes) / quiz_count
        std_dev = variance ** 0.5
        consistency = max(0.0, 100.0 - (std_dev * 2))
            
        # Curriculum Coverage
        unique_topics_attempted = len(set(q.topic_id for q in quizzes if q.topic_id))
        coverage = (unique_topics_attempted / total_topics) * 100
        
        # Mastery Ratio
        topics_mastered = tp_counts.get("strong", 0)
        mastery_ratio = (topics_mastered / total_topics) * 100
        
        # Weak Topic Penalty
        weak_topics_count = tp_counts.get("weak", 0)
        attempted_topics_count = tp_counts.get("total", 1) or 1
        weak_ratio = weak_topics_count / attempted_topics_count
        weak_topic_score = max(0.0, 100.0 - (weak_ratio * 100))
        
        # Engagement
        engagement = min(100.0, (study_sessions * 5) + (quiz_count * 5))
        if engagement == 0: engagement = 75.0

        score = (
            (0.30 * avg_accuracy) +
            (0.25 * mastery_ratio) +
            (0.20 * coverage) +
            (0.10 * consistency) +
            (0.10 * engagement) +
            (0.05 * weak_topic_score)
        )
        
        if score >= 80: label = "High readiness"
        elif score >= 60: label = "Moderate readiness"
        else: label = "Needs improvement"

        # Evidence Score & Confidence
        evidence_score = (
            (min(quiz_count, 10) / 10) * 40 +
            (min(unique_topics_attempted, 5) / 5) * 30 +
            (min(study_sessions, 5) / 5) * 30
        )
        
        if evidence_score < 50: confidence = "Low"
        elif evidence_score < 80: confidence = "Medium"
        else: confidence = "High"

        return {
            "score": round(score, 1),
            "label": label,
            "confidence": confidence,
            "metrics": {
                "accuracy": round(avg_accuracy, 1),
                "coverage": round(coverage, 1),
                "consistency": round(consistency, 1),
                "engagement": round(engagement, 1),
                "weak_penalty": round(weak_topic_score, 1)
            }
        }

student_stats_service = StudentStatisticsService()
