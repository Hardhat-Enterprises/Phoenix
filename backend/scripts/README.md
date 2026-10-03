# CY017 Security Logging Tests

Checks that each security event is recorded correctly. Every test sends a request, checks the HTTP response, then finds the matching security record in the container logs and checks its fields. Records are also checked for leaked tokens or passwords.

## Running the Script

Requirements: `docker`, `curl`, `jq`, and the stack running (`docker compose up -d`).

```bash
cd backend
bash scripts/cy017-security-log-tests.sh
```

- Prompts for the `analyst_test1` password and, optionally, the `admin1` password (input hidden, never saved).
- Logs the analyst test user in twice and refreshes once, so any open session for that user is logged out.
- Prints a results table and a summary table (event, reason, result). Exit code 0 means every test passed.
- Saves the matched records and the summary to `backend/logs/` (gitignored).

## Manual Testing with Postman

Base URL: `http://localhost:3001`. Watch the records in a terminal while sending requests:

```bash
docker logs -f api-gateway 2>&1 | grep --line-buffered '^{' | jq .
docker logs -f user-service 2>&1 | grep --line-buffered '^{' | jq .
```

Add a header such as `x-request-id: demo-test-01` (8–64 letters, digits, `.`, `_` or `-`) to any request. The record carries the same `request_id`, so it can be found with `grep demo-test-01`.

| Event | Reason | Script test | Postman steps | Expected response | Record (container) |
|---|---|---|---|---|---|
| `access_restricted` | `missing_authorization_header` | 01 | GET `/api/users/user`, Auth: No Auth | 401 "No token provided" | `details.cause` set (api-gateway) |
| `access_restricted` | `non_bearer_authorization_scheme` | 02 | Same request, Auth: Basic Auth with any values | 401 "No token provided" | `details.cause` set (api-gateway) |
| `token_invalid` | `malformed` | 03 | Same request, Bearer Token `notatoken` | 401 "Invalid token" | severity medium (api-gateway) |
| `token_invalid` | `expired` | 04 | Wait 15 minutes after login and reuse the token, or use an expired test token (below) | 401 "Invalid token" | severity low (api-gateway) |
| `access_restricted` | `user_not_found` | 05 | Use a test token for a user that does not exist (below) | 401 "Logged out" | `details.cause` set (api-gateway) |
| `request_id` | generated UUID | 06 | Any request without `x-request-id`. Read the `x-request-id` response header | Header holds a UUID | Record carries the same UUID (api-gateway) |
| `auth_failure` | `bad_password` | 07 | POST `/api/users/auth/login`, body `{"username":"analyst_test1","password":"wrong"}` | 401 "Invalid username or password" | `user_id` and `role` set (user-service) |
| `auth_failure` | `unknown_user` | 08 | Same request with a username that does not exist | Same 401 as `bad_password` | No `user_id` (user-service) |
| `token_issued` | `grant_type=password` | 09 | Log in with valid credentials | 200 with tokens | No token value in the record (api-gateway) |
| `rbac_denied` | `check=roles` | 10 | Analyst token → GET `/api/users/user` | 403 "Access denied" | `required_roles`, `actual_role` (api-gateway) |
| `rbac_denied` | `check=self_or_roles` | 11 | Analyst token → POST `/api/users/auth/logout/<another user id>` | 403 "You are not authorized to access this user account" | `requested_user_id` (api-gateway) |
| `token_invalid` | `bad_signature` | 12 | Add a few characters to the end of a valid token | 401 "Invalid token" | severity high (api-gateway) |
| `access_restricted` | `token_no_longer_matches_account` | 13 | Log in, copy the token, log in again 2+ seconds later, then use the first token | 401 "Logged out" | severity high (api-gateway) |
| `token_issued` | `grant_type=refresh_token` | 14 | POST `/api/users/auth/refresh`, body `{"refresh_token":"<from login>"}` | 200 with a new access token | (api-gateway) |
| `token_invalid` | `refresh_expired` | 15 | POST `/api/users/auth/refresh` with an expired refresh test token (below) | 401 "Invalid or expired refresh token" | No `request_id` yet (user-service) |
| `rate_limit_exceeded` | `rate_limit_hit` | – | Not testable yet: the login limiter is not attached to a route. Once attached, send 6 logins within 15 minutes | 429 "Too many login attempts…" | (api-gateway) |

The script also runs an admin control request (admin token on an admin route, no denial record) and checks that `logs/security.log` inside the gateway container holds only JSON security records.

## Test Tokens

Expired tokens, or tokens for a user that does not exist, cannot be obtained by logging in. Create them inside the container, where the secret is already set. The secret is not printed; only the token is.

```bash
# Expired access token (use "5m" instead of "-1h" for the user_not_found case)
docker exec api-gateway node -e 'const jwt=require("jsonwebtoken");process.stdout.write(jwt.sign({user_id:"00000000-0000-0000-0000-000000000000",username:"cy017_test",role:"analyst"},process.env.AUTH_JWT_SECRET||process.env.JWT_SECRET,{expiresIn:"-1h"}))'

# Expired refresh token
docker exec user-service node -e 'const jwt=require("jsonwebtoken");process.stdout.write(jwt.sign({user_id:"00000000-0000-0000-0000-000000000000",username:"cy017_test",role:"analyst"},process.env.AUTH_JWT_REFRESH_SECRET||process.env.JWT_SECRET,{expiresIn:"-1h"}))'
```

Do not share or commit these tokens.

## Known Gaps

- `refresh_expired` records have no `request_id`, because the refresh call does not pass gRPC metadata yet. The script matches this record by time instead.
- `rate_limit_exceeded` cannot be tested until the login limiter is attached to a route.
