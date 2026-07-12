"""
Database connection and session management
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings
from database.models.postgres_models import Base

# PostgreSQL setup
POSTGRES_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}?sslmode=require&connect_timeout=4"
SQLITE_FALLBACK_URL = "sqlite:///./learning_platform.db"


import time

def _create_engine_with_fallback():
    max_retries = 3
    for attempt in range(max_retries):
        try:
            pg_engine = create_engine(
                POSTGRES_URL,
                pool_pre_ping=True,
                pool_recycle=1800,  # 30 minutes instead of 5 — fewer reconnections
                pool_size=10,       # More persistent connections
                max_overflow=5,     # Extra connections when busy
                pool_timeout=30,    # Wait up to 30s for a connection
                connect_args={
                    "keepalives": 1,
                    "keepalives_idle": 30,    # Send keepalive after 30s idle
                    "keepalives_interval": 10, # Retry every 10s
                    "keepalives_count": 5,     # Max retries before declaring dead
                }
            )
            with pg_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("Connected to PostgreSQL successfully")
            return pg_engine
        except Exception as err:
            if attempt < max_retries - 1:
                sleep_time = 2 ** attempt
                print(f"PostgreSQL connection attempt {attempt + 1} failed: {err}. Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)
            else:
                print(f"PostgreSQL unavailable after {max_retries} attempts, falling back to SQLite: {err}")
                
    return create_engine(
        SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )

engine = _create_engine_with_fallback()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency for getting PostgreSQL database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_postgres_db():
    """Initialize PostgreSQL database tables"""
    Base.metadata.create_all(bind=engine)
    
    # Run migrations/updates
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE learning_logs ADD COLUMN IF NOT EXISTS last_position INTEGER DEFAULT 0;"))
            conn.commit()
        except Exception:
            try:
                # SQLite fallback
                conn.execute(text("ALTER TABLE learning_logs ADD COLUMN last_position INTEGER DEFAULT 0;"))
                conn.commit()
            except Exception:
                pass # Already exists
                
    print("PostgreSQL database tables created and updated successfully")

# MongoDB setup
class MongoDBManager:
    client: AsyncIOMotorClient = None
    
    @classmethod
    def connect_db(cls):
        """Connect to MongoDB"""
        cls.client = AsyncIOMotorClient(settings.MONGODB_URL)
        print("Connected to MongoDB successfully")
    
    @classmethod
    def close_db(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            print("MongoDB connection closed")
    
    @classmethod
    def get_database(cls):
        """Get MongoDB database instance"""
        return cls.client[settings.MONGODB_DB]
    
    @classmethod
    def get_collection(cls, collection_name: str):
        """Get MongoDB collection"""
        db = cls.get_database()
        return db[collection_name]

# MongoDB collections
def get_chat_history_collection():
    return MongoDBManager.get_collection("chat_history")

def get_activity_logs_collection():
    return MongoDBManager.get_collection("activity_logs")

def get_daily_quests_collection():
    return MongoDBManager.get_collection("daily_quests")

def get_session_summary_collection():
    return MongoDBManager.get_collection("session_summary")
