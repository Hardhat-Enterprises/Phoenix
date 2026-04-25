# CY007 – TEAVS API Design
## TEAVS API Endpoint Specification

**Project:** Project Phoenix – TEAVS (Trusted Emergency Alert Verification System)\
**Task Group:** CY007 – TEAVS API Design\
**Sub-task:** Define endpoints

---

## Table of Contents

1. [Overview](#overview)
2. [Standard Conventions](#standard-conventions)
   - [Authentication](#authentication)
   - [Response Format](#response-format)
   - [Rate Limits](#rate-limits)
   - [Request Size Cap](#request-size-cap)
3. [Endpoints](#endpoints)
   - [POST /api/alerts – Create Alert](#1-post-apialerts--create-alert)
   - [GET /api/alerts – List Alerts](#2-get-apialerts--list-alerts)
   - [GET /api/alerts/{id} – Get Alert by ID](#3-get-apialertsid--get-alert-by-id)
   - [POST /api/alerts/{id}/verify – Verify Alert](#4-post-apialertsidverify--verify-alert)
   - [PATCH /api/alerts/{id}/status – Update Alert Status](#5-patch-apialertsidstatus--update-alert-status)
   - [GET /api/alerts/{id}/history – Get Alert History](#6-get-apialertsidhistory--get-alert-history)
4. [Role Access Summary](#role-access-summary)
5. [Error Response Reference](#error-response-reference)

---

## Overview

This document specifies the TEAVS API endpoints for the alert creation, retrieval, verification, lifecycle management and audit trail. Each endpoint is defined with its path, method, access control, security controls, request fields, success response and error responses.

These endpoints operate within the security framework established in CY009 (Rate Limiting and Abuse Prevention) and CY010 (Document Rules). All requests must pass authentication, role enforcement and rate limiting checks before any business logic is executed. Endpoint behaviour for alert lifecycle states is defined in CY007.

---

## Standard Conventions

### Authentication

Every endpoint requires a valid JSON Web Token (JWT) in the request header, except where explicitly noted. The token must be present, unexpired and correctly signed using HMAC-SHA256 (HS256).

```
Authorization: Bearer <token>
```

Tokens expire after 15–30 minutes. Requests without a valid token are rejected with `401 Unauthorized` before any other processing occurs.

### Response Format

All endpoints return a consistent response wrapper aligned with the Phoenix platform standard:

```json
{
  "status": number,
  "message": string,
  "data": []
}
```

- `status` — HTTP status code as a number
- `message` — Human-readable result description
- `data` — Array containing the response payload; empty array `[]` for operations with no return data

### Rate Limits

| Endpoint | Method | Limit |
|---|---|---|
| `/api/alerts` | POST | 10 per minute per authenticated user |
| `/api/alerts` | GET | 60 per minute per authenticated user |
| `/api/alerts/{id}` | GET | 60 per minute per authenticated user |
| `/api/alerts/{id}/verify` | POST | 30 per minute per authenticated user |
| `/api/alerts/{id}/status` | PATCH | 20 per minute per authenticated user |
| `/api/alerts/{id}/history` | GET | 60 per minute per authenticated user |

Exceeding any limit returns `429 Too Many Requests` with a `Retry-After` header.

### Request Size Cap

All request bodies are subject to a fixed maximum payload size of **5 KB**, enforced at the API gateway before body parsing. Requests exceeding this limit return `400 Bad Request`.

---

## Endpoints

---

### 1. POST /api/alerts – Create Alert

**Purpose:** Submit a new emergency alert into the TEAVS system. The alert enters the lifecycle at `Draft` status and requires admin approval before distribution.

**Access:** `admin`, `council_officer` only

**Security controls applied:**
- JWT validation (401 if absent or invalid)
- RBAC role check (403 if role is not `admin` or `council_officer`)
- Request size check: 5 KB maximum (400 if exceeded)
- Input validation on all fields (400 with field detail if invalid)
- Rate limit: 10 POST per minute per user (429 if exceeded)
- Progressive throttling applied on rapid successive submissions
- Duplicate detection: submissions matching an existing alert on `title` + `message` + `disaster_type` + `location` within 5 minutes are flagged for review

**Request fields:**

| Field | Type | Required | Allowed Values / Format | Max Length |
|---|---|---|---|---|
| `title` | string | Yes | Plain text, no script tags | 100 characters |
| `message` | string | Yes | Plain text only | 500 characters |
| `disaster_type` | enum | Yes | `bushfire`, `flood`, `both` | — |
| `threat_type` | enum | Yes | `phishing`, `scam`, `ransomware`, `misinformation` | — |
| `severity` | enum | Yes | `low`, `medium`, `high`, `critical` | — |
| `location` | string | Yes | Letters and spaces only | 100 characters |
| `source` | string | No | Valid source identifier | 50 characters |

**Success response:** `201 Created`

```json
{
  "status": 201,
  "message": "Alert created successfully",
  "data": [
    {
      "alert_id": "string",
      "status": "Draft",
      "created_at": "timestamp"
    }
  ]
}
```

**Error responses:**

| Code | Condition |
|---|---|
| `400 Bad Request` | Missing required field, invalid enum value, field too long, or payload exceeds 5 KB |
| `401 Unauthorized` | JWT absent, malformed or expired |
| `403 Forbidden` | Authenticated user's role is not `admin` or `council_officer` |
| `429 Too Many Requests` | Rate limit exceeded; includes `Retry-After` header |

**Error response format:**

```json
{
  "status": 400,
  "message": "Invalid input",
  "data": [],
  "error": {
    "field": "severity",
    "detail": "Field 'severity' must be one of: low, medium, high, critical."
  }
}
```

---

### 2. GET /api/alerts – List Alerts

**Purpose:** Retrieve a paginated, filterable list of alerts. Supports filtering by status, severity, disaster type, location and source.

**Access:** `admin`, `council_officer`, `emergency_services`

**Security controls applied:**
- JWT validation (401 if absent or invalid)
- RBAC role check (403 if role is `public_user`)
- Rate limit: 60 GET per minute per user (429 if exceeded)

**Query parameters (all optional):**

| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by alert lifecycle status (e.g., `Draft`, `Approved`, `Sent`, `Expired`, `Revoked`) |
| `severity` | string | Filter by severity level (`low`, `medium`, `high`, `critical`) |
| `disaster_type` | string | Filter by disaster type (`bushfire`, `flood`, `both`) |
| `location` | string | Filter by affected location |
| `source` | string | Filter by originating source or system |
| `page` | integer | Page number for pagination (default: 1) |
| `limit` | integer | Number of results per page (default: 20, max: 100) |

**Success response:** `200 OK`

```json
{
  "status": 200,
  "message": "Alerts retrieved successfully",
  "data": [
    {
      "alert_id": "string",
      "title": "string",
      "disaster_type": "string",
      "severity": "string",
      "location": "string",
      "status": "string",
      "created_at": "timestamp"
    }
  ],
  "pagination": {
    "total_count": 45,
    "page": 1,
    "limit": 20,
    "total_pages": 3
  }
}
```

**Error responses:**

| Code | Condition |
|---|---|
| `401 Unauthorized` | JWT absent, malformed or expired |
| `403 Forbidden` | Role is `public_user` |
| `429 Too Many Requests` | Rate limit exceeded |

---

### 3. GET /api/alerts/{id} – Get Alert by ID

**Purpose:** Retrieve the full details of a specific alert including its current status and signature verification state.

**Access:** `admin`, `council_officer`, `emergency_services`

**Security controls applied:**
- JWT validation (401 if absent or invalid)
- RBAC role check (403 if role is `public_user`)
- Rate limit: 60 GET per minute per user (429 if exceeded)

**Path parameter:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique alert identifier |

**Success response:** `200 OK`

```json
{
  "status": 200,
  "message": "Alert retrieved successfully",
  "data": [
    {
      "alert_id": "string",
      "title": "string",
      "message": "string",
      "disaster_type": "string",
      "threat_type": "string",
      "severity": "string",
      "location": "string",
      "source": "string",
      "status": "string",
      "signature_status": "string",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

**Error responses:**

| Code | Condition |
|---|---|
| `401 Unauthorized` | JWT absent, malformed or expired |
| `403 Forbidden` | Role is `public_user` |
| `404 Not Found` | No alert found with the given ID |
| `429 Too Many Requests` | Rate limit exceeded |

---

### 4. POST /api/alerts/{id}/verify – Verify Alert

**Purpose:** Verify the cryptographic authenticity of an alert using its digital signature. Available to all authenticated users including public users.

**Access:** All authenticated users (`admin`, `council_officer`, `emergency_services`, `public_user`)

**Security controls applied:**
- JWT validation (401 if absent or invalid)
- Rate limit: 30 POST per minute per user (429 if exceeded)
- Input validation on `signature` field (400 if malformed)

**Path parameter:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique alert identifier |

**Request fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `signature` | string | Yes | The digital signature value to be verified against the alert content |

The `signature` field is required. An alert verification request submitted without a signature value cannot be processed and will return `400 Bad Request`.

**Success response:** `200 OK`

```json
{
  "status": 200,
  "message": "Alert verification complete",
  "data": [
    {
      "alert_id": "string",
      "verification_result": "valid",
      "verified_at": "timestamp",
      "detail": "Signature matches. Alert is authentic."
    }
  ]
}
```

**Error responses:**

| Code | Condition |
|---|---|
| `400 Bad Request` | Signature field is absent or malformed |
| `401 Unauthorized` | JWT absent, malformed or expired |
| `404 Not Found` | No alert found with the given ID |
| `429 Too Many Requests` | Rate limit exceeded |

---

### 5. PATCH /api/alerts/{id}/status – Update Alert Status

**Purpose:** Update the lifecycle status of an existing alert. Only administrators may change alert status. Valid transitions follow the alert lifecycle defined in CY006.

**Access:** `admin` only

**Security controls applied:**
- JWT validation (401 if absent or invalid)
- RBAC role check (403 if role is not `admin`)
- Request size check: 5 KB maximum (400 if exceeded)
- Input validation on `status` field (400 if value is not an allowed status)
- Rate limit: 20 PATCH per minute per user (429 if exceeded)

**Path parameter:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique alert identifier |

**Request fields:**

| Field | Type | Required | Allowed Values |
|---|---|---|---|
| `status` | enum | Yes | `Draft`, `Approved`, `Sent`, `Expired`, `Revoked` |

**Success response:** `200 OK`

```json
{
  "status": 200,
  "message": "Alert status updated successfully",
  "data": [
    {
      "alert_id": "string",
      "updated_status": "Approved",
      "updated_at": "timestamp"
    }
  ]
}
```

**Error responses:**

| Code | Condition |
|---|---|
| `400 Bad Request` | Invalid or disallowed status value, or payload exceeds 5 KB |
| `401 Unauthorized` | JWT absent, malformed or expired |
| `403 Forbidden` | Authenticated user's role is not `admin` |
| `404 Not Found` | No alert found with the given ID |
| `429 Too Many Requests` | Rate limit exceeded |

---

### 6. GET /api/alerts/{id}/history – Get Alert History

**Purpose:** Retrieve the full lifecycle audit trail for a specific alert. Records every status change, including who made the change, when and any associated reason. Supports accountability and post-incident review.

**Access:** `admin`, `council_officer`

**Security controls applied:**
- JWT validation (401 if absent or invalid)
- RBAC role check (403 if role is `emergency_services` or `public_user`)
- Rate limit: 60 GET per minute per user (429 if exceeded)

**Path parameter:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique alert identifier |

**Success response:** `200 OK`

```json
{
  "status": 200,
  "message": "Alert history retrieved successfully",
  "data": [
    {
      "history_id": "string",
      "alert_id": "string",
      "previous_status": "Draft",
      "new_status": "Approved",
      "changed_by_user_id": "string",
      "changed_by_role": "admin",
      "changed_at": "timestamp",
      "reason": "string"
    }
  ]
}
```

**Error responses:**

| Code | Condition |
|---|---|
| `401 Unauthorized` | JWT absent, malformed or expired |
| `403 Forbidden` | Role is `emergency_services` or `public_user` |
| `404 Not Found` | No alert found with the given ID |
| `429 Too Many Requests` | Rate limit exceeded |

---

## Role Access Summary

| Endpoint | `admin` | `council_officer` | `emergency_services` | `public_user` |
|---|---|---|---|---|
| POST /api/alerts | Yes | Yes | No | No |
| GET /api/alerts | Yes | Yes | Yes | No |
| GET /api/alerts/{id} | Yes | Yes | Yes | No |
| POST /api/alerts/{id}/verify | Yes | Yes | Yes | Yes |
| PATCH /api/alerts/{id}/status | Yes | No | No | No |
| GET /api/alerts/{id}/history | Yes | Yes | No | No |

---

## Error Response Reference

| HTTP Code | Meaning | When It Occurs |
|---|---|---|
| `400 Bad Request` | Invalid or missing input | Missing required field, invalid enum, field too long, payload over 5 KB |
| `401 Unauthorized` | Authentication failure | JWT absent, expired or malformed |
| `403 Forbidden` | Authorisation failure | Valid token but role is not permitted for this endpoint |
| `404 Not Found` | Resource not found | Alert ID does not exist |
| `429 Too Many Requests` | Rate limit exceeded | Requests exceed the per-minute threshold; `Retry-After` header included |
