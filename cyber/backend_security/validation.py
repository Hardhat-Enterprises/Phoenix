import re

VALID_ROLES = ["admin", "analyst", "user"]

try:
    from pydantic import BaseModel, EmailStr, validator

    class RegisterValidation(BaseModel):
        username: str
        email: EmailStr
        password: str
        role: str

        @validator("username")
        def validate_username(cls, v):
            return validate_username_value(v)

        @validator("password")
        def validate_password(cls, v):
            return validate_password_value(v)

        @validator("role")
        def validate_role(cls, v):
            return validate_role_value(v)

except ModuleNotFoundError:
    class RegisterValidation:
        def __init__(self, username, email, password, role):
            self.username = validate_username_value(username)
            self.email = validate_email_value(email)
            self.password = validate_password_value(password)
            self.role = validate_role_value(role)


def validate_username_value(value):
    if not value.strip():
        raise ValueError("Username cannot be empty")

    # Block suspicious patterns
    if "'" in value or "--" in value or ";" in value:
        raise ValueError("Invalid characters detected")

    return value


def validate_email_value(value):
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
        raise ValueError("value is not a valid email address")

    return value


def validate_password_value(value):
    if len(value) < 8:
        raise ValueError("Password too short")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Must include uppercase letter")
    if not re.search(r"[0-9]", value):
        raise ValueError("Must include number")

    return value


def validate_role_value(value):
    if value not in VALID_ROLES:
        raise ValueError("Invalid role")

    return value
