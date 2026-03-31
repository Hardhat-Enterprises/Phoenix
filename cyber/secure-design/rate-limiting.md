# Rate Limiting and Abuse Prevention Design

## Overview
The PHOENIX system applies rate limiting to prevent brute-force attacks, spam alerts, API abuse, and excessive requests that could affect system availability.


## Rate Limiting Rules

### 1. Login Endpoint
- Limit: 5 requests per 15 minutes per user/IP
- Purpose: Prevent brute-force login attempts

### 2. Create Alert Endpoint
- Limit: 10 requests per minute per authenticated user
- Purpose: Prevent spam alert creation and misuse of the TEAVS system

### 3. Get Alert / List Alerts
- Limit: 60 requests per minute per user
- Purpose: Prevent excessive API load while allowing normal system use

### 4. Verify Alert Endpoint
- Limit: 30 requests per minute per IP/user
- Purpose: Prevent automated abuse while allowing public verification

### 5. Update Alert Status
- Limit: 20 requests per minute per admin user
- Purpose: Prevent misuse of alert lifecycle management


## Abuse Prevention Controls

### 1. Brute-Force Protection
- Repeated failed login attempts trigger temporary blocking
- Account or IP may be locked for a limited period after too many failures

### 2. Spam Alert Prevention
- Alert creation is restricted to authorised roles only
- Excessive alert creation attempts trigger throttling or review

### 3. API Throttling
- Requests above the allowed threshold are temporarily rejected
- The system should return a `429 Too Many Requests` response

### 4. Monitoring and Logging
- Excessive requests must be logged
- Suspicious behaviour should be flagged for review


## Example Rate Limit Table

| Endpoint | Limit | Purpose |
|---|---|---|
| `/api/login` | 5 per 15 min | Prevent brute-force login |
| `/api/alerts` POST | 10 per min | Prevent spam alerts |
| `/api/alerts` GET | 60 per min | Control API usage |
| `/api/alerts/{id}/verify` | 30 per min | Prevent automated abuse |
| `/api/alerts/{id}/status` | 20 per min | Protect admin actions |


## Response for Exceeded Limits
If a rate limit is exceeded, the API should return:
- `429 Too Many Requests`
- a message explaining that the request limit has been exceeded
- a retry time if applicable


## Conclusion
Rate limiting in PHOENIX helps maintain system availability, prevents abuse, and protects critical alert functionality from brute-force, spam, and overload attacks.