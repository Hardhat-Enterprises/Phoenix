# Input Validation and Injection Prevention

## Overview
The PHOENIX system must validate and sanitise all user and system inputs to prevent injection attacks. Injection prevention is important to ensure that alert data, API inputs, and external data feeds are treated only as data and not executed as commands, queries, or scripts.

## Validation Enforcement

- Validation is enforced at the API layer before request processing
- Invalid requests are rejected early to reduce system load and attack surface

## Injection Risks
Potential injection risks in the PHOENIX system include:
- SQL injection through API input fields
- Script injection through alert messages or user-submitted content
- Command injection through system-level processing
- Log injection through malicious text added to audit records


## Injection Prevention Rules

### 1. Validate All Inputs
All input fields must be checked before processing.
- Reject unexpected characters
- Reject malformed input
- Ensure required fields are present
- Enforce correct data types
- Repeated invalid inputs are tracked and flagged

### 2. Use Allowed Input Formats
Each field should only accept expected formats.
- `title` → plain text, limited length
- `message` → plain text only
- `severity` → only predefined values (low, medium, high, critical)
- `disaster_type` → only predefined values (bushfire, flood, both)

### 3. Sanitise User Input
Inputs must be sanitised to remove or neutralise harmful content.
- Remove script tags
- Escape special characters where required
- Strip unsupported HTML or code content

### 4. Use Parameterised Queries
Database operations must use parameterised queries or prepared statements instead of directly inserting user input into queries.

### 5. Avoid Direct Command Execution
User input must never be directly passed into system commands, shell commands, or file operations.

### 6. Validate External Data Sources
Data received from external systems such as BoM, Scamwatch, or other feeds must also be validated before being processed.

### 7. Protect Logging and Error Messages
Input included in logs must be sanitised to prevent log injection. System error messages should not expose internal query structures or sensitive implementation details.

### 8. Input Limits
- Maximum API request size: 2 KB – 10 KB (depending on endpoint)
- Prevents large payload attacks and system overload

### 9. Field Length Constraints
- title - max 100 characters
- message - max 500 characters
- location - max 100 characters
- source - max 50 characters

### 10. Logging for Suspicious Inputs

- Suspicious or repeated invalid inputs are logged with:
timestamp
  - IP address
  - action attempted
- Supports monitoring and security audits



## Example Validation Rules

| Field | Allowed Input | Rule |
|---|---|---|
| title | Text | Maximum 100 characters, no script tags |
| message | Text | Maximum 500 characters, plain text only |
| severity | Enum | Must be one of: low, medium, high, critical |
| disaster_type | Enum | Must be one of: bushfire, flood, both |
| location | Text | Letters, spaces, and approved punctuation only |

## Format Validation Rules

### Overview
The PHOENIX system enforces strict format validation to ensure that all inputs follow expected data types, structures, and allowed values. This prevents invalid data entry and reduces security risks.



### Field Format Requirements

| Field | Type | Allowed Format | Example |
|---|---|---|---|
| title | string | Plain text (max 100 characters) | "Flood Warning" |
| message | string | Plain text (max 500 characters) | "Heavy rainfall expected" |
| disaster_type | enum | bushfire, flood, both | "flood" |
| threat_type | enum | phishing, scam, ransomware, misinformation | "phishing" |
| severity | enum | low, medium, high, critical | "high" |
| location | string | Letters and spaces only | "Melbourne" |
| source | string | Valid source name | "Scamwatch" |


### Validation Rules

- Inputs must match defined data types.
- Enum fields must only contain predefined values.
- Input length must not exceed specified limits.
- Invalid or unexpected formats must be rejected.
- Only safe characters are allowed in text fields.

### Validation Workflow

- Request received by API
- Required fields checked
- Data type validation applied
- Allowed values verified
- Input length checked
- Request accepted or rejected


### Security Impact

- Reduces attack surface at early stages
- Prevents system overload from invalid requests
- Detects malicious patterns before deeper processing
- Improves system reliability and trust


### Error Handling for Invalid Format

Invalid inputs should result in:
- `400 Bad Request`
- Clear error message indicating the incorrect field

Repeated invalid requests may result in:
  - `429 Too Many Requests`
Suspicious activity is flagged and logged.

Example:

```json
{
  "error_code": 400,
  "error_message": "Invalid format",
  "details": "Severity must be one of: low, medium, high, critical"
}

## Conclusion
Injection prevention in PHOENIX is achieved by validating inputs, sanitising content, restricting allowed formats, using parameterised queries, and ensuring that untrusted input is never executed as code or commands.

