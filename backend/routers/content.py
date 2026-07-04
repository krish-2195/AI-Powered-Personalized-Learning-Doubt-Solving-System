from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from database.connection import get_db
from database.models.postgres_models import Content, TopicPerformance
from backend.routers.auth import get_current_user
from backend.utils.response_formatter import success_response, error_response
import random

router = APIRouter()

@router.get("/learning-path/{user_id}")
def get_learning_path(user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Fetch recommended content based on weak topics, plus some general content.
    """
    try:
        # Get user's weak topics
        weak_topics = db.query(TopicPerformance).options(joinedload(TopicPerformance.topic)).filter(
            TopicPerformance.user_id == user_id,
            TopicPerformance.mastery_level == "Weak"
        ).all()
        
        weak_topics_dict = {wt.topic_id: wt for wt in weak_topics if wt.topic_id}
        weak_topic_ids = list(weak_topics_dict.keys())
        
        # Fetch all content with topics eagerly loaded
        all_content = db.query(Content).options(joinedload(Content.topic)).all()
        
        # We will categorize into video, article, practice
        videos = []
        articles = []
        practice = []
        
        for c in all_content:
            is_recommended = c.topic_id in weak_topic_ids
            reason = None
            if is_recommended:
                accuracy = int(weak_topics_dict[c.topic_id].ewma_accuracy) if weak_topics_dict[c.topic_id].ewma_accuracy else 0
                reason = f"Because your mastery in {c.topic.name if c.topic else 'this topic'} is Weak ({accuracy}%)"
                
            content_data = {
                "id": c.id,
                "title": c.title,
                "topic": c.topic.name if c.topic else "General",
                "difficulty": c.difficulty,
                "duration_minutes": c.duration_minutes,
                "url": c.url,
                "is_recommended": is_recommended,
                "recommendation_reason": reason
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
