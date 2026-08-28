import base64
import binascii
import hashlib
import hmac
import time
from dataclasses import dataclass
from typing import Mapping, Optional, Union

try:
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
except ModuleNotFoundError:
    InvalidSignature = None
    hashes = None
    serialization = None
    padding = None


DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300


class SignatureVerificationError(ValueError):
    """Raised when a request signature cannot be verified."""


@dataclass(frozen=True)
class VerificationResult:
    valid: bool
    reason: str


def build_signature_payload(
    method: str,
    path: str,
    timestamp: str,
    body: Union[str, bytes] = b"",
) -> bytes:
    """Build the exact payload format that should be signed by the sender."""
    body_bytes = body.encode("utf-8") if isinstance(body, str) else body
    metadata = f"{method.upper()}\n{path}\n{timestamp}\n".encode("utf-8")
    return metadata + body_bytes


def sha256_digest(data: Union[str, bytes]) -> str:
    data_bytes = data.encode("utf-8") if isinstance(data, str) else data
    return hashlib.sha256(data_bytes).hexdigest()


def verify_hmac_signature(
    *,
    secret: str,
    signature: str,
    method: str,
    path: str,
    timestamp: str,
    body: Union[str, bytes] = b"",
    tolerance_seconds: int = DEFAULT_SIGNATURE_TOLERANCE_SECONDS,
    current_time: Optional[float] = None,
) -> VerificationResult:
    if not secret:
        return VerificationResult(False, "missing signing secret")

    if not signature:
        return VerificationResult(False, "missing signature")

    if not _timestamp_is_fresh(timestamp, tolerance_seconds, current_time):
        return VerificationResult(False, "signature timestamp is invalid or expired")

    payload = build_signature_payload(method, path, timestamp, body)
    expected_signature = hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()

    if hmac.compare_digest(expected_signature, signature):
        return VerificationResult(True, "signature verified")

    return VerificationResult(False, "signature does not match payload")


def verify_rsa_signature(
    *,
    public_key_pem: Union[str, bytes],
    signature: bytes,
    method: str,
    path: str,
    timestamp: str,
    body: Union[str, bytes] = b"",
    tolerance_seconds: int = DEFAULT_SIGNATURE_TOLERANCE_SECONDS,
    current_time: Optional[float] = None,
) -> VerificationResult:
    if not public_key_pem:
        return VerificationResult(False, "missing public key")

    if not signature:
        return VerificationResult(False, "missing signature")

    if not _timestamp_is_fresh(timestamp, tolerance_seconds, current_time):
        return VerificationResult(False, "signature timestamp is invalid or expired")

    if serialization is None or padding is None or hashes is None:
        return VerificationResult(False, "RSA verification requires cryptography")

    try:
        public_key_bytes = (
            public_key_pem.encode("utf-8")
            if isinstance(public_key_pem, str)
            else public_key_pem
        )
        public_key = serialization.load_pem_public_key(public_key_bytes)
        public_key.verify(
            signature,
            build_signature_payload(method, path, timestamp, body),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
    except InvalidSignature:
        return VerificationResult(False, "signature does not match payload")
    except ValueError:
        return VerificationResult(False, "invalid public key")

    return VerificationResult(True, "signature verified")


def verify_api_request(
    *,
    headers: Mapping[str, str],
    method: str,
    path: str,
    body: Union[str, bytes] = b"",
    public_key_pem: Union[str, bytes] = b"",
    secret: str = "",
) -> VerificationResult:
    normalized_headers = {key.lower(): value for key, value in headers.items()}
    signature = normalized_headers.get("x-signature", "")
    timestamp = normalized_headers.get("x-signature-timestamp", "")

    if public_key_pem:
        parsed_signature = _decode_signature(signature)
        if parsed_signature is None:
            return VerificationResult(False, "signature encoding is invalid")

        return verify_rsa_signature(
            public_key_pem=public_key_pem,
            signature=parsed_signature,
            timestamp=timestamp,
            method=method,
            path=path,
            body=body,
        )

    return verify_hmac_signature(
        secret=secret,
        signature=signature,
        timestamp=timestamp,
        method=method,
        path=path,
        body=body,
    )


def require_valid_api_signature(
    *,
    headers: Mapping[str, str],
    method: str,
    path: str,
    body: Union[str, bytes] = b"",
    public_key_pem: Union[str, bytes] = b"",
    secret: str = "",
) -> None:
    result = verify_api_request(
        headers=headers,
        method=method,
        path=path,
        body=body,
        public_key_pem=public_key_pem,
        secret=secret,
    )

    if not result.valid:
        raise SignatureVerificationError(result.reason)


def _timestamp_is_fresh(
    timestamp: str,
    tolerance_seconds: int,
    current_time: Optional[float],
) -> bool:
    try:
        signed_at = float(timestamp)
    except (TypeError, ValueError):
        return False

    now = time.time() if current_time is None else current_time
    return abs(now - signed_at) <= tolerance_seconds


def _decode_signature(signature: str) -> Optional[bytes]:
    try:
        return base64.b64decode(signature, validate=True)
    except (binascii.Error, ValueError):
        pass

    try:
        return bytes.fromhex(signature)
    except ValueError:
        return None
