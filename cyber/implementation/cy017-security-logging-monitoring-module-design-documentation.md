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

1. [Purpose of This Document](#1-purpose-of-this-document)
2. [Executive Summary](#2-executive-summary)
3. [Project and Task Context](#3-project-and-task-context)
4. [Related Project Design Areas](#4-related-project-design-areas)
5. [Scope Boundary](#5-scope-boundary)
6. [Core Design Principles](#6-core-design-principles)
7. [Security Logging Model at a Glance](#7-security-logging-model-at-a-glance)
8. [Security Events Tracked](#8-security-events-tracked)
9. [Complete Event Catalogue with Reason Sub-Classifiers](#9-complete-event-catalogue-with-reason-sub-classifiers)
10. [Validation Failure Design](#10-validation-failure-design)
11. [Access Restricted Design](#11-access-restricted-design)
12. [Synchronous and Asynchronous Logging Model](#12-synchronous-and-asynchronous-logging-model)
13. [Structured Log Format](#13-structured-log-format)
14. [Log Safety and Sanitisation](#14-log-safety-and-sanitisation)
15. [Example Structured Logs](#15-example-structured-logs)
16. [Severity and Outcome Vocabulary](#16-severity-and-outcome-vocabulary)
17. [Module Dependencies](#17-module-dependencies)
18. [Point of Operation in the Backend](#18-point-of-operation-in-the-backend)
19. [Relationship with Backend Security Controls](#19-relationship-with-backend-security-controls)
20. [Alignment with Project Architecture](#20-alignment-with-project-architecture)
21. [Implementation Direction](#21-implementation-direction)
22. [Future Integration Notes](#22-future-integration-notes)
23. [Future Scalability Notes](#23-future-scalability-notes)
24. [Assumptions and Open Items](#24-assumptions-and-open-items)
25. [Document History](#25-document-history)


---

## 1. Purpose of This Document

This document presents the design phase for a reusable security logging and monitoring module for the Project Phoenix backend. It reorganises the design into a clearer implementation-ready specification.

The document explains:

- what security events the logger records;
- how each event is classified;
- which `reason` values are allowed for each event type;
- when logs are produced synchronously inside a request;
- when logs are produced asynchronously by a later monitoring process;
- what structured JSON fields every log should contain;
- how the logger relates to authentication, JWT validation, RBAC, validation, rate limiting, throttling, duplicate detection and incident escalation;
- what is deliberately out of scope for the current coding phase.

The goal is to keep the logging design simple enough for the current capstone implementation, but structured enough that it can later support database storage, dashboards, SIEM ingestion and incident response workflows.

---

## 2. Executive Summary

The CY017 logging module is a reusable backend component that records security-relevant events in structured JSON format. For the current phase, the module writes newline-delimited JSON to `console.log`. Later, the same structured records can be sent to a database, log shipper, SIEM, dashboard or monitoring service.

The logger does **not** decide whether a request should be blocked, delayed, accepted, flagged, held for review or escalated. Those decisions belong to the relevant backend security controls, such as authentication, JWT validation, RBAC, validation, rate limiting, throttling, duplicate detection and persistent-violation monitoring. The logger records the security decision after it has already been made.

The module records eight main event types:

1. `auth_failure`
2. `token_invalid`
3. `token_issued`
4. `rbac_denied`
5. `validation_failure`
6. `rate_limit_exceeded`
7. `duplicate_alert`
8. `access_restricted`

The key design decisions are:

- `validation_failure` remains the broad event type, while the specific validation problem is stored in the `reason` field.
- `access_restricted` supports both request-time restrictions and later monitoring-based escalations.
- Synchronous `access_restricted` has exactly four allowed reasons:
  - `access_restricted_rate_limit`
  - `access_restricted_throttling`
  - `access_restricted_duplicate`
  - `access_restricted_authentication`
- Asynchronous `access_restricted` uses repeated-pattern reasons such as `repeated_rate_limit`, `repeated_duplicate`, `repeated_invalid_input`, `repeated_authentication_failure`, `repeated_rbac_denied` and `sustained_abuse_pattern`.
- RBAC failures remain separate as `rbac_denied` because a `403 Forbidden` authorisation failure should not be mixed with a `401 Unauthorized` authentication failure.
- The logger outputs structured records only; it does not require database setup, SIEM setup or full backend integration.

---

## 3. Project and Task Context

Project Phoenix is an AI-driven disaster and cyber threat intelligence platform. It combines disaster-related data, cyber threat intelligence, risk scoring and trusted alerting so that disaster management authorities and public users can receive reliable risk information.

The CY017 task focuses on logging and monitoring. The specific work in this document is the design of a reusable backend security logging module. It supports the wider CY017 objectives:

- define logs;
- implement logging;
- track suspicious activity;
- support alerts and monitoring;
- document the logging design clearly.

This design also supports the broader secure backend flow by recording evidence from authentication, JWT validation, RBAC, validation, abuse prevention, duplicate detection and temporary access restriction decisions.

---

## 4. Related Project Design Areas

This logging design is based on the wider Project Phoenix cybersecurity design work. Instead of tying the design to individual contributors, the related work is referenced by task code or security topic.

| Related area | How it relates to this logging module |
|---|---|
| **CY007 – TEAVS API Design** | Defines key API endpoints, request/response structure, alert lifecycle and error-handling expectations. The logger records endpoint, method and response code for security-relevant API events. |
| **CY008 – Authentication and Authorisation** | Defines JWT-based authentication, role-based access control and protected endpoints. The logger records login failures, token failures, token issuance and RBAC denial events. |
| **CY009 – Input Validation and Security Rules** | Defines validation rules, input limits, format restrictions and injection prevention expectations. The logger records validation failures using detailed reason sub-classifiers. |
| **CY010 – Rate Limiting and Abuse Prevention** | Defines spam prevention, rate limiting, throttling, duplicate alert detection, suspicious activity logging and temporary access restriction. The logger is the implementation-ready logging layer for these rules. |
| **CY011 – Cryptographic Design** | Defines hashing, digital signatures, key management and token integrity concepts. The logger records token issuance, token validation failures and tampering-related token events. |
| **CY017 – Logging and Monitoring** | Defines the need for standardised security logs and monitoring. This document specifies the reusable module design that will satisfy the implementation requirement. |
| **CY018 – Incident Response Workflow** | Defines detection, containment, mitigation, escalation and communication concepts. The logger produces structured evidence that future incident response workflows can consume. |
| **Detection, Monitoring and Response Framework** | Defines the need to monitor API abuse, login attacks, unauthorised access, repeated failed attempts and abnormal behaviour. The logger provides the structured event stream for those monitoring rules. |
| **Project architecture and trust boundary design** | Defines how TEAVS, ADCRS, backend APIs, protected endpoints and internal data flows interact. The logger helps monitor violations at those boundaries. |

---

## 5. Scope Boundary

### 5.1 In scope for the current design

The logger must support structured security logging for:

- failed login attempts;
- invalid, expired, malformed or tampered JWTs;
- successful token issuance as an audit event;
- RBAC failures and unauthorised access attempts;
- validation failures and invalid inputs;
- request size failures;
- rate limit violations;
- throttling decisions;
- duplicate alert detection;
- synchronous access restrictions;
- asynchronous persistent-violation escalation events.

### 5.2 Out of scope for the current design

The following are not required in this phase:

- database storage;
- SIEM integration;
- Winston, Pino, Splunk, ELK or Microsoft Sentinel implementation;
- full backend integration;
- final route/controller implementation;
- final alert lifecycle database schema;
- final dashboard visualisation;
- final persistent-violation monitor implementation beyond this demonstration.

### 5.3 Target implementation stack

The current implementation target is:

```text
Node.js + Express + TypeScript
```

 For this specific task, the logger will be implemented in TypeScript for an Express-style backend. The logging schema remains portable so that the same event model can be reused by other backend services later.

---

## 6. Core Design Principles

### 6.1 Logger records decisions; it does not make decisions

The logger must not decide whether a request is valid, authorised, abusive or suspicious. Those decisions are made by backend security controls. The logger only records the outcome.

Examples:

- The JWT middleware decides that a token is expired. The logger records `token_invalid`.
- The RBAC middleware decides that the role is not permitted. The logger records `rbac_denied`.
- The validation middleware decides that a field is invalid. The logger records `validation_failure`.
- The rate limiter decides that the user exceeded the threshold. The logger records `rate_limit_exceeded` and, where access is blocked, `access_restricted`.

### 6.2 Structured logs must be consistent

Every event should use the same base fields so future dashboards, databases and SIEM tools can parse the logs reliably.

### 6.3 The design must separate event type from reason

`event_type` records the broad category of the event. `reason` records the exact sub-classifier.

Example:

```json
{
  "event_type": "validation_failure",
  "reason": "invalid_enum"
}
```

This is cleaner than creating separate event types such as `invalid_enum_failure`, `missing_field_failure` and `size_exceeded_failure`.

### 6.4 Synchronous and asynchronous events must remain separate

Some security events are known immediately during a request. Other security patterns only become visible after multiple events are aggregated across time windows. The design records both, but separates them clearly.



---

## 7. Security Logging Model at a Glance

The logging model can be understood as the following flow:

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

For synchronous request-time events:

```text
Client request
    -> middleware or handler detects a security event
    -> logger records the event immediately
    -> backend returns response or continues handling
```

For asynchronous monitoring events:

```text
Many request-time logs
    -> persistent-violation monitor aggregates them across time windows
    -> repeated pattern is detected
    -> temporary restriction or escalation is applied
    -> logger records the escalation event
```

---

## 8. Security Events Tracked

The reusable module tracks eight main security event categories.

| # | Category | `event_type` | Main trigger | Design basis |
|---:|---|---|---|---|
| 1 | Failed login attempts | `auth_failure` | Login credentials rejected, unknown user, account lockout or brute-force pattern | CY008 authentication design; detection and monitoring rules for login attacks |
| 2 | Invalid or expired tokens | `token_invalid` | JWT validation fails because token is expired, malformed, tampered, has a bad signature or refresh flow is invalid | CY008 JWT authentication; CY011 token integrity and key-management concepts; CY010 Rule 1 |
| 3 | Token issuance audit | `token_issued` | Login or refresh endpoint issues a JWT | CY008 token lifecycle and JWT auditability requirements |
| 4 | Unauthorised access / RBAC | `rbac_denied` | Authenticated user tries to access an endpoint not allowed for their role | CY008 RBAC; CY007 endpoint access rules; CY010 Rule 2 |
| 5 | Suspicious or invalid inputs | `validation_failure` | Request rejected by size, field, type, enum, length or format validation | CY009 validation and injection prevention; CY010 Rule 6 and Rule 7 |
| 6 | Rate limiting / throttling | `rate_limit_exceeded` | Hard rate limit or progressive throttling is triggered | CY010 Rule 3 and Rule 4 |
| 7 | Duplicate alert detection | `duplicate_alert` | Similarity key matches a recent alert from the same source within five minutes | CY010 Rule 5 |
| 8 | Temporary access restriction | `access_restricted` | Access is blocked, delayed, held for review or escalated due to repeated violations | CY010 Rule 8 and Rule 9; CY017 monitoring; CY018 escalation |

---

## 9. Complete Event Catalogue with Reason Sub-Classifiers

| # | `event_type` | When it fires | Default severity | Allowed `reason` values | Expected response / outcome | Sync or async |
|---:|---|---|---|---|---|---|
| 1 | `auth_failure` | Login credentials are rejected | `medium` → `critical` | `bad_password`, `unknown_user`, `account_locked`, `lockout_active` | `401` or login failure response | Synchronous |
| 2 | `token_invalid` | JWT verification fails | `low` → `critical` | `expired`, `malformed`, `bad_signature`, `tampered_claims`, `refresh_expired`, `refresh_replay` | `401` | Synchronous |
| 3 | `token_issued` | Login or refresh issues a JWT | `info` | No reason field | `200` | Synchronous |
| 4 | `rbac_denied` | Role check rejects request | `medium` → `high` | No reason field for now | `403` | Synchronous |
| 5 | `validation_failure` | Body, field, format or size validation rejects request | `low` → `medium` | `missing_field`, `invalid_type`, `invalid_enum`, `length_exceeded`, `bad_format`, `size_exceeded` | `400` | Synchronous |
| 6 | `rate_limit_exceeded` | Hard cap or throttle condition is triggered | `medium` → `high` | `rate_limit_hit`, `throttled` | `429` where blocked; delayed handling where applicable | Synchronous |
| 7 | `duplicate_alert` | Duplicate or near-duplicate alert is detected within the configured window | `medium` | No reason field for now | Preferred: `202 Accepted / held for review`; optional backend decision: `409 Conflict` if rejected outright | Synchronous |
| 8 | `access_restricted` | Request access is restricted or later monitoring escalation is applied | `medium` → `critical` | Synchronous: `access_restricted_rate_limit`, `access_restricted_throttling`, `access_restricted_duplicate`, `access_restricted_authentication`; asynchronous: `repeated_rate_limit`, `repeated_throttling`, `repeated_duplicate`, `repeated_invalid_input`, `repeated_authentication_failure`, `repeated_rbac_denied`, `sustained_abuse_pattern` | Depends on control: `401`, `429`, `202`, delayed handling or suspension event | Both |

### 9.1 How to read the catalogue

- `event_type` is the broad class of security event.
- `reason` is the precise cause inside that class.
- `validation_failure` uses reason sub-classifiers because validation can fail in several different ways.
- `access_restricted` is special because it can be logged both synchronously and asynchronously.
- The logger does not decide the HTTP response. It records the response chosen by the control that called it.
- If an event type has no reason field for now, the schema still allows future extension without breaking the log format.

---

## 10. Validation Failure Design

### 10.1 Purpose

`validation_failure` records suspicious, malformed or invalid input rejected by the backend. It is directly related to CY009 input validation and CY010 Rules 6 and 7.

This event type is important because validation failures can represent:

- normal user mistakes;
- invalid client behaviour;
- probing for accepted field names and formats;
- injection attempts;
- oversized payload attacks;
- attempts to bypass API schema rules.

### 10.2 Event type and reason model

`validation_failure` remains the event type. The exact validation problem is recorded in the `reason` field.

This gives the future dashboard a simple top-level category while still allowing filtering by the exact validation cause.

Example:

```json
{
  "event_type": "validation_failure",
  "reason": "missing_field"
}
```

### 10.3 Validation failure reasons

| `reason` | Trigger condition | Relevant project rule/design | Expected HTTP response | How it should be logged | Sync or async |
|---|---|---|---|---|---|
| `missing_field` | Required field is absent, such as `title`, `message`, `disaster_type`, `threat_type`, `severity` or `location` | CY009 validation rules; CY010 Rule 6 | `400 Bad Request` | `event_type="validation_failure"`, `reason="missing_field"`, include field name in sanitised `details` | Synchronous |
| `invalid_type` | A field value does not match the expected data type, such as a number where a string is expected | CY009 validation rules; CY010 Rule 6 | `400 Bad Request` | `event_type="validation_failure"`, `reason="invalid_type"`, include safe field name and expected type | Synchronous |
| `invalid_enum` | Enum field contains a value outside the allowed set, such as invalid `severity`, `disaster_type` or `threat_type` | CY009 format validation; CY010 Rule 6 | `400 Bad Request` | `event_type="validation_failure"`, `reason="invalid_enum"`, include field name and allowed set reference, not raw unsafe input | Synchronous |
| `length_exceeded` | Text field exceeds its maximum length, such as title above 100 characters or message above 500 characters | CY009 input limits; CY010 Rule 6 | `400 Bad Request` | `event_type="validation_failure"`, `reason="length_exceeded"`, include field and configured max length | Synchronous |
| `bad_format` | Input contains unsupported characters, unsafe format, script tags, command-like content or fails an allowed pattern | CY009 injection prevention and format validation; CY010 Rule 6 | `400 Bad Request` | `event_type="validation_failure"`, `reason="bad_format"`, include field name and validation rule, but not dangerous raw payload | Synchronous |
| `size_exceeded` | Request body exceeds the fixed 5 KB maximum size before normal body processing | CY010 Rule 7 | `400 Bad Request` | `event_type="validation_failure"`, `reason="size_exceeded"`, include endpoint, method, configured max size and observed size if safe | Synchronous |

### 10.4 Validation logging decision

Validation failures are synchronous because the backend knows the failure at the exact request where the input is rejected.

Repeated validation failures from the same user or IP are not handled by the logger itself. They are consumed later by the asynchronous monitor and may escalate to `access_restricted` with reason `repeated_invalid_input`.

---

## 11. Access Restricted Design

### 11.1 Purpose

`access_restricted` records situations where access is blocked, delayed, held, temporarily suspended or escalated. It supports CY010 Rules 8 and 9 by ensuring that restriction decisions are logged in a structured way.

Access restriction has two different timing models:

1. **Synchronous restriction** – happens during the same request.
2. **Asynchronous escalation** – happens later after multiple logs are aggregated across time windows.

These are both represented by the same event type, `access_restricted`, but with different `reason` values.

---

### 11.2 Synchronous `access_restricted`

Synchronous `access_restricted` reasons are emitted during the same request where access was restricted. This gives a precise audit trail for the exact request affected.

There are exactly four synchronous reasons.

| `reason` | Trigger condition | Relevant project rule/design | Expected HTTP response | Related event emitted with it | Sync or async |
|---|---|---|---|---|---|
| `access_restricted_rate_limit` | Request is blocked because the hard rate limit has been exceeded | CY010 Rule 3 | `429 Too Many Requests` with `Retry-After` where applicable | `rate_limit_exceeded` with `reason="rate_limit_hit"` | Synchronous |
| `access_restricted_throttling` | Request is blocked or delayed because throttling logic has been applied | CY010 Rule 4 | `429` if blocked; delayed handling if slowed but not rejected | `rate_limit_exceeded` with `reason="throttled"` | Synchronous |
| `access_restricted_duplicate` | Duplicate or near-duplicate alert is detected and alert creation is restricted until review | CY010 Rule 5 | Preferred: `202 Accepted / held for review`; optional backend decision: `409 Conflict` if rejected outright | `duplicate_alert` | Synchronous |
| `access_restricted_authentication` | Access is restricted because authentication or token validation failed | CY008 authentication/JWT validation; CY010 Rule 1 | `401 Unauthorized` | `auth_failure` or `token_invalid`, depending on where the failure occurred | Synchronous |

---

### 11.3 RBAC design decision

RBAC failure remains `rbac_denied` and does **not** automatically produce synchronous `access_restricted`.

The reason is that RBAC failure is an authorisation failure, not an authentication failure:

- authentication failure means the user identity is missing or invalid;
- RBAC failure means the user is authenticated, but the role is not permitted.

This preserves the important distinction between:

```text
401 Unauthorized  -> identity/authentication problem
403 Forbidden     -> permission/authorisation problem
```

Keeping RBAC as `rbac_denied` avoids duplicate logging and keeps dashboard categories clear.

However, repeated RBAC failures can still be consumed by the asynchronous monitor and escalated under `repeated_rbac_denied` if the pattern suggests probing or abuse.

---

### 11.4 Asynchronous `access_restricted`

The asynchronous layer consumes logs produced by the synchronous layer and applies temporary restrictions when repeated behaviour is detected across rolling windows.

This design uses separate asynchronous reasons rather than one generic `access_restricted_escalation` reason.

### 11.5 Why separate asynchronous reasons are better

Separate reasons are more useful for dashboard monitoring and incident response. A generic escalation reason would show that a restriction happened, but not why.

Separate reasons allow security reviewers to see whether the escalation came from:

- repeated rate-limit violations;
- repeated throttling;
- repeated duplicate submissions;
- invalid input probing;
- repeated authentication failures;
- repeated RBAC denials;
- a broader sustained abuse pattern.

### 11.6 Asynchronous access restriction reasons

| Async `reason` | Consumes these prior logs | Trigger pattern | Rule 9 action | Notification |
|---|---|---|---|---|
| `repeated_rate_limit` | `rate_limit_exceeded`, `access_restricted_rate_limit` | Repeated hard cap violations across rolling windows | Initial 15-minute suspension; escalating duration on repeat | Admin/security team |
| `repeated_throttling` | `rate_limit_exceeded`, `access_restricted_throttling` | Repeated throttle decisions across windows | Temporary restriction if behaviour continues | Admin/security team if threshold reached |
| `repeated_duplicate` | `duplicate_alert`, `access_restricted_duplicate` | Duplicate detection across multiple five-minute windows | Alert creation suspension; review queue visibility | Admin/security team or reviewer |
| `repeated_invalid_input` | `validation_failure` reasons including bad format and size failures | Repeated invalid submissions after warnings or rejections | Temporary restriction for probing behaviour | Security team |
| `repeated_authentication_failure` | `auth_failure`, `token_invalid`, `access_restricted_authentication` | Repeated failed login or invalid token attempts | Temporary lockout or session/access restriction | Admin/security team and affected user if account action occurs |
| `repeated_rbac_denied` | `rbac_denied` | Repeated access attempts against endpoints outside the user’s role | Temporary access restriction or security review | Admin/security team |
| `sustained_abuse_pattern` | Mixed events from multiple categories | Monitoring system detects coordinated or sustained abuse | Temporary restriction, escalation and incident response handoff | Security team / DMT if critical |

### 11.7 Asynchronous access restriction requirements

The asynchronous monitor must:

- consume structured logs produced by synchronous request-time controls;
- detect repeated violations across time windows;
- apply temporary suspension under CY010 Rule 9;
- support a 15-minute initial restriction and escalating duration for repeated offences;
- notify the admin or security team where required;
- produce a new `access_restricted` log event when escalation actually happens.

---

## 12. Synchronous and Asynchronous Logging Model

### 12.1 Synchronous logging

Synchronous logging happens inside the same request that triggered the security decision. It is needed because the system must preserve an accurate audit trail for the exact request that was blocked, rejected, delayed, held for review or denied.

Examples:

- A JWT is expired → `token_invalid` and `access_restricted_authentication` are logged immediately.
- A public or unpermitted role attempts `POST /api/alerts` → `rbac_denied` is logged immediately.
- A body exceeds 5 KB → `validation_failure` with `reason="size_exceeded"` is logged immediately.
- A request exceeds the hard rate limit → `rate_limit_exceeded` and `access_restricted_rate_limit` are logged immediately.
- A duplicate alert is detected → `duplicate_alert` and `access_restricted_duplicate` are logged immediately.

### 12.2 Asynchronous logging

Asynchronous logging happens after the original request, when a monitor aggregates multiple log events across time windows.

It is necessary because many abuse patterns are not visible from a single request. Slow spam, repeated invalid probing, repeated invalid token attempts and distributed retry behaviour may avoid one-off controls but become suspicious when viewed over time.

### 12.3 Why both are required

Without asynchronous monitoring, slow spam and repeated probing could avoid per-request controls. Without synchronous logging, the system would not have the precise evidence needed to prove which individual request was blocked.

The final design therefore uses both:

```text
Synchronous logging  -> accurate request-level audit trail
Asynchronous logging -> repeated-pattern detection and escalation trail
```

---

## 13. Structured Log Format

Each emitted record is a single JSON object on one line. This is newline-delimited JSON and can later be redirected to a log shipper, database writer, SIEM transport or dashboard processor.

### 13.1 Field reference

| Field | Type | Required | Description |
|---|---|---:|---|
| `timestamp` | string | Yes | UTC ISO-8601 timestamp when the event occurred |
| `component` | string | Yes | Component or subsystem name, e.g. `teavs-backend`, `adcrs-ingestion`, `auth-service` |
| `event_type` | enum | Yes | One of the approved security event types |
| `severity` | enum | Yes | `info`, `low`, `medium`, `high` or `critical` |
| `outcome` | enum | Yes | `success`, `failure`, `blocked`, `delayed`, `flagged`, `restricted` or `escalated` |
| `user_id` | string | No | Authenticated user ID where available; absent or `anonymous` before authentication |
| `role` | string | No | Role claim where available |
| `ip_address` | string | Yes | Source IP address or trusted proxy-derived client IP |
| `endpoint` | string | Yes | Request path such as `/api/alerts` |
| `method` | string | Yes | HTTP method such as `POST`, `GET`, `PATCH` |
| `response_code` | number | No | HTTP response code returned or planned, where applicable |
| `rule_triggered` | string | No | Rule reference such as `CY010 Rule 6 - Input Validation` |
| `request_id` | string | No | Correlation ID for tracing one request through logs |
| `reason` | enum/string | No | Sub-classifier for event types that require one |
| `details` | object/string | No | Sanitised extra context; no raw passwords, tokens, secrets or full request bodies |

### 13.2 Why these fields are needed

The fields support future monitoring and investigation by answering these questions:

| Question | Field(s) that answer it |
|---|---|
| When did the event occur? | `timestamp` |
| Which subsystem produced it? | `component` |
| What happened? | `event_type`, `reason`, `details` |
| How serious was it? | `severity` |
| What was the result? | `outcome`, `response_code` |
| Who was involved? | `user_id`, `role` |
| Where did it come from? | `ip_address` |
| Which endpoint was affected? | `endpoint`, `method` |
| Which rule/control was triggered? | `rule_triggered` |
| How can this event be correlated with others? | `request_id` |

---

## 14. Log Safety and Sanitisation

Security logs must be useful, but they must not introduce new security risks.

The `details` field must be safe for logs:

- Do not log passwords.
- Do not log raw JWTs or refresh tokens.
- Do not log secrets, private keys or signing keys.
- Do not log full request bodies.
- Remove newline and control characters to prevent log injection.
- Truncate long strings to a safe length.
- Prefer field names, IDs, configured limits and safe counters over raw user input.
- Avoid exposing internal stack traces or sensitive implementation details in security event logs.

This is especially important because Project Phoenix deals with authentication, trusted alerts and potentially sensitive disaster-related data. Logs must support audit and monitoring without leaking credentials or private information.

---

## 15. Example Structured Logs

### 15.1 Validation failure — invalid enum

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

### 15.2 Validation failure — size exceeded

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

### 15.3 Hard rate-limit restriction

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
  "reason": "access_restricted_rate_limit",
  "details": {
    "limit": "10 per minute",
    "retry_after_seconds": 60
  }
}
```

### 15.4 Duplicate restriction emitted with duplicate alert

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
  "reason": "access_restricted_duplicate",
  "details": {
    "similarity_key_fields": ["title", "message", "disaster_type", "location"],
    "window": "5 minutes",
    "action": "held_for_manual_review"
  }
}
```

### 15.5 Authentication restriction caused by expired token

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
  "reason": "access_restricted_authentication",
  "details": {
    "auth_failure_type": "expired_token"
  }
}
```

### 15.6 Asynchronous escalation restriction

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
  "reason": "repeated_duplicate",
  "details": {
    "initial_restriction_minutes": 15,
    "escalation_model": "duration increases on repeated offence",
    "notification": "admin_security_team"
  }
}
```

---

## 16. Severity and Outcome Vocabulary

### 16.1 Severity vocabulary

| Severity | Meaning | Example |
|---|---|---|
| `info` | Healthy or audit-only event | Successful token issuance |
| `low` | Low-risk or likely accidental event | Token naturally expired |
| `medium` | Suspicious event that may be user error or early probing | Single validation failure, single RBAC denial, single duplicate held for review |
| `high` | Probable abuse or active attack pattern | Hard rate-limit hit, repeated failed login attempts, tampered token |
| `critical` | Confirmed serious incident or escalation | Account lockout, sustained abuse restriction, suspected alert system compromise |

The caller chooses severity based on the final context. The logger should not calculate severity on its own, although helper functions can provide sensible defaults.

### 16.2 Outcome vocabulary

| Outcome | Meaning | Example |
|---|---|---|
| `success` | Security-relevant operation succeeded | Token issued after valid login |
| `failure` | Security-relevant operation failed | Login credentials rejected |
| `blocked` | Request was stopped | Invalid token or hard rate-limit hit |
| `delayed` | Request was slowed by throttling | Progressive throttle applied |
| `flagged` | Event was marked for review | Duplicate alert held for manual review |
| `restricted` | Access was limited or suspended | User temporarily restricted from creating alerts |
| `escalated` | Monitoring or response process raised the event to a higher level | Persistent duplicate abuse triggers a 15-minute restriction |

---

## 17. Module Dependencies

The future TypeScript implementation should depend only on:

- Node.js standard library where needed;
- TypeScript type definitions;
- optional Express request types for the Express context helper.

The module should not depend on:

- a database;
- a SIEM client;
- a logging library such as Winston or Pino;
- full Phoenix backend integration;
- any final user database schema.

This keeps the module easy to commit, review and later integrate.

---

## 18. Point of Operation in the Backend

The logger is called at backend control points after the relevant security decision is made.

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
    |                                      logAccessRestricted(reason="access_restricted_authentication")
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
    |                         logAccessRestricted(reason="access_restricted_rate_limit")
    |
    v
[7] Throttling Middleware
    |-- blocked or delayed --> logRateLimitExceeded(reason="throttled")
    |                          logAccessRestricted(reason="access_restricted_throttling")
    |
    v
[8] Duplicate Detection Logic
    |-- duplicate found --> logDuplicateAlert()
    |                      logAccessRestricted(reason="access_restricted_duplicate")
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

The synchronous path and asynchronous path must remain separate. The synchronous path records the immediate security outcome for one request. The asynchronous path records later restriction decisions based on aggregated behaviour.

---

## 19. Relationship with Backend Security Controls

| Backend control | What it produces | What this logger records |
|---|---|---|
| Login/auth handler | Successful login, failed login, account lockout | `token_issued` on success; `auth_failure` on failure; `access_restricted_authentication` if access is blocked due to authentication failure |
| JWT validation middleware | Token verification result for protected endpoints | `token_invalid` with reason such as `expired`, `malformed`, `bad_signature` or `tampered_claims`; may also emit `access_restricted_authentication` |
| Refresh-token logic | Token rotation, expired refresh token, replay attempt | `token_issued` on success; `token_invalid` with `refresh_expired` or `refresh_replay` on failure |
| RBAC middleware | Role permission decision | `rbac_denied` for per-request `403`; repeated events may feed async `repeated_rbac_denied` |
| Request size checker | Body size decision before parsing | `validation_failure` with `reason="size_exceeded"` |
| Input validation middleware | Field-level validation result | `validation_failure` with `missing_field`, `invalid_type`, `invalid_enum`, `length_exceeded` or `bad_format` |
| Rate limiter | Request count threshold decision | `rate_limit_exceeded`; if blocked, also `access_restricted_rate_limit` |
| Throttling control | Progressive delay or early block decision | `rate_limit_exceeded` with `throttled`; if delayed or blocked, also `access_restricted_throttling` |
| Duplicate detection logic | Similarity-key match decision | `duplicate_alert` and synchronous `access_restricted_duplicate` |
| Persistent-violation monitor | Cross-window pattern detection and escalation | Async `access_restricted` with repeated-pattern reasons |
| Incident response workflow | Containment, escalation and communication decisions | Later systems can consume logs and add incident response records; not implemented inside this logger |

---

## 20. Alignment with Project Architecture

### 20.1 CY007 – TEAVS API design and endpoint structure

The logging module aligns with the API design by recording the endpoint, HTTP method and response code for each security event. This makes it possible to identify which backend routes are producing security failures.

Relevant examples:

- `/api/users/auth/login` for login failures and token issuance;
- `/api/users/auth/refresh` for token refresh and refresh-token failures;
- `/api/alerts` for alert creation, validation, rate limiting, throttling and duplicate detection;
- protected dashboard, hazards, threats and risk-assessment routes for RBAC and JWT checks;
- internal ingestion endpoints for future ADCRS-to-TEAVS validation and trust-boundary monitoring.

### 20.2 CY008 – Authentication, JWT and RBAC

The module records authentication and authorisation outcomes separately:

- login failure → `auth_failure`;
- invalid token → `token_invalid`;
- successful token issue → `token_issued`;
- authenticated user with insufficient role → `rbac_denied`.

This supports the authentication model where JWTs prove identity, while RBAC decides whether the authenticated user can perform a specific action.

### 20.3 CY009 – Input validation and injection prevention

The expanded `validation_failure` model supports field-level validation, input-size limits, enum validation, format validation, length validation and log-injection prevention.

The logger records validation outcomes without storing unsafe raw input. This supports the secure-by-design principle that all inputs should be treated as untrusted until validated.

### 20.4 CY010 – Rate limiting and abuse prevention

The module directly supports CY010 Rules 1–10 by recording:

- authentication failures;
- RBAC failures;
- validation failures;
- request size failures;
- rate-limit triggers;
- throttling decisions;
- duplicate alert detection;
- temporary access restriction events;
- repeated-pattern escalation events.

This makes the logger the implementation-ready logging layer for spam prevention and abuse monitoring.

### 20.5 CY011 – Cryptographic design and token integrity

The module supports JWT and token integrity monitoring by recording:

- token issuance;
- expired tokens;
- malformed tokens;
- bad signatures;
- tampered claims;
- refresh-token expiry;
- refresh-token replay attempts.

This helps create an audit trail for token-related behaviour without logging raw tokens or secret keys.

### 20.6 CY017 – Logging and monitoring

The module is the central reusable logging design for CY017. It defines:

- standard event types;
- standard fields;
- severity levels;
- outcomes;
- reason sub-classifiers;
- safe details handling;
- future transport extension points.

### 20.7 CY018 – Incident response workflow

The module does not perform containment or incident response itself. However, it provides the structured evidence that future incident response workflows can consume.

For example:

```text
Repeated duplicate alerts
    -> structured logs
    -> monitor detects repeated pattern
    -> temporary restriction event
    -> admin/security notification
    -> incident response review if severity is high or critical
```

### 20.8 TEAVS and ADCRS interaction

TEAVS handles alert creation, verification and distribution. ADCRS analyses cyber and disaster-risk data and may send outputs into TEAVS.

The logging module can later help monitor both sides:

- TEAVS request failures and abuse patterns;
- ADCRS-to-TEAVS input validation failures;
- internal trust-boundary violations;
- suspicious API usage;
- future correlation between cyber risk events and alert creation behaviour.

---

## 21. Implementation Direction 

This design should be implemented as a small TypeScript module with clear file separation.

A suitable structure is:

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

### 21.1 Expected implementation pieces

The implementation should include:

1. **Type definitions** for event types, severity, outcome, rules and reasons.
2. **Core log record type** matching the structured log format.
3. **Generic logging function** such as `logSecurityEvent()`.
4. **Helper functions** such as `logAuthFailure()`, `logTokenInvalid()`, `logRbacDenied()`, `logValidationFailure()`, `logRateLimitExceeded()`, `logDuplicateAlert()` and `logAccessRestricted()`.
5. **Details sanitisation** to remove control characters, truncate long values and avoid secrets.
6. **Transport interface** so console output can later be replaced by database, SIEM or logging-library transport.
7. **Express context helper** to safely extract IP address, endpoint, method, request ID, user ID and role where available.
8. **Usage examples** for login, JWT middleware, RBAC middleware, validation middleware, rate limiter, throttling, duplicate detection and async persistent-violation monitor.

### 21.2 Design constraints

The implementation should remain:

- simple;
- modular;
- reusable;
- strongly typed;
- database-independent;
- SIEM-independent;
- compatible with Express-style request objects;
- not dependent on the full Phoenix backend running.

---

## 22. Future Integration Notes

The future fully integrated system may use this path:

```text
Express middleware / handlers
        |
        v
Security Logger Module
        |
        v
LogTransport interface
        |
        +--> Console JSON output now
        +--> Database transport later
        +--> SIEM transport later
        +--> Winston/Pino wrapper later
        +--> Multi-transport fan-out later
```

The first implementation should remain console-based. Replacing console output with database or SIEM storage should require only a transport change, not changes to every middleware or controller.

### 22.1 Possible future transports

| Future transport | Purpose |
|---|---|
| `ConsoleJsonTransport` | Current default; writes newline-delimited JSON to console |
| `DatabaseTransport` | Writes events to a future `security_events` table or collection |
| `SiemTransport` | Sends events to a SIEM or log shipper |
| `WinstonTransport` or `PinoTransport` | Wraps an application logging library if the backend later standardises on one |
| `MultiTransport` | Sends each event to multiple destinations, such as console and database |

---

## 23. Future Scalability Notes

| Concern | Current approach | Future extension |
|---|---|---|
| Log output | Console NDJSON | Database, SIEM, log shipper or cloud log service |
| Persistence | None | Append-only `security_events` table or document collection |
| Dashboard monitoring | Not implemented | Dashboard reads from DB, SIEM or indexed logs |
| Cross-service correlation | `request_id` | Distributed tracing headers across ADCRS, TEAVS and frontend |
| Log protection | Sanitisation and no secrets | Append-only storage, restricted access and retention policy |
| PII handling | Avoid raw sensitive values | Field-level redaction policy |
| Volume | Immediate console write | Buffered or batched transport |
| Multi-tenant support | `component` field only | Tenant or project IDs if required later |

---

## 24. Assumptions and Open Items

### 24.1 Assumptions

1. The module will be implemented in TypeScript for Node.js + Express.
2. Request objects will be Express-style, but the logger core will not require Express.
3. User identity and role may not always be present, especially before JWT validation.
4. `request_id` may be extracted from a request header or generated when missing.
5. Database storage is future work.
6. SIEM integration is future work.
7. The logger records security decisions made by other components; it does not make those decisions itself.
8. The async monitor consumes emitted logs but is not fully implemented unless a simple demonstration is added.

### 24.2 Open items

1. The final backend may choose exact response semantics for duplicate detection: `202 Accepted / held for review` or `409 Conflict`.
2. The final backend may choose whether throttling is implemented as delayed handling, early `429`, or both.
3. Final threshold values for async escalation should be confirmed with detection thresholds and the final backend rate-limiter configuration.
4. The final user object shape is not known yet, so the implementation should use optional user/role extraction.

---

## 25. Document History

| Version | Change |
|---|---|
| v0.1 | Initial Phase 2 design for reusable security logging module |
| v0.2 | Added broader event catalogue, structured log format and relationship mapping |
| v0.3 | Expanded `access_restricted` for duplicate pending review and async repeated-pattern escalation; identified need for validation reason sub-classifiers |
| v0.4 | Expanded `validation_failure`; redesigned `access_restricted` with exactly four synchronous reasons plus separate async reasons; clarified sync/async split; updated event catalogue, log examples, request-flow diagram, relationship table, CY010 alignment and self-review |
| v0.5 | Documentation-focused revision.|

---

