# Key Management in the TEAVS system

## Overview
In the TEAVS system, key management includes the processes of securely generating, distributing, storing, using, rotating, and revoking cryptographic keys that are used for JWT authentication and digital signatures, adhering to OWASP Key Management, FIPS and NIST. 
The authorization to generate and use keys is only granted to selected personnel. Proper key management can prevent unauthorized access, data breaches/misuse, and data loss.

## Types and Usage of keys
- Symmetric JWT Secret Key : JWT authentication requires a secret key which is used to sign and validate JWT token for the purpose of validation. 
-Asymmetric Private Key : Digital signatures are encrypted using a private key, validating disaster alerts, API requests and any other sensitive communication between system components.
- Public Key - Digital signatures are decrypted by receivers using public key, verifying data authenticity.

## Standards for generating keys
- Keys are generated in secure FIPS-compliant cryptographic modules (AWS KMS, HashiCorp Vault)
- Since HS256 (HMAC using SHA-256) is used for signing, a minimum entropy of 256-bit is recommended for symmetric keys
- For the public/private key pairs, choose lengths recommended by NIST or other accepted industry practices (for example, 2048+ bits for RSA)

## Key Storage Recommendations
- For storing JWT secret keys, the use of environment variables is recommended instead of hardcoding them, which prevents exposure of secret keys through code repositories. 
- Cloud Key Management Services provided by AWS KMS, Google Cloud KMS, Azure Key Vault can be used to store symmetric and assymmetric keys.

## Key Rotation
Cryptographic keys should be periodically replaced with new keys, enhancing security. The process of key rotation involves changing JWT authentication keys, or private keys (for encryption), at regular intervals. This ensures minimal damage in case of compromise, because the key is only valid for a limited time. 
Steps for rotating keys include:
- A new cryptographic key is generated
- The system is updated to use the new encryption key.
- Existing data may remain encrypted by the old key, or be re-encrypted using the new key
- The old key either expires or is securely destroyed, adhering to industry practices. 

## Monitoring Recommendations
- All cryptographic key usage events should be logged for auditability.
- JWT token issuance, validation, and expiry events should be monitored.
- Logging supports detection of suspicious activity and ensures compliance with industry-based security standards.
