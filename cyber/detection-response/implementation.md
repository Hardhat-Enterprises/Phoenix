# Detection and Response Implementation Rules for Project PHOENIX

This document defines reusable implementation-level detection and response rules for major cyber threat categories identified in Project PHOENIX. These rules are designed to support backend integration by specifying the required inputs, detection logic, alert level, mitigation action, and communication flow.

## Rule 1: Login and Authentication Attack Detection

### Covers
- Brute force attacks
- Credential stuffing
- Unauthorized access using stolen credentials
- Suspicious login activity

### Required Inputs
- user_id
- ip_address
- failed_login_attempts
- login_timestamp
- geo_location
- device_id
- session_id

### Detection Logic
- Detect repeated failed login attempts in a short time window
- Detect login from unknown or unusual location
- Detect login from unrecognized device
- Detect sudden abnormal session behaviour after login

### Rule Logic
- If failed login attempts are greater than 5 within 1 minute, trigger a high alert
- If failed login attempts are greater than 10, lock the account
- If login occurs from an unknown location or device, trigger a medium or high alert depending on severity
- If suspicious session activity is detected after login, revoke session

### Alert Level
- Medium to Critical

### Mitigation
- Lock account temporarily
- Enforce MFA
- Revoke active session
- Reset credentials if needed

### Communication
- Notify security team
- Notify system administrator
- Notify affected user if account action is taken

---

## Rule 2: API Abuse and Unauthorised API Access Detection

### Covers
- API abuse
- Unsecured API access
- Abnormal API request patterns
- Excessive request frequency

### Required Inputs
- api_key
- user_id
- endpoint
- request_count
- request_timestamp
- response_code
- auth_status
- source_ip

### Detection Logic
- Detect request spikes from same API key or IP
- Detect unauthorised access attempts
- Detect repeated access to restricted endpoints
- Detect abnormal use outside expected usage patterns

### Rule Logic
- If request count exceeds threshold within fixed time window, trigger a high alert
- If authentication fails repeatedly, block or throttle the source
- If restricted endpoint is accessed without proper authorisation, trigger critical alert
- If abnormal API pattern continues, revoke API key

### Alert Level
- High to Critical

### Mitigation
- Revoke API key
- Rate limit requests
- Block suspicious IP
- Enforce authentication and validation

### Communication
- Notify backend team
- Notify system administrator
- Notify security team

---

## Rule 3: Data Breach and Unauthorised Data Access Detection

### Covers
- Data breach
- Unauthorised access to database
- Sensitive data exposure
- Abnormal data extraction

### Required Inputs
- user_id
- database_query
- records_accessed
- download_size
- timestamp
- source_ip
- role

### Detection Logic
- Detect abnormal number of database queries
- Detect access to sensitive records outside expected role
- Detect large data extraction
- Detect access at unusual times or from unusual locations

### Rule Logic
- If accessed records exceed threshold, trigger high alert
- If low-privilege user accesses sensitive dataset, trigger critical alert
- If large download size is detected unexpectedly, suspend session
- If repeated abnormal access occurs, restrict access immediately

### Alert Level
- High to Critical

### Mitigation
- Restrict access
- Suspend session
- Isolate affected account
- Secure database endpoint
- Begin incident response

### Communication
- Notify security team
- Notify database administrator
- Notify relevant stakeholders if sensitive data is impacted

---

## Rule 4: Phishing, Scam, and Social Engineering Detection

### Covers
- Phishing emails
- Scam messages
- Fake donation requests
- Government impersonation scams
- Voice phishing
- Social engineering attempts

### Required Inputs
- message_id
- sender
- receiver
- sender_domain
- message_content
- links
- channel_type
- user_reports
- timestamp

### Detection Logic
- Detect suspicious links
- Detect urgent or manipulative language
- Detect impersonation of trusted organisations
- Detect unverified sender or domain
- Detect repeated scam patterns in messages

### Rule Logic
- If suspicious link and urgent language are both present, trigger high alert
- If sender domain does not match trusted domain, flag as suspicious
- If multiple users report same sender or content, quarantine the message
- If message contains known scam patterns, block or isolate delivery

### Alert Level
- Medium to High

### Mitigation
- Quarantine email or message
- Block malicious URL
- Prevent further delivery
- Flag suspicious sender

### Communication
- Notify user
- Notify moderation or security team
- Raise awareness alert if campaign is widespread

---

## Rule 5: Malware and Ransomware Detection

### Covers
- Malware infection
- Information stealer
- Ransomware
- Suspicious executable activity
- Malicious mobile app behaviour

### Required Inputs
- host_id
- process_name
- file_modifications
- cpu_usage
- outbound_connections
- file_encryption_events
- app_behaviour
- timestamp

### Detection Logic
- Detect abnormal process behaviour
- Detect file encryption activity
- Detect unusual outbound communication
- Detect suspicious application access to sensitive files
- Detect sudden system changes

### Rule Logic
- If file encryption event count exceeds threshold, trigger critical alert
- If unknown process accesses multiple sensitive files, isolate host
- If suspicious outbound traffic is detected after execution, flag malware activity
- If malicious application behaviour is found on device, block or remove app

### Alert Level
- High to Critical

### Mitigation
- Isolate infected system
- Stop malicious processes
- Remove malicious application
- Recover from clean backup if needed

