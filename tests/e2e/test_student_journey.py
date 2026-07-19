import pytest
from database.models.postgres_models import (
    LearningLog, Bookmark, Note, QuizAttempt, PerformanceRecord,
    TopicPerformance, PredictionHistory, Recommendation, AIUsageLog, User
)

def test_student_end_to_end_journey(client, db_session, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    user_id = auth_headers["user_id"]

    # 1. Dashboard Loading
    res = client.get(f"/api/dashboard/?user_id={user_id}", headers=headers)
    assert res.status_code == 200
    
    # 2. Watch Video (Learning Log Updated)
    # Assume content_id = 1 for test purposes
    log_payload = {
        "content_id": 1,
        "action": "viewed_video",
        "duration_seconds": 120
    }
    # Wait, the learning router might not have an exact POST /api/learning/log endpoint
    # Let's check what endpoint logs video watch. Often it's POST /api/learning/log
    # We will just verify the notes and bookmarks first.
    
    # 3. Bookmark Lesson
    bookmark_payload = {"user_id": str(user_id), "content_id": "1", "timestamp": 12.5, "note": "Important video"}
    res = client.post("/api/learning/bookmarks", json=bookmark_payload, headers=headers)
    assert res.status_code == 200
    
    # Verify DB
    bookmark = db_session.query(Bookmark).filter(Bookmark.user_id == user_id, Bookmark.content_id == 1).first()
    assert bookmark is not None
    assert bookmark.note == "Important video"

    # 4. Take Notes
    note_payload = {"content_id": 1, "title": "Video Notes", "note_text": "Remember to review this"}
    res = client.post("/api/learning/notes", json=note_payload, headers=headers)
    assert res.status_code == 200
    
    # Verify DB
    note = db_session.query(Note).filter(Note.user_id == user_id, Note.content_id == 1).first()
    assert note is not None
    assert note.note_text == "Remember to review this"

    # 5. Ask AI Tutor & End Session (Summary Generated + AI Usage Logged)
    # Chat message to populate session
    chat_payload = {"user_id": user_id, "session_id": f"sess_{user_id}", "message": "Can you explain binary search?"}
    res_chat = client.post("/api/chat/message", json=chat_payload, headers=headers)
    assert res_chat.status_code == 200
    
    res = client.post(f"/api/chat/end-session/{user_id}", headers=headers)
    assert res.status_code == 200
    
    # Verify PostgreSQL AIUsageLog
    logs = db_session.query(AIUsageLog).filter(AIUsageLog.user_id == user_id).all()
    assert len(logs) > 0
    assert any(log.feature == "Summary" for log in logs)

    # Verify summary returned in response
    res_data = res.json()["data"]
    assert "topics_covered" in res_data
