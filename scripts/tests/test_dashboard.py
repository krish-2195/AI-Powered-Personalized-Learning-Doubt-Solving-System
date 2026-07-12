import requests
from .config import BASE_URL, STATE, print_result, get_headers

def run():
    print("\n--- Dashboard & Cold Start Testing ---")
    all_passed = True
    
    user_id = STATE.get("user_id")
    if not user_id:
        print_result("Dashboard tests skipped (no user_id)", False)
        return False
        
    headers = get_headers()
    
    # 1. Dashboard Cold Start
    res = requests.get(f"{BASE_URL}/api/dashboard/?user_id={user_id}", headers=headers)
    passed = res.status_code == 200
    data = {}
    if passed:
        try:
            data = res.json().get("data", {})
        except Exception:
            pass
    
    passed &= data.get("is_new_user", False) == True
    passed &= data.get("streak", 0) >= 0
    
    all_passed &= print_result("Cold Start Dashboard (New User)", passed, res.text)
    
    # 2. Content Learning Path
    res = requests.get(f"{BASE_URL}/api/content/learning-path/{user_id}", headers=headers)
    passed = res.status_code == 200
    all_passed &= print_result("Load Content from Database", passed, res.text)
    
    # 3. Analytics Empty State
    res = requests.get(f"{BASE_URL}/api/users/stats/{user_id}", headers=headers)
    passed = res.status_code == 200
    all_passed &= print_result("Load Analytics Empty State", passed, res.text)
    
    return all_passed
