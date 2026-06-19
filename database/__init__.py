# Database package initialization
from database.connection import (
    get_db, 
    init_postgres_db, 
    MongoDBManager,
    get_videos_collection,
    get_quizzes_collection,
    get_materials_collection
)
from database.models.postgres_models import (
    User,
    UserProfile,
    LearningLog,
    QuizAttempt,
    PerformanceRecord,
    WeakTopic,
    ChatHistory,
    Recommendation,
    ExamReadiness
)

__all__ = [
    'get_db',
    'init_postgres_db',
    'MongoDBManager',
    'get_videos_collection',
    'get_quizzes_collection',
    'get_materials_collection',
    'User',
    'UserProfile',
    'LearningLog',
    'QuizAttempt',
    'PerformanceRecord',
    'WeakTopic',
    'ChatHistory',
    'Recommendation',
    'ExamReadiness'
]
