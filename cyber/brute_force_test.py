import requests
import time

# ============================================================
# Phoenix CY015 - AT-01 Brute Force Test
# Sub Team Leader: Himanshu Khanna
# ============================================================

BASE_URL = "http://localhost:3001"
LOGIN_ENDPOINT = f"{BASE_URL}/api/users/auth/login"
TEST_USERNAME = "analyst_test1"
WRONG_PASSWORD = "wrongpassword123"
ATTEMPTS = 15
DELAY = 1

print("=" * 60)
print("Phoenix CY015 - AT-01 Brute Force Test")
print("Endpoint:", LOGIN_ENDPOINT)
print("=" * 60)
print()

results = []

for i in range(1, ATTEMPTS + 1):
    payload = {
        "username": TEST_USERNAME,
        "password": WRONG_PASSWORD
    }
    try:
        response = requests.post(LOGIN_ENDPOINT, json=payload, timeout=10)
        status = response.status_code
        if status == 429:
            result = "PASS - Rate limited (429 Too Many Requests)"
        elif status == 401:
            result = "OK - Rejected (401 Unauthorized) - no lockout yet"
        elif status == 403:
            result = "PASS - Account locked (403 Forbidden)"
        elif status == 200:
            result = "FAIL - Login succeeded with wrong password!"
        else:
            result = f"UNEXPECTED - Status {status}"
        print(f"Attempt {i:02d}: Status {status} - {result}")
        results.append({"attempt": i, "status": status, "result": result})
    except requests.exceptions.ConnectionError:
        print(f"Attempt {i:02d}: CONNECTION ERROR - Check if test environment URL is correct")
        break
    except requests.exceptions.Timeout:
        print(f"Attempt {i:02d}: TIMEOUT - Server took too long to respond")
        break
    time.sleep(DELAY)

print()
print("=" * 60)
print("TEST COMPLETE - SUMMARY")
print("=" * 60)

rate_limited = any(r["status"] == 429 for r in results)
locked = any(r["status"] == 403 for r in results)

if rate_limited:
    print("RESULT: PASS - System rate limited after multiple failed attempts")
elif locked:
    print("RESULT: PASS - Account locked after multiple failed attempts")
else:
    print("RESULT: FAIL - System did NOT rate limit or lock account after", ATTEMPTS, "failed attempts")
    print("RECOMMENDATION: Implement rate limiting or account lockout on the login endpoint")

print()
print("Take a screenshot of this output for your test evidence!")
print("=" * 60)