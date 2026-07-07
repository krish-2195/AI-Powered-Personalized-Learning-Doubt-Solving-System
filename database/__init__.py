# Database package initialization
from database.connection import (
    get_db, 
    init_postgres_db, 
    MongoDBManager,
    get_chat_history_collection,
    get_activity_logs_collection,
    get_daily_quests_collection
)
from database.models.postgres_models import (
    User,
    UserProfile,
    LearningLog,
    QuizAttempt,
    PerformanceRecord,
    WeakTopic,
    Recommendation,
    ExamReadiness,
    QuestionBank,
    Subject,
    Topic,
    Content,
    TopicPerformance
)

__all__ = [
    'get_db',
    'init_postgres_db',
    'MongoDBManager',
    'get_chat_history_collection',
    'get_activity_logs_collection',
    'get_daily_quests_collection',
    'User',
    'UserProfile',
    'LearningLog',
    'QuizAttempt',
    'PerformanceRecord',
    'WeakTopic',
    'Recommendation',
    'ExamReadiness',
    'QuestionBank',
    'Subject',
    'Topic',
    'Content',
    'TopicPerformance'
]
