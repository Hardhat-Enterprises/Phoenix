# Error Handling Design

## Overview
The PHOENIX system implements standard API error handling to ensure clear communication when requests fail. Error responses help users understand what went wrong and how to fix it, while preventing exposure of sensitive system details.


## Standard Error Codes

| Code | Name | Description |
|------|------|------------|
| 400 | Bad Request | Invalid or missing input data |
| 401 | Unauthorized | User is not authenticated |
| 403 | Forbidden | User does not have permission |
| 404 | Not Found | Resource (alert) does not exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected system error |


## Error Scenarios

### 1. Invalid Input (400)
- Missing required fields
- Incorrect data format
- Invalid values (e.g., wrong severity)

### 2. Authentication Failure (401)
- Missing token
- Invalid or expired token

### 3. Authorization Failure (403)
- User tries to access restricted endpoint
- Example: Public user trying to update alert status

### 4. Resource Not Found (404)
- Alert ID does not exist
- Incorrect endpoint path

### 5. Rate Limit Exceeded (429)
- Too many requests in a short time
- API throttling applied

### 6. Internal Server Error (500)
- Unexpected system failure
- Database or service failure


## Error Response Format

All error responses should follow a consistent format:

```json
{
  "error_code": 400,
  "error_message": "Invalid input data",
  "details": "Severity must be one of: low, medium, high, critical"
}