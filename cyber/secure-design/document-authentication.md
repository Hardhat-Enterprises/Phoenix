# Authentication System Design

The TEAVS authentication system ensures that only authorised users can access protected resources through a secure login and token-based authentication mechanism.

## 1. User Login Process
- The user submits credentials (username and password) via the frontend
- The request is sent securely over HTTPS to the `/api/login` endpoint
- The backend verifies credentials against stored hashed passwords (SHA-256)

## 2. Credential Verification
- The entered password is hashed using SHA-256
- The hashed value is compared with the stored hash in the database
- If the values match, authentication is successful

## 3. Token Generation
- Upon successful authentication, a JWT is generated
- The token includes user identity and role information
- The token is signed using HS256 to ensure integrity

## 4. Access Control
- All protected endpoints require a valid JWT
- The backend validates:
  - Token signature
  - Token expiry
  - User role permissions (RBAC)

## 5. Authorisation Model
- Role-Based Access Control (RBAC) is used:
  - Admin: full system access
  - Analyst/DMT: review and manage alerts
  - Public user: limited access to public endpoints

## 6. Security Measures
- HTTPS is used for secure transmission
- Passwords are stored using SHA-256 hashing
- JWT tokens are time-limited to reduce misuse risk
- Invalid or expired tokens require reauthentication