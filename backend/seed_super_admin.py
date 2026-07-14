import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import SessionLocal
from database.models.postgres_models import User

def seed_super_admin(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email.lower().strip()).first()
        if not user:
            print(f"❌ User with email '{email}' not found.")
            print("Please create an account through the regular registration page first.")
            return
            
        old_role = user.role
        user.role = "super_admin"
        db.commit()
        
        print(f"✅ Successfully promoted {user.full_name} ({email}) to super_admin.")
        print(f"Role changed from '{old_role}' to 'super_admin'.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python seed_super_admin.py <your-email>")
        sys.exit(1)
        
    seed_super_admin(sys.argv[1])
