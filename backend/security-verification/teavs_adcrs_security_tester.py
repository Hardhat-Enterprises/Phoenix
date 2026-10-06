import json
import os
import urllib.request
import urllib.error

BASE = "http://localhost:3001"

ANALYST_USER = "rbac_test_analyst"
ANALYST_PASS = os.getenv("ANALYST_PASSWORD")

INGESTION_USER = "rbac_test_ingestion"
INGESTION_PASS = os.getenv("INGESTION_PASSWORD")

results = []


def request(method, path, body=None, token=None, raw=None):
    headers = {}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    if raw is not None:
        data = raw.encode()
        headers["Content-Type"] = "application/json"
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    else:
        data = None

    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return 0, str(e)


def test(name, expected, actual):
    passed = actual == expected

    results.append((name, passed, expected, actual))

    print(
        f"[{'PASS' if passed else 'FAIL'}] "
        f"{name}: expected {expected}, got {actual}"
    )


def login(username, password):
    status, body = request(
        "POST",
        "/api/users/auth/login",
        {
            "username": username,
            "password": password,
        },
    )

    if status != 200:
        return None

    return json.loads(body)["access_token"]


print("\nPHOENIX TEAVS-ADCRS SECURITY TESTER\n")


status, _ = request("GET", "/health")
test("API Gateway health", 200, status)


status, _ = request(
    "POST",
    "/api/ingestion/core",
    {},
)
test("Missing JWT rejected", 401, status)


status, _ = request(
    "POST",
    "/api/ingestion/core",
    {},
    "invalid-token-test",
)
test("Invalid JWT rejected", 401, status)


analyst_token = login(
    ANALYST_USER,
    ANALYST_PASS,
)

if analyst_token:
    status, _ = request(
        "POST",
        "/api/ingestion/core",
        {},
        analyst_token,
    )
    test("Analyst blocked by RBAC", 403, status)
else:
    print("[FAIL] Analyst login failed")


ingestion_token = login(
    INGESTION_USER,
    INGESTION_PASS,
)

if ingestion_token:

    valid_payload = {
        "url": "https://example.com/teavs-alert",
        "text": "TEAVS detected a potential phishing hazard",
        "timestamp": "2026-09-27T07:55:00+10:00",
        "hazard_type": "phishing",
        "hazard_severity": 4,
        "hazard_timestamp": "2026-09-27T07:54:00+10:00",
        "hazard_location": "VIC",
        "hazard_status": "active",
        "alert_level": "critical",
        "source": "TEAVS"
    }

    status, _ = request(
        "POST",
        "/api/ingestion/core",
        valid_payload,
        ingestion_token,
    )
    test("Ingestion service allowed", 202, status)

    status, _ = request(
        "POST",
        "/api/ingestion/core",
        {"source": "TEAVS"},
        ingestion_token,
    )
    test("Incomplete payload rejected", 400, status)

    status, _ = request(
        "POST",
        "/api/ingestion/core",
        {
            "hazard_severity": "HIGH",
            "timestamp": 12345,
            "source": 999,
        },
        ingestion_token,
    )
    test("Wrong field types rejected", 400, status)

    status, _ = request(
        "POST",
        "/api/ingestion/core",
        token=ingestion_token,
        raw='{"source":"TEAVS"',
    )
    test("Malformed JSON rejected", 400, status)

else:
    print("[FAIL] Ingestion service login failed")


passed = sum(1 for _, p, _, _ in results if p)
failed = sum(1 for _, p, _, _ in results if not p)

print("\n------------------------------")
print("TEST SUMMARY")
print("------------------------------")
print("Passed:", passed)
print("Failed:", failed)
print("Total: ", len(results))
