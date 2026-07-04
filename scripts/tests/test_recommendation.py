import requests
from .config import BASE_URL, STATE, print_result

def run():
    print("\n--- Recommendation Engine & KG Testing ---")
    all_passed = True
    
    user_id = STATE.get("user_id")
    
    # Fetch Recommendations (Should be populated now that student is 'Weak' in Trees)
    res = requests.get(f"{BASE_URL}/api/learning/next-steps/{user_id}")
    passed = res.status_code == 200
    data = res.json()
    
    # Verify we get at least one recommendation
    passed &= len(data) > 0
    
    all_passed &= print_result("Knowledge Graph Recommendation Generation", passed, res.text)
    
    return all_passed
