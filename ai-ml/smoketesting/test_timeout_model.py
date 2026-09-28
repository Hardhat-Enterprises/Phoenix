"""
Model-level latency : isolates TF-IDF transform + model.predict time from
network, auth, and JSON serialization overhead. tells you how much of 
end-to-end API latency is the model itself vs. everything wrapped around it.

Compare these numbers against the equivalent test_timeout.py T-01 results
from the API-level tests, a big gap between the two tells you where to
optimize.
"""
import time
import pytest
from model_helpers import run_inference


def make_text(n_chars, filler="flood warning issued for downtown area. "):
    reps = (n_chars // len(filler)) + 1
    return (filler * reps)[:n_chars]


@pytest.mark.p0
@pytest.mark.observation
@pytest.mark.parametrize("n_chars", [100, 1000, 5000, 50000])
def test_T_model_only_latency_by_size(n_chars):
    text = make_text(n_chars)
    start = time.time()
    run_inference(raw_text=text)
    elapsed = time.time() - start
    print(f"Model-only latency @ {n_chars} chars: {elapsed*1000:.2f}ms")
    # this is a measurement for now.
    assert elapsed < 5.0, f"Model-only inference took {elapsed:.2f}s at {n_chars} chars -> investigate"


@pytest.mark.p0
@pytest.mark.observation
def test_T_model_artifact_load_time():
    """
    Measures joblib.load() time for the model bundle, this is the true
    'cold start' cost if the API loads the model per-request instead of once
    at startup.
    """
    import joblib
    from model_helpers import MODEL_PATH

    start = time.time()
    joblib.load(MODEL_PATH)
    elapsed = time.time() - start
    print(f"Artifact load time: {elapsed*1000:.2f}ms")
    if elapsed > 0.5:
        print(
            "WARNING: artifact load takes >500ms - confirm the deployed service "
            "loads this once at startup, not per request (see T-02 in the API suite)"
        )
