# JSON Web Token Lifecycle

The JWT lifecycle defines how a token is created, stored, used, validated, and expired within the TEAVS system. This ensures secure access control and enables stateless authentication.

## 1. Issuing a token
- After the user successfully authenticates at `/api/login`, the backend generates a JWT
- The token includes claims such as `userId`, `role`, `iat`, and `exp`
- The token is signed using SHA256 algorithm to ensure integrity.

## 2. Storing a token
- The frontend stores the JWT after receiving it from the backend
- Tokens can be stored as:
  - Secure HTTP-only cookies 
  - Local storage 

## 3. Using a token
- For every subsequent API request, the frontend includes the token in: `Authorization: Bearer <token>` header
- This allows the backend to identify and statelessly authenticate the user.

## 4. Token Validation
- The backend, upon receiving the token:
  - Verifies the token signature
  - Checks token expiration (`exp`)
  - Validates user role for access control (RBAC)
  - If validation fails, access is denied.

## 5. Token Expiration
- Tokens are valid for a limited duration, i.e., 15–30 minutes
- Once expired, the token is no longer accepted
- The backend returns a `401 Unauthorized` response
- The user must reauthenticate to obtain a new token
