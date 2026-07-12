from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from database.connection import get_db
from database.models.postgres_models import Content, TopicPerformance, UserProfile, Topic, Subject
from backend.routers.auth import get_current_user
from backend.utils.response_formatter import success_response, error_response
import random

router = APIRouter()

@router.get("/course-mappings")
def get_course_mappings():
    """
    Get dynamic mappings from course to valid subjects based on the dataset CSV.
    """
    try:
        from backend.utils.course_mapping import CourseMappingService
        mappings = CourseMappingService.get_mappings()
        return success_response(data=mappings)
    except Exception as e:
        return error_response(str(e), "Failed to load course mappings")

@router.get("/learning-path/{user_id}")
def get_learning_path(
    user_id: int, 
    subject: Optional[str] = None, 
    course: Optional[str] = None, 
    search: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """
    Fetch recommended content based on weak topics, plus some general content, filtered by course, subject, and search query.
    """
    try:
        # Get user's weak topics
        weak_topics = db.query(TopicPerformance).options(joinedload(TopicPerformance.topic)).filter(
            TopicPerformance.user_id == user_id,
            TopicPerformance.mastery_level == "Weak"
        ).all()
        
        weak_topics_dict = {wt.topic_id: wt for wt in weak_topics if wt.topic_id}
        weak_topic_ids = list(weak_topics_dict.keys())
        
        # Get user's selected subjects
        from database.models.postgres_models import UserProfile, Topic, Subject
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        selected_subjects = profile.subjects if profile and profile.subjects else []

        # Fetch all content with topics eagerly loaded
        all_content = db.query(Content).options(
            joinedload(Content.topic).joinedload(Topic.subject)
        ).all()
        
        # Mapping from full course name to code
        course_name_to_code = {
            'Computer Science': 'CS',
            'Information Technology': 'IT',
            'Software Engineering': 'SE',
            'Data Science': 'DS'
        }
        
        # Determine active course code and subject
        active_course_code = course_name_to_code.get(course) if course else None
        
        # If no explicit course parameter is provided, fallback to the user's profile course
        if not active_course_code:
            profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
            if profile and profile.course:
                active_course_code = course_name_to_code.get(profile.course)
                
        # If no explicit subject parameter is provided, we can fallback to the user's profile subjects
        fallback_subjects = []
        if not subject:
            profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
            fallback_subjects = profile.subjects if profile and profile.subjects else []

        # We will categorize into video, article, practice
        videos = []
        articles = []
        practice = []
        
        from backend.utils.course_mapping import CourseMappingService

        for c in all_content:
            subject_name = c.topic.subject.name if c.topic and c.topic.subject else None
            
            # Translate raw database subject to user-facing name
            user_subject = CourseMappingService.CSV_TO_USER_SUBJECT.get(subject_name, subject_name) if subject_name else None
            
            # Course filter
            if active_course_code:
                c_programs = [p.strip().upper() for p in (c.program or "").split(",") if p.strip()]
                if active_course_code not in c_programs:
                    continue
                    
            # Subject filter
            if subject:
                if not user_subject or user_subject.lower() != subject.lower():
                    continue
            elif fallback_subjects:
                fallback_subs_lower = [fs.lower() for fs in fallback_subjects]
                if not user_subject or user_subject.lower() not in fallback_subs_lower:
                    continue
                    
            # Search filter (operating inside selected subject scope)
            if search:
                search_lower = search.lower()
                title_match = search_lower in (c.title or "").lower()
                desc_match = search_lower in (c.description or "").lower()
                tags_match = search_lower in (c.tags or "").lower()
                if not (title_match or desc_match or tags_match):
                    continue

            is_recommended = c.topic_id in weak_topic_ids
            reason = None
            if is_recommended:
                accuracy = int(weak_topics_dict[c.topic_id].ewma_accuracy) if weak_topics_dict[c.topic_id].ewma_accuracy else 0
                reason = f"Because your mastery in {c.topic.name if c.topic else 'this topic'} is Weak ({accuracy}%)"
                
            content_data = {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "subject": user_subject,
                "topic": c.topic.name if c.topic else "General",
                "difficulty": c.difficulty,
                "duration_minutes": c.duration_minutes,
                "url": c.url,
                "youtube_video_id": c.youtube_video_id,
                "youtube_url": c.youtube_url,
                "thumbnail_url": c.thumbnail_url,
                "estimated_time": c.estimated_time,
                "is_recommended": is_recommended,
                "recommendation_reason": reason
            }
            
            if c.content_type == "video":
                videos.append(content_data)
            elif c.content_type == "article":
                articles.append(content_data)
            else:
                practice.append(content_data)
                


        return success_response(data={
            "videos": videos,
            "articles": articles,
            "practice": practice
        })
    except Exception as e:
        return error_response(str(e), "Failed to fetch learning path")

@router.get("/{content_id}")
def get_content(content_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    try:
        c = db.query(Content).options(joinedload(Content.topic)).filter(Content.id == content_id).first()
        if not c:
            return error_response("Content not found", status_code=404)
        
        # Find next and previous content items of the same type
        prev_item = db.query(Content).filter(Content.content_type == c.content_type, Content.id < c.id).order_by(Content.id.desc()).first()
        next_item = db.query(Content).filter(Content.content_type == c.content_type, Content.id > c.id).order_by(Content.id.asc()).first()
        
        content_data = {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "topic": c.topic.name if c.topic else "General",
            "difficulty": c.difficulty,
            "duration_minutes": c.duration_minutes,
            "url": c.url,
            "youtube_video_id": c.youtube_video_id,
            "youtube_url": c.youtube_url,
            "thumbnail_url": c.thumbnail_url,
            "estimated_time": c.estimated_time,
            "prev_id": prev_item.id if prev_item else None,
            "next_id": next_item.id if next_item else None
        }
        return success_response(data=content_data)
    except Exception as e:
        return error_response(str(e), "Failed to fetch content")
