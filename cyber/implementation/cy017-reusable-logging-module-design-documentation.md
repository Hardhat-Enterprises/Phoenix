# CY017 – Security Logging and Monitoring Module

## Reusable Backend Logging Module Design (Implementation Specification)  v0.5

**Project:** Project Phoenix – TEAVS / ADCRS  
**Company:** Hardhat Enterprises  
**Team:** Cybersecurity  
**Task Group:** CY017 – Logging and Monitoring  
**Sub-task:** Reusable Security Logging Module  
**Revision:** v0.5  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project and Task Context](#2-project-and-task-context)
3. [Related Project Design Areas](#3-related-project-design-areas)
4. [Scope Boundary](#4-scope-boundary)
5. [Core Design Principles](#5-core-design-principles)
6. [Security Logging Model at a Glance](#6-security-logging-model-at-a-glance)
7. [Security Events Tracked](#7-security-events-tracked)
8. [Complete Event Catalogue with Reason Sub-Classifiers](#8-complete-event-catalogue-with-reason-sub-classifiers)
9. [Validation Failure Design](#9-validation-failure-design)
10. [Access Restricted Design](#10-access-restricted-design)
11. [Synchronous and Asynchronous Logging Model](#11-synchronous-and-asynchronous-logging-model)
12. [Structured Log Format](#12-structured-log-format)
13. [Log Safety and Sanitisation](#13-log-safety-and-sanitisation)
14. [Example Structured Logs](#14-example-structured-logs)
15. [Severity and Outcome Vocabulary](#15-severity-and-outcome-vocabulary)
16. [Module Dependencies](#16-module-dependencies)
17. [Point of Operation in the Backend](#17-point-of-operation-in-the-backend)
18. [Relationship with Backend Security Controls](#18-relationship-with-backend-security-controls)
19. [Alignment with Project Architecture](#19-alignment-with-project-architecture)
20. [Implementation Direction](#20-implementation-direction)
21. [Future Integration and Scalability Notes](#21-future-integration-and-scalability-notes)
22. [Assumptions and Open Items](#22-assumptions-and-open-items)
23. [Document History](#23-document-history)

---

## 1. Executive Summary

The CY017 logging module is a reusable backend component that records security-relevant events in structured JSON format. For the current phase, the module writes newline-delimited JSON to `console.log`. Later, the same structured records can be sent to a database, log shipper, SIEM, dashboard or monitoring service.

The logger does **not** decide whether a request should be blocked, delayed, accepted, flagged, held for review or escalated. Those decisions belong to the relevant backend security controls. The logger records the security decision after it has already been made.

The module records eight main event types:

1. `auth_failure`
2. `token_invalid`
3. `token_issued`
4. `rbac_denied`
5. `validation_failure`
6. `rate_limit_exceeded`
7. `duplicate_alert`
8. `access_restricted`

Key design decisions:

- `validation_failure` remains the broad event type; the specific validation problem is stored in `reason`.
- `access_restricted` supports both request-time restrictions and monitoring-based escalations.
- Synchronous `access_restricted` has exactly four allowed reasons: `rate_limit_hit`, `throttling`, `duplicate_request`, `authentication_failure`.
- Asynchronous `access_restricted` uses repeated-pattern reasons: `repeated_rate_limit_hit`, `repeated_duplicate_request`, `repeated_invalid_input`, `repeated_authentication_failure`, `repeated_rbac_denied`, `sustained_abuse_pattern`.
- RBAC failures remain separate as `rbac_denied` to preserve the `401 Unauthorized` / `403 Forbidden` distinction.
- The logger outputs structured records only; it does not require database or SIEM setup.

---

## 2. Project and Task Context

Project Phoenix is an AI-driven disaster and cyber threat intelligence platform combining disaster data, cyber threat intelligence, risk scoring and trusted alerting for disaster management authorities and public users.

The CY017 task covers logging and monitoring. This document designs a reusable backend security logging module that supports defining, implementing and tracking security events; supporting alerts and monitoring; and providing clear logging documentation. It records evidence from authentication, JWT validation, RBAC, validation, abuse prevention, duplicate detection and temporary access restriction decisions.

---

## 3. Related Project Design Areas

| Related area | How it relates to this logging module |
|---|---|
| **CY007 – TEAVS API Design** | Defines key API endpoints, request/response structure and error-handling. The logger records endpoint, method and response code for security-relevant API events. |
| **CY008 – Authentication and Authorisation** | Defines JWT-based authentication, RBAC and protected endpoints. The logger records login failures, token failures, token issuance and RBAC denial events. |
| **CY009 – Input Validation and Security Rules** | Defines validation rules, input limits, format restrictions and injection prevention. The logger records validation failures using detailed reason sub-classifiers. |
| **CY010 – Rate Limiting and Abuse Prevention** | Defines spam prevention, rate limiting, throttling, duplicate alert detection and temporary access restriction. The logger is the implementation-ready logging layer for these rules. |
| **CY011 – Cryptographic Design** | Defines hashing, digital signatures, key management and token integrity. The logger records token issuance, token validation failures and tampering-related token events. |
| **CY017 – Logging and Monitoring** | Defines the need for standardised security logs. This document specifies the reusable module design. |
| **CY018 – Incident Response Workflow** | Defines detection, containment, mitigation and escalation. The logger produces structured evidence that incident response workflows can consume. |
| **Detection, Monitoring and Response Framework** | Defines monitoring for API abuse, login attacks and abnormal behaviour. The logger provides the structured event stream for those monitoring rules. |

---

## 4. Scope Boundary

### 4.1 In scope

- Failed login attempts; invalid, expired, malformed or tampered JWTs; successful token issuance as an audit event
- RBAC failures and unauthorised access attempts
- Validation failures and invalid inputs; request size failures
- Rate limit violations; throttling decisions; duplicate alert detection
- Synchronous access restrictions; asynchronous persistent-violation escalation events

### 4.2 Out of scope

Database storage, SIEM integration, Winston/Pino/Splunk/ELK/Sentinel implementation, full backend integration, final route/controller implementation, final alert lifecycle database schema, final dashboard visualisation and final persistent-violation monitor implementation beyond demonstration.

### 4.3 Target stack

```text
Node.js + Express + TypeScript
```

---

## 5. Core Design Principles

**5.1 Logger records decisions; it does not make decisions.** Backend security controls decide whether a request is valid, authorised, abusive or suspicious. The logger only records the outcome (e.g. the JWT middleware decides a token is expired; the logger records `token_invalid`).

**5.2 Structured logs must be consistent.** Every event uses the same base fields so future dashboards, databases and SIEM tools can parse the logs reliably.

**5.3 Separate event type from reason.** `event_type` records the broad category; `reason` records the exact sub-classifier. This avoids proliferating separate event types such as `invalid_enum_failure` or `missing_field_failure`.

**5.4 Keep synchronous and asynchronous events separate.** Some events are known immediately during a request; others are only visible after aggregating multiple events across time windows. The design records both, clearly separated.

---

## 6. Security Logging Model at a Glance

```text
Backend security control makes a decision
        |
        v
Security logger receives safe context + event information
        |
        v
Security logger sanitises details
        |
        v
Security logger emits one structured JSON log line
        |
        v
Current phase: console.log output
        |
        v
Future phase: database / SIEM / dashboard / monitoring pipeline
```

**Synchronous (request-time):**
```text
Client request -> middleware/handler detects security event -> logger records event -> backend responds
```

**Asynchronous (monitoring):**
```text
Many request-time logs -> persistent-violation monitor aggregates across time windows
    -> repeated pattern detected -> restriction/escalation applied -> logger records escalation
```

---

## 7. Security Events Tracked

| # | Category | `event_type` | Main trigger | Design basis |
|---:|---|---|---|---|
| 1 | Failed login attempts | `auth_failure` | Login credentials rejected, unknown user, account lockout or brute-force pattern | CY008; detection/monitoring rules for login attacks |
| 2 | Invalid or expired tokens | `token_invalid` | JWT fails because token is expired, malformed, tampered, bad signature or refresh flow is invalid | CY008, CY011, CY010 Rule 1 |
| 3 | Token issuance audit | `token_issued` | Login or refresh endpoint issues a JWT | CY008 token lifecycle and JWT auditability |
| 4 | Unauthorised access / RBAC | `rbac_denied` | Authenticated user tries an endpoint not allowed for their role | CY008 RBAC; CY007 endpoint access rules; CY010 Rule 2 |
| 5 | Suspicious or invalid inputs | `validation_failure` | Request rejected by size, field, type, enum, length or format validation | CY009; CY010 Rule 6 and Rule 7 |
| 6 | Rate limiting / throttling | `rate_limit_exceeded` | Hard rate limit or progressive throttling is triggered | CY010 Rule 3 and Rule 4 |
| 7 | Duplicate alert detection | `duplicate_alert` | Similarity key matches a recent alert from the same source within five minutes | CY010 Rule 5 |
| 8 | Temporary access restriction | `access_restricted` | Access is blocked, delayed, held for review or escalated due to repeated violations | CY010 Rule 8 and Rule 9; CY017; CY018 |

---

## 8. Complete Event Catalogue with Reason Sub-Classifiers

| # | `event_type` | When it fires | Default severity | Allowed `reason` values | Expected response / outcome | Sync or async |
|---:|---|---|---|---|---|---|
| 1 | `auth_failure` | Login credentials are rejected | `medium` → `critical` | `bad_password`, `unknown_user`, `account_locked`, `lockout_active` | `401` or login failure response | Synchronous |
| 2 | `token_invalid` | JWT verification fails | `low` → `critical` | `expired`, `malformed`, `bad_signature`, `tampered_claims`, `refresh_expired`, `refresh_replay` | `401` | Synchronous |
| 3 | `token_issued` | Login or refresh issues a JWT | `info` | No reason field | `200` | Synchronous |
| 4 | `rbac_denied` | Role check rejects request | `medium` → `high` | No reason field for now | `403` | Synchronous |
| 5 | `validation_failure` | Body, field, format or size validation rejects request | `low` → `medium` | `missing_field`, `invalid_type`, `invalid_enum`, `length_exceeded`, `bad_format`, `size_exceeded` | `400` | Synchronous |
| 6 | `rate_limit_exceeded` | Hard cap or throttle condition triggered | `medium` → `high` | `rate_limit_hit`, `throttled` | `429` where blocked; delayed handling where applicable | Synchronous |
| 8 | `access_restricted` | Access is restricted or monitoring escalation is applied | `medium` → `critical` | Sync: `rate_limit_hit`, `throttling`, `duplicate_request`, `authentication_failure`; Async: `repeated_rate_limit_hit`, `repeated_throttling`, `repeated_duplicate_request`, `repeated_invalid_input`, `repeated_authentication_failure`, `repeated_rbac_denied`, `sustained_abuse_pattern` | Depends on control: `401`, `429`, `202`, delayed or suspension event | Both |
| 7 | `duplicate_alert` | Duplicate or near-duplicate alert detected within the configured window | `medium` | No reason field for now | Preferred: `202 Accepted / held for review`; optional: `409 Conflict` | Synchronous |
| 8 | `access_restricted` | Access is restricted or monitoring escalation is applied | `medium` → `critical` | Sync: `rate_limit_hit`, `throttling`, `duplicate_request`, `authentication_failure`; Async: `repeated_rate_limit_hit`, `repeated_throttling`, `repeated_duplicate_request`, `repeated_invalid_input`, `repeated_authentication_failure`, `repeated_rbac_denied`, `sustained_abuse_pattern` | Depends on control: `401`, `429`, `202`, delayed or suspension event | Both |

---

## 9. Validation Failure Design

`validation_failure` records suspicious, malformed or invalid input rejected by the backend (CY009 input validation and CY010 Rules 6 and 7). Validation failures are synchronous — the failure is known at the exact request. Repeated failures from the same user or IP are consumed later by the async monitor and may escalate to `access_restricted` with `reason="repeated_invalid_input"`.

| `reason` | Trigger condition | Relevant rule | Expected HTTP | Logging notes | Sync/async |
|---|---|---|---|---|---|
| `missing_field` | Required field is absent (`title`, `message`, `disaster_type`, `threat_type`, `severity`, `location`) | CY009; CY010 Rule 6 | `400` | Include field name in sanitised `details` | Synchronous |
| `invalid_type` | Field value does not match expected data type | CY009; CY010 Rule 6 | `400` | Include safe field name and expected type | Synchronous |
| `invalid_enum` | Enum field contains a value outside the allowed set | CY009; CY010 Rule 6 | `400` | Include field name and allowed set reference; not raw input | Synchronous |
| `length_exceeded` | Text field exceeds maximum length (e.g. title > 100 chars, message > 500 chars) | CY009; CY010 Rule 6 | `400` | Include field and configured max length | Synchronous |
| `bad_format` | Input contains unsafe characters, script tags, command-like content or fails an allowed pattern | CY009; CY010 Rule 6 | `400` | Include field name and validation rule; not dangerous raw payload | Synchronous |
| `size_exceeded` | Request body exceeds the fixed 5 KB maximum before body processing | CY010 Rule 7 | `400` | Include endpoint, method, configured max size and observed size if safe | Synchronous |

---

## 10. Access Restricted Design

`access_restricted` records situations where access is blocked, delayed, held, temporarily suspended or escalated (CY010 Rules 8 and 9). It has two timing models — synchronous (same request) and asynchronous (later, after log aggregation) — both represented by the same event type with different `reason` values.

### 10.1 Synchronous `access_restricted` reasons

| `reason` | Trigger condition | Relevant rule | Expected HTTP | Related event emitted with it |
|---|---|---|---|---|
| `rate_limit_hit` | Request blocked because hard rate limit exceeded | CY010 Rule 3 | `429` with `Retry-After` | `rate_limit_exceeded` with `reason="rate_limit_hit"` |
| `throttling` | Request blocked or delayed by throttling logic | CY010 Rule 4 | `429` if blocked; delayed if slowed | `rate_limit_exceeded` with `reason="throttled"` |
| `duplicate_request` | Duplicate alert detected; creation restricted pending review | CY010 Rule 5 | `202` preferred; `409` optional | `duplicate_alert` |
| `authentication_failure` | Access restricted because authentication or token validation failed | CY008; CY010 Rule 1 | `401` | `auth_failure` or `token_invalid` |

### 10.2 RBAC design decision

RBAC failure remains `rbac_denied` and does **not** automatically produce synchronous `access_restricted`. This preserves the `401 Unauthorized` (identity/authentication) vs `403 Forbidden` (permission/authorisation) distinction and avoids duplicate logging. Repeated RBAC failures can still be escalated by the async monitor under `repeated_rbac_denied`.

### 10.3 Asynchronous `access_restricted` reasons

| Async `reason` | Consumes these prior logs | Trigger pattern | Rule 9 action | Notification |
|---|---|---|---|---|
| `repeated_rate_limit_hit` | `rate_limit_exceeded`, `rate_limit_hit` | Repeated hard cap violations across rolling windows | Initial 15-minute suspension; escalating duration | Admin/security team |
| `repeated_throttling` | `rate_limit_exceeded`, `throttling` | Repeated throttle decisions across windows | Temporary restriction if behaviour continues | Admin/security team if threshold reached |
| `repeated_duplicate_request` | `duplicate_alert`, `duplicate_request` | Duplicate detection across multiple five-minute windows | Alert creation suspension; review queue visibility | Admin/security team or reviewer |
| `repeated_invalid_input` | `validation_failure` reasons (incl. bad format, size) | Repeated invalid submissions after warnings or rejections | Temporary restriction for probing behaviour | Security team |
| `repeated_authentication_failure` | `auth_failure`, `token_invalid`, `authentication_failure` | Repeated failed login or invalid token attempts | Temporary lockout or access restriction | Admin/security team and affected user |
| `repeated_rbac_denied` | `rbac_denied` | Repeated access attempts against out-of-role endpoints | Temporary access restriction or security review | Admin/security team |
| `sustained_abuse_pattern` | Mixed events from multiple categories | Coordinated or sustained abuse detected | Temporary restriction, escalation, incident response handoff | Security team / DMT if critical |

The async monitor must consume structured logs, detect repeated violations across rolling time windows, apply temporary suspension per CY010 Rule 9, support 15-minute initial restrictions with escalating duration, notify where required and emit a new `access_restricted` log event on escalation.

---

## 11. Synchronous and Asynchronous Logging Model

**Synchronous logging** happens inside the same request that triggered the security decision, preserving an accurate audit trail for the exact blocked, rejected, delayed or denied request.

**Asynchronous logging** happens after the original request, when a monitor aggregates multiple log events across time windows to detect slow spam, repeated invalid probing or distributed retry behaviour invisible at the per-request level.

```text
Synchronous logging  -> accurate request-level audit trail
Asynchronous logging -> repeated-pattern detection and escalation trail
```

---

## 12. Structured Log Format

Each emitted record is a single JSON object on one line (newline-delimited JSON), redirectable to a log shipper, database writer, SIEM transport or dashboard processor.

| Field | Type | Required | Description | Answers the question |
|---|---|---:|---|---|
| `timestamp` | string | Yes | UTC ISO-8601 timestamp | When did the event occur? |
| `component` | string | Yes | Subsystem name, e.g. `teavs-backend`, `adcrs-ingestion` | Which subsystem produced it? |
| `event_type` | enum | Yes | One of the approved security event types | What happened? |
| `severity` | enum | Yes | `info`, `low`, `medium`, `high` or `critical` | How serious was it? |
| `outcome` | enum | Yes | `success`, `failure`, `blocked`, `delayed`, `flagged`, `restricted` or `escalated` | What was the result? |
| `user_id` | string | No | Authenticated user ID; absent or `anonymous` before authentication | Who was involved? |
| `role` | string | No | Role claim where available | Who was involved? |
| `ip_address` | string | Yes | Source IP or trusted proxy-derived client IP | Where did it come from? |
| `endpoint` | string | Yes | Request path such as `/api/alerts` | Which endpoint was affected? |
| `method` | string | Yes | HTTP method such as `POST`, `GET`, `PATCH` | Which endpoint was affected? |
| `response_code` | number | No | HTTP response code returned or planned | What was the result? |
| `rule_triggered` | string | No | Rule reference such as `CY010 Rule 6 - Input Validation` | Which rule/control was triggered? |
| `request_id` | string | No | Correlation ID for tracing one request through logs | How can events be correlated? |
| `reason` | enum/string | No | Sub-classifier for event types that require one | What happened (detail)? |
| `details` | object/string | No | Sanitised extra context; no raw passwords, tokens, secrets or full request bodies | What happened (context)? |

---

## 13. Log Safety and Sanitisation

The `details` field must be safe for logs. Do not log passwords, raw JWTs or refresh tokens, secrets, private keys, signing keys or full request bodies. Remove newline and control characters to prevent log injection. Truncate long strings to a safe length. Prefer field names, IDs, configured limits and safe counters over raw user input. Avoid exposing internal stack traces or sensitive implementation details.

---

## 14. Example Structured Logs

### 14.1 Validation failure — invalid enum

```json
{
  "timestamp": "2026-05-06T04:12:22.013Z",
  "component": "teavs-backend",
  "event_type": "validation_failure",
  "severity": "medium",
  "outcome": "failure",
  "user_id": "usr_8821",
  "role": "council_officer",
  "ip_address": "203.0.113.42",
  "endpoint": "/api/alerts",
  "method": "POST",
  "response_code": 400,
  "rule_triggered": "CY010 Rule 6 - Input Validation Before Processing",
  "request_id": "req_7f3a1b",
  "reason": "invalid_enum",
  "details": {
    "field": "severity",
    "message": "Field must be one of the allowed severity values."
  }
}
```

### 14.2 Validation failure — size exceeded

```json
{
  "timestamp": "2026-05-06T04:13:10.901Z",
  "component": "teavs-backend",
  "event_type": "validation_failure",
  "severity": "medium",
  "outcome": "blocked",
  "ip_address": "203.0.113.44",
  "endpoint": "/api/alerts",
  "method": "POST",
  "response_code": 400,
  "rule_triggered": "CY010 Rule 7 - Request Size Enforcement",
  "request_id": "req_b31e9c",
  "reason": "size_exceeded",
  "details": {
    "max_size": "5KB",
    "message": "Request body exceeded permitted size."
  }
}
```

### 14.3 Hard rate-limit restriction

```json
{
  "timestamp": "2026-05-06T04:14:45.502Z",
  "component": "teavs-backend",
  "event_type": "access_restricted",
  "severity": "high",
  "outcome": "blocked",
  "user_id": "usr_8821",
  "role": "council_officer",
  "ip_address": "203.0.113.42",
  "endpoint": "/api/alerts",
  "method": "POST",
  "response_code": 429,
  "rule_triggered": "CY010 Rule 3 - Alert Creation Rate Limit",
  "request_id": "req_4a91dd",
  "reason": "rate_limit_hit",
  "details": {
    "limit": "10 per minute",
    "retry_after_seconds": 60
  }
}
```

### 14.4 Duplicate restriction

```json
{
  "timestamp": "2026-05-06T04:15:33.218Z",
  "component": "teavs-backend",
  "event_type": "access_restricted",
  "severity": "medium",
  "outcome": "flagged",
  "user_id": "usr_8821",
  "role": "council_officer",
  "ip_address": "203.0.113.42",
  "endpoint": "/api/alerts",
  "method": "POST",
  "response_code": 202,
  "rule_triggered": "CY010 Rule 5 - Duplicate Alert Detection",
  "request_id": "req_9cc201",
  "reason": "duplicate_request",
  "details": {
    "similarity_key_fields": ["title", "message", "disaster_type", "location"],
    "window": "5 minutes",
    "action": "held_for_manual_review"
  }
}
```

### 14.5 Authentication restriction — expired token

```json
{
  "timestamp": "2026-05-06T04:16:09.504Z",
  "component": "teavs-backend",
  "event_type": "access_restricted",
  "severity": "medium",
  "outcome": "blocked",
  "ip_address": "203.0.113.77",
  "endpoint": "/api/alerts",
  "method": "POST",
  "response_code": 401,
  "rule_triggered": "CY010 Rule 1 - Authentication Required",
  "request_id": "req_a122f1",
  "reason": "authentication_failure",
  "details": {
    "auth_failure_type": "expired_token"
  }
}
```

### 14.6 Asynchronous escalation restriction

```json
{
  "timestamp": "2026-05-06T04:30:00.000Z",
  "component": "teavs-security-monitor",
  "event_type": "access_restricted",
  "severity": "critical",
  "outcome": "escalated",
  "user_id": "usr_8821",
  "role": "council_officer",
  "ip_address": "203.0.113.42",
  "endpoint": "/api/alerts",
  "method": "POST",
  "response_code": 429,
  "rule_triggered": "CY010 Rule 9 - Temporary Access Restriction",
  "request_id": "monitor_window_20260506T0430Z",
  "reason": "repeated_duplicate_request",
  "details": {
    "initial_restriction_minutes": 15,
    "escalation_model": "duration increases on repeated offence",
    "notification": "admin_security_team"
  }
}
```

---

## 15. Severity and Outcome Vocabulary

| Severity | Meaning | Example |
|---|---|---|
| `info` | Healthy or audit-only event | Successful token issuance |
| `low` | Low-risk or likely accidental event | Token naturally expired |
| `medium` | Suspicious; may be user error or early probing | Single validation failure, single RBAC denial |
| `high` | Probable abuse or active attack | Hard rate-limit hit, tampered token |
| `critical` | Confirmed serious incident or escalation | Account lockout, sustained abuse restriction |

The caller chooses severity based on final context. The logger does not calculate severity autonomously, though helper functions can provide sensible defaults.

| Outcome | Meaning | Example |
|---|---|---|
| `success` | Security-relevant operation succeeded | Token issued after valid login |
| `failure` | Security-relevant operation failed | Login credentials rejected |
| `blocked` | Request was stopped | Invalid token or hard rate-limit hit |
| `delayed` | Request was slowed by throttling | Progressive throttle applied |
| `flagged` | Event marked for review | Duplicate alert held for manual review |
| `restricted` | Access was limited or suspended | User temporarily restricted |
| `escalated` | Monitoring raised event to a higher level | Persistent duplicate abuse triggers 15-min restriction |

---

## 16. Module Dependencies

The TypeScript implementation depends only on: Node.js standard library, TypeScript type definitions and optional Express request types for the Express context helper.

It must **not** depend on: a database, a SIEM client, a logging library (Winston, Pino), full Phoenix backend integration or any final user database schema.

---

## 17. Point of Operation in the Backend

```text
Client request
    |
    v
[1] Login / Auth Handler
    |-- failed credentials --> logAuthFailure()
    |-- successful login ----> logTokenIssued()
    |
    v
[2] JWT Validation Middleware
    |-- invalid/expired/tampered token --> logTokenInvalid()
    |                                      logAccessRestricted(reason="authentication_failure")
    |
    v
[3] RBAC Middleware
    |-- role not permitted --> logRbacDenied()
    |
    v
[4] Request Size Check
    |-- body > 5 KB --> logValidationFailure(reason="size_exceeded")
    |
    v
[5] Input Validation Middleware
    |-- missing field  --> logValidationFailure(reason="missing_field")
    |-- invalid type   --> logValidationFailure(reason="invalid_type")
    |-- invalid enum   --> logValidationFailure(reason="invalid_enum")
    |-- length issue   --> logValidationFailure(reason="length_exceeded")
    |-- bad format     --> logValidationFailure(reason="bad_format")
    |
    v
[6] Rate Limit Middleware
    |-- hard cap exceeded --> logRateLimitExceeded(reason="rate_limit_hit")
    |                         logAccessRestricted(reason="rate_limit_hit")
    |
    v
[7] Throttling Middleware
    |-- blocked or delayed --> logRateLimitExceeded(reason="throttled")
    |                          logAccessRestricted(reason="throttling")
    |
    v
[8] Duplicate Detection Logic
    |-- duplicate found --> logDuplicateAlert()
    |                       logAccessRestricted(reason="duplicate_request")
    |
    v
[9] Controller / Business Logic
    |-- allowed request continues
    |
    v
[10] Async Persistent-Violation Monitor
    |-- consumes logs from [1]–[8]
    |-- repeated pattern found --> logAccessRestricted(reason="repeated_*" or "sustained_abuse_pattern")
```

---

## 18. Relationship with Backend Security Controls

| Backend control | What it produces | What this logger records |
|---|---|---|
| Login/auth handler | Successful login, failed login, account lockout | `token_issued` on success; `auth_failure` on failure; `authentication_failure` if access is blocked |
| JWT validation middleware | Token verification result | `token_invalid` with reason (`expired`, `malformed`, `bad_signature`, `tampered_claims`); may also emit `authentication_failure` |
| Refresh-token logic | Token rotation, expired/replayed refresh token | `token_issued` on success; `token_invalid` with `refresh_expired` or `refresh_replay` on failure |
| RBAC middleware | Role permission decision | `rbac_denied` for per-request `403`; feeds async `repeated_rbac_denied` |
| Request size checker | Body size decision before parsing | `validation_failure` with `reason="size_exceeded"` |
| Input validation middleware | Field-level validation result | `validation_failure` with `missing_field`, `invalid_type`, `invalid_enum`, `length_exceeded` or `bad_format` |
| Rate limiter | Request count threshold decision | `rate_limit_exceeded`; if blocked, also `rate_limit_hit` |
| Throttling control | Progressive delay or early block decision | `rate_limit_exceeded` with `throttled`; if delayed/blocked, also `throttling` |
| Duplicate detection logic | Similarity-key match decision | `duplicate_alert` and synchronous `duplicate_request` |
| Persistent-violation monitor | Cross-window pattern detection and escalation | Async `access_restricted` with repeated-pattern reasons |
| Incident response workflow | Containment, escalation and communication | Future systems can consume logs; not implemented inside this logger |

---

## 19. Alignment with Project Architecture

| Area | Logger alignment |
|---|---|
| **CY007 – TEAVS API** | Records `endpoint`, `method` and `response_code` per event, covering `/api/users/auth/login`, `/api/users/auth/refresh`, `/api/alerts` and protected dashboard/hazard/risk routes |
| **CY008 – Auth/JWT/RBAC** | Separates `auth_failure` (identity/authentication) from `rbac_denied` (permission/authorisation) and records `token_issued` as an audit trail |
| **CY009 – Input Validation** | Expanded `validation_failure` model covers field-level, size, enum, format and length validation; records outcomes without storing unsafe raw input |
| **CY010 – Rate Limiting and Abuse** | Directly supports Rules 1–10: authentication, RBAC, validation, size, rate limit, throttle, duplicate, temporary restriction and repeated-pattern escalation |
| **CY011 – Cryptographic / Token Integrity** | Records token issuance, expiry, malformed tokens, bad signatures, tampered claims and refresh replay without logging raw tokens or keys |
| **CY017 – Logging and Monitoring** | Defines standard event types, fields, severity, outcomes, reason sub-classifiers, safe details handling and future transport extension points |
| **CY018 – Incident Response** | Provides structured evidence for future incident response; escalation pattern (repeated violations → restriction event → admin notification → incident review) is supported by the async `access_restricted` model |

---

## 20. Implementation Direction

```text
src/
  security/
    logging/
      securityLogTypes.ts
      logTransport.ts
      expressLogContext.ts
      securityLogger.ts
      examples.ts
```

### 20.1 Expected implementation pieces

1. **Type definitions** for event types, severity, outcome, rules and reasons.
2. **Core log record type** matching the structured log format.
3. **Generic logging function** `logSecurityEvent()`.
4. **Helper functions**: `logAuthFailure()`, `logTokenInvalid()`, `logRbacDenied()`, `logValidationFailure()`, `logRateLimitExceeded()`, `logDuplicateAlert()` and `logAccessRestricted()`.
5. **Details sanitisation** to remove control characters, truncate long values and avoid secrets.
6. **Transport interface** so console output can later be replaced by database, SIEM or logging-library transport.
7. **Express context helper** to safely extract IP address, endpoint, method, request ID, user ID and role.
8. **Usage examples** for login, JWT middleware, RBAC middleware, validation middleware, rate limiter, throttling, duplicate detection and async persistent-violation monitor.

### 20.2 Design constraints

Simple, modular, reusable, strongly typed, database-independent, SIEM-independent, compatible with Express-style request objects, not dependent on the full Phoenix backend.

---

## 21. Future Integration and Scalability Notes

```text
Express middleware / handlers
        |
        v
Security Logger Module
        |
        v
LogTransport interface
        |
        +--> Console JSON output (current)
        +--> Database transport
        +--> SIEM transport
        +--> Winston/Pino wrapper
        +--> Multi-transport fan-out
```

Replacing console output with database or SIEM storage should require only a transport change, not changes to every middleware or controller.

| Concern | Current approach | Future extension |
|---|---|---|
| Log output | Console NDJSON | Database, SIEM, log shipper or cloud log service |
| Persistence | None | Append-only `security_events` table or document collection |
| Dashboard monitoring | Not implemented | Dashboard reads from DB, SIEM or indexed logs |
| Cross-service correlation | `request_id` field | Distributed tracing headers across ADCRS, TEAVS and frontend |
| Log protection | Sanitisation and no secrets | Append-only storage, restricted access, retention policy |
| PII handling | Avoid raw sensitive values | Field-level redaction policy |
| Volume | Immediate console write | Buffered or batched transport |
| Multi-tenant support | `component` field only | Tenant or project IDs if required |
| Transports | `ConsoleJsonTransport` | `DatabaseTransport`, `SiemTransport`, `WinstonTransport`, `MultiTransport` |

---

## 22. Assumptions and Open Items

### 22.1 Assumptions

1. Implemented in TypeScript for Node.js + Express; logger core will not require Express.
2. User identity and role may not always be present (especially before JWT validation).
3. `request_id` may be extracted from a request header or generated when missing.
4. Database storage and SIEM integration are future work.
5. The logger records decisions made by other components; it does not make those decisions.
6. The async monitor consumes emitted logs but is not fully implemented unless a simple demonstration is added.

### 22.2 Open items

1. Final backend may choose exact response semantics for duplicate detection: `202 Accepted / held for review` or `409 Conflict`.
2. Final backend may choose whether throttling is delayed handling, early `429`, or both.
3. Final threshold values for async escalation should be confirmed with detection thresholds and final rate-limiter configuration.
4. Final user object shape is not known yet; implementation should use optional user/role extraction.

---

## 23. Document History

| Version | Change |
|---|---|
| v0.1 | Initial Phase 2 design for reusable security logging module |
| v0.2 | Added broader event catalogue, structured log format and relationship mapping |
| v0.3 | Expanded `access_restricted` for duplicate pending review and async repeated-pattern escalation; identified need for validation reason sub-classifiers |
| v0.4 | Expanded `validation_failure`; redesigned `access_restricted` with exactly four synchronous reasons plus separate async reasons; clarified sync/async split; updated event catalogue, log examples, request-flow diagram, relationship table, CY010 alignment and self-review |
| v0.5 | Documentation-focused revision. Removed explanatory padding (§9.1, §20.8), merged field-reference tables, condensed architecture alignment into single table, trimmed redundant prose throughout. |

---
