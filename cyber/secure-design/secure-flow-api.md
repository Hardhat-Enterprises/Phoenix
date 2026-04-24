## Secure Flow - API

The TEAVS system exposes the following key endpoints - 

- POST /api/alerts → Create alert  
- GET /api/alerts/{id} → Retrieve alert  
- GET /api/alerts → List alerts  
- POST /api/alerts/{id}/verify → Verify alert  
- PATCH /api/alerts/{id}/status → Update alert status 

# Secure Flow Framework

These checks, validations and operations are a must to access protected endpoints.

1. A user must be authenticated.

2. A user must have necessary roles to perform the given the operation.

3. Any input given to the endpoint must be thoroughly validated, sanitized and normalized before sending it to the rest of the flow.

    Validation ensures that the input is of proper format and all required fields are present.
    Sanitization helps prevent injection attacks.
    Noramalization ensures that data is not redundant and scale data to a defined range.

4. Any data fetch from databases must be checked for authentication and authorization. DB credentials must be fetched from a secret vault. Principle of least privilege must be followed for DB credentials. Raw errors from database transactions must not be exposed. All database accesses must be logged for auditing and traceability.

5. Any service call must be checked for authentication and authorization. Only valid and processed inputs must be sent to services from endpoint flow. Proper timeouts and retry mechanisms must be enforced to ensure endpoint resilience and service calls are executed with either a successful response or a well-defined failure within a reasonable amount of time. The integrity of response from service must be verified by checking response source and schema, signature verification can be implemented for the same at endpoint level.

6. Any operations or transformations being performed as part of the endpoint operation must be outsourced to a proper and secure service, for example, an Alert creation service.

7. Any data storage/alterations must be checked for authentication and authorization. DB credentials must be fetched
from a secret vault. Principle of least privilege must be followed for DB credentials. Raw errors from database transa
ctions must not be exposed. Data must be encrypted before storage using modern symmetric encryption methods like AES-128. Passwords and sensitive information must be hashed before storage using bcrypt or argon2. All database insertions and alterations must be logged for auditing and traceability. Use mechanisms like concurrency control to avoid race conditions.

8. All endpoint responses must be contain proper status codes, formatted messages and filtered outputs. Proper response schemas must be utilized to ensure only necessary and relevant information is output. Error messages must not contain any sensitive information like traceids, internal IDs and system details.

9. Rate limiting must be enforced using an API gateway or load balancers like nginx.

10. Use secure headers like -
    Strict-Transport-Policy - to force client to always use HTTPS
    Content-Security-Policy - to control what resources the browser is allowed to load
    X-Content-Type-Option, X-Frame-Options and CORS headers.

11. Proper logging infrastructure must be implemented and each and every operation must be logged. Using a traceid which is generated at every entrypoint, passed through every service call and included in every corresponding log. This ensures that all logs relevant to a single operation can be tied together. Logs for the following events or operation are must - 
    Authentication and authorization events
    API requests and responses - Metadata
    Database activity
    Business events - alert created, alert verified and alert updated
    Errors and Exceptions

All these points represent important baselines controls for a proper and secure API system. However, these are not to be used as a definitive checklist for a secure API system.

Further changes will be induced going forward. Modifications are welcome.
