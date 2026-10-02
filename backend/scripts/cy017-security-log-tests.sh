#!/usr/bin/env bash
#
# CY017 security logging - live test run
#
# Sends a set of requests to the running Docker stack and checks, for each one,
# the HTTP response AND the matching security record in the container logs.
# Each request carries its own x-request-id, so the record is found by
# request_id rather than by time.
#
# Usage (from backend/):   bash scripts/cy017-security-log-tests.sh
# Needs: docker, curl, jq, and the stack running (docker compose up -d).
#
# Passwords are read from the terminal (hidden) and never written to disk.
# Some tests need a token that cannot be obtained by logging in (an expired one,
# or one for a user that does not exist). Those are created INSIDE the container
# with the JWT secret already configured there; the secret never leaves the
# container and is never printed. Tokens are held in memory only.
#
# Side effects: logs in as the analyst test user twice and refreshes once (this
# replaces that user's stored token, so any open session for that user is
# logged out) and creates a few auth_failure records. Nothing else changes.
#
# Optional environment overrides:
#   BASE_URL (default http://localhost:3001)
#   ANALYST_USER (default analyst_test1)   ADMIN_USER (default admin1)
#   GATEWAY_CONTAINER (default api-gateway)   USER_CONTAINER (default user-service)

set -u

BASE_URL="${BASE_URL:-http://localhost:3001}"
ANALYST_USER="${ANALYST_USER:-analyst_test1}"
ADMIN_USER="${ADMIN_USER:-admin1}"
GW="${GATEWAY_CONTAINER:-api-gateway}"
US="${USER_CONTAINER:-user-service}"
NO_SUCH_USER_ID="00000000-0000-0000-0000-000000000000"

for bin in docker curl jq; do
  command -v "$bin" >/dev/null 2>&1 || { echo "Missing required tool: $bin"; exit 2; }
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
EVIDENCE_DIR="$SCRIPT_DIR/../logs"
EVIDENCE="$EVIDENCE_DIR/cy017-test-run-$RUN_ID.ndjson"
SUMMARY="$EVIDENCE_DIR/cy017-test-run-$RUN_ID.txt"
mkdir -p "$EVIDENCE_DIR"
: > "$EVIDENCE"

BODY="$(mktemp)"; HDRS="$(mktemp)"; RESULTS="$(mktemp)"
PW=""; ADMIN_PW=""; T1=""; RT=""; TA=""; XT=""
cleanup() { rm -f "$BODY" "$HDRS" "$RESULTS"; PW=""; ADMIN_PW=""; T1=""; RT=""; TA=""; XT=""; }
trap cleanup EXIT

PASS=0; FAIL=0; TOTAL=0
LAST_STATUS=""; LAST_MSG=""

# ---------- helpers ----------

# rid NN -> a request id the gateway accepts (^[A-Za-z0-9._-]{8,64}$)
rid() { echo "cy017-$RUN_ID-$1"; }

# row NN NAME HTTP EXPECTED RESULT -> one line of the results table
# EXPECTED is written as "event / reason"; every test row is also kept for the final summary table.
row() {
  printf '%-4s %-30s %-4s %-54s %s\n' "$1" "$2" "$3" "$4" "$5" | tee -a "$SUMMARY"
  [ "$1" != "#" ] && printf '%s|%s|%s\n' "$1" "$4" "${5%% *}" >> "$RESULTS"
  return 0
}

# http METHOD PATH RID [AUTH_HEADER] [yes = send JSON body from stdin]
# RID "-" sends no x-request-id header. Response headers are kept in $HDRS.
http() {
  local method="$1" path="$2" id="$3" auth="${4:-}" stdin="${5:-no}"
  local args=(-s -o "$BODY" -D "$HDRS" -w '%{http_code}' -X "$method")
  [ "$id" != "-" ] && args+=(-H "x-request-id: $id")
  [ -n "$auth" ] && args+=(-H "Authorization: $auth")
  if [ "$stdin" = "yes" ]; then args+=(-H "Content-Type: application/json" --data-binary @-); fi
  LAST_STATUS="$(curl "${args[@]}" "$BASE_URL$path")"
  LAST_MSG="$(jq -r '.message // empty' "$BODY" 2>/dev/null)"
}

