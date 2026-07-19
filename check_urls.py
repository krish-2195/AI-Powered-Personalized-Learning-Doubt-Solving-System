"""
URL Checker for content_repository.csv
========================================
Checks every YouTube URL in your content repository to confirm it is
reachable and returns a valid (non-404, non-private) response.

HOW TO RUN
----------
1. Make sure content_repository.csv is in the same folder as this script.
2. Install dependencies (only needed once):
       pip install requests tqdm
3. Run:
       python check_urls.py

OUTPUT
------
- Prints a live progress bar while checking.
- Writes two files in the same folder:
    url_check_results.csv   — full results for every row
    url_check_FAILED.csv    — only the rows with broken / suspect URLs

WHAT IS CHECKED
---------------
For each URL the script sends an HTTP HEAD request (no page download,
just the response code).  YouTube-specific rules:

  200  → PASS   — URL reachable
  301  → PASS   — permanent redirect (YouTube normalises some URLs this way)
  302  → PASS   — temporary redirect
  404  → FAIL   — video deleted or never existed
  403  → WARN   — access denied (may be region-locked, worth a manual check)
  429  → WARN   — rate-limited; re-run later, do NOT treat as broken
  other → WARN  — unexpected; manual check recommended

The script backs off automatically when it receives 429 responses and
retries up to 3 times before marking a URL as WARN.

CONFIGURATION
-------------
You can adjust these constants at the top of the script:
  WORKERS      — parallel threads (default 8; lower if you get many 429s)
  TIMEOUT      — seconds per request (default 10)
  MAX_RETRIES  — retries on 429 / network error (default 3)
  BACKOFF      — seconds to wait between retries (doubles each attempt)
"""

import csv
import time
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# ── Try to import optional dependencies ────────────────────────────────────────
try:
    import requests
except ImportError:
    sys.exit("ERROR: 'requests' is not installed. Run:  pip install requests")

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    print("TIP: Install tqdm for a progress bar:  pip install tqdm\n")

# ── Configuration ──────────────────────────────────────────────────────────────
WORKERS     = 8      # parallel threads
TIMEOUT     = 10     # seconds per request
MAX_RETRIES = 3      # retries on 429 / connection error
BACKOFF     = 2      # seconds; doubles each retry

from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE   = BASE_DIR / "ml" / "datasets" / "content_repository.csv"
RESULTS_FILE = "url_check_results.csv"
FAILED_FILE  = "url_check_FAILED.csv"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# ── Status classification ──────────────────────────────────────────────────────
def classify(status_code):
    if status_code in (200, 301, 302, 303, 307, 308):
        return "PASS"
    if status_code == 404:
        return "FAIL"
    if status_code == 429:
        return "WARN-RATELIMIT"
    if status_code == 403:
        return "WARN-FORBIDDEN"
    if status_code == 0:
        return "FAIL-NETWORK"
    return f"WARN-{status_code}"


def check_url(row):
    """Check a single URL. Returns the row dict with added check fields."""
    url      = row.get("url", "").strip()
    result   = dict(row)
    attempts = 0
    wait     = BACKOFF

    while attempts < MAX_RETRIES:
        attempts += 1
        try:
            resp = requests.head(
                url,
                headers=HEADERS,
                timeout=TIMEOUT,
                allow_redirects=True,
            )
            status = resp.status_code

            # YouTube sometimes needs a GET for accurate status
            if status in (405, 400):
                resp   = requests.get(url, headers=HEADERS,
                                      timeout=TIMEOUT, allow_redirects=True,
                                      stream=True)
                status = resp.status_code
                resp.close()

            if status == 429 and attempts < MAX_RETRIES:
                time.sleep(wait)
                wait *= 2
                continue

            result["http_status"]  = status
            result["check_result"] = classify(status)
            result["checked_at"]   = datetime.now().isoformat(timespec="seconds")
            result["attempts"]     = attempts
            return result

        except requests.exceptions.ConnectionError:
            if attempts < MAX_RETRIES:
                time.sleep(wait)
                wait *= 2
                continue
            result["http_status"]  = 0
            result["check_result"] = "FAIL-NETWORK"
            result["checked_at"]   = datetime.now().isoformat(timespec="seconds")
            result["attempts"]     = attempts
            return result

        except requests.exceptions.Timeout:
            result["http_status"]  = 0
            result["check_result"] = "FAIL-TIMEOUT"
            result["checked_at"]   = datetime.now().isoformat(timespec="seconds")
            result["attempts"]     = attempts
            return result

        except Exception as exc:
            result["http_status"]  = 0
            result["check_result"] = f"FAIL-ERROR: {exc}"
            result["checked_at"]   = datetime.now().isoformat(timespec="seconds")
            result["attempts"]     = attempts
            return result

    # Should not reach here, but safety net
    result["http_status"]  = 0
    result["check_result"] = "FAIL-MAX-RETRIES"
    result["checked_at"]   = datetime.now().isoformat(timespec="seconds")
    result["attempts"]     = attempts
    return result


