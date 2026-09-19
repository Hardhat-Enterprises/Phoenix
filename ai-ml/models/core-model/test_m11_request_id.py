import core_model_integration as c
import io
import logging

class FakeModel:
    feature_names_in_ = []

    def predict(self, features):
        return [1]

    def predict_proba(self, features):
        return [[0.1, 0.7, 0.2]]


c._load_model = lambda model_path: FakeModel()

log_stream = io.StringIO()
log_handler = logging.StreamHandler(log_stream)
c.logger.addHandler(log_handler)
c.logger.setLevel(logging.INFO)

test_input = {
    "url": "https://example.com",
    "text": "test",
    "timestamp": "2026-09-18",
    "hazard_type": "fire",
    "hazard_timestamp": "2026-09-18",
    "hazard_location": "Melbourne",
    "hazard_status": "active",
    "alert_level": "high",
    "source": "test",
    "hazard_severity": 0.5,
}

result_1 = c.predict(test_input)
result_2 = c.predict(test_input)

log_output = log_stream.getvalue()

print("LOG OUTPUT:", log_output.strip())
assert "https://example.com" not in log_output
assert "test" not in log_output
assert result_1["request_id"] != result_2["request_id"]

print("SAFE LOGGING CHECK: PASSED")
print("REQUEST ID UNIQUENESS CHECK: PASSED")