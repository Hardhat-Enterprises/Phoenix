# TEAVS–ADCRS API Interface Specification

## 1. Purpose

This document defines the proposed API interface between TEAVS and ADCRS within Project PHOENIX.

The aim is to document how TEAVS can send relevant cyber alert or event information for risk analysis and how ADCRS can return the analysis result back to the PHOENIX backend and TEAVS.

The interface is based on the existing PHOENIX API Gateway structure and current ingestion routes. The proposed TEAVS–ADCRS endpoint described in this document is an interface design and should not be treated as an already implemented production endpoint.

## 2. Existing API Baseline

The current PHOENIX backend exposes ingestion routes through the API Gateway.

The existing routes reviewed are:

* `POST /api/ingestion/hazard`
* `POST /api/ingestion/cyber`
* `POST /api/ingestion/core`

The existing cyber ingestion route already accepts structured cyber-related event information, while the core ingestion route is used for model/integration processing.

These routes provide the baseline for the proposed TEAVS–ADCRS interface so that existing routing, authentication and backend patterns can be reused where possible.

## 3. Proposed TEAVS–ADCRS Endpoint

**Proposed endpoint:**

`POST /api/ingestion/adcrs`

**Purpose:**

Accept a TEAVS cyber alert or security event and submit the relevant information for ADCRS cyber-risk analysis.

**HTTP Method:**

`POST`

The endpoint should follow the existing `/api/ingestion/...` API Gateway structure rather than introducing a completely separate API pattern.

## 4. TEAVS to ADCRS Request Structure

The request should contain the security-event information required by ADCRS to perform risk analysis.

### Proposed JSON Request

```json
{
  "alert_id": "alert-12345",
  "event_type": "cyber_alert",
  "threat_type": "phishing",
  "severity": "high",
  "location": {
    "state_region": "Victoria",
    "suburb": "Melbourne"
  },
  "timestamp": "2026-09-21T10:30:00Z"
}
```

### Request Fields

| Field         | Type   | Required | Description                                 |
| ------------- | ------ | -------- | ------------------------------------------- |
| `alert_id`    | string | Yes      | Unique identifier for the TEAVS alert/event |
| `event_type`  | string | Yes      | Type of event being submitted               |
| `threat_type` | string | Yes      | Identified or suspected cyber threat        |
| `severity`    | string | Yes      | Severity assigned by TEAVS                  |
| `location`    | object | Yes      | Location associated with the event          |
| `timestamp`   | string | Yes      | Time the event occurred or was detected     |

## 5. ADCRS to Backend/TEAVS Response Structure

ADCRS should return the result of the cyber-risk analysis in a structured format that can be consumed by the backend and TEAVS.

### Proposed JSON Response

```json
{
  "risk_score": 0.87,
  "risk_level": "High",
  "detected_threat": "Phishing activity detected",
  "recommended_response": "Block source and investigate related events"
}
```

### Response Fields

| Field                  | Type   | Description                                     |
| ---------------------- | ------ | ----------------------------------------------- |
| `risk_score`           | number | Numeric result representing the calculated risk |
| `risk_level`           | string | Low, Medium, High or Critical                   |
| `detected_threat`      | string | Threat or anomaly identified by ADCRS           |
| `recommended_response` | string | Recommended action based on the analysis        |

## 6. Authentication and RBAC

The proposed integration should reuse the authentication and authorisation controls already implemented in the PHOENIX API Gateway.

JWT authentication should be required before the TEAVS–ADCRS endpoint accepts a request.

The existing `authenticate` middleware verifies the bearer token and checks that the token matches the current access token stored for the user.

Role-based access control should also be applied using the existing `authorize()` middleware.

The exact role permitted to submit TEAVS–ADCRS requests should be confirmed with the backend team. A service role similar to the existing ingestion-service role may be appropriate.

The endpoint should return:

* `401 Unauthorized` when the JWT is missing or invalid.
* `403 Forbidden` when the authenticated user or service does not have the required role.

## 7. Input Validation

Input validation should be applied before the request is passed to downstream processing.