def main():
    # ── Load input ─────────────────────────────────────────────────────────────
    if not os.path.exists(INPUT_FILE):
        sys.exit(f"ERROR: '{INPUT_FILE}' not found. "
                 f"Make sure it is in the same folder as this script.")

    with open(INPUT_FILE, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    print(f"\n{'='*60}")
    print(f"  Content Repository URL Checker")
    print(f"  Checking {len(rows)} URLs with {WORKERS} parallel workers")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # ── Run checks in parallel ──────────────────────────────────────────────────
    results = []
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(check_url, row): row for row in rows}

        if HAS_TQDM:
            bar = tqdm(total=len(futures), unit="url",
                       bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]")
        else:
            bar = None
            done = 0

        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            if bar:
                bar.update(1)
            else:
                done += 1
                if done % 25 == 0 or done == len(rows):
                    print(f"  Progress: {done}/{len(rows)}")

        if bar:
            bar.close()

    # ── Sort by original ID ─────────────────────────────────────────────────────
    try:
        results.sort(key=lambda r: int(r.get("id", 0)))
    except Exception:
        pass

    # ── Write results ───────────────────────────────────────────────────────────
    extra_fields = ["http_status", "check_result", "checked_at", "attempts"]
    all_fields   = list(rows[0].keys()) + extra_fields

    with open(RESULTS_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=all_fields)
        writer.writeheader()
        writer.writerows(results)

    failed = [r for r in results if not r["check_result"].startswith("PASS")]
    with open(FAILED_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=all_fields)
        writer.writeheader()
        writer.writerows(failed)

    # ── Summary ─────────────────────────────────────────────────────────────────
    from collections import Counter
    status_counts = Counter(r["check_result"] for r in results)

    passed = sum(1 for r in results if r["check_result"].startswith("PASS"))
    warned = sum(1 for r in results if r["check_result"].startswith("WARN"))
    failed_count = sum(1 for r in results if r["check_result"].startswith("FAIL"))

    print(f"\n{'='*60}")
    print(f"  RESULTS SUMMARY")
    print(f"{'='*60}")
    print(f"  Total checked  : {len(results)}")
    print(f"  ✅ PASS        : {passed}")
    print(f"  ⚠️  WARN        : {warned}  (manual review recommended)")
    print(f"  ❌ FAIL        : {failed_count}")
    print(f"\n  Status breakdown:")
    for status, count in sorted(status_counts.items()):
        icon = "✅" if status.startswith("PASS") else ("⚠️ " if status.startswith("WARN") else "❌")
        print(f"    {icon} {status:30s}: {count}")
    print(f"\n  Full results  → {RESULTS_FILE}")
    print(f"  Failed only   → {FAILED_FILE}")
    print(f"\n  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    if failed_count > 0:
        print("  FAILED / WARN URLs to review:")
        print(f"  {'ID':>4}  {'Subject':20s}  {'Result':25s}  URL")
        print(f"  {'-'*4}  {'-'*20}  {'-'*25}  {'-'*40}")
        for r in failed:
            print(f"  {r.get('id','?'):>4}  {r.get('subject','?'):20s}  "
                  f"{r.get('check_result','?'):25s}  {r.get('url','?')[:60]}")
        print()


if __name__ == "__main__":
    main()
