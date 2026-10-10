# Security Architecture Design (API + Authentication + Cryptography)

## Overview
The PHOENIX TEAVS system integrates API design, authentication mechanisms, and cryptographic techniques to ensure secure, reliable, and trusted alert communication. This design ensures that all system interactions are controlled, validated, and protected against misuse and tampering.

---

## 1. API Security Design

The TEAVS API provides structured access to system functionality through defined endpoints.

### Key Endpoints
- POST /api/alerts → Create alert  
- GET /api/alerts/{id} → Retrieve alert  
- GET /api/alerts → List alerts  
- POST /api/alerts/{id}/verify → Verify alert  
- PATCH /api/alerts/{id}/status → Update alert status  

### Security Controls
- Endpoints are protected based on user roles  
- Input validation and format checks are applied  
- Rate limiting is enforced to prevent abuse  
- Error responses do not expose internal system details  

---

## 2. Authentication and Authorization (JWT + RBAC)

### Authentication (JWT)
- Users authenticate via `/api/login`  
- System verifies credentials using stored hashed passwords  
- A signed JWT is issued upon successful login  
- Token is sent in `Authorization: Bearer <token>` header  

### Authorization (RBAC)
- Admin → full access  
- Council Officer → create/manage alerts  
- Emergency Services → view alerts  
- Public User → verify alerts  

### Protected Endpoints
- POST /api/alerts → Admin, Council Officer  
- PATCH /api/alerts/{id}/status → Admin  
- GET endpoints → restricted access  
- Verify endpoint → public access  

---

## 3. Cryptographic Design

### 3.1 Digital Signatures (Alert Integrity)

Digital signatures ensure alert authenticity and prevent tampering.

#### Purpose
- Ensure data integrity  
- Verify data origin  
- Provide non-repudiation  
- Secure system communication  

#### Signature Generation
- Alert data is created  
- Data is hashed using SHA-256  
- Hash is encrypted using a private key  
- Resulting value is the digital signature  

#### Verification Process
- Receiver decrypts signature using public key  
- Receiver hashes the received data  
- Both hashes are compared  
- Match → valid  
- Mismatch → rejected  

---

### 3.2 Password Hashing (Authentication Security)

SHA-256 hashing is used to protect user credentials.

#### Process
- User enters password  
- Password is sent securely to backend  
- Backend hashes password using SHA-256  
- Hash is stored in database  
- During login, hashes are compared  

#### Security Benefits
- Passwords are not stored in plaintext  
- Hashing is irreversible  
- Protects against credential exposure  

---

## 4. Security Integration

All components work together:

- API → defines system interaction  
- JWT → verifies user identity  
- RBAC → controls access  
- Validation → ensures safe input  
- Rate limiting → prevents abuse  
- Digital signatures → ensure data integrity  
- Hashing → protects credentials  

---

## Design Approach

This architecture was developed by analysing system requirements and identifying key security risks such as unauthorised access, data tampering, and malicious input.

API design was structured using REST principles, authentication was designed using JWT and RBAC, and cryptographic techniques such as hashing and digital signatures were incorporated to ensure secure communication and data protection.

The system follows a secure-by-design approach where security is integrated into all layers rather than added after implementation.

---

## Conclusion

The combined use of API security, authentication mechanisms, and cryptographic techniques ensures that the PHOENIX TEAVS system provides secure, controlled, and trustworthy alert communication.