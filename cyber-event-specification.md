# Cyber Threat Event Specification

## Overview

This document defines example cyber event structures and detection logic for integration into the Project Phoenix cyber ingestion pipeline.

--------------------------------------------------

## 1. Brute Force Login Event

Trigger Condition:
If the same IP address or username performs 5 or more failed login attempts within 10 minutes.

Example Event:

{
  "event_id": "CYB-BF-001",
  "timestamp": "2026-05-17T10:00:00Z",
  "event_type": "cyber",
  "source": "auth-service",
  "threat_type": "brute_force",
  "severity": "high",
  "confidence_score": 0.92
}

--------------------------------------------------

## 2. Suspicious API Usage Event

Trigger Condition:
If one IP repeatedly accesses sensitive endpoints or triggers excessive 401/403/429 responses.

Example Event:

{
  "event_id": "CYB-API-001",
  "timestamp": "2026-05-17T10:05:00Z",
  "event_type": "cyber",
  "source": "api-gateway",
  "threat_type": "suspicious_api_usage",
  "severity": "medium",
  "confidence_score": 0.85
}

--------------------------------------------------

## 3. Abnormal Activity Event

Trigger Condition:
If a user performs unusual activity patterns or unexpected endpoint access.

Example Event:

{
  "event_id": "CYB-ABN-001",
  "timestamp": "2026-05-17T10:10:00Z",
  "event_type": "cyber",
  "source": "activity-monitor",
  "threat_type": "abnormal_activity",
  "severity": "medium",
  "confidence_score": 0.82
}

--------------------------------------------------

## 4. Malware / Phishing Indicator Event

Trigger Condition:
If suspicious uploaded files, malicious links, or phishing indicators are detected.

Example Event:

{
  "event_id": "CYB-MAL-001",
  "timestamp": "2026-05-17T10:15:00Z",
  "event_type": "cyber",
  "source": "content-scanner",
  "threat_type": "malware",
  "severity": "critical",
  "confidence_score": 0.98
}

--------------------------------------------------

## Severity Mapping

low -> monitor

medium -> monitor_closely

high -> investigate

critical -> urgent_response

--------------------------------------------------

## Notes

These cyber events are intended to be generated from:
- authentication logs
- API gateway logs
- user activity monitoring
- suspicious content scanning
- abnormal behaviour detection

The generated events can then be forwarded into the backend ingestion pipeline for monitoring, statistics, dashboard integration, and response handling.
