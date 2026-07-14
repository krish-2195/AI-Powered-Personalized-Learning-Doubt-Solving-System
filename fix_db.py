from database.connection import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("Promoting ptlkrish.19@gmail.com...")
    conn.execute(text("UPDATE users SET role = 'super_admin' WHERE email = 'ptlkrish.19@gmail.com'"))
    
    print("Fixing missing updated_at columns...")
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
    
    conn.commit()
    
    print("\nCurrent Users:")
    result = conn.execute(text("SELECT email, role FROM users")).fetchall()
    for r in result:
        print(f'{r[0]} - {r[1]}')
        if 'admin' in r[0]:
            print(f"--> Found potential admin account: {r[0]}")
            # Promote this one too
            conn.execute(text(f"UPDATE users SET role = 'super_admin' WHERE email = '{r[0]}'"))
            print(f"--> Promoted {r[0]} to super_admin")
    
    conn.commit()
