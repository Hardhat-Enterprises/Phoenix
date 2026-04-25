# CY010 – Rate Limiting & Abuse Prevention
## Sub-task: Prevent Spam Alerts

**Project:** Project Phoenix – TEAVS (Trusted Emergency Alert Verification System)\
**Task Group:** CY010 – Rate Limiting & Abuse Prevention\
**Sub-task:** Prevent Spam Alerts


---

## Table of Contents

1. [Overview](#overview)
2. [What Spam Means in This System](#1-what-spam-means-in-this-system)
3. [Spam Prevention Layers](#2-spam-prevention-layers)
   - [Layer 1 – Authentication Gate](#layer-1--authentication-gate)
   - [Layer 2 – Role Enforcement Gate](#layer-2--role-enforcement-gate)
   - [Layer 3 – Rate Limiting, Throttling and Duplicate Detection Gate](#layer-3--rate-limiting-throttling-and-duplicate-detection-gate)
4. [How Controls Fit into the Alert Flow](#3-how-controls-fit-into-the-alert-flow)
5. [Anti-Spam Controls Summary](#4-anti-spam-controls-summary)

---

## Overview

This document defines how the TEAVS system detects and blocks spam, fake, repeated and abusive alert submissions. It explains what counts as spam in this project's context, describes the three sequential prevention layers applied to every alert creation request, maps each control to its position in the alert submission flow and summarises the full set of anti-spam mechanisms.

This design works alongside the authentication design (CY008), the input validation design (CY009), the rate limiting thresholds (CY010) and the alert lifecycle design (CY007). It forms the abuse prevention layer of the integrated security architecture (CY012).

---

## 1. What Spam Means in This System

In the context of TEAVS, a spam alert is any alert submission that is:

- **Unauthorised** – submitted by a user whose role does not permit alert creation.
- **Duplicate or near-duplicate** – an alert with matching `title`, `message`, `disaster_type` and `location` submitted again by the same source within a **5-minute window**.
- **Volume-abusive** – an authorised user submitting alerts at a rate that exceeds legitimate operational need.
- **Automated or bot-driven** – scripted or programmatic submissions not backed by a real disaster or threat event.
- **Structurally invalid but persistent** – malformed submissions that repeatedly fail validation, indicating probing or flooding behaviour rather than honest error.

The threat model for this system is grounded in a documented real-world pattern: during Australian natural disasters such as bushfires and floods, malicious actors deliberately spread fake alerts and misinformation to create confusion, suppress legitimate emergency communications and exploit public anxiety. A flood of spam alerts in TEAVS could displace genuine alerts, undermine public trust, degrade system performance and interfere with emergency response. Preventing this is a core security objective of the project.

---

## 2. Spam Prevention Layers

Spam prevention in TEAVS operates across three sequential layers. Every request to create an alert must pass all three layers before the alert enters the system.

---

### Layer 1 – Authentication Gate

Every request to `POST /api/alerts` must carry a valid JSON Web Token (JWT) in the `Authorization: Bearer <token>` header. Requests without a valid, unexpired token are rejected immediately with `401 Unauthorized`. Because tokens expire after 15–30 minutes and are signed using HMAC-SHA256 (HS256), stolen or forged tokens cannot be replayed indefinitely. This layer eliminates unauthenticated spam entirely and ensures that every alert submission is traceable to a specific identity.

**What this stops:** An attacker with no account who attempts to flood the create-alert endpoint with a script is rejected at this layer. Every request without a valid token never reaches any further processing.

---

### Layer 2 – Role Enforcement Gate

Even with a valid token, only users holding the `admin` or `council_officer` role may create alerts. Emergency Services can view alerts but not create them. Public Users can verify alerts but not create them. A valid token belonging to an unauthorised role attempting `POST /api/alerts` is rejected with `403 Forbidden`. This layer ensures that the alert creation surface is limited to roles that carry operational accountability within the system.

**What this stops:** An authenticated public user who attempts to create an alert is blocked here. Their valid login cannot override the role restriction.

---

### Layer 3 – Rate Limiting, Throttling and Duplicate Detection Gate

Authorised users who have cleared authentication and role checks are subject to the following controls:

- A submission rate cap of **10 `POST /api/alerts` requests per minute per authenticated user**. Exceeding this returns `429 Too Many Requests` with a `Retry-After` header.
- **Progressive throttling** that slows or delays responses for rapid successive submissions approaching the rate limit ceiling, before the hard cap is applied.
- **Duplicate and near-duplicate detection**: the system checks incoming submissions against a **similarity key of `title` + `message` + `disaster_type` + `location`**. If a matching submission from the same source is detected within a **5-minute window**, it is flagged for manual review and creation is restricted. This window operates independently of the rate limiting window — rate limiting controls request volume, while duplicate detection controls content repetition regardless of how slowly the requests arrive.
- **Temporary access restriction** for users or IP addresses that persistently violate rate limits or repeatedly trigger duplicate detection accross multiple time window. This follows the same escalation model used for brute-force protection: an **initial restriction of 15 minutes** is applied on the first sustained violation, with the restriction duration increasing for each repeated offence. The admin is notified when a restriction is applied.
- A **fixed request size cap of 5 KB** is enforced at the API layer. This is a balanced value that prevents oversized or abusive payloads without affecting normal alert submissions.

**What this stops:**
- A compromised council officer (user with valid token) account flooding the system → caught by the rate limit and throttling.
- An authorised user submitting the same alert slowly but repeatedly → caught by duplicate detection (5-minute window, similarity key: `title` + `message` + `disaster_type` + `location`).
- Sustained repeated abuse → caught by temporary access restriction (initial 15-minute block, escalating on repeat violations).

---

## 3. How Controls Fit into the Alert Flow

The following sequence shows where each anti-spam control intercepts the `POST /api/alerts` request before an alert enters the TEAVS lifecycle:

```
Client → POST /api/alerts
    │
    ▼
[1] JWT Validation
    │ Fail → 401 Unauthorized
    ▼
[2] RBAC Role Check (admin or council_officer only)
    │ Fail → 403 Forbidden
    ▼
[3] Request Size Check (fixed cap: 5 KB)
    │ Fail → 400 Bad Request
    ▼
[4] Input Validation (field types, lengths, enum values, format)
    │ Fail → 400 Bad Request + field-level error message
    ▼
[5] Rate Limit Check (≤ 10 POST/min per authenticated user)
    │ Exceed → 429 Too Many Requests + "Retry-After" header
    ▼
[6] Throttle Check (rapid successive requests near limit)
    │ Pattern detected → progressive delay or early 429
    ▼
[7] Duplicate / Similar Content Detection
    │ Key: title + message + disaster_type + location
    │ Window: 5 minutes per source (independent of rate limit window)
    │ Match found → flag for review; restrict creation
    │ Repeated violations → 15-min restriction (escalating on repeat offences)
    ▼
[8] Alert Created → Status: Draft (enters TEAVS lifecycle)
    │
    ▼
[9] All events logged (including all rejection points above)
```

Once an alert passes all controls and is created, it enters the TEAVS alert lifecycle at the `Draft` state and is subject to the approval, distribution and revocation workflow defined separately (CY006).

---

## 4. Anti-Spam Controls Summary

| Control | Mechanism | Applies To | Response on Trigger |
|---|---|---|---|
| JWT Authentication | Token presence and validity check | All `POST /api/alerts` requests | `401 Unauthorized` |
| Role Enforcement | RBAC role check from JWT payload | All `POST /api/alerts` requests | `403 Forbidden` |
| Rate Limiting | 10 requests per minute per authenticated user | `POST /api/alerts` | `429 Too Many Requests` + `Retry-After` |
| Throttling | Progressive delay for rapid successive requests | Sensitive endpoints including alert creation | `429` after cooldown period |
| Duplicate Detection | Similarity key: `title` + `message` + `disaster_type` + `location`; 5-minute window per source | `POST /api/alerts` | Flagged for review; creation restricted |
| Input Validation | Field type, format, enum and length checks | All request fields | `400 Bad Request` with field detail |
| Request Size Cap | Fixed 5 KB maximum payload size enforced at API layer | All endpoints | `400 Bad Request` |
| Temporary Restriction | Initial 15-min block on sustained violations; duration escalates on repeat offences | Per user / per IP | Access suspended; admin notified |
| Audit Logging | All rejection and suspicious events captured | All endpoints and control points | Logged with timestamp, IP, user, action |

---