At minimum, the following checks should be performed:

* all required fields are present;
* `alert_id` is a valid non-empty string;
* `event_type` and `threat_type` contain accepted values;
* `severity` is restricted to agreed severity values;
* `timestamp` uses a valid date-time format;
* `location` has the required structure;
* malformed JSON is rejected;
* unexpected or invalid field types are rejected.

Invalid requests should return `400 Bad Request` with a controlled error response.

## 8. Error Handling

The proposed endpoint should follow the error-handling pattern already used by the API Gateway.

Suggested responses are:

| Status                      | Meaning                                                 |
| --------------------------- | ------------------------------------------------------- |
| `200 OK`                    | Analysis completed and response returned synchronously  |
| `202 Accepted`              | Request accepted for asynchronous processing            |
| `400 Bad Request`           | Invalid or incomplete request                           |
| `401 Unauthorized`          | Missing, invalid or expired authentication token        |
| `403 Forbidden`             | Authenticated requester does not have the required role |
| `500 Internal Server Error` | Unexpected backend or processing failure                |

The final choice between `200` and `202` depends on whether the final integration operates synchronously or through the existing asynchronous backend/queue processing model.

## 9. Security Considerations

The TEAVS–ADCRS integration should build on the existing PHOENIX security controls rather than introducing duplicate security logic.

The main security areas are:

### JWT Authentication

Reuse the existing API Gateway authentication middleware.

### Role-Based Access Control

Reuse the existing role-checking middleware and define the minimum role required to access the integration endpoint.

### Input Validation

Validate all external input before the event is passed into downstream processing.

### Rate Limiting

Rate limiting should be considered to reduce API abuse and excessive integration requests.

During the current review, rate limiting has not yet been confirmed in the API Gateway configuration and requires further checking.

### Error Handling

Error responses should not expose sensitive backend information, credentials, stack traces or internal implementation details.

### Alert Integrity and Verification

The integration should preserve the integrity and authenticity of TEAVS alert information.

Existing alert verification, hashing or signing controls should be reused where available. The exact implementation still requires confirmation in the current backend.

### Logging

Sensitive event information should not be unnecessarily written into application logs.

Logs should provide enough information for investigation and troubleshooting without exposing credentials or sensitive payload contents.

## 10. Security Event Notification

Security events generated by the integration may be useful inputs for the PHOENIX Security Event Notification module.

Possible notification events include:

* failed authentication;
* repeated invalid JWT attempts;
* RBAC access denial;
* malformed or invalid requests;
* rate-limit violations;
* failed integrity or signature verification;
* repeated processing failures.

The current notification service supports health checking and notification retrieval.

During the current backend review, a clear method for creating security-event notifications from these controls has not yet been confirmed.

This should therefore be treated as an integration gap requiring further review.

## 11. Current Gaps

The following items still require confirmation or further work:

1. Final production TEAVS–ADCRS endpoint.
2. Final HTTP processing model: synchronous or asynchronous.
3. Final RBAC role required for the integration.
4. Complete runtime input-validation implementation.
5. API rate-limiting implementation.
6. Alert integrity/signature verification implementation.
7. Security Event Notification creation flow.
8. Final ADCRS backend/AI contract.
9. Integration and security testing.

## 12. Next Steps

The next technical steps are:

1. Run the PHOENIX backend locally through Docker.
2. Access Swagger through the API Gateway.
3. Confirm the currently implemented endpoints.
4. Compare the current backend against this interface specification.
5. Complete the backend security-controls review.
6. Document identified gaps.
7. Perform positive and negative integration/security tests.
8. Update this specification if the final Backend/AI interface differs from the proposed design.

## 13. Conclusion

The proposed interface provides a structured starting point for TEAVS–ADCRS communication while following the existing PHOENIX backend design.

The intention is not to duplicate existing security controls, but to reuse authentication, authorisation, validation, error-handling and integrity mechanisms wherever possible.

The remaining work is to verify the proposed interface against the running backend, confirm the final Backend/AI requirements and test the integration before it is considered ready for wider use.
