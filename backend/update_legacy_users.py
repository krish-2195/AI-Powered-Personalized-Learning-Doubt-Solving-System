import sys
import os

# Add the root project directory to sys.path so we can import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import SessionLocal, engine
from sqlalchemy import text
from database.models.postgres_models import Base

def update_schema():
    # 1. Create any missing tables (like Sessions, PasswordResetTokens)
    Base.metadata.create_all(bind=engine)
    
    session = SessionLocal()
    try:
        # 2. Add missing columns to 'users' table
        queries = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR DEFAULT 'email';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_user_id VARCHAR;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;",
        ]
        
        for q in queries:
            session.execute(text(q))
            
        # 3. Update legacy users
        result = session.execute(
            text("UPDATE users SET email_verified = true, provider = 'email' WHERE email_verified = false OR email_verified IS NULL")
        )
        session.commit()
        print(f"Successfully added columns, created tables, and migrated {result.rowcount} legacy users!")
    except Exception as e:
        session.rollback()
        print(f"Error updating schema: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    update_schema()
