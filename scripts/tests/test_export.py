import sys
import os
from .config import print_result

def run():
    print("\n--- Export & Retraining Pipeline Testing ---")
    all_passed = True
    
    # We will programmatically run the python scripts
    import subprocess
    
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
    
    script_export = os.path.join(os.path.dirname(__file__), '../../ml/scripts/export_training_data.py')
    res = subprocess.run([sys.executable, script_export], capture_output=True, text=True, env=env)
    
    passed = res.returncode == 0
    all_passed &= print_result("Export Real Data to CSV", passed, res.stderr)
    
    script_retrain = os.path.join(os.path.dirname(__file__), '../../ml/scripts/retrain_model.py')
    res = subprocess.run([sys.executable, script_retrain], capture_output=True, text=True, env=env)
    
    passed = res.returncode == 0
    all_passed &= print_result("Retrain Model & Version Generation", passed, res.stderr)
    
    return all_passed
