import os
BASE_URL = "http://127.0.0.1:8000"
STATE = {}

def print_result(name, success, error_msg=""):
    symbol = "[PASS]" if success else "[FAIL]"
    print(f"{symbol} {name}")
    if not success and error_msg:
        print(f"   Reason: {error_msg}")
    return success

def get_headers():
    token = STATE.get("token")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}
