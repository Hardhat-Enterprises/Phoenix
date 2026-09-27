# CY010 – Rate Limiting & Abuse Prevention

**Project:** Project Phoenix – TEAVS (Trusted Emergency Alert Verification System)\
**Task Group:** CY010 – Rate Limiting & Abuse Prevention\
**Sub-task:** Document Rules

> **Note:** This file documents the formal security rules for all sub-tasks under CY010. Currently it contains rules for the Spam Alert Prevention (Rules 1–10). Rules from other sub-tasks will be added here as those designs are completed.

---

## Table of Contents

1. [Overview](#overview)
2. [Spam Alert Prevention Rules](#spam-alert-prevention-rules)
   - [Rule 1 – Authentication Required](#rule-1--authentication-required-for-alert-submission)
   - [Rule 2 – Role-Based Alert Creation Restriction](#rule-2--role-based-alert-creation-restriction)
   - [Rule 3 – Alert Creation Rate Limit](#rule-3--alert-creation-rate-limit)
   - [Rule 4 – Alert Submission Throttling](#rule-4--alert-submission-throttling)
   - [Rule 5 – Duplicate Alert Detection](#rule-5--duplicate-alert-detection)
   - [Rule 6 – Input Validation Before Processing](#rule-6--input-validation-before-processing)
   - [Rule 7 – Request Size Enforcement](#rule-7--request-size-enforcement)
   - [Rule 8 – Suspicious Activity Logging](#rule-8--suspicious-activity-logging)
   - [Rule 9 – Temporary Access Restriction](#rule-9--temporary-access-restriction-for-persistent-violations)
   - [Rule 10 – External Source Alert Validation](#rule-10--external-source-alert-validation)
3. [Rule Summary Table](#rule-summary-table)
4. [Alignment with Project Design](#alignment-with-project-design)

---

## Overview

This document presents the formal security rules that govern TEAVS system behaviour across all sub-tasks under CY010. Each rule is structured with a purpose, trigger condition, system response and justification so that it can be directly referenced during implementation.

These rules work alongside the authentication design (CY008), the input validation design (CY009), the rate limiting thresholds (CY010) and the alert lifecycle (CY007). Together they define the abuse prevention layer of the integrated security architecture (CY012).

---

## Spam Alert Prevention Rules

The following rules govern alert submission behaviour and form the abuse prevention layer for the Spam Alert Prevention sub-task. Rules 1–10 must all pass before an alert is admitted into the TEAVS lifecycle.

---

### Rule 1 – Authentication Required for Alert Submission

**Purpose:**
Ensure that every alert creation request is authenticated and traceable to a specific, identified user before any processing occurs.

**Trigger:**
Any request to `POST /api/alerts` is received by the API.

**System Response:**
- The system checks for a valid JWT in the `Authorization: Bearer <token>` header.
- The token signature is verified using HMAC-SHA256 (HS256).
- The token expiry (`exp` claim) is checked. Tokens are valid for 15–30 minutes.
- If the token is absent, malformed or expired, the system returns `401 Unauthorized`.
- No alert data is read, validated or processed before token validation is complete.

**Error response format:**
```json
{
  "error_code": 401,
  "error_message": "Unauthorized",
  "details": "A valid authentication token is required to submit alerts."
}
```

**Why This Rule Is Needed:**
Anonymous submissions cannot be attributed to any user, making it impossible to detect abuse patterns, revoke access from bad actors or maintain accountability for alert content. Requiring authentication as the first gate eliminates the most basic vector for mass unauthenticated spam and ensures that every submission carries an auditable identity.

---

### Rule 2 – Role-Based Alert Creation Restriction

**Purpose:**
Restrict alert creation to the roles that have operational authority and accountability within TEAVS.

**Trigger:**
An authenticated request is received at `POST /api/alerts`.

**System Response:**
- The system extracts the `role` claim from the validated JWT payload.
- If the role is not `admin` or `council_officer`, the system returns `403 Forbidden`.
- Emergency Services users (`emergency_services`) and Public Users (`public_user`) are denied alert creation regardless of token validity.
- No alert data is processed after a role rejection.

**Permitted roles for alert creation:**

| Role | Can Create Alert |
|---|---|
| `admin` | Yes |
| `council_officer` | Yes |
| `emergency_services` | No |
| `public_user` | No |

**Error response format:**
```json
{
  "error_code": 403,
  "error_message": "Forbidden",
  "details": "Your role does not permit alert creation."
}
```

**Why This Rule Is Needed:**
RBAC is the primary architectural defence against unauthorised alert creation. Without enforced role restrictions, any authenticated user — including public users — could submit alerts, enabling fake or malicious submissions at scale. Restricting creation to roles with operational accountability creates a meaningful barrier that spam attacks cannot easily circumvent.

---

### Rule 3 – Alert Creation Rate Limit

**Purpose:**
Prevent any single authenticated user from submitting alerts at a volume that exceeds legitimate operational need.

**Trigger:**
A user submits more than **10 `POST /api/alerts` requests within a rolling 60-second window**.

**System Response:**
- All requests beyond the 10-per-minute threshold return `429 Too Many Requests`.
- The response includes a `Retry-After` header specifying when the user may resume submissions.
- The rate limit counter resets after the rolling window expires.
- The violation event is logged with the user ID, IP address, timestamp and endpoint.

**Rate limit reference table (full system):**

| Endpoint | Method | Limit | Purpose |
|---|---|---|---|
| `/api/login` | POST | 5 per 15 min | Prevent brute-force login |
| `/api/alerts` | POST | 10 per min | Prevent spam alert creation |
| `/api/alerts` | GET | 60 per min | Control API load |
| `/api/alerts/{id}/verify` | POST | 30 per min | Prevent automated abuse |
| `/api/alerts/{id}/status` | PATCH | 20 per min | Protect admin lifecycle actions |

**Error response format:**
```json
{
  "error_code": 429,
  "error_message": "Too Many Requests",
  "details": "Alert creation limit exceeded. Please retry after 60 seconds.",
  "retry_after": 60
}
```

**Why This Rule Is Needed:**
Even authorised roles can be compromised or misused. Without a submission cap, a single account could flood the system with alerts, overwhelming moderators and displacing legitimate emergency communications. The 10-per-minute limit accommodates genuine multi-alert scenarios (such as compound disaster events) while making sustained abuse costly, detectable and automatically throttled.

---

### Rule 4 – Alert Submission Throttling

**Purpose:**
Progressively slow or restrict requests that exhibit patterns of rapid or excessive submission, before the hard rate limit is reached.

**Trigger:**
Repeated alert creation requests arrive in rapid succession from the same authenticated user, even if individually below the hard rate limit threshold.

**System Response:**
- The system applies progressive response delays to successive rapid requests that approach the rate limit ceiling.
- Sustained rapid submissions may result in a `429 Too Many Requests` response before the full 10-request limit is consumed.
- Normal access resumes after a cooldown period has elapsed.
- All throttle events are logged.

**Throttling applies most strictly to:**
- `POST /api/alerts` (alert creation)
- `POST /api/login` (repeated failed attempts)
- `PATCH /api/alerts/{id}/status` (admin lifecycle changes)

**Why This Rule Is Needed:**
Throttling provides a graduated response that degrades the experience for abusive or automated patterns without immediately cutting off potentially legitimate use. It acts as a buffer layer that detects intent before the hard rate limit activates, reducing the impact of burst-style abuse where an attacker submits at the maximum allowed rate continuously.

---

### Rule 5 – Duplicate Alert Detection

**Purpose:**
Detect and flag repeated or near-identical alert submissions from the same source within a defined time window to prevent content flooding even within rate limit thresholds.

**Trigger:**
A new `POST /api/alerts` request contains a **similarity key** — the combination of `title` + `message` + `disaster_type` + `location` — that matches an alert already submitted by the same authenticated user within the **last 5 minutes**. This window is separate from the rate limiting window: rate limiting tracks request volume per minute, while duplicate detection tracks content repetition over a 5-minute period regardless of submission speed.

**System Response:**
- The incoming alert is flagged as a potential duplicate and held for manual review rather than being automatically added to the alert lifecycle.
- Alert creation is temporarily restricted for the submitting user until the flagged submission is reviewed.
- The event is logged for security monitoring.
- Multiple duplicate detections from the same source may trigger escalation to Rule 9 (temporary access restriction).

**Monitored patterns:**
- Alerts with matching `title`, `message`, `disaster_type` and `location` from the same user within 5 minutes
- Repeated submissions of the same `disaster_type` and `location` combination across short intervals
- Unusual bursts of alert creation activity from a single user

**Why This Rule Is Needed:**
Spam campaigns often repeat the same content across multiple submissions to amplify reach or overwhelm moderation workflows. Duplicate detection prevents this pattern from succeeding even when the submitter is technically authorised and operating within the rate limit. Using all four fields — title, message, disaster type and location — ensures that both content and context are checked, so that genuinely different alerts about nearby but distinct events are not incorrectly blocked.

---

### Rule 6 – Input Validation Before Processing

**Purpose:**
Reject malformed, incomplete or structurally invalid alert submissions at the API boundary, before they reach business logic or database layers.

**Trigger:**
A `POST /api/alerts` request is received with any of the following conditions:

- A required field is absent: `title`, `message`, `disaster_type`, `threat_type`, `severity` or `location`.
- A field value does not match its expected data type.
- An enum field contains an out-of-range value (see table below).
- A text field exceeds its maximum character limit.
- Input contains characters outside the allowed set for that field.

**Allowed field values and limits:**

| Field | Type | Allowed Values / Format | Max Length |
|---|---|---|---|
| `title` | string | Plain text, no script tags | 100 characters |
| `message` | string | Plain text only | 500 characters |
| `disaster_type` | enum | `bushfire`, `flood`, `both` | — |
| `threat_type` | enum | `phishing`, `scam`, `ransomware`, `misinformation` | — |
| `severity` | enum | `low`, `medium`, `high`, `critical` | — |
| `location` | string | Letters and spaces only | 100 characters |
| `source` | string | Valid source name | 50 characters |

**System Response:**
- The request is rejected with `400 Bad Request`.
- The response body identifies the specific invalid field and the reason for rejection.
- Repeated invalid submissions from the same source are tracked and flagged for security monitoring.

**Error response format:**
```json
{
  "error_code": 400,
  "error_message": "Invalid input",
  "details": "Field 'severity' must be one of: low, medium, high, critical."
}
```

**Why This Rule Is Needed:**
Enforcing field structure at the API boundary prevents both accidental misuse and deliberate injection attempts (SQL injection, script injection, log injection). Tracking repeated invalid submissions from a single source catches probing behaviour — where an attacker tests the system boundaries — and passes those signals to the monitoring system for further action.

---

### Rule 7 – Request Size Enforcement

**Purpose:**
Prevent oversized payloads from consuming disproportionate backend resources, bypassing field-level validation or exploiting payload parsing behaviour.

**Trigger:**
A request body to any alert endpoint exceeds the **fixed maximum size of 5 KB**.

**System Response:**
- The request is rejected with `400 Bad Request` before the body content is parsed or processed.
- The event is logged with the source IP, timestamp and endpoint.

**Error response format:**
```json
{
  "error_code": 400,
  "error_message": "Request too large",
  "details": "Request body exceeds the maximum permitted size of 5 KB."
}
```

**Why This Rule Is Needed:**
Large payload attacks can degrade API performance and, in certain scenarios, exploit parser vulnerabilities or consume memory resources disproportionate to the request content. A fixed 5 KB cap enforced at the API gateway is a low-cost, high-value control that stops this class of abuse before any field-level processing begins. The 5 KB value is a balanced choice — large enough to accommodate a complete, well-formed alert submission, small enough to prevent abusive or bloated payloads. It complements Rule 6 by providing a structural check before content-level validation.

---

### Rule 8 – Suspicious Activity Logging

**Purpose:**
Capture and retain a structured record of all rejected, flagged or rate-limited events to support monitoring, investigation, incident response and ongoing security improvement.

**Trigger:**
Any of the following events occurs at any point in the alert submission flow:
- JWT validation fails (→ 401)
- RBAC role check fails (→ 403)
- Input validation fails (→ 400)
- Rate limit is exceeded (→ 429)
- Request size limit is exceeded (→ 400)
- Duplicate alert is detected
- Throttling is applied
- Temporary access restriction is triggered

**System Response:**
- The event is written immediately to the system security log.
- Each log entry includes:
  - Timestamp (UTC)
  - Source IP address
  - Authenticated user ID (where available)
  - Endpoint and HTTP method
  - HTTP response code returned
  - Rule triggered
  - Brief reason description
- Logs are stored securely and retained for audit and forensic analysis.
- Patterns of repeated events from the same source may trigger automated security alerts to the monitoring system (CY017).

**Example log entry:**
```json
{
  "timestamp": "2026-04-24T09:15:33Z",
  "ip_address": "203.0.113.42",
  "user_id": "usr_8821",
  "endpoint": "POST /api/alerts",
  "response_code": 429,
  "rule_triggered": "Rule 3 – Alert Creation Rate Limit",
  "details": "User exceeded 10 requests per minute."
}
```

**Why This Rule Is Needed:**
Without logging, abuse is invisible. The security log produced by this rule feeds directly into the monitoring and incident response workflows (CY017, CY018) and provides the evidentiary trail required for post-incident analysis, security audits and system tuning. Logging is the mechanism that transforms individual rejection events into actionable intelligence about attack patterns.

---

### Rule 9 – Temporary Access Restriction for Persistent Violations

**Purpose:**
Escalate the system's response for users or IP addresses that persistently violate rate limits or submission rules, beyond the per-request `429` rejection.

**Trigger:**
A user or IP address meets any of the following conditions:
- Repeatedly triggers the alert creation rate limit (Rule 3) across multiple rolling windows.
- Repeatedly submits duplicate alerts that trigger Rule 5 across multiple 5-minute windows.
- Repeatedly submits invalid alerts after receiving rejection responses.
- Is identified by the monitoring system as exhibiting a sustained pattern of abusive submission behaviour.

**System Response:**
- Alert creation access for the user or IP address is temporarily suspended.
- Suspension follows the same escalation model as brute-force login protection, ensuring consistent enforcement behaviour across the system:
  - **Initial violation: 15-minute suspension**
  - **Repeated violations: suspension duration increases with each subsequent offence**
- An administrative notification is generated for system administrator review.
- Admin override is available to lift or modify the suspension if legitimate use is confirmed.
- All suspension events are logged under Rule 8.

**Why This Rule Is Needed:**
Per-request rejection (429) is insufficient for determined abusers who simply retry after the cooldown window. A temporary access restriction introduces a meaningful cost to sustained abuse while preserving the ability for administrators to review and intervene when legitimate users are affected. Using the same 15-minute initial restriction and escalating duration model as brute-force login protection keeps enforcement behaviour consistent and simplifies implementation.

---

### Rule 10 – External Source Alert Validation

**Purpose:**
Ensure that alert data originating from the ADCRS pipeline or other internal data sources is validated against the same schema standards as user-submitted alerts before entering TEAVS processing.

**Trigger:**
Alert data is received at the TEAVS system via the ADCRS output interface or any internal data ingestion endpoint.

**System Response:**
- Full schema validation is applied to the incoming data, using the same field rules defined in Rule 6.
- The fixed 5 KB request size limit (Rule 7) is enforced on incoming data payloads.
- Source authentication is verified: the data source must be identified as a trusted, authorised internal service before data is accepted.
- Non-conformant data is rejected and logged.
- Rejected events are written to the audit log under Rule 8.

**Why This Rule Is Needed:**
The ADCRS → TEAVS interface is an internal trust boundary. Trusting data from internal components unconditionally creates a path for a compromised upstream component to inject malicious alert content directly into the TEAVS system, bypassing all user-facing controls. Applying the same validation rules at this boundary closes that gap and is consistent with the project's secure-by-design principle, which treats all inputs — internal and external — as untrusted until validated.

---

## Rule Summary Table

| Rule | Name | Trigger Condition | System Response | HTTP Code |
|---|---|---|---|---|
| 1 | Authentication Required | Missing / invalid / expired JWT on POST /api/alerts | Reject request before processing | 401 |
| 2 | Role-Based Restriction | Role not `admin` or `council_officer` | Reject request | 403 |
| 3 | Alert Creation Rate Limit | > 10 POST /api/alerts per minute per user | Reject; log; return Retry-After | 429 |
| 4 | Submission Throttling | Rapid successive requests near the rate limit ceiling | Progressive delay; early 429; cooldown | 429 |
| 5 | Duplicate Alert Detection | Matching `title` + `message` + `disaster_type` + `location` from same source within 5 minutes | Flag for review; restrict creation; log | — |
| 6 | Input Validation | Missing fields, invalid types/enums, length exceeded | Reject with field-specific error | 400 |
| 7 | Request Size Limit | Payload exceeds 5 KB | Reject before parsing | 400 |
| 8 | Suspicious Activity Logging | Any rejection or flagging event (Rules 1–7, 9–10) | Structured log entry written | — |
| 9 | Temporary Access Restriction | Persistent or repeated rule violations by user/IP | 15-min initial suspension; escalates on repeat; admin notified | — |
| 10 | External Source Validation | ADCRS or pipeline data received at TEAVS | Full schema validation + 5 KB cap + source auth check | 400 if invalid |

---

## Alignment with Project Design

These rules connect directly with the following completed components of the Project Phoenix design:

**Authentication and JWT (CY008):**
Rules 1, 2 and 9 depend on the JWT token structure (`userId`, `role`, `iat`, `exp`) and the RBAC model defined in the authentication design. The token expiry window of 15–30 minutes and the HMAC-SHA256 signing algorithm are referenced directly in Rule 1.

**Input Validation (CY009):**
Rule 6 extends the field-level validation rules already established for the create alert endpoint. The field formats, enum sets and character limits used in Rule 6 are drawn directly from those designs. Rule 10 applies the same validation standards to the internal data pipeline.

**Rate Limiting (CY010):**
Rules 3 and 4 formalise the rate limit thresholds and throttling behaviour already established in the rate limiting design. The 10-per-minute create alert limit and the full rate limit table in Rule 3 are taken directly from that documentation.

**Alert Lifecycle (CY007):**
All rules operate on requests before they enter the `Draft` state. Only submissions that pass all controls are admitted to the TEAVS alert lifecycle. This means the lifecycle itself is not affected by spam — rejected submissions never reach it.

**Error Handling (CY007):**
The HTTP response codes (400, 401, 403, 429) and the JSON error response format used throughout these rules are consistent with the error handling design already established for the TEAVS API.

**Logging and Monitoring (CY017):**
Rule 8 defines the events that the logging and monitoring system must capture. The log entry structure is designed to be compatible with the broader monitoring design.

**Incident Response (CY018):**
Rule 9 defines the access restriction response that escalates into the incident response workflow for persistent abuse cases requiring administrator review.

**Security Architecture (CY012):**
These rules collectively form the rate limiting and abuse prevention layer of the integrated security architecture, which combines API security, authentication, input validation, cryptographic verification and abuse prevention into a single coherent design.
