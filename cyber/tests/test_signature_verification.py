import base64
import hmac
import hashlib
import sys
import time
import unittest

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding, rsa
except ModuleNotFoundError:
    hashes = None
    serialization = None
    padding = None
    rsa = None

from cyber.backend_security.verification import (
    build_signature_payload,
    require_valid_api_signature,
    verify_api_request,
    verify_hmac_signature,
)


class TestSignatureVerification(unittest.TestCase):
    def test_hmac_signature_accepts_untampered_payload(self):
        """Valid HMAC signature is accepted"""
        secret = "test-signing-secret"
        timestamp = str(time.time())
        body = '{"alert":"high"}'
        payload = build_signature_payload("POST", "/api/alerts", timestamp, body)
        signature = hmac.new(
            secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()

        result = verify_hmac_signature(
            secret=secret,
            signature=signature,
            method="POST",
            path="/api/alerts",
            timestamp=timestamp,
            body=body,
        )

        self.assertTrue(result.valid)

    def test_hmac_signature_rejects_tampered_payload(self):
        """Tampered payload is rejected"""
        secret = "test-signing-secret"
        timestamp = str(time.time())
        payload = build_signature_payload(
            "POST",
            "/api/alerts",
            timestamp,
            '{"alert":"low"}',
        )
        signature = hmac.new(
            secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()

        result = verify_hmac_signature(
            secret=secret,
            signature=signature,
            method="POST",
            path="/api/alerts",
            timestamp=timestamp,
            body='{"alert":"critical"}',
        )

        self.assertFalse(result.valid)

    def test_api_request_accepts_rsa_signature(self):
        """Valid RSA signature is accepted"""
        if rsa is None:
            self.skipTest("cryptography is not installed")

        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public_key_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        timestamp = str(time.time())
        body = b'{"event":"login"}'
        signature = private_key.sign(
            build_signature_payload("POST", "/api/events", timestamp, body),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )

        result = verify_api_request(
            headers={
                "X-Signature": base64.b64encode(signature).decode("utf-8"),
                "X-Signature-Timestamp": timestamp,
            },
            method="POST",
            path="/api/events",
            body=body,
            public_key_pem=public_key_pem,
        )

        self.assertTrue(result.valid)

    def test_api_request_rejects_expired_timestamp(self):
        """Expired signature timestamp is rejected"""
        secret = "test-signing-secret"
        old_timestamp = str(time.time() - 1000)
        payload = build_signature_payload("GET", "/api/users", old_timestamp, "")
        signature = hmac.new(
            secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()

        result = verify_api_request(
            headers={
                "X-Signature": signature,
                "X-Signature-Timestamp": old_timestamp,
            },
            method="GET",
            path="/api/users",
            body="",
            secret=secret,
        )

        self.assertFalse(result.valid)

    def test_require_valid_api_signature_raises_for_invalid_signature(self):
        """Invalid API signature raises an error"""
        with self.assertRaises(ValueError):
            require_valid_api_signature(
                headers={"X-Signature": "bad", "X-Signature-Timestamp": str(time.time())},
                method="GET",
                path="/api/users",
                secret="test-signing-secret",
            )


if __name__ == "__main__":
    print("\nCY014 Signature Verification Tests\n")

    print("TEST CASES BEING EXECUTED:")
    print("1. HMAC valid signature is accepted")
    print("2. HMAC tampered payload is rejected")
    print("3. RSA signature is accepted")
    print("4. Expired timestamp is rejected")
    print("5. Invalid signature raises error\n")

    suite = unittest.defaultTestLoader.loadTestsFromTestCase(
        TestSignatureVerification
    )

    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(suite)

    print("\n=================================")
    print(f"Total Tests : {result.testsRun}")
    print(f"Failures    : {len(result.failures)}")
    print(f"Errors      : {len(result.errors)}")
    print(f"Skipped     : {len(result.skipped)}")

    if result.wasSuccessful():
        print("\nALL TESTS PASSED")
    else:
        print("\nTEST FAILURES DETECTED")