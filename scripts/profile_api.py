import time
import requests

BASE_URL = "http://localhost:8000/api"
USER_EMAIL = "admin@ailearn.com"
USER_PASS = "admin123"

def measure_latency(method, url, data=None, headers=None, name=""):
    start_time = time.time()
    try:
        if method == 'POST':
            res = requests.post(url, json=data, headers=headers)
        else:
            res = requests.get(url, headers=headers)
        latency_ms = (time.time() - start_time) * 1000
        print(f"[{name}] {res.status_code} | Latency: {latency_ms:.2f} ms")
        return res, latency_ms
    except Exception as e:
        print(f"[{name}] Failed: {e}")
        return None, 0

print("--- Starting Performance Test ---")

# 1. Login
res, _ = measure_latency('POST', f"{BASE_URL}/auth/login", data={"email": USER_EMAIL, "password": USER_PASS}, name="Login API")
token = res.json()["data"]["token"] if res else ""
user_id = res.json()["data"]["user_id"] if res else 1
headers = {"Authorization": f"Bearer {token}"}

# 2. Dashboard
measure_latency('GET', f"{BASE_URL}/dashboard/?user_id={user_id}", headers=headers, name="Dashboard API")

# 3. Analytics Summary
measure_latency('GET', f"{BASE_URL}/analytics/summary/{user_id}", headers=headers, name="Analytics API")

# 4. Learning Path
measure_latency('GET', f"{BASE_URL}/content/learning-path/{user_id}", headers=headers, name="Learning Path API")

# 5. Chat History
measure_latency('GET', f"{BASE_URL}/chat/history/{user_id}", headers=headers, name="Chat History API")

# 6. Profile Stats
measure_latency('GET', f"{BASE_URL}/users/stats/{user_id}", headers=headers, name="User Stats API")

# 7. Admin Stats
measure_latency('GET', f"{BASE_URL}/admin/stats", headers=headers, name="Admin Stats API")

# 8. Admin Activity
measure_latency('GET', f"{BASE_URL}/admin/activity", headers=headers, name="Admin Activity API")

print("--- Test Complete ---")
