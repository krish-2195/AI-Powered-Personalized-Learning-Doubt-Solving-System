import pytest
from database.models.postgres_models import User, Course, AuditLog

@pytest.fixture
def admin_headers(client, unique_id, db_session):
    email = f"admin_{unique_id}@example.com"
    
    # Direct DB injection for admin role
    user = User(
        email=email,
        hashed_password="fakehash",
        full_name="Test Admin",
        role="admin",
        email_verified=True
    )
    db_session.add(user)
    db_session.commit()
    
    # Bypass login, generate token directly
    from backend.services.auth import TokenService
    token = TokenService.create_access_token(user.id, user.email, user.role)
    
    return {
        "Authorization": f"Bearer {token}",
        "user_id": user.id
    }

def test_admin_end_to_end_journey(client, db_session, admin_headers):
    headers = {"Authorization": admin_headers["Authorization"]}
    admin_id = admin_headers["user_id"]
    
    # 1. Dashboard / AI Usage Stats
    res = client.get("/api/admin/ai-usage", headers=headers)
    assert res.status_code == 200
    
    # 2. Approve Course
    course = Course(title="Admin Test Course", instructor_id=admin_id, is_approved=False)
    db_session.add(course)
    db_session.commit()
    
    res = client.patch(f"/api/admin/courses/{course.id}/approve", headers=headers)
    assert res.status_code == 200
    
    # Verify Course is approved
    db_session.refresh(course)
    assert course.is_approved == True
    
    # Verify AuditLog
    audit = db_session.query(AuditLog).filter(
        AuditLog.user_id == admin_id,
        AuditLog.action == "APPROVE_COURSE"
    ).first()
    assert audit is not None
    assert str(course.id) in audit.details
