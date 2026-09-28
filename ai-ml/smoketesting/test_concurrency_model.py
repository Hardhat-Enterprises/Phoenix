"""
Model-level concurrency : tests thread-safety of the SHARED model and
vectorizer objects directly, with no network layer involved. This is a more
precise test of the actual risk than the API-level C-02/C-03 (which could
also be masking/introducing issues in the web framework's request handling).
If this passes but the API-level equivalent fails, the bug is in the API
layer, not the model.
"""
import concurrent.futures
import pytest
from model_helpers import run_inference


@pytest.mark.p0
@pytest.mark.concurrency
def test_C_model_identical_input_thread_safety():
    text = "flood warning issued for downtown area"
    n_workers = 50

    with concurrent.futures.ThreadPoolExecutor(max_workers=n_workers) as ex:
        results = list(ex.map(lambda _: run_inference(raw_text=text), range(n_workers)))

    outputs = {(r["label"], round(r["probability"], 8)) for r in results}
    assert len(outputs) == 1, (
        f"Identical input produced {len(outputs)} distinct outputs under concurrent "
        f"threads calling the model directly -> confirms a genuine thread-safety issue "
        f"in the model/vectorizer objects themselves, not the API layer: {outputs}"
    )


@pytest.mark.p0
@pytest.mark.concurrency
def test_C_model_distinct_inputs_no_crosstalk():
    known_texts = [
        "flood warning issued for downtown area",
        "local bakery wins community award",
        "wildfire forces evacuation of 4000 residents",
        "unverified rumor about contaminated water supply spreading online",
    ]
    inputs = known_texts * 15  # 60 concurrent calls

    with concurrent.futures.ThreadPoolExecutor(max_workers=30) as ex:
        results = list(ex.map(lambda t: (t, run_inference(raw_text=t)), inputs))

    from collections import defaultdict
    grouped = defaultdict(set)
    for text, result in results:
        grouped[text].add((result["label"], round(result["probability"], 8)))

    for text, outputs in grouped.items():
        assert len(outputs) == 1, (
            f"Input '{text[:40]}...' produced inconsistent outputs under concurrent "
            f"threads: {outputs} - model-level cross-talk detected"
        )


@pytest.mark.p1
@pytest.mark.concurrency
def test_C_model_threadpool_consistency_sanity():
    """
    Sanity check that repeated thread-pool execution is internally consistent.
    This test rules out any hidden shared-state assumption in run_inference itself 
    independent of the process-vs-thread deployment question.
    """
    text = "flood warning issued for downtown area"

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        results = {round(r["probability"], 8) for r in ex.map(lambda _: run_inference(raw_text=text), range(10))}

    assert len(results) == 1, "Thread pool execution is already inconsistent for identical input"
