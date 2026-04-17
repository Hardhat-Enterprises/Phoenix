# Digital Signature implementation in TEAVS System 

## Overview
In the TEAVS system, data integrity and authenticity are maintained by using digital signatures. Digital signatures act as a tamper-proof seal and validate the source of data, providing a trust layer between the systems. 


## Purpose of Digital Signatures

### 1. Data Integrity 
The system can detect tampered or corrupted data since any changes to the original data leads to a mismatch in digital signatures. 

### 2. Authentication
The Backend signs data (using a private key). 
The receiver verifies the data using a public key.
This process maintains data authenticity, confirming that data migrated from a trusted, legitimate source.

### 3. Non-Repudiation
Accountability is maintained in the system since data, once signed with a private key, is bound to the sender. 

### 4. Secure System Communications
In the TEAVS system, digital signatures secure data such as: 
- Alerts about disasters/scams.
- Notifications about threats.
- API requests between frontend and backend
- Information shared between backend components ( such as AI Model, Risk scoring engine, Correlation engine)

### 5. Attack Prevention
The implementation of digital signatures in the TEAVS system prevents attacks such as:
- Man-in-the-middle attacks
- Data injection attacks
- Spoofing attacks

## Generating Digital Signatures
The steps followed to create digital signatures are:
- Data is created (such as an alert)
- Data is hashed using SHA-256 hashing algorithm
- Backend encrypts the hashed data using a private key.
- The encrypted hash value is the digital signature
- The receiver gets the original data along with the digital signature. 

## Verifying Digital Signatures
The steps followed to verify the received data:
- Once Backend sends original data and signature to the receiver, the receiver uses its public key to decrypt the signature (to get the original hash value). 
- The receiver computes the SHA-256 hash of the original data.
- The two hash values are compared. 
- Hash values match -> Data is valid
  Hash values do not match -> Data is rejected

## Flow Summary

 In the system: <br>
 Data -> SHA-256 -> Encrypt with Private key -> Digital signature

 Receiver verifies: <br>
 Signature -> Decrypt with Public key -> Compare with SHA-256 hash 
