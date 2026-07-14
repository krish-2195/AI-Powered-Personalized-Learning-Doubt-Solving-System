from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
import time

from database.connection import get_db
from database.models.postgres_models import User, Content, QuizAttempt, PredictionHistory, QuestionBank, Topic, Course
from backend.routers.auth import require_role, get_current_admin
from backend.utils.response_formatter import success_response, error_response

class QuestionCreate(BaseModel):
    topic: str
    difficulty: str
    question_text: str
    options: List[str]
    correct_answer_index: int
    explanation: str

class CourseCreate(BaseModel):
    title: str
    description: str
    is_published: bool = False

router = APIRouter(
    prefix="/api/instructor",
    tags=["Instructor"],
    dependencies=[require_role("instructor", "super_admin")]
)

@router.get("/stats")
def get_instructor_stats(db: Session = Depends(get_db), current_user: User = require_role("instructor", "super_admin")):
    """Get high-level stats for the instructor dashboard."""
    try:
        active_students = db.query(User).filter(User.role == "student").count()
        total_courses = db.query(Course).filter(Course.instructor_id == current_user.id).count()

        avg_score_query = db.query(func.avg(QuizAttempt.score)).scalar()
        avg_score = round(avg_score_query, 1) if avg_score_query else 0
        
        return success_response(
            data={
                "active_students": active_students,
                "total_courses": total_courses,
                "avg_quiz_score": f"{avg_score}%",
                "watch_time_hrs": 124  # Mock watch time
            },
            message="Stats fetched successfully"
        )
    except Exception as e:
        return error_response(str(e), "Failed to fetch stats")

@router.get("/courses")
def get_instructor_courses(db: Session = Depends(get_db), current_user: User = require_role("instructor", "super_admin")):
    """Fetch all courses owned by the current instructor."""
    try:
        courses = db.query(Course).filter(Course.instructor_id == current_user.id).all()
        return success_response(
            data=[{
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "is_published": c.is_published,
                "created_at": c.created_at.isoformat()
            } for c in courses],
            message="Courses fetched successfully"
        )
    except Exception as e:
        return error_response(str(e), "Failed to fetch courses")

@router.post("/courses")
def create_instructor_course(payload: CourseCreate, db: Session = Depends(get_db), current_user: User = require_role("instructor", "super_admin")):
    """Create a new course owned by the instructor."""
    try:
        new_course = Course(
            title=payload.title,
            description=payload.description,
            is_published=payload.is_published,
            instructor_id=current_user.id
        )
        db.add(new_course)
        db.commit()
        db.refresh(new_course)
        
        return success_response(
            data={
                "id": new_course.id,
                "title": new_course.title,
                "description": new_course.description,
                "is_published": new_course.is_published
            },
            message="Course created successfully"
        )
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to create course")

@router.post("/upload")
def upload_content(
    title: str = Form(...),
    description: str = Form(""),
    content_type: str = Form(...),
    subject: str = Form(...),
    topic: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = require_role("instructor", "super_admin")
):
    """Upload new course content."""
    try:
        # Mock file upload process. In a real app, upload to S3/Cloud Storage
        file_size = 0
        file_content = file.file.read()
        file_size = len(file_content)
        
        # We would create a Content record here
        # new_content = Content(title=title, url="mock_url", type=content_type...)
        
        return success_response(
            data={"filename": file.filename, "size": file_size, "type": content_type},
            message="Content uploaded successfully"
        )
    except Exception as e:
        return error_response(str(e), "Failed to upload content")

@router.get("/struggling-topics")
def get_struggling_topics(db: Session = Depends(get_db)):
    """AI Analytics: Identify topics where students are struggling."""
    try:
        # Mock AI analytics data based on the user's prompt examples
        struggles = [
            {"topic": "Recursion", "student_count": 34, "severity": "high"},
            {"topic": "Trees", "student_count": 42, "severity": "critical"},
            {"topic": "Dynamic Programming", "student_count": 18, "severity": "medium"},
            {"topic": "Graph Algorithms", "student_count": 12, "severity": "low"}
        ]
        return success_response(data=struggles, message="Struggling topics fetched")
    except Exception as e:
        return error_response(str(e), "Failed to fetch AI analytics")

