import requests
from .config import BASE_URL, STATE, print_result, get_headers

def run():
    print("\n--- Quiz Engine & ML Prediction Testing ---")
    all_passed = True
    
    user_id = STATE.get("user_id")
    if not user_id:
        return False
        
    headers = get_headers()
    
    # Submit Quiz 1 (Poor Performance)
    res = requests.post(f"{BASE_URL}/api/learning/quiz/submit", json={
        "user_id": str(user_id),
        "topic": "Trees",
        "quiz_id": "test_quiz_id",
        "questions_count": 10,
        "correct_answers": 2,
        "time_taken_seconds": 300,
        "attempt_number": 1,
        "difficulty": "Medium",
        "topic_id": 1,
        "avg_time_per_question": 30.0
    }, headers=headers)
    
    passed = res.status_code == 200
    res_json = {}
    data = {}
    if passed:
        try:
            res_json = res.json()
            data = res_json.get("data", res_json)
        except Exception:
            pass
    passed &= "ml_prediction" in data
    
    all_passed &= print_result("Submit Quiz & Generate ML Prediction", passed, res.text)
    
    # Verify Confidence Thresholding
    ml_pred = data.get("ml_prediction", {})
    confidence = ml_pred.get("confidence", 0)
    passed = confidence > 0
    all_passed &= print_result("ML Prediction Confidence Scored", passed)
    
    return all_passed
