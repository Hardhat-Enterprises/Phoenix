# PHOENIX Token Lifecycle (CY007)

## 1. Token Comparison Table
This table defines the two-tier token system used to secure the TEAVS API.

| Feature | Access Token | Refresh Token |
| :--- | :--- | :--- |
| **Purpose** | Authenticates immediate API requests (Alerts/Verify). | Generates new access tokens when they expire. |
| **Lifespan** | **15 Minutes** (Minimizes window for replay attacks). | **24 Hours** (Maintains secure session persistence). |
| **Algorithm** | **HS256** (HMAC with SHA-256). | **HS256**. |
| **Claims** | `user_id`, `role` (Admin/Council/Public), `exp`. | `user_id`, `token_id`, `exp`. |

## 2. The Four Stages of the Lifecycle

### A. Generation
Tokens are issued upon successful authentication at the `/api/login` endpoint. The payload must include the user's specific role to support the Role-Based Access Control (RBAC) required for protected endpoints.

### B. Usage & Transmission
The client must transmit the JWT in the `Authorization: Bearer <token>` header for all requests to `/api/alerts`. The server validates the signature; if the user's role does not match the endpoint requirements, the API returns a **403 Forbidden** error.

### C. Expiration & Renewal
When the 15-minute access window expires, the server returns a **401 Unauthorized** response. The client application must then use the Refresh Token to request a new Access Token, reducing the risk of using intercepted credentials.

### D. Revocation (Blacklisting)
To prevent API abuse, tokens are immediately revoked and added to a "Blacklist" in secure storage if:
1. The user logs out.
2. The system detects suspicious behavior, such as exceeding the rate limit of **10 alert creations per minute**.
3. A security breach or credential leak is detected by the AI analysis engine.