import pytest
import os
from database.models.postgres_models import Course, Subject, Topic, Content, User

@pytest.fixture
def instructor_headers(client, unique_id, db_session):
    email = f"instructor_{unique_id}@example.com"
    password = "Password123!"
    
    # Direct DB injection for instructor role
    user = User(
        email=email,
        hashed_password="fakehash",
        full_name="Test Instructor",
        role="instructor",
        email_verified=True
    )
    db_session.add(user)
    db_session.commit()
    
    # Using existing login, might need raw token if hashed_password is fake
    # Let's bypass and generate token directly
    from backend.services.auth import TokenService
    token = TokenService.create_access_token(user.id, user.email, user.role)
    
    return {
        "Authorization": f"Bearer {token}",
        "user_id": user.id
    }

def test_instructor_end_to_end_journey(client, db_session, instructor_headers):
    headers = {"Authorization": instructor_headers["Authorization"]}
    user_id = instructor_headers["user_id"]
    
    # 1. Create Course (Direct DB setup since no API might exist to 'create' course)
    # The instructor uploads content, which implicitly uses existing courses, or they can create them.
    # Let's verify we can just upload content.
    course = Course(title="E2E Test Course", instructor_id=user_id, is_approved=True)
    db_session.add(course)
    db_session.commit()
    course_id = course.id
    
    # 2. Upload Video
    assets_dir = os.path.join("tests", "assets")
    video_path = os.path.join(assets_dir, "sample_video.mp4")
    
    test_subject = f"Testing_{user_id}"
    with open(video_path, "rb") as f:
        res = client.post(
            "/api/instructor/upload",
            headers=headers,
            data={
                "title": "E2E Video",
                "content_type": "video",
                "course_id": course_id,
                "subject": test_subject,
                "topic": "E2E"
            },
            files={"file": ("sample_video.mp4", f, "video/mp4")}
        )
    
    assert res.status_code == 200
    assert res.json().get("success") is True, f"Upload failed: {res.json()}"
    # Verify DB updates
    subject = db_session.query(Subject).filter(Subject.course_id == course_id, Subject.name == test_subject).first()
    assert subject is not None
    
    topic = db_session.query(Topic).filter(Topic.subject_id == subject.id, Topic.name == "E2E").first()
    assert topic is not None
    
    content = db_session.query(Content).filter(Content.topic_id == topic.id, Content.title == "E2E Video").first()
    assert content is not None
    
    # 3. View Analytics
    res = client.get("/api/instructor/students-at-risk", headers=headers)
    assert res.status_code == 200
    
    res = client.get("/api/instructor/readiness-distribution", headers=headers)
    assert res.status_code == 200
