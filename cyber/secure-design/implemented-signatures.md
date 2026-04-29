# Implementation of Digital Signatures in the TEAVS system 

## Overview
In the TEAVS system, ensuring that data (such as API requests, alerts/notifications about disasters, and any sensitive communication between system components) is secure, authentic and untampered is critical for maintaining system integrity, security, and trust.

## Implementation Logic
Digital Signatures in the system are implemented using the logic: Hash -> Sign --> Verify. Encryption and Decryption of the hashes are done by Asymmetric Cryptographic Keys: Public key and Private Key. 

- Private key + SHA-256 + PSS = Signature Generation
- Public key + SHA-256 + PSS = Signature Verification

## Technical Implementation
This system uses the Python Asymmetric Encryption library `cryptography`
``` python
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa

# Generate public and private keys 
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public key = private_key.public_key()

def sign_data(message):
    data = message.encode()
    # Generate Signature
    signature = private_key.sign(
        data, 
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
        hashes.SHA256()
        )
    return signature

def verify_signature(message, signature):
    data = message.encode()
    try:
        public_key.verify(
            signature, 
            data,
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH), 
            hashes.SHA256()
        )
        return True
    except Exception:
        return False 
    
```
Example of how generating and verifying signatures will work in main:

```python

alert = "CYCLONE ALERT: Category 3 cyclone approaching coastal Victoria"
signed = sign_data(alert)

print(f"Verified: {verify_signature(alert,signed)}")

```
