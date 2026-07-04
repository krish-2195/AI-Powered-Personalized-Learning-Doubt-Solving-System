import requests
from .config import BASE_URL, STATE, print_result

def run():
    print("\n--- Quiz Engine & ML Prediction Testing ---")
    all_passed = True
    
    user_id = STATE.get("user_id")
    if not user_id:
        return False
        
    # Submit Quiz 1 (Poor Performance)
    res = requests.post(f"{BASE_URL}/api/performance/submit", json={
        "user_id": user_id,
        "topic": "Trees",
        "topic_id": 1,
        "quiz_id": "test_quiz_id",
        "score": 2,
        "total_questions": 10,
        "time_taken": 300,
        "answers": [{"question_id": "q1", "is_correct": False, "selected_answer": "A", "time_taken_seconds": 30}]
    })
    
    passed = res.status_code == 200
    res_json = res.json()
    data = res_json.get("data", {})
    passed &= "ml_prediction" in data
    
    all_passed &= print_result("Submit Quiz & Generate ML Prediction", passed, res.text)
    
    # Verify Confidence Thresholding
    ml_pred = data.get("ml_prediction", {})
    confidence = ml_pred.get("confidence", 0)
    passed = confidence > 0
    all_passed &= print_result("ML Prediction Confidence Scored", passed)
    
    return all_passed
