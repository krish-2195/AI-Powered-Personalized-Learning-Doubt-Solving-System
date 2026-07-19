import pytest
from fastapi.testclient import TestClient
from backend.main import app
from database.connection import get_db
import uuid

@pytest.fixture(scope="session")
def client():
    # Use TestClient with the FastAPI app
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="function")
def db_session():
    # Get a fresh DB session for direct database assertions
    db = next(get_db())
    yield db
    db.close()

@pytest.fixture
def unique_id():
    # Generate a unique ID to avoid email conflicts during tests
    return str(uuid.uuid4())[:8]

@pytest.fixture
def auth_headers(client, unique_id):
    """Register and login a test student, returning the headers."""
    email = f"test_student_{unique_id}@example.com"
    password = "Password123!"
    
    register_payload = {
        "email": email,
        "password": password,
        "full_name": "Test Student",
        "course": "Computer Science",
        "subjects": ["Data Structures", "Algorithms"],
        "current_level": "Intermediate",
        "exam_target": "GATE 2026",
        "exam_timeline": "1 year"
    }
    client.post("/api/auth/register", json=register_payload)
    
    login_payload = {
        "email": email,
        "password": password
    }
    
    # Needs verified email (bypassed or forced via DB if needed)
    # The current auth router requires email_verified.
    # We can force verify via DB
    db = next(get_db())
    from database.models.postgres_models import User
    user = db.query(User).filter(User.email == email).first()
    user_id = None
    if user:
        user.email_verified = True
        db.commit()
        user_id = user.id
    db.close()
    
    response = client.post("/api/auth/login", json=login_payload)
    token = response.json()["data"]["token"]
    
    return {
        "Authorization": f"Bearer {token}",
        "user_id": user_id,
        "email": email
    }
