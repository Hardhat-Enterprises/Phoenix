# PHOENIX Model-Level Test Suite

Runs the model pipeline (clean_text → TF-IDF → XGBoost) directly, in-process,
with no server, network, or auth layer involved. This is the fast, local
counterpart to the API-level testing suite. Use it to isolate whether a failure 
comes from the model itself or from the API wrapped around it.

## Setup

1. Edit `MODEL_PATH` in `model_helpers.py` to point at your saved joblib
   bundle.
2. Confirm `load_bundle()` matches your actual artifact structure, it
   currently assumes the `{model, text_vectorizers, numeric_features,
   feature_col_map, target_le, label_encoders}` bundle shape from the
   training notebook. Adjust if your saved artifact differs.
3. Confirm `clean_text()` in `model_helpers.py` is byte-for-byte identical
   to whatever the deployed service actually runs. If they diverge, this
   suite will pass while the deployed service fails (or vice versa).

```bash
pip install pytest scikit-learn scipy numpy pandas joblib
python -m pytest -v -s
```

## What this suite covers vs. the API-level suite

| | Model-level (this suite) | API-level (`phoenix_api_tests/`) |
|---|---|---|
| Boundary cases (B-01..B-14) | ✅ Full coverage, faster | ✅ Also covered, adds HTTP status codes |
| Preprocessing edge cases (I-02, I-10, I-11, I-13) | ✅ Tests the actual functions | ✅ Tests what the API does with them |
| Schema/HTTP validation (I-01, I-03..I-09, I-14, I-15) | ❌ Not applicable | ✅ Only testable here |
| Auth (A-01..A-04) | ❌ Not applicable | ✅ Only testable here |
| `request_id`, `mock` fields | ❌ Not applicable | ✅ Only testable here |
| Determinism | ✅ | ✅ |
| Latency | ✅ Model-only (isolates the actual compute cost) | ✅ End-to-end (includes network/serialization/auth overhead) |
| Thread-safety of model/vectorizer | ✅ More precise and no network variance | ✅ Also covered, but conflates model + framework concurrency |

## Why run both

If a test fails at the API level but passes here, the bug is in the API
layer (routing, serialization, the framework's request handling), not the
model. If it fails here too, it's in the model/preprocessing pipeline
itself, and fixing the API won't help.

The latency numbers are especially useful together: subtract the
model-only latency (this suite) from the end-to-end API latency
(`test_timeout.py` in the API suite) to see how much time the API layer
itself is adding, this is directly relevant to the timeout/fallback
decision that has yet to be decided upon.