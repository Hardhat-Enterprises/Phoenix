# JWT Authentication Design

## Overview 
In the TEAVS system, we use JWT (JSON Web Token) to authenticate users and ensure secure access control. Once the user is successfully logged in, the system issues a signed token that verifies the user for all subsequent API requests, hence enabling stateless authentication and safe transmission of information.

## Authentication Flow
- Through Frontend, user inputs login credentials (username + password) to `/api/login`
- The system verifies user credentials by comparing with stored hashed values.
- The system generates and forwards a JWT to the Frontend, if the credentials are valid. 
- Frontend stores the JWT in local storage or in secure HTTP-only cookies.
- For all future API requests, Frontend sends the JWT in the 'Authorization: Bearer <token>' header
- Before the system responds with granted access, it validates the token sent by the Frontend. 


## JSON Web Token Design 
Each token contains three parts:
### 1. Header 
The header tells the token receiver about the type of the token and the hashing algorithm used. 
- Token Type : `{"typ": "JWT"}`
- Signing Agorithm : `{"alg" : "HS256"}`

```json
{
    "typ": "JWT",
    "alg": "HS256"
}
```

### 2. Payload
The payload tells the receiver statements and claims about the user
- Registered claims :
  - `iss` (issuer)
  - `iat` (issued at time)
  - `exp` (expiration time)
- Custom claims :
  - `userId`
  - `role` (admin, council user, emergency services, public users)


### 3. Signature: 
The signature verifies the token.

`HMACSHA256 (
    base64UrlEncode(header) + "." + base64UrlEncode(payload),
    secret
    )`



## JWT Security
### Signature
- Each JWT is signed by the system using a secure algorithm (HMAC SHA-256 for project PHOENIX)
- Since the token is verified through comparing signatures every time an API request is made, it prevents tampering with the payload. 

### Token Expiration and Reauthentication
- Tokens have short validity periods lasting from 15-30 minutes.
- Once the system detects an expired token, system returns an error requiring user to reauthenticate, that is, login again and obtain a new token. 
-  Therefore, if token is stolen, chances of misuse are reduced.

### Role-Based Access Control System
- In the TEAVS system, system validates user's role before granting access to protected API endpoints. 
- These roles are contained in the JWT token. 

## Error Handling
On failure of user authentication:
- `401 Unauthorized` : token is invalid/missing
- `403 Forbidden` : the role of the user (as dictated by the token) forbids user to access protected API endpoint. 

