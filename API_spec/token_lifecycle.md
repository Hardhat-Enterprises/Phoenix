# PHOENIX Token Lifecycle (CY007)

## (A) Four Stages of the Token Lifecycle
1. **Generation:** Tokens are generated using the **HS256** (HMAC with SHA-256) algorithm once a user is authenticated at the `/api/login` endpoint.
2. [cite_start]**Usage:** The client application must include the JWT in the `Authorization: Bearer <token>` header for all requests to protected `/api/alerts` endpoints. [cite: 452]
3. [cite_start]**Expiration:** Access tokens will expire every **15 minutes** to minimize the window of opportunity for token interception and replay attacks. [cite: 452]
4. **Revocation:** In case of suspected abuse (e.g., exceeding 10 alerts per minute) or credential leak, the token ID is added to a "Blacklist" in secure storage to immediately invalidate access.

## (B) Token Comparison Table

| Feature | Access Token | Refresh Token |
| :--- | :--- | :--- |
| **Purpose** | Immediate authentication for API requests (Alerts/Verify). | Generates new access tokens when they expire. |
| **Lifespan** | **15 - 30 Minutes** (Minimizes exposure if stolen). | **7 - 30 Days** (Reduced frequency of re-login). |
| **Storage** | Client-side memory or secure session state. | Secure, encrypted database in the PHOENIX framework. |
| **Security Risk** | High (Provides direct system access). | Low (Cannot be used to access API data directly). |

