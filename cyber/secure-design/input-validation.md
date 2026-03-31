# Input Validation and Injection Prevention

## Overview
The PHOENIX system must validate and sanitise all user and system inputs to prevent injection attacks. Injection prevention is important to ensure that alert data, API inputs, and external data feeds are treated only as data and not executed as commands, queries, or scripts.


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


## Example Validation Rules

| Field | Allowed Input | Rule |
|---|---|---|
| title | Text | Maximum 100 characters, no script tags |
| message | Text | Maximum 500 characters, plain text only |
| severity | Enum | Must be one of: low, medium, high, critical |
| disaster_type | Enum | Must be one of: bushfire, flood, both |
| location | Text | Letters, spaces, and approved punctuation only |


## Conclusion
Injection prevention in PHOENIX is achieved by validating inputs, sanitising content, restricting allowed formats, using parameterised queries, and ensuring that untrusted input is never executed as code or commands.