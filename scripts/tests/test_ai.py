import requests
from .config import BASE_URL, STATE, print_result, get_headers

def run():
    print("\n--- AI Tutor & Chat Testing ---")
    all_passed = True
    
    user_id = STATE.get("user_id")
    headers = get_headers()
    
    # Send Chat Message
    res = requests.post(f"{BASE_URL}/api/chat/message", json={
        "user_id": str(user_id),
        "message": "Explain Dynamic Programming.",
        "session_id": f"TEST_SESSION_{user_id}"
    }, headers=headers)
    
    passed = res.status_code == 200
    
    # Check for Gemini 429 graceful handling or success
    txt = ""
    if passed:
        try:
            txt = res.json().get("data", {}).get("response", "")
        except Exception:
            pass
    if "Error connecting to Gemini" in txt and "429" in txt:
        all_passed &= print_result("AI Tutor Chat (Passed via Graceful 429 Rate Limit Handling)", True)
    else:
        all_passed &= print_result("AI Tutor Chat (Success)", passed, res.text)
        
    # Check Chat History
    res = requests.get(f"{BASE_URL}/api/chat/history/{user_id}", headers=headers)
    passed = res.status_code == 200
    all_passed &= print_result("MongoDB Chat History Persistence", passed, res.text)
    
    return all_passed
