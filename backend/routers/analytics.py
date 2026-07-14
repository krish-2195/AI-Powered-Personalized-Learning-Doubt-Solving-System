from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from backend.routers.auth import get_current_user

from database.connection import get_db
from database.models.postgres_models import QuizAttempt, TopicPerformance
from backend.utils.response_formatter import success_response, error_response

router = APIRouter()

@router.get("/summary/{user_id}")
def get_analytics_summary(user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Fetch real performance trends and weak topics from PostgreSQL."""
    try:
        # 1. Fetch Weak Topics
        weak_topics = db.query(TopicPerformance).options(joinedload(TopicPerformance.topic)).filter(
            TopicPerformance.user_id == user_id,
            TopicPerformance.mastery_level == "Weak"
        ).all()
        
        from database.models.postgres_models import PerformanceRecord
        weak_topics_data = []
        for wt in weak_topics:
            if wt.topic:
                perf = db.query(PerformanceRecord).filter(
                    PerformanceRecord.user_id == user_id,
                    PerformanceRecord.topic_id == wt.topic_id
                ).first()
                attempts = perf.total_attempts if perf else 0
                acc = round(wt.ewma_accuracy or 0)
                time_taken = perf.avg_time_seconds if perf and perf.avg_time_seconds else 60
                
                reason = "Pattern identified by ML model"
                if acc < 60 and attempts > 3:
                    reason = "Struggling after multiple attempts"
                elif acc < 60:
                    reason = "Low overall accuracy"
                elif time_taken > 120:
                    reason = "High response time"
                
                weak_topics_data.append({
                    "topic": wt.topic.name,
                    "reason": reason
                })

        # 2. Topic Performance (Bar Chart Data)
        # Pull from PerformanceRecord to guarantee all attempted topics are plotted
        all_performance = db.query(PerformanceRecord).options(joinedload(PerformanceRecord.topic)).filter(PerformanceRecord.user_id == user_id).all()
        topic_performance_data = [{"topic": p.topic.name, "score": round(p.accuracy or 0)} for p in all_performance if p.topic]

        # 3. Performance Trend over the last 5 weeks (Line Chart Data)
        from database.models.postgres_models import Topic, LearningLog
        trend_data = []
        now = datetime.utcnow()
        total_topics = db.query(Topic).count() or 1
        
        for i in range(4, -1, -1):
            start_date = now - timedelta(weeks=i+1)
            end_date = now - timedelta(weeks=i)
            
            # Get quizzes and logs for this week
            quizzes_this_week = db.query(QuizAttempt).filter(
                QuizAttempt.user_id == user_id,
                QuizAttempt.timestamp >= start_date,
                QuizAttempt.timestamp < end_date
            ).all()
            
            logs_count = db.query(LearningLog).filter(
                LearningLog.user_id == user_id,
                LearningLog.timestamp >= start_date,
                LearningLog.timestamp < end_date
            ).count()
            
            if quizzes_this_week:
                quiz_count = len(quizzes_this_week)
                avg_acc = sum((q.accuracy or 0) for q in quizzes_this_week) / quiz_count
                topics_count = len(set(q.topic_id for q in quizzes_this_week if q.topic_id))
                
                variance = sum((q.accuracy - avg_acc) ** 2 for q in quizzes_this_week) / quiz_count
                std_dev = variance ** 0.5
                consistency = max(0.0, 100.0 - (std_dev * 2))
                coverage = (topics_count / total_topics) * 100
                engagement = min(100.0, (logs_count * 5) + (quiz_count * 5))
            else:
                avg_acc = 0
                topics_count = 0
                consistency = 0
                coverage = 0
                engagement = min(100.0, logs_count * 5)
                
            label = "Current" if i == 0 else f"Week -{i}"
            trend_data.append({
                "date": label,
                "accuracy": round(avg_acc),
                "topics": topics_count,
                "consistency": round(consistency),
                "coverage": round(coverage),
                "engagement": round(engagement)
            })

        return success_response(data={
            "weak_topics": weak_topics_data,
            "topic_performance": topic_performance_data,
            "trend_data": trend_data
        })
    except Exception as e:
        return error_response(str(e), "Failed to fetch analytics")

import os
import json

@router.get("/model-metrics")
def get_model_metrics(current_user = Depends(get_current_user)):
    """
    Returns the Random Forest model training and evaluation metrics,
    including overall accuracy, classification report, confusion matrix, and feature importance.
    """
    try:
        report_path = os.path.join(os.path.dirname(__file__), '../../ml/artifacts/evaluation_report.json')
        if not os.path.exists(report_path):
            return error_response("Evaluation report not found", "Evaluation report not found")
            
        with open(report_path, 'r') as f:
            report_data = json.load(f)
            
        return success_response(data=report_data)
    except Exception as e:
        return error_response(str(e), "Failed to fetch model metrics")
