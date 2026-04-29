# Hashing Passwords in the TEAVS system

## Overview 
In the TEAVS system, we are storing hashed passwords using SHA-256 algorithm, ensuring that they are non-reversibly hashed, that is, the plaintext passwords cannot be recovered. To improve security and protect against Rainbow Table attacks and data leaks, unique Salts are added to the user credentials before they are hashed.

## Technical Implementation 
The system uses Python standard library for hashing `hashlib`

```python
import hashlib 

def hash_password (password):
    # User password is coverted into bytes, then hashed
    sha256_hash = hashlib.sha256(password.encode())
    return sha256_hash.hexdigest()

```
Example of how this method will be called in main:
```python
user_input = "Mypassword"
hash_value = hash_password(user_input)
print(f"Stored hash; {hash_value}") 
```
## Salting Passwords 
In the case of two users having the same passwords, salting is very useful as it adds a random, unique string to the password before it is hashed and stored in the database. The two same passwords will now have different hashes, improving password security.
Steps to hash passwords using Salting:
- Generate a salt
- Concatenate the password and the salt 
- Hash the concatenated string using SHA-256 hashing algorithm
- Store the hashed password in the database.

## Technical Implementation using Salts
The system uses Python libraries `hashlib` for hashing and `secrets` for generating cryptographically secure random numbers

```python

import hashlib
import secrets

def hash_salt_password(password):
    # Generate salt
    salt = secrets.token_hex(16)

    # Concatenate salt and password
    salted_password = salt + password
    # Hash concatenated password
    hash_value = hashlib.sha256(salted_password.encode()).hexdigest()

    return salt, hash_value

```

Example of how this method will be called in main:
```python
user_input = "MyPassword"
salt, hashed_user_input = hash_salt_password(user_input)

print (f"Salt (Store this): {salt}")
print (f"Hash(Store this): {hashed_user_input}")
```

## Recommended secure Password Storage in Database
For storing the hashed passwords, the `users` table (or the table where credentials will be stored in database) in the database must include:
- `password_hash` : CHAR(64)
- `password_salt` : CHAR(32)

## Security Benefits 
- Adding salts (a generated random 16 byte string) to the password prevents rainbow table attacks since a specific rainbow table will be required for every possible value of salt, which is not feasible or possible. 
- Same passwords for two different users would have a different hash each, because of added salt value. 
- Brute-force and Dictionary attacks will also be prevented because of the added salt value, since the time complexity of these attacks will be very high.
- Using the python library `secrets`, it is ensured that the salts are unpredictable and generated randomly. 