# login USER PASSWORD RID -> sets LAST_STATUS; the response body stays in $BODY
# (here-string, not a pipe: a pipe would run http in a subshell and lose LAST_STATUS)
login() {
  http POST /api/users/auth/login "$3" "" yes <<< "$(jq -n --arg u "$1" --arg p "$2" '{username:$u,password:$p}')"
}

# refresh REFRESH_TOKEN RID -> POST /auth/refresh with the token in the body
refresh() {
  http POST /api/users/auth/refresh "$2" "" yes <<< "$(jq -n --arg t "$1" '{refresh_token:$t}')"
}

# mint CONTAINER SECRET_VAR EXPIRES_IN USER_ID -> prints a test JWT signed inside
# the container with the secret it already has. The secret is never printed.
mint() {
  docker exec "$1" node -e '
    const jwt = require("jsonwebtoken");
    const s = process.env[process.argv[1]] || process.env.JWT_SECRET;
    if (!s) process.exit(3);
    process.stdout.write(jwt.sign(
      { user_id: process.argv[3], username: "cy017_test", role: "analyst" },
      s, { expiresIn: process.argv[2] }));
  ' "$2" "$3" "$4" 2>/dev/null
}

# records CONTAINER RID -> the security records (NDJSON) carrying that request_id.
# RID "since:<epoch>" returns every security record logged since that time instead
# (used where the service has no request_id to match on).
records() {
  if [ "${2#since:}" != "$2" ]; then
    docker logs --since "${2#since:}" "$1" 2>&1 | grep '^{' \
      | jq -c -R 'fromjson?' 2>/dev/null
  else
    docker logs --since 20m "$1" 2>&1 | grep '^{' \
      | jq -c -R --arg r "$2" 'fromjson? | select(.request_id == $r)' 2>/dev/null
  fi
}

# wait_records CONTAINER RID FILTER -> polls up to 6s until FILTER matches
wait_records() {
  local out="" i
  for i in 1 2 3 4 5 6; do
    out="$(records "$1" "$2")"
    [ -n "$out" ] && echo "$out" | jq -s -e "$3" >/dev/null 2>&1 && break
    sleep 1
  done
  echo "$out"
}

# leak_check RECORDS -> fails if token or password material is in the records
leak_check() {
  local recs="$1"
  [ -z "$recs" ] && return 0
  echo "$recs" | grep -q 'eyJ' && return 1
  echo "$recs" | grep -qi 'bearer ' && return 1
  [ -n "$PW" ] && echo "$recs" | grep -qF -- "$PW" && return 1
  [ -n "$ADMIN_PW" ] && echo "$recs" | grep -qF -- "$ADMIN_PW" && return 1
  return 0
}

# check NN NAME EXPECTED_STATUS CONTAINER RID JQ_FILTER EXPECTED_TEXT
# JQ_FILTER runs over an array of this request's records and must return true.
# JQ_FILTER=NONE means "no denial record may exist" (control test).
check() {
  local nn="$1" name="$2" want="$3" container="$4" id="$5" filter="$6" expect="$7"
  local got="$LAST_STATUS" recs ok="PASS" note=""
  TOTAL=$((TOTAL+1))
  if [ "$filter" = "NONE" ]; then
    sleep 2; recs="$(records "$container" "$id")"
  else
    recs="$(wait_records "$container" "$id" "$filter")"
  fi
  # for time-based matching, keep only the records the filter is about
  if [ "${id#since:}" != "$id" ] && [ "$filter" != "NONE" ]; then
    recs="$(echo "$recs" | jq -c "select(${filter#any(.[]; } " 2>/dev/null | sed '/^$/d')"
  fi
  [ -n "$recs" ] && echo "$recs" >> "$EVIDENCE"

  if ! echo "$got" | grep -Eq "^($want)$"; then ok="FAIL"; note="status $got, expected $want"; fi
  if [ "$filter" = "NONE" ]; then
    if [ -n "$(echo "$recs" | jq -c 'select(.event_type=="rbac_denied" or .event_type=="access_restricted" or .event_type=="token_invalid")' 2>/dev/null)" ]; then
      ok="FAIL"; note="${note:+$note; }unexpected denial record"
    fi
  elif ! echo "$recs" | jq -s -e "$filter" >/dev/null 2>&1; then
    ok="FAIL"; note="${note:+$note; }record missing or fields differ"
  fi
  if ! leak_check "$recs"; then ok="FAIL"; note="${note:+$note; }SECRET MATERIAL IN RECORD"; fi

  if [ "$ok" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  row "$nn" "$name" "$got" "$expect" "$ok${note:+ ($note)}"
}

# fail_row NN NAME EXPECTED NOTE -> a test that could not be run counts as a failure
fail_row() { TOTAL=$((TOTAL+1)); FAIL=$((FAIL+1)); row "$1" "$2" "-" "$3" "FAIL ($4)"; }

any() { echo "any(.[]; $1)"; }

# ---------- start ----------

echo "CY017 security logging test run $RUN_ID against $BASE_URL" | tee "$SUMMARY"
curl -s -o /dev/null "$BASE_URL/health" || { echo "Gateway not reachable at $BASE_URL - is the stack up?"; exit 2; }

printf '%s password: ' "$ANALYST_USER"; read -rs PW; echo
printf '%s password (Enter to skip the admin control test): ' "$ADMIN_USER"; read -rs ADMIN_PW; echo
[ -z "$PW" ] && { echo "Analyst password is required."; exit 2; }

JESSICA_BEFORE="$(docker logs --since 20m "$GW" 2>&1 | grep -c 'SECURITY EVENT DETECTED')"

echo | tee -a "$SUMMARY"
row "#" "Test" "HTTP" "Expected record" "Result"

# ---- requests with no valid login ----

# 01 no Authorization header
ID="$(rid 01)"; http GET /api/users/user "$ID"
check 01 "No Authorization header" 401 "$GW" "$ID" \
  "$(any '.event_type=="access_restricted" and .details.cause=="missing_authorization_header"')" \
  "access_restricted / missing_authorization_header"

# 02 non-Bearer scheme
ID="$(rid 02)"; http GET /api/users/user "$ID" "Basic abc"
check 02 "Non-Bearer header" 401 "$GW" "$ID" \
  "$(any '.event_type=="access_restricted" and .details.cause=="non_bearer_authorization_scheme"')" \
  "access_restricted / non_bearer_authorization_scheme"

# 03 malformed token
ID="$(rid 03)"; http GET /api/users/user "$ID" "Bearer notatoken"
check 03 "Malformed token" 401 "$GW" "$ID" \
  "$(any '.event_type=="token_invalid" and .reason=="malformed"')" \
  "token_invalid / malformed"

# 04 expired access token (created inside the gateway container, expired 1h ago)
XT="$(mint "$GW" AUTH_JWT_SECRET -1h "$NO_SUCH_USER_ID")"
if [ -n "$XT" ]; then
  ID="$(rid 04)"; http GET /api/users/user "$ID" "Bearer $XT"
  check 04 "Expired access token" 401 "$GW" "$ID" \
    "$(any '.event_type=="token_invalid" and .reason=="expired" and .severity=="low"')" \
    "token_invalid / expired (severity low)"
else
  fail_row 04 "Expired access token" "token_invalid / expired" "could not create test token"
fi

# 05 valid token for a user that does not exist (created inside the gateway container)
XT="$(mint "$GW" AUTH_JWT_SECRET 5m "$NO_SUCH_USER_ID")"
if [ -n "$XT" ]; then
  ID="$(rid 05)"; http GET /api/users/user "$ID" "Bearer $XT"
  check 05 "Token for unknown user" 401 "$GW" "$ID" \
    "$(any '.event_type=="access_restricted" and .details.cause=="user_not_found"')" \
    "access_restricted / user_not_found"
else
  fail_row 05 "Token for unknown user" "access_restricted / user_not_found" "could not create test token"
fi
XT=""

# 06 no x-request-id sent: the gateway must generate a UUID and put it on the record
http GET /api/users/user "-"
GEN_ID="$(grep -i '^x-request-id:' "$HDRS" | tr -d '\r' | awk '{print $2}')"
if echo "$GEN_ID" | grep -Eqi '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
  check 06 "Generated request_id" 401 "$GW" "$GEN_ID" \
    "$(any '.event_type=="access_restricted"')" \
    "request_id / generated UUID on record"
else
  fail_row 06 "Generated request_id" "request_id / generated UUID on record" "no UUID in x-request-id response header"
fi

# ---- login failures ----

# 07 wrong password for a real user
ID="$(rid 07)"; login "$ANALYST_USER" "cy017-wrong-password" "$ID"; MSG_BAD="$LAST_MSG"
check 07 "Login, wrong password" 401 "$US" "$ID" \
  "$(any '.event_type=="auth_failure" and .reason=="bad_password" and (.user_id != null) and (.role != null)')" \
  "auth_failure / bad_password (user_id, role)"

# 08 unknown user
ID="$(rid 08)"; login "cy017_no_such_user" "cy017-wrong-password" "$ID"; MSG_UNKNOWN="$LAST_MSG"
check 08 "Login, unknown user" 401 "$US" "$ID" \
  "$(any '.event_type=="auth_failure" and .reason=="unknown_user" and (.user_id == null)')" \
  "auth_failure / unknown_user (no user_id)"

# 08b the client must not be able to tell 07 and 08 apart
TOTAL=$((TOTAL+1))
if [ -n "$MSG_BAD" ] && [ "$MSG_BAD" = "$MSG_UNKNOWN" ]; then
  PASS=$((PASS+1)); row 08b "Same 401 message (07 vs 08)" "-" "auth_failure / same 401 for 07 and 08" "PASS"
else
  FAIL=$((FAIL+1)); row 08b "Same 401 message (07 vs 08)" "-" "auth_failure / same 401 for 07 and 08" "FAIL (messages differ)"
fi

# ---- logged in as the analyst ----

# 09 successful login
ID="$(rid 09)"; login "$ANALYST_USER" "$PW" "$ID"; T1="$(jq -r '.access_token // empty' "$BODY")"
check 09 "Login, success" 200 "$GW" "$ID" \
  "$(any '.event_type=="token_issued" and .details.grant_type=="password"')" \
  "token_issued / grant_type=password"
[ -z "$T1" ] && { echo "Login failed - no token, stopping. Check the analyst password."; exit 1; }

# 10 analyst on an admin-only route
ID="$(rid 10)"; http GET /api/users/user "$ID" "Bearer $T1"
check 10 "Analyst -> admin route" 403 "$GW" "$ID" \
  "$(any '.event_type=="rbac_denied" and .details.check=="roles"')" \
  "rbac_denied / check=roles"

# 11 analyst logs out another user
ID="$(rid 11)"; http POST "/api/users/auth/logout/$NO_SUCH_USER_ID" "$ID" "Bearer $T1"
check 11 "Analyst -> other user logout" 403 "$GW" "$ID" \
  "$(any '.event_type=="rbac_denied" and .details.check=="self_or_roles"')" \
  "rbac_denied / check=self_or_roles"

# 12 tampered signature
ID="$(rid 12)"; http GET /api/users/user "$ID" "Bearer ${T1}x"
check 12 "Tampered signature" 401 "$GW" "$ID" \
  "$(any '.event_type=="token_invalid" and .reason=="bad_signature"')" \
  "token_invalid / bad_signature"

# 13 superseded token: log in again (>1s later, see finding 8), then reuse the first token
sleep 2
login "$ANALYST_USER" "$PW" "$(rid 13a)"; RT="$(jq -r '.refresh_token // empty' "$BODY")"
ID="$(rid 13)"; http GET /api/users/user "$ID" "Bearer $T1"
check 13 "Superseded token" 401 "$GW" "$ID" \
  "$(any '.event_type=="access_restricted" and .details.cause=="token_no_longer_matches_account" and .severity=="high"')" \
  "access_restricted / token_no_longer_matches_account"

# 14 refresh with the current refresh token (run after 10-13: a refresh replaces the access token)
if [ -n "$RT" ]; then
  ID="$(rid 14)"; refresh "$RT" "$ID"
  check 14 "Refresh, success" 200 "$GW" "$ID" \
    "$(any '.event_type=="token_issued" and .details.grant_type=="refresh_token"')" \
    "token_issued / grant_type=refresh_token"
else
  fail_row 14 "Refresh, success" "token_issued / grant_type=refresh_token" "login returned no refresh token"
fi
RT=""

# 15 expired refresh token (created inside user-service with its refresh secret).
# user-service gets no request_id for refresh yet, so the record is matched by time.
XT="$(mint "$US" AUTH_JWT_REFRESH_SECRET -1h "$NO_SUCH_USER_ID")"
if [ -n "$XT" ]; then
  SINCE="$(( $(date +%s) - 1 ))"
  refresh "$XT" "$(rid 15)"
  check 15 "Expired refresh token" 401 "$US" "since:$SINCE" \
    "$(any '.event_type=="token_invalid" and .reason=="refresh_expired"')" \
    "token_invalid / refresh_expired (matched by time)"
else
  fail_row 15 "Expired refresh token" "token_invalid / refresh_expired" "could not create test token"
fi
XT=""

# 16 admin control (optional)
if [ -n "$ADMIN_PW" ]; then
  login "$ADMIN_USER" "$ADMIN_PW" "$(rid 16a)"; TA="$(jq -r '.access_token // empty' "$BODY")"
  ID="$(rid 16)"; http GET /api/users/user "$ID" "Bearer $TA"
  check 16 "Admin -> admin route (control)" "2[0-9][0-9]" "$GW" "$ID" NONE "(control) / admin route, no denial record"
else
  row 16 "Admin control" "-" "(control) / admin route, no denial record" "SKIP (no admin password)"
fi

# 17 persistent audit file inside the gateway container
TOTAL=$((TOTAL+1))
IN_FILE="$(docker exec "$GW" sh -c "grep -c '$(rid 01)' logs/security.log 2>/dev/null || true")"
NON_JSON="$(docker exec "$GW" sh -c "grep -vc '^{' logs/security.log 2>/dev/null || true")"
if [ "${IN_FILE:-0}" -ge 1 ] 2>/dev/null && [ "${NON_JSON:-0}" -eq 0 ] 2>/dev/null; then
  PASS=$((PASS+1)); row 17 "Audit file written" "-" "audit file / security.log has test 01, JSON only" "PASS"
else
  FAIL=$((FAIL+1)); row 17 "Audit file written" "-" "audit file / security.log has test 01, JSON only" "FAIL (test 01 lines: ${IN_FILE:-none}, non-JSON lines: ${NON_JSON:-none})"
fi

JESSICA_AFTER="$(docker logs --since 20m "$GW" 2>&1 | grep -c 'SECURITY EVENT DETECTED')"
printf '%s|%s|%s\n' "-" "rate_limit_exceeded / rate_limit_hit" "NOT-TESTED" >> "$RESULTS"

{
  echo
  echo "SUMMARY"
  printf '%-4s %-22s %-48s %s\n' "#" "Event" "Reason" "Result"
  printf '%-4s %-22s %-48s %s\n' "----" "----------------------" "------------------------------------------------" "----------"
  while IFS='|' read -r nn expect res; do
    printf '%-4s %-22s %-48s %s\n' "$nn" "${expect%% / *}" "${expect#* / }" "$res"
  done < "$RESULTS"
} | tee -a "$SUMMARY"

echo | tee -a "$SUMMARY"
echo "NOT-TESTED: rate_limit_exceeded - the login limiter is not attached to a route yet." | tee -a "$SUMMARY"
echo "Jessica notification blocks in this run: $((JESSICA_AFTER - JESSICA_BEFORE)) (info only; 10 expected: tests 01-06 and 10-13)" | tee -a "$SUMMARY"
echo "Result: $PASS/$TOTAL passed" | tee -a "$SUMMARY"
echo "Evidence: $EVIDENCE" | tee -a "$SUMMARY"
echo "Summary:  $SUMMARY"
[ "$FAIL" -eq 0 ]
