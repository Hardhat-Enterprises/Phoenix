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

# TEAVS API Request and Response Design

## 1. Create Alert
- Path: `/api/alerts`
- Method: `POST`
- Purpose: Create a new emergency alert
- Access: Admin, Council Officer

### Request
| Field | Type | Required | Description |
|---|---|---:|---|
| title | string | Yes | Short alert title |
| message | string | Yes | Main alert content |
| disaster_type | string | Yes | Type of disaster such as bushfire or flood |
| threat_type | string | Yes | Threat category such as phishing or misinformation |
| severity | string | Yes | Risk level such as low, medium, high, critical |
| location | string | Yes | Area affected by the alert |
| source | string | No | Data source or originating system |

### Response
| Field | Type | Description |
|---|---|---|
| alert_id | integer/string | Unique identifier of the alert |
| status | string | Current alert status |
| created_at | datetime | Time alert was created |
| message | string | Success confirmation |

---

## 2. Get Alert by ID
- Path: `/api/alerts/{id}`
- Method: `GET`
- Purpose: Retrieve a specific alert
- Access: Admin, Council Officer, Emergency Services

### Request
| Field | Type | Required | Description |
|---|---|---:|---|
| id | integer/string | Yes | Unique alert identifier in URL path |

### Response
| Field | Type | Description |
|---|---|---|
| alert_id | integer/string | Unique alert identifier |
| title | string | Alert title |
| message | string | Alert content |
| disaster_type | string | Type of disaster |
| threat_type | string | Threat category |
| severity | string | Risk level |
| location | string | Affected area |
| status | string | Alert lifecycle state |
| created_at | datetime | Creation timestamp |
| signature_status | string | Whether signature is valid |

---

## 3. List Alerts
- Path: `/api/alerts`
- Method: `GET`
- Purpose: Retrieve all alerts
- Access: Admin, Council Officer, Emergency Services

### Request
| Field | Type | Required | Description |
|---|---|---:|---|
| status | string | No | Filter by alert status |
| severity | string | No | Filter by severity |
| disaster_type | string | No | Filter by disaster type |

### Response
| Field | Type | Description |
|---|---|---|
| alerts | array | List of alert objects |
| total_count | integer | Number of alerts returned |

---

## 4. Verify Alert
- Path: `/api/alerts/{id}/verify`
- Method: `POST`
- Purpose: Verify whether an alert is authentic
- Access: Admin, Council Officer, Emergency Services, Public Viewer

### Request
| Field | Type | Required | Description |
|---|---|---:|---|
| id | integer/string | Yes | Unique alert identifier in URL path |
| signature | string | No | Signature value if required by design |

### Response
| Field | Type | Description |
|---|---|---|
| alert_id | integer/string | Unique alert identifier |
| verification_result | string | Valid or invalid |
| verified_at | datetime | Time verification was performed |
| message | string | Verification result message |

---

## 5. Update Alert Status
- Path: `/api/alerts/{id}/status`
- Method: `PATCH`
- Purpose: Update alert lifecycle status
- Access: Admin

### Request
| Field | Type | Required | Description |
|---|---|---:|---|
| id | integer/string | Yes | Unique alert identifier in URL path |
| status | string | Yes | New alert status such as Draft, Approved, Sent, Expired, or Revoked |

### Response
| Field | Type | Description |
|---|---|---|
| alert_id | integer/string | Unique alert identifier |
| updated_status | string | New status value |
| updated_at | datetime | Time status was updated |
| message | string | Confirmation message |
