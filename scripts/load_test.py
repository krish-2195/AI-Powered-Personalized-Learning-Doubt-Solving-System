import requests
import time
import concurrent.futures

BASE_URL = "http://127.0.0.1:8000"
NUM_REQUESTS = 100

def fetch_dashboard(i):
    # Using user_id 1
    start = time.time()
    res = requests.get(f"{BASE_URL}/api/dashboard/?user_id=1")
    duration = time.time() - start
    return res.status_code, duration

def main():
    print(f"\n--- Stress Testing ({NUM_REQUESTS} requests) ---")
    
    success_count = 0
    total_time = 0
    
    start_all = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = executor.map(fetch_dashboard, range(NUM_REQUESTS))
        
        for status, duration in results:
            if status == 200:
                success_count += 1
            total_time += duration
            
    wall_time = time.time() - start_all
    avg_time = (total_time / NUM_REQUESTS) * 1000  # ms
    
    print(f"Total Requests: {NUM_REQUESTS}")
    print(f"Successful: {success_count}/{NUM_REQUESTS}")
    print(f"Average Response Time: {avg_time:.2f} ms")
    print(f"Wall Time: {wall_time:.2f} s")
    
if __name__ == "__main__":
    main()
