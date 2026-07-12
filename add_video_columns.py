import sys
import os

# Add current directory to path so database.connection can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import engine
from sqlalchemy import text

commands = [
    # Content table
    "ALTER TABLE content ADD COLUMN description VARCHAR",
    "ALTER TABLE content ADD COLUMN youtube_video_id VARCHAR",
    "ALTER TABLE content ADD COLUMN youtube_url VARCHAR",
    "ALTER TABLE content ADD COLUMN thumbnail_url VARCHAR",
    "ALTER TABLE content ADD COLUMN estimated_time INTEGER",
    # Learning logs table
    "ALTER TABLE learning_logs ADD COLUMN started_at TIMESTAMP",
    "ALTER TABLE learning_logs ADD COLUMN ended_at TIMESTAMP",
    "ALTER TABLE learning_logs ADD COLUMN watch_duration INTEGER",
    "ALTER TABLE learning_logs ADD COLUMN completion_percentage FLOAT"
]

with engine.connect() as conn:
    for cmd in commands:
        try:
            conn.execute(text(cmd))
            conn.commit()
            print(f"Executed: {cmd}")
        except Exception as e:
            print(f"Error executing {cmd}:", e)
            conn.rollback()

print("Migration completed.")
