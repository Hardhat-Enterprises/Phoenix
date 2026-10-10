# Sample Cyber Detection Logic

## Purpose

This document defines sample cyber event-generation logic for Project Phoenix. These rules can be used to create cyber events and send them into the backend ingestion pipeline.

---

## 1. Brute Force Login Detection

Condition:
If the same IP address or username has 5 or more failed login attempts within 10 minutes.

Generated Event:

{
  "event_id": "CYB-BF-001",
  "timestamp": "2026-05-17T10:00:00Z",
  "event_type": "cyber",
  "source": "auth-service",
  "threat_type": "brute_force",
  "severity": "high",
  "confidence_score": 0.92
}

Response Action:
investigate

---

## 2. Suspicious API Usage Detection

Condition:
If one IP repeatedly accesses sensitive endpoints or receives many 401, 403, or 429 responses.

Generated Event:

{
  "event_id": "CYB-API-001",
  "timestamp": "2026-05-17T10:05:00Z",
  "event_type": "cyber",
  "source": "api-gateway",
  "threat_type": "suspicious_api_usage",
  "severity": "medium",
  "confidence_score": 0.85
}

Response Action:
monitor_closely

---

## 3. Abnormal Activity Detection

Condition:
If a user performs unusual behaviour, such as accessing restricted endpoints or too many resources quickly.

Generated Event:

{
  "event_id": "CYB-ABN-001",
  "timestamp": "2026-05-17T10:10:00Z",
  "event_type": "cyber",
  "source": "activity-monitor",
  "threat_type": "abnormal_activity",
  "severity": "medium",
  "confidence_score": 0.82
}

Response Action:
monitor_closely

---

## 4. Malware or Phishing Indicator Detection

Condition:
If suspicious files, malicious links, or phishing indicators are detected.

Generated Event:

{
  "event_id": "CYB-MAL-001",
  "timestamp": "2026-05-17T10:15:00Z",
  "event_type": "cyber",
  "source": "content-scanner",
  "threat_type": "malware",
  "severity": "critical",
  "confidence_score": 0.98
}

Response Action:
urgent_response

---

## Severity Mapping

low -> monitor  
medium -> monitor_closely  
high -> investigate  
critical -> urgent_response  

---

## Integration Notes

These cyber events can be generated from:
- login/authentication logs
- API gateway logs
- user activity logs
- suspicious file or content scanning
- abnormal behaviour detection

The generated events can be sent into the existing backend ingestion pipeline and later displayed through the frontend dashboard.
