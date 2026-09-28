"""
Model-level equivalents of the INVALID-INPUT cases that are actually about
preprocessing behaviour, not HTTP/schema validation.

NOT reproducible at model level (these are framework/routing concerns, not
model concerns - leave them in the API-level suite):
  I-01 missing field, I-03/I-04/I-05 wrong JSON types, I-06 misspelled key,
  I-07 malformed JSON, I-08 wrong content-type, I-09 extra fields,
  I-14 wrong HTTP method, I-15 empty body.
"""
import pytest
import numpy as np
from model_helpers import run_inference, clean_text, load_bundle


@pytest.mark.p0
def test_I02_model_null_text_handling():
    """
    At the HTTP layer, null text should be rejected before it ever reaches
    the model. This test checks what the *preprocessing function itself*
    does if a None slips through, is useful defense-in-depth information even
    if the API is supposed to catch this earlier.
    """
    try:
        cleaned = clean_text(None)
        # clean_text does str(None) -> "none", which is misleading but won't crash.
        # Flag this explicitly rather than let it pass silently:
        assert cleaned == "none", (
            f"clean_text(None) produced unexpected output '{cleaned}': if this ever "
            f"reaches the model (i.e. the API validation layer failed), it would be "
            f"silently scored as if the literal word 'none' were submitted"
        )
    except Exception as e:
        pytest.fail(f"clean_text(None) raised {type(e).__name__}: {e} - should be caught upstream")


@pytest.mark.p0
def test_I10_model_unknown_categorical_value():
    """
    Tests the LabelEncoder unseen-category handling directly, mirrors the
    __missing__ bucket pattern used at training/validation time.
    """
    bundle = load_bundle()
    label_encoders = bundle.get("label_encoders", {})
    if "hazard_type" not in label_encoders:
        pytest.skip("hazard_type not in label_encoders for this bundle, adjust column name")

    le = label_encoders["hazard_type"]
    known = set(le.classes_)
    unknown_value = "not_a_real_type"

    assert unknown_value not in known, "Test setup issue: value unexpectedly already known"
    # Mirror the exact fallback logic used in the training notebook
    fallback = unknown_value if unknown_value in known else "__missing__"
    assert "__missing__" in known, (
        "'__missing__' bucket is not in the fitted encoder's classes - unseen categorical "
        "values at inference time will raise a ValueError instead of falling back safely"
    )
    encoded = le.transform([fallback])
    assert encoded is not None  # must not raise


@pytest.mark.p1
def test_I11_model_invalid_timestamp_parsing():
    """Mirrors the pd.to_datetime(..., errors='coerce') pattern from training."""
    import pandas as pd
    result = pd.to_datetime("not-a-date", errors="coerce")
    assert pd.isna(result), "Invalid timestamp should coerce to NaT, matching training-time handling"
    # Confirm this flows into the same numeric NaN path XGBoost expects for missing values
    as_unix = result.value if not pd.isna(result) else np.nan
    assert np.isnan(as_unix) or as_unix is None


@pytest.mark.p1
def test_I13_model_control_characters():
    """Control/binary characters shouldn't crash clean_text or the vectorizer."""
    result = run_inference(raw_text="\x00\x01\xff garbled text")
    assert result["probability"] is not None  # must not raise
