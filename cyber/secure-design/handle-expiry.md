# Handling Expiry of JWT tokens in the TEAVS system

## Overview
In the TEAVS system implemented in the PHOENIX project, security is prioritised and to maintain security, access tokens are intentionally given a short period of lifetime (15-30 mins). This prevents larger impact in case the attacker gets a hold of token. 
Refresh Token Pattern mechanism to handle the transition from token expiry to token re-issuance.
## Strategy 
To handle token expiry, a dual-token system must be implemented:
- Access Token (JWT) : Lifetime of 15-30 minutes. Verified for API request from frontend to backend.
- Refresh Token : Lifetime of  7 days. Used to request a new Access token after the old one expires.
## Implementation Logic at Backend
When Backend receives an expired token, it should take the following steps:
- Detect token expiration during `jwt.decode()`
- Return `401 Unauthorized`. Inform the frontend with a message ("Token Expired")
- Create a secure `/refresh` endpoint that accepts a Refresh Token
    - Check if the Refresh Token is valid
    - Issue a new Access Token and a new Refresh Token, hence, rotate tokens. 

## Implementation Logic at Frontend
When token expires, Frotend should handle token expiry, without interrupting user:
- Watch for `401` errors or messages sent by the backend
- If an error or message is received, indicating that Access Token has expired, call the `/refresh` endpoint
- Once the new token is received, update token in storage, and retry the user's request. 