import sys
import unittest

from cyber.backend_security.validation import RegisterValidation


class TestInvalidInputs(unittest.TestCase):
    def test_empty_username_is_rejected(self):
        """Empty username is rejected"""
        with self.assertRaises(ValueError):
            RegisterValidation(
                username="",
                email="test@gmail.com",
                password="Password1",
                role="user",
            )

    def test_invalid_email_is_rejected(self):
        """Invalid email format is rejected"""
        with self.assertRaises(ValueError):
            RegisterValidation(
                username="user",
                email="bad-email",
                password="Password1",
                role="user",
            )

    def test_short_password_is_rejected(self):
        """Short password is rejected"""
        with self.assertRaises(ValueError):
            RegisterValidation(
                username="user",
                email="test@gmail.com",
                password="123",
                role="user",
            )

    def test_invalid_role_is_rejected(self):
        """Invalid role is rejected"""
        with self.assertRaises(ValueError):
            RegisterValidation(
                username="user",
                email="test@gmail.com",
                password="Password1",
                role="hacker",
            )

    def test_sql_injection_username_is_rejected(self):
        """SQL-injection-style username is rejected"""
        with self.assertRaises(ValueError):
            RegisterValidation(
                username="' OR 1=1 --",
                email="test@gmail.com",
                password="Password1",
                role="user",
            )


if __name__ == "__main__":
    print("\n===================================")
    print(" CY014 Invalid Input Validation ")
    print("===================================\n")

    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestInvalidInputs)
    result = unittest.TestResult()

    for test in suite:
        test_name = test._testMethodName
        test_doc = test._testMethodDoc or test_name

        print(f"▶ {test_doc}")

        try:
            test.run(result)

            if any(f[0] == test for f in result.failures):
                print("   ❌ FAIL\n")
            elif any(e[0] == test for e in result.errors):
                print("   ⚠️ ERROR\n")
            elif any(s[0] == test for s in result.skipped):
                print("   ⏭ SKIPPED\n")
            else:
                print("   ✅ PASS\n")

        except Exception as e:
            print(f"   ⚠️ ERROR: {e}\n")

    passed = result.testsRun - len(result.failures) - len(result.errors) - len(result.skipped)

    print("===================================")
    print(f"TOTAL   : {result.testsRun}")
    print(f"PASSED  : {passed}")
    print(f"FAILED  : {len(result.failures)}")
    print(f"ERRORS  : {len(result.errors)}")
    print(f"SKIPPED : {len(result.skipped)}")
    print("===================================\n")

    if result.wasSuccessful():
        print("STATUS  : ALL TESTS PASSED")
    else:
        print("STATUS  : TEST FAILURES DETECTED")