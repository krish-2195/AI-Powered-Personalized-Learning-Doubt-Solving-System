import sys
from tests import test_auth, test_dashboard, test_quiz, test_recommendation, test_ai, test_export

def main():
    print("========================================")
    print("   AI LEARN FULL SYSTEM TEST RUNNER")
    print("========================================")
    
    success = True
    success &= test_auth.run()
    success &= test_dashboard.run()
    success &= test_quiz.run()
    success &= test_recommendation.run()
    success &= test_ai.run()
    success &= test_export.run()
    
    print("\n========================================")
    if success:
        print("[PASS] ALL TESTS PASSED! Project is Production-Ready.")
    else:
        print("[FAIL] SOME TESTS FAILED! Check logs above.")
        
if __name__ == "__main__":
    main()