@router.get("/questions")
def get_questions(db: Session = Depends(get_db)):
    """Fetch all questions in the question bank."""
    try:
        questions = db.query(QuestionBank).order_by(QuestionBank.id.desc()).limit(50).all()
        data = []
        for q in questions:
            topic_name = "Unknown"
            if q.topic_id:
                t = db.query(Topic).filter(Topic.id == q.topic_id).first()
                if t:
                    topic_name = t.name
            
            data.append({
                "id": q.id,
                "topic": topic_name,
                "difficulty": q.difficulty,
                "question_text": q.question_text,
                "options": q.options,
                "correct_answer_index": q.correct_answer_index,
                "explanation": q.explanation
            })
        return success_response(data=data, message="Questions fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch questions")

@router.post("/questions")
def add_question(
    payload: QuestionCreate, 
    db: Session = Depends(get_db)
):
    """Add a new question to the question bank."""
    try:
        # Find or create topic
        topic = db.query(Topic).filter(Topic.name == payload.topic).first()
        if not topic:
            topic = Topic(name=payload.topic, subject_id=1) # Mock subject_id for now
            db.add(topic)
            db.flush()

        question = QuestionBank(
            topic_id=topic.id,
            difficulty=payload.difficulty,
            question_text=payload.question_text,
            options=payload.options,
            correct_answer_index=payload.correct_answer_index,
            explanation=payload.explanation,
            tags=[payload.topic, payload.difficulty]
        )
        db.add(question)
        db.commit()
        return success_response(
            data={"id": question.id}, 
            message="Question added to the bank successfully"
        )
    except Exception as e:
        db.rollback()
        return error_response(str(e), "Failed to add question")

@router.get("/courses")
def get_instructor_courses(db: Session = Depends(get_db)):
    """Fetch courses managed by this instructor."""
    try:
        # Mock data for Phase 2 UI
        courses = [
            {
                "id": 1,
                "title": "Data Structures & Algorithms in Python",
                "status": "Published",
                "students": 142,
                "rating": 4.8,
                "modules": 12,
                "progress": 100
            },
            {
                "id": 2,
                "title": "System Design Masterclass",
                "status": "Draft",
                "students": 0,
                "rating": 0,
                "modules": 4,
                "progress": 35
            },
            {
                "id": 3,
                "title": "Advanced Dynamic Programming",
                "status": "Published",
                "students": 89,
                "rating": 4.9,
                "modules": 8,
                "progress": 100
            }
        ]
        return success_response(data=courses, message="Courses fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch courses")

@router.get("/students")
def get_instructor_students(db: Session = Depends(get_db)):
    """Fetch students and their performance metrics."""
    try:
        # Mock data for Phase 2 UI
        students = [
            {
                "id": 1,
                "name": "Sarah Jenkins",
                "email": "sarah.j@example.com",
                "completion": 78,
                "avg_score": 92,
                "last_active": "2 hours ago",
                "risk_level": "Low"
            },
            {
                "id": 2,
                "name": "Michael Chen",
                "email": "mchen@example.com",
                "completion": 45,
                "avg_score": 64,
                "last_active": "3 days ago",
                "risk_level": "Medium"
            },
            {
                "id": 3,
                "name": "Emma Wilson",
                "email": "ewilson@example.com",
                "completion": 12,
                "avg_score": 42,
                "last_active": "2 weeks ago",
                "risk_level": "High"
            },
            {
                "id": 4,
                "name": "James Rodriguez",
                "email": "james.r@example.com",
                "completion": 95,
                "avg_score": 98,
                "last_active": "Just now",
                "risk_level": "Low"
            }
        ]
        return success_response(data=students, message="Students fetched successfully")
    except Exception as e:
        return error_response(str(e), "Failed to fetch students")
