"""
Database migration script for RBAC Phase 1.
Adds the invitation_tokens table to the existing database.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine
from sqlalchemy import text, inspect

def run_migration():
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    with engine.connect() as conn:
        # 1. Create invitation_tokens table if it doesn't exist
        if "invitation_tokens" not in existing_tables:
            conn.execute(text("""
                CREATE TABLE invitation_tokens (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR NOT NULL,
                    role VARCHAR NOT NULL,
                    token VARCHAR NOT NULL UNIQUE,
                    invited_by INTEGER REFERENCES users(id),
                    expires_at TIMESTAMP NOT NULL,
                    used BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX ix_invitation_tokens_token ON invitation_tokens(token);
                CREATE INDEX ix_invitation_tokens_id ON invitation_tokens(id);
            """))
            conn.commit()
            print("[OK] Created invitation_tokens table")
        else:
            print("[SKIP] invitation_tokens table already exists")
        
    print("\n[DONE] RBAC migration complete!")

if __name__ == "__main__":
    run_migration()
