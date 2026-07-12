import sys
import os

# Add current directory to path so database.connection can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine
from sqlalchemy import text

commands = [
    "ALTER TABLE content ADD COLUMN IF NOT EXISTS program VARCHAR",
    "ALTER TABLE content ADD COLUMN IF NOT EXISTS tags VARCHAR"
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
