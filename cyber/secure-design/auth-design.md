# Authentication and Authorization Design

## Overview
The PHOENIX system uses role-based access control (RBAC) to ensure that only authorised users can perform specific actions within the TEAVS system.


## Roles

### 1. Admin
Full system access and control.

### 2. Council Officer
Responsible for creating and managing alerts.

### 3. Emergency Services
Can view alerts for response and coordination.

### 4. Public User
Can view and verify alerts.

## Role Permissions

| Action | Admin | Council Officer | Emergency Services | Public User |
|------|------|----------------|--------------------|------------|
| Create Alert | Yes | Yes | No | No |
| View Alerts | Yes | Yes | Yes | Limited |
| Verify Alert | Yes | Yes | Yes | Yes |
| Update Alert Status | Yes | No | No | No |


## Access Control Rules

- Only Admin and Council Officers can create alerts.
- Only Admin can update alert status.
- Emergency Services can only view alerts.
- Public users can verify alerts but cannot modify them.
- All protected endpoints require authentication except public verification.


## Authentication Method

The system uses JSON Web Tokens (JWT) for authentication.

- Users log in and receive a token.
- The token contains user role and expiry time.
- Each request must include the token.
- The system verifies the token before allowing access.



## Token Lifecycle

- Token is issued at login.
- Token expires after a defined time.
- Expired tokens require re-authentication.

## Purpose of RBAC
RBAC reduces the risk of misuse, prevents unauthorised changes to alerts, and protects sensitive parts of the system by ensuring that permissions are granted according to role and responsibility.


## Conclusion
Role-Based Access Control is an essential part of the PHOENIX secure design because it ensures that critical actions within TEAVS are limited to the appropriate authorised users.