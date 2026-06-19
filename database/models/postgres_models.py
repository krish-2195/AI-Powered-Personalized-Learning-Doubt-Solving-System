"""
PostgreSQL Database Models using SQLAlchemy ORM
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    learning_logs = relationship("LearningLog", back_populates="user")
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
    performance_records = relationship("PerformanceRecord", back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    course = Column(String)
    subjects = Column(JSON)  # Store as JSON array
    current_level = Column(String)  # Beginner, Intermediate, Advanced
    exam_target = Column(String)
    exam_timeline = Column(String)
    exam_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="profile")

class LearningLog(Base):
    __tablename__ = "learning_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    activity_type = Column(String)  # video, quiz, chat, revision
    resource_id = Column(String)
    topic = Column(String)
    duration_seconds = Column(Integer)
    completed = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    extra_metadata = Column("metadata", JSON)  # Additional flexible data
    
    # Relationship
    user = relationship("User", back_populates="learning_logs")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    quiz_id = Column(String)
    topic = Column(String)
    questions_count = Column(Integer)
    correct_answers = Column(Integer)
    accuracy = Column(Float)
    time_taken_seconds = Column(Integer)
    attempt_number = Column(Integer, default=1)
    timestamp = Column(DateTime, default=datetime.utcnow)
    answers_data = Column(JSON)  # Store individual question responses
    
    # Relationship
    user = relationship("User", back_populates="quiz_attempts")

class PerformanceRecord(Base):
    __tablename__ = "performance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String)
    accuracy = Column(Float)
    avg_time_seconds = Column(Float)
    total_attempts = Column(Integer)
    status = Column(String)  # strong, moderate, weak
    weakness_score = Column(Float, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="performance_records")

class WeakTopic(Base):
    __tablename__ = "weak_topics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String)
    weakness_score = Column(Float)
    reason = Column(String)
    identified_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)

class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_message = Column(String)
    ai_response = Column(String)
    topic_detected = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    helpful = Column(Boolean, nullable=True)
    rating = Column(Integer, nullable=True)

class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    recommendation_type = Column(String)  # video, quiz, revision
    resource_id = Column(String)
    topic = Column(String)
    reason = Column(String)
    relevance_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    interacted = Column(Boolean, default=False)
    interacted_at = Column(DateTime, nullable=True)

class ExamReadiness(Base):
    __tablename__ = "exam_readiness"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    readiness_score = Column(Float)
    readiness_level = Column(String)  # Low, Medium, High
    success_probability = Column(Float)
    predicted_score = Column(Float)
    improvement_tips = Column(JSON)
    calculated_at = Column(DateTime, default=datetime.utcnow)
