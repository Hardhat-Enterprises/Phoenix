# Authentication Testing

## Overview
Authentication testing was conducted on the TEAVS system to verify the correctness and security of the login mechanism, JWT handling, and access control. 
The goal of the testing was focused on ensuring that only authenticated users were granted access to protected API endpoints and invalid authentication attempted were handled correctly. 

## Test Environment
- Backend API with JWT authentication enabled
- Protected API endpoints
- JWT validation and expiry handling implemented
- Role-Based Access Control (RBAC) enabled


## Scope of Testing
The scope of testing was limited to the authentucationand authoriztion layer of the TEAVS system. This included login mechanism,JWT toke validation, token expiry handling and RBAC. 

## Test Cases

### 1. Authentication (Login)

#### 1.1 Valid Login
- Checking if the system accepts correct credentials(username and password)
- Request :
` POST /api/users/auth/login `
```JSON
{
    "username" : "user",
    "password" : "password123"
}
```
- Expected response:
```JSON
{
    "token" : "eyhkqlisojNiLsiw...."
}
```

| Test Id | TC- 01 |
|-------|-------|
|Description        | Valid Login      |
| Input | username + password |
| Expected Result | JWT returned |
| Actual Result  | JWT returned |
| Status | PASS |

---

#### 1.2 Invalid login
- Checking if the system accepts wrong/guessed passwords 
- Inputs : correct username,  wrong password 
- Request:
```JSON 
{
    "username" : "user",
    "password" : "wrongpassword"
}
```
- Expected Response :
```JSON
{
    "error": "Unauthorized"
}
```
| Test Id | TC- 02 |
|-------|-------|
|Description        | Invalid Login      |
| Input | correct username + wrong password |
| Expected Result | No JWT returned |
| Actual Result  | No JWT returned |
| Status | PASS |

--- 

#### 1.3 Non-existent User
- Checking if the system authorises a fake user
- Input:
```JSON
{
    "username" : "non-user",
    "password" : "somepassword"
}
```
- Expected Result:
` 401 Unauthorized `

| Test Id | TC- 03 |
|-------|-------|
|Description        | Non-existing user login      |
| Input | non-existent username + any password |
| Expected Result | Error 401: Unauthorized |
| Actual Result  | Error 401: Unauthorized |
| Status | PASS |

---

#### 1.4 Empty credentials 
- Checking how the system handles empty inputs or missing fields
- Input:
```JSON
{
    "username" : "",
    "password" : ""
}

``` 
- Expected Result:
`400 Bad Request ` or ` 401 Unauthorized` 

| Test Id | TC- 04 |
|-------|-------|
|Description        | Empty input fields      |
| Input | empty username and password fields |
| Expected Result | Error 400: Bad Request or 401: Unauthorized |
| Actual Result  | Error 400:Bad Request or Error 401: Unauthorized |
| Status | PASS |


---
### 2. Token Validation

#### 2.1 Valid JWT Access
- Checking if a valid JWT token allows access to protected resources according to RBAC. 
- Request:
` GET /api/users/hazards`
- Header:
`Authorization: Bearer <valid_JWT> `
- Expected Response :
`200 OK`

| Test Id | TC- 05 |
|-------|-------|
|Description        | Valid JWT access |
| Input |Valid JWT token in the Authorization header |
| Expected Result | Access Granted |
| Actual Result  | Access Granted |
| Status | PASS |
---
#### 2.2 Missing JWT 
- Checking if the system blocks unauthenticated requests. No authorization header. 
- Request:
` GET /api/users/hazards`
- Expected response: 
` 401 Unauthorized `

| Test Id | TC-06 |
|-------|-------|
|Description        | Missing JWT |
| Input |No authorization header  |
| Expected Result | Request denied |
| Actual Result  | Request denied |
| Status | PASS |
---
#### 2.3 Expired JWT token
- Checking whether the system rejects expired JWT tokens
- Request:
` GET /api/users/hazards`
- Header:
`Authorization: Bearer <expired_JWT> `
- Expected Response: 
`401 Unauthorized`

| Test Id | TC- 07 |
|-------|-------|
|Description        | Expired JWT |
| Input |Expired token |
| Expected Result | Token rejected  |
| Actual Result  | Token rejected |
| Status | PASS |
---
#### 2.4 Tampered token 
- Checks if the system detects and rejects tampered/modified JWT tokens. 
- Request:
` GET /api/users/hazards`
- Header:
`Authorization : Bearer <tampered_token>`
- Expected Response: 
` 401 Unauthorized`

| Test Id | TC- 08 |
|-------|-------|
|Description        | Tampered JWT  |
| Input | Tampered token |
| Expected Result | Token rejected due to signature validation failure |
| Actual Result  | Token rejected |
| Status | PASS |
 
--- 
### 3. Authorization (RBAC)

#### 3.1 Authorized Access (Admin)
- Checking whether an admin user can access the admin-only endpoints
- Request:
` POST /api/users/auth/register/`
- Header:
` Authorization : Bearer <admin_token>`
- Expected Response:
` 200 OK`

| Test Id | TC- 09 |
|-------|-------|
|Description        | Admin Access |
| Input |Valid admin token |
| Expected Result | Access Granted |
| Actual Result  | Access Granted |
| Status | PASS |

#### 3.2 Unauthorized Access (Public)
-Checking whether a standard user is not granted access to admin-only endpoints.
- Request:
` GET /api/users/locations `
- Header:
` Authorization: Bearer <standard_user_token> `
- Expected Response:
`403 Forbidden`

| Test Id | TC- 010 |
|-------|-------|
|Description        | Non-admin access to admin-only endpoint |
| Input |User JWT token |
| Expected Result | Access denied  |
| Actual Result  | Access denied |
| Status | PASS |

# Conclusion

Authentication testing confirmed that the TEAVS authentication system correctly:
- validates user credentials
- generates and verifies JWT tokens
- enforces token expiry handling
- prevents access using invalid or tampered tokens
- applies Role-Based Access Control (RBAC)

The TEAVS authentication system successfully enforces access control (RBAC) and prevents unauthorized access to protected endpoints. 