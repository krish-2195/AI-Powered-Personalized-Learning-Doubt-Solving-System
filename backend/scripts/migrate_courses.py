import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine
from database.models.postgres_models import Course, Base
from sqlalchemy import inspect

def run_migration():
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    if "courses" not in existing_tables:
        print("[INFO] Creating courses table...")
        # Only create the courses table
        Course.__table__.create(engine)
        print("[OK] Created courses table successfully.")
    else:
        print("[SKIP] courses table already exists.")

if __name__ == "__main__":
    run_migration()
