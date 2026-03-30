# TEAVS API Endpoint Design

## 1. Create Alert
- Path: /api/alerts
- Method: POST
- Purpose: Create a new alert
- Access: Admin, Council Officer
- Request:
  - title
  - message
  - disaster_type
  - threat_type
  - severity
  - location
- Response:
  - alert_id
  - status
  - created_at


## 2. Get Alert by ID
- Path: /api/alerts/{id}
- Method: GET
- Purpose: Retrieve a specific alert
- Access: Admin, Council, Emergency Services
- Response:
  - alert details



## 3. List Alerts
- Path: /api/alerts
- Method: GET
- Purpose: Get all alerts
- Access: Admin, Council, Emergency Services



## 4. Verify Alert
- Path: /api/alerts/{id}/verify
- Method: POST
- Purpose: Verify authenticity of alert
- Access: All users (including public)
- Response:
  - valid / invalid



## 5. Update Alert Status
- Path: /api/alerts/{id}/status
- Method: PATCH
- Purpose: Update alert lifecycle
- Access: Admin
- Request:
  - status (Draft, Approved, Sent, Expired, Revoked)
