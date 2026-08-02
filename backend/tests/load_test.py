"""
Quick concurrent-request sanity check — NOT a real load test.
Just confirms the dev server doesn't fall over under light concurrent traffic.
Run: python load_test.py
"""
import time
import concurrent.futures
import urllib.request
import json

BASE_URL = "http://127.0.0.1:8001"
CONCURRENT_REQUESTS = 100
ENDPOINT = "/health"  # safe, no auth needed — swap to an authed endpoint if you want deeper testing


def hit_endpoint(i):
    start = time.time()
    try:
        req = urllib.request.Request(BASE_URL + ENDPOINT)
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            body = resp.read()
        elapsed = time.time() - start
        return {"request": i, "status": status, "elapsed_sec": round(elapsed, 3)}
    except Exception as e:
        elapsed = time.time() - start
        return {"request": i, "error": str(e), "elapsed_sec": round(elapsed, 3)}


def main():
    print(f"Firing {CONCURRENT_REQUESTS} concurrent requests to {BASE_URL}{ENDPOINT} ...\n")
    start = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT_REQUESTS) as executor:
        results = list(executor.map(hit_endpoint, range(CONCURRENT_REQUESTS)))
    total_time = time.time() - start

    success = [r for r in results if r.get("status") == 200]
    failed = [r for r in results if r.get("status") != 200]

    print(f"Total time for {CONCURRENT_REQUESTS} concurrent requests: {round(total_time, 3)}s")
    print(f"Success: {len(success)}/{CONCURRENT_REQUESTS}")
    print(f"Failed:  {len(failed)}/{CONCURRENT_REQUESTS}\n")

    if success:
        avg_time = sum(r["elapsed_sec"] for r in success) / len(success)
        max_time = max(r["elapsed_sec"] for r in success)
        print(f"Avg response time: {round(avg_time, 3)}s")
        print(f"Max response time: {round(max_time, 3)}s")

    if failed:
        print("\nFailed requests:")
        for r in failed:
            print(f"  #{r['request']}: {r.get('error', r.get('status'))}")


if __name__ == "__main__":
    main()