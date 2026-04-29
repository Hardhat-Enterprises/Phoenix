# Testing Tampering to validate security logic

## Overview
The purpose of tampering testing is to validate the security components (JWT token authentication, SHA-256 password hashing, Digital Signatures) we have implemented in the TEAVS system to maintain integrity, authenticity and validity of data. These tampering checks ensure and prove that when the attacker attempts to modify/tamper with the data (password hashes, signed alerts, payload and claims of the signed JWT ), the system immediately throws an error or denies authentication request. 

## Testing Scenarios 
| Security Layer | Tampering Check | Expected Result |
|---|---|---|
| SHA-256 Hashing | Change a character of the stored hashed password <br> in the database | On login,the hashes do not match, authentication fails  |
|   Digital Signatures | Change the message text in <br> a signed alert (for instance, "Danger zone" to "Safe zone")  | Digital sigantures do not match at sender and receiver. Verification fails.  |
| JWT(payload)  | Change `role: "public"` to `role: "admin"` | Verification fails. `401 Unauthorized` Error or `InvalidTokenError`  |

## Implemention 

### Test 1 : JWT Payload Tampering
``` python
import jwt
import generate_jwt, verify_jwt, sign_data, verify_signature

def test_jwt_tampering:
    token = generate_jwt(user_id = "user123", role= "public user")

    # Decode the token, change role, re-encode without secret key
    header, payload, signature = token.split('.')
    tampered_payload = '{"userId" : "user123", "role":"admin"}'
    tampered_token = f"{header}.{tampered.token}.{signature}"

    # Verify security logic
    try:
        verify_jwt(tampered_token)
        print ("FAILED TEST: System accepted a tampered token")
    except jwt.InvalidTokenError:
        print ("SUCCES: System did not accept the tampered token (InvalidTokenError)")
    except Exception as e:
        print(f"FAILED: Unexpected error occurred: {e}")

```

### Test 2: Digital Signature Tampering

``` python
def test_signature_tampering():
    message = "SAFE"
    sig = sign_data(message)
    
    # Tamper the message
    tampered_message = "DANGER"

    # Verify
    try: 
        verify_signature (tampered_message, sig)
        print("FAILED: System accepted a tampered signature")
    except InvalidSignature:
        print ("SUCCESS: System detected invalid signature")
    except Exception as e:
        print ("FAILED: An unexpected error occurred: {e}")
```
