"""
MongoDB Document Schemas using Pydantic
For flexible content storage like videos, quizzes, resources
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class VideoResource(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    video_id: str
    title: str
    topic: str
    description: str
    duration_seconds: int
    difficulty: str  # Beginner, Intermediate, Advanced
    url: str
    thumbnail_url: Optional[str] = None
    tags: List[str] = []
    view_count: int = 0
    avg_rating: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class QuizResource(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    quiz_id: str
    title: str
    topic: str
    description: str
    difficulty: str
    questions: List[Dict[str, Any]]  # List of question objects
    total_questions: int
    time_limit_seconds: Optional[int] = None
    passing_score: int = 70
    tags: List[str] = []
    attempt_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Question(BaseModel):
    question_id: str
    question_text: str
    question_type: str  # multiple_choice, true_false, coding
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str
    difficulty: str
    topic: str
    points: int = 1

class StudyMaterial(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    material_id: str
    title: str
    topic: str
    content_type: str  # pdf, article, notes, tutorial
    content: str  # Text content or file path
    difficulty: str
    estimated_time_minutes: int
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserProgress(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    topic: str
    mastery_level: float  # 0.0 to 1.0
    videos_watched: List[str] = []
    quizzes_completed: List[str] = []
    total_time_seconds: int = 0
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    milestones: List[Dict[str, Any]] = []
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class LearningPath(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    path_name: str
    topics_sequence: List[str]
    current_topic: str
    progress_percentage: float
    estimated_completion_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class AnalyticsEvent(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    event_type: str
    event_data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    session_id: Optional[str] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
