# Verification Process

## Overview
The verification process ensures that the received data is authentic and has not been tampered with. It allows the receiver to validate both the integrity of the data and the identity of the sender.

## Verification Steps
Steps followed by the receiver to verify the digital signature:

1. The receiver obtains the original data and the digital signature.
2. The digital signature is decrypted using the sender’s public key to retrieve the original hash value.
3. The receiver independently computes the SHA-256 hash of the received data.
4. The computed hash is compared with the decrypted hash.

## Verification Outcome
- If both hash values match:
  The data is authentic and has not been altered.

- If the hash values do not match:
  The data is considered tampered or invalid and is rejected.

## Key Characteristics
- The public key is shared and used only for verification.
- No private key is exposed during this process.
- Ensures protection against tampering and spoofing.

## Flow Representation
Signature → Decrypt with Public Key → Compare with SHA-256 Hash