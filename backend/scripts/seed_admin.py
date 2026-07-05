import sys
import os
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db, engine
from database.models.postgres_models import User
from backend.routers.auth import pwd_context
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError

def seed_admin():
    # 1. Manually add role column to users table if it doesn't exist
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'student'"))
            conn.commit()
            print("Successfully added 'role' column to users table.")
        except ProgrammingError as e:
            if "already exists" in str(e):
                print("Column 'role' already exists in users table.")
            else:
                print(f"Error altering table: {e}")
        except Exception as e:
            print(f"Error altering table: {e}")

    # 2. Insert or update the admin user
    db = next(get_db())
    try:
        admin_email = "admin@ailearn.com"
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        
        if not existing_admin:
            print("Creating default admin user...")
            admin_user = User(
                email=admin_email,
                hashed_password=pwd_context.hash("admin123"),
                full_name="System Admin",
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print("Admin user created successfully.")
        else:
            print("Admin user already exists. Updating role to admin...")
            existing_admin.role = "admin"
            existing_admin.hashed_password = pwd_context.hash("admin123")
            db.commit()
            print("Admin user updated successfully.")
            
    except Exception as e:
        print(f"Error seeding admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
