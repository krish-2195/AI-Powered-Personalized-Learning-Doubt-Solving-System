from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models.postgres_models import Content, TopicPerformance
from backend.utils.response_formatter import success_response, error_response
import random

router = APIRouter()

@router.get("/learning-path/{user_id}")
async def get_learning_path(user_id: int, db: Session = Depends(get_db)):
    """
    Fetch recommended content based on weak topics, plus some general content.
    """
    try:
        # Get user's weak topics
        weak_topics = db.query(TopicPerformance).filter(
            TopicPerformance.user_id == user_id,
            TopicPerformance.mastery_level == "Beginner"
        ).all()
        
        weak_topic_ids = [wt.topic_id for wt in weak_topics if wt.topic_id]
        
        # Fetch all content
        all_content = db.query(Content).all()
        
        # We will categorize into video, article, practice
        videos = []
        articles = []
        practice = []
        
        for c in all_content:
            is_recommended = c.topic_id in weak_topic_ids
            content_data = {
                "id": c.id,
                "title": c.title,
                "topic": c.topic.name if c.topic else "General",
                "difficulty": c.difficulty,
                "duration_minutes": c.duration_minutes,
                "url": c.url,
                "is_recommended": is_recommended
            }
            
            if c.content_type == "video":
                videos.append(content_data)
            elif c.content_type == "article":
                articles.append(content_data)
            else:
                practice.append(content_data)
                
        # If practice is empty (e.g. we only seeded videos), we'll mock some practice quizzes based on existing topics
        if not practice and len(videos) > 0:
            topics_set = list(set([v["topic"] for v in videos]))
            for t in topics_set[:3]:
                practice.append({
                    "id": f"mock_q_{t}",
                    "title": f"Practice Quiz: {t}",
                    "topic": t,
                    "difficulty": "Medium",
                    "duration_minutes": 15,
                    "url": "#",
                    "is_recommended": True
                })

        return success_response(data={
            "videos": videos,
            "articles": articles,
            "practice": practice
        })
    except Exception as e:
        return error_response(str(e), "Failed to fetch learning path")