### Communication
- Notify security team
- Notify incident response team
- Notify administrator immediately

---

## Rule 6: DDoS and Traffic Flooding Detection

### Covers
- DDoS attacks
- Resource exhaustion
- Traffic flooding
- Service availability attacks

### Required Inputs
- source_ip
- request_count
- request_rate
- endpoint
- system_load
- response_time
- timestamp

### Detection Logic
- Detect abnormal traffic spikes
- Detect repeated requests from same or distributed sources
- Detect degraded service availability
- Detect resource exhaustion patterns

### Rule Logic
- If traffic rate exceeds threshold, trigger high alert
- If endpoint response time degrades rapidly under traffic spike, trigger critical alert
- If repeated malicious traffic detected, rate limit or block source
- If system load exceeds safe limits, activate protection controls

### Alert Level
- High to Critical

### Mitigation
- Rate limit traffic
- Block malicious IP addresses
- Scale infrastructure if possible
- Redirect or filter suspicious traffic

### Communication
- Notify administrator
- Notify network/security team
- Notify operations team if service is affected

---

## Rule 7: IoT Sensor and Device Manipulation Detection

### Covers
- IoT attack
- Sensor manipulation
- False disaster readings
- Device compromise
- Abnormal sensor communication

### Required Inputs
- device_id
- sensor_type
- sensor_value
- expected_range
- timestamp
- location
- communication_status
- peer_sensor_values

### Detection Logic
- Detect sensor values outside normal range
- Detect inconsistency across multiple sensors
- Detect unusual device communication
- Detect repeated invalid readings from same device

### Rule Logic
- If sensor value exceeds expected threshold, trigger medium alert
- If multiple sensors conflict significantly, trigger high alert
- If same device repeatedly sends abnormal readings, mark device as compromised
- If device communication pattern becomes abnormal, isolate device from system

### Alert Level
- Medium to High

### Mitigation
- Ignore corrupted readings
- Isolate affected device
- Mark data as untrusted
- Require manual verification

### Communication
- Notify system operator
- Notify technical team
- Notify monitoring team for validation

---

## Rule 8: Misinformation and Deepfake Detection

### Covers
- Fake disaster updates
- Social media misinformation
- Deepfake media
- False evacuation information
- Unverified public communications

### Required Inputs
- content_id
- source
- content_text
- media_type
- verification_status
- share_count
- user_reports
- timestamp

### Detection Logic
- Detect unverified sources
- Detect conflicting information against trusted data
- Detect AI-generated or manipulated media indicators
- Detect rapid spread of false or suspicious content

### Rule Logic
- If content is unverified and rapidly spreading, trigger medium alert
- If content conflicts with trusted official sources, flag for review
- If deepfake indicators are found in media, trigger high alert
- If repeated user reports are received, restrict content distribution

### Alert Level
- Medium to High

### Mitigation
- Flag content
- Restrict distribution
- Send for verification
- Prevent automated escalation of false information

### Communication
- Notify moderation team
- Notify analysts or reviewers
- Inform users where appropriate

---

## Rule 9: Emergency Alert System Compromise Detection

### Covers
- Emergency alert compromise
- Fake official alerts
- Unauthorized alert generation
- Alert suppression or misuse

### Required Inputs
- alert_id
- sender_id
- alert_content
- approval_status
- dispatch_time
- source_ip
- authentication_status

### Detection Logic
- Detect alert dispatch from unauthorised source
- Detect alert without valid approval
- Detect unusual alert timing or abnormal volume
- Detect alert content inconsistent with official disaster context

### Rule Logic
- If alert is sent without approval, trigger critical alert
- If sender does not match authorised source, block alert
- If multiple abnormal alerts are generated, disable dispatch temporarily
- If authentication failure occurs during alert dispatch, revoke session immediately

### Alert Level
- Critical

### Mitigation
- Block or disable alert dispatch
- Revoke user/session access
- Verify official alert content manually
- Escalate incident immediately

### Communication
- Notify authorities
- Notify system administrator
- Notify emergency response management team

---

## Rule 10: Fraudulent Claims and Application Abuse Detection

### Covers
- Fraudulent grant claims
- Fake disaster recovery applications
- Duplicate claim submissions
- False supporting evidence

### Required Inputs
- application_id
- applicant_id
- uploaded_documents
- submission_time
- source_ip
- identity_verification_status
- previous_submission_count

### Detection Logic
- Detect duplicate or repeated applications
- Detect fake or suspicious supporting documents
- Detect mismatched identity information
- Detect large number of submissions from same source

### Rule Logic
- If duplicate applications are submitted from same source, trigger medium alert
- If uploaded evidence appears reused or manipulated, flag for verification
- If identity mismatch is detected, reject submission
- If repeated abusive submission pattern continues, block source

### Alert Level
- Medium to High

### Mitigation
- Reject suspicious applications
- Send to manual verification
- Block abusive source
- Strengthen validation controls

### Communication
- Notify verification team
- Notify administrators
- Notify fraud review team

---

## Summary

These implementation rules provide reusable detection and response patterns that can be integrated into backend services. Instead of duplicating logic for every threat in the dataset, the rules group similar threats into core categories that can be monitored, alerted, and mitigated systematically within Project PHOENIX.
