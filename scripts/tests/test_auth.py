import requests
import random
from .config import BASE_URL, STATE, print_result

def run():
    print("\n--- Authentication & Security Testing ---")
    all_passed = True
    
    # 1. Register
    email = f"test_{random.randint(1000, 99999)}@example.com"
    res = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "securepassword123",
        "full_name": "Test User",
        "course": "B.Tech Computer Science",
        "subjects": ["Data Structures", "Algorithms", "DBMS", "Operating Systems", "Computer Networks"],
        "current_level": "Beginner",
        "exam_target": "GATE CS",
        "exam_timeline": "6 months"
    })
    
    passed = res.status_code == 200 and "token" in res.json().get("data", {})
    all_passed &= print_result("Register New User", passed, res.text)
    
    if passed:
        STATE["user_id"] = res.json()["data"]["user_id"]
        STATE["token"] = res.json()["data"]["token"]
        STATE["email"] = email
        
    # 2. Login
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": "securepassword123"
    })
    passed = res.status_code == 200
    all_passed &= print_result("Login with Correct Credentials", passed, res.text)
    
    # 3. Wrong Password
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": "wrongpassword!"
    })
    passed = res.json().get("success") == False
    all_passed &= print_result("Reject Wrong Password", passed)
    
    # 4. Duplicate Email
    res = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "anotherpassword",
        "full_name": "Duplicate",
        "course": "B.Tech Computer Science",
        "subjects": ["Data Structures", "Algorithms"],
        "current_level": "Beginner",
        "exam_target": "GATE CS",
        "exam_timeline": "6 months"
    })
    passed = res.json().get("success") == False
    all_passed &= print_result("Reject Duplicate Email", passed)
    
    return all_passed
