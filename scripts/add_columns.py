import sys
import os

# Add current directory to path so database.connection can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN longest_streak INTEGER DEFAULT 0"))
        conn.commit()
        print("Added longest_streak")
    except Exception as e:
        print("Error longest_streak:", e)
        conn.rollback()
        
    try:
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN last_check_in TIMESTAMP"))
        conn.commit()
        print("Added last_check_in")
    except Exception as e:
        print("Error last_check_in:", e)
        conn.rollback()
