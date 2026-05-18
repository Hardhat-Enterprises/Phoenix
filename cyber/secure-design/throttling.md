## Throttling Design

### Overview
Throttling is used in the PHOENIX system to control excessive request traffic and reduce the risk of abuse, overload, or service disruption. It works alongside rate limiting by slowing or temporarily restricting repeated requests before they can negatively affect the system.

### Throttling Rules
- Requests that exceed normal usage patterns may be delayed or temporarily restricted.
- Throttling applies more strictly to sensitive endpoints such as alert creation, login, and alert status updates.
- Public or verification endpoints may allow broader access, but abnormal repeated use should still trigger throttling.
- Throttling responses should prevent system overload while still preserving availability for legitimate users.

### Example Application
- Login endpoint: repeated failed requests trigger temporary delay
- Create alert endpoint: excessive requests trigger slowdown or rejection
- Verify alert endpoint: repeated automated requests trigger temporary restriction
- Admin-only endpoints: stricter throttling due to higher sensitivity

### Throttling Response
When throttling is triggered, the system should:
- slow repeated requests
- return `429 Too Many Requests` where appropriate
- log excessive activity for monitoring
- allow normal access again after a cooldown period

### Purpose
Throttling helps protect the system from brute-force attacks, spam requests, automated abuse, and unnecessary pressure on backend services.

### Design Approach
Throttling rules were defined by identifying endpoints that are more sensitive to abuse and applying stricter controls to those operations. The goal is to maintain system stability while reducing malicious or excessive usage.

### Conclusion
Throttling strengthens API protection by reducing abusive behaviour, protecting system availability, and supporting secure service operation.