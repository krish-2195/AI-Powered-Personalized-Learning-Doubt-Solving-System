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
    role = Column(String, default="student")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    learning_logs = relationship("LearningLog", back_populates="user")
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
    performance_records = relationship("PerformanceRecord", back_populates="user")
    topic_performances = relationship("TopicPerformance", back_populates="user")
    learning_sessions = relationship("LearningSession", back_populates="user")
    recommendation_feedback = relationship("RecommendationFeedback", back_populates="user")

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
    streak_count = Column(Integer, default=0)
    last_active_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="profile")

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    
    # Relationships
    topics = relationship("Topic", back_populates="subject")

class Topic(Base):
    __tablename__ = "topics"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    name = Column(String, index=True, nullable=False)
    description = Column(String)
    difficulty_level = Column(String)  # Beginner, Intermediate, Advanced
    
    # Relationships
    subject = relationship("Subject", back_populates="topics")
    content = relationship("Content", back_populates="topic")
    topic_performances = relationship("TopicPerformance", back_populates="topic")

class Content(Base):
    __tablename__ = "content"
    
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    content_type = Column(String)  # video, quiz, article
    title = Column(String, nullable=False)
    text_content = Column(String)  # Main text or summary for TF-IDF
    difficulty = Column(String)
    duration_minutes = Column(Integer)
    url = Column(String)
    
    # Relationships
    topic = relationship("Topic", back_populates="content")

class TopicPerformance(Base):
    __tablename__ = "topic_performance"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"))
    ewma_accuracy = Column(Float, default=0.0)
    mastery_level = Column(String, default="Beginner")  # Beginner, Intermediate, Expert
    last_attempt_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="topic_performances")
    topic = relationship("Topic", back_populates="topic_performances")

class LearningLog(Base):
    __tablename__ = "learning_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    activity_type = Column(String)  # video, quiz, chat, revision
    resource_id = Column(String)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    duration_seconds = Column(Integer)
    completed = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    extra_metadata = Column("metadata", JSON)  # Additional flexible data
    
    # Relationships
    user = relationship("User", back_populates="learning_logs")
    topic = relationship("Topic")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    quiz_id = Column(String)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    questions_count = Column(Integer)
    correct_answers = Column(Integer)
    accuracy = Column(Float)
    time_taken_seconds = Column(Integer)
    attempt_number = Column(Integer, default=1)
    timestamp = Column(DateTime, default=datetime.utcnow)
    answers_data = Column(JSON)  # Store individual question responses
    
    # Relationships
    user = relationship("User", back_populates="quiz_attempts")
    topic = relationship("Topic")

class PerformanceRecord(Base):
    __tablename__ = "performance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    accuracy = Column(Float)
    avg_time_seconds = Column(Float)
    total_attempts = Column(Integer)
    status = Column(String)  # strong, moderate, weak
    weakness_score = Column(Float, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="performance_records")
    topic = relationship("Topic")

class WeakTopic(Base):
    __tablename__ = "weak_topics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    weakness_score = Column(Float)
    reason = Column(String)
    identified_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)

class LearningSession(Base):
    __tablename__ = "learning_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    login_time = Column(DateTime, default=datetime.utcnow)
    logout_time = Column(DateTime, nullable=True)
    study_duration = Column(Integer, nullable=True)
    topics_completed = Column(Integer, default=0)
    
    user = relationship("User", back_populates="learning_sessions")

class RecommendationFeedback(Base):
    __tablename__ = "recommendation_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content_id = Column(Integer, ForeignKey("content.id"))
    recommended_at = Column(DateTime, default=datetime.utcnow)
    clicked = Column(Boolean, default=False)
    opened_at = Column(DateTime, nullable=True)
    time_spent = Column(Integer, default=0)  # in seconds
    completed = Column(Boolean, default=False)
    liked = Column(Boolean, default=False)
    bookmarked = Column(Boolean, default=False)
    rating = Column(Float, nullable=True)
    
    user = relationship("User", back_populates="recommendation_feedback")
    content = relationship("Content")

class PredictionHistory(Base):
    __tablename__ = "prediction_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"))
    prediction = Column(String)  # Weak, Moderate, Strong
    confidence = Column(Float)
    model_version = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    topic = relationship("Topic")

class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    recommendation_type = Column(String)  # video, quiz, revision
    resource_id = Column(String)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
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

class QuestionBank(Base):
    __tablename__ = "question_bank"
    
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    difficulty = Column(String)
    question = Column(String, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    correct_answer = Column(String, nullable=False)
    explanation = Column(String)
    estimated_time = Column(Integer)
    tags = Column(JSON)
    bloom_level = Column(String)
    learning_outcome = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    topic = relationship("Topic")
