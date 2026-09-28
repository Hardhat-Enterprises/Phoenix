"""
Model-level equivalents of B-01 .. B-14. These run in-process - no server,
no network, no auth - isolating whether boundary behaviour comes from the
model pipeline first, can test the API layer later.
"""
import pytest
from model_helpers import run_inference, clean_text


@pytest.mark.p0
def test_B01_model_empty_string():
    result = run_inference(raw_text="")
    assert result["vocab_hit_counts"]["text"] == 0, "Empty text should produce an all-zero TF-IDF vector"
    print(f"B-01 model probability on empty input: {result['probability']}")


@pytest.mark.p0
def test_B02_model_whitespace_only():
    r_ws = run_inference(raw_text="   \n\t  ")
    r_empty = run_inference(raw_text="")
    assert r_ws["cleaned_text"] == r_empty["cleaned_text"] == "", (
        "Whitespace-only text should clean to an empty string, same as B-01"
    )


@pytest.mark.p1
def test_B03_model_single_character():
    result = run_inference(raw_text="a")
    assert result["probability"] is not None
    print(f"B-03 model probability: {result['probability']}")


@pytest.mark.p1
def test_B04_model_single_word():
    result = run_inference(raw_text="flood")
    assert result["vocab_hit_counts"]["text"] >= 0  # doesn't crash; may be 0 if "flood" was filtered/unseen


@pytest.mark.p0
def test_B05_model_only_stopwords():
    # stop_words="english" in the fitted vectorizer should filter these to nothing
    result = run_inference(raw_text="the a an and or")
    assert result["probability"] is not None  # must not raise


@pytest.mark.p0
def test_B06_model_only_punctuation():
    result = run_inference(raw_text="!!! ??? ...")
    assert result["cleaned_text"] == "", "clean_text should strip all punctuation to empty"
    assert result["vocab_hit_counts"]["text"] == 0


@pytest.mark.p1
def test_B07_model_only_digits():
    result = run_inference(raw_text="123 456 2024")
    assert result["cleaned_text"] == "", "clean_text strips digits - should clean to empty"


@pytest.mark.p0
def test_B08_model_full_out_of_vocab():
    result = run_inference(raw_text="xqzflib wobblesnark zyndrofex")
    assert result["vocab_hit_counts"]["text"] == 0, "Nonsense tokens should not match the fitted vocabulary"
    if result["probability"] > 0.9:
        pytest.fail(
            f"Fully OOV input (zero vocab hits) produced high-confidence probability "
            f"{result['probability']} - the model may be overconfident on empty/near-empty "
            f"feature vectors, worth flagging regardless of API-layer behaviour"
        )


@pytest.mark.p1
def test_B11_model_case_insensitivity():
    r_upper = run_inference(raw_text="URGENT FLOOD EVACUATE")
    r_lower = run_inference(raw_text="urgent flood evacuate")
    assert r_upper["cleaned_text"] == r_lower["cleaned_text"], (
        "clean_text lowercases - cleaned output should be identical regardless of input case"
    )
    assert r_upper["label"] == r_lower["label"]


@pytest.mark.p1
def test_B12_model_mixed_scripts():
    # Should not raise UnicodeDecodeError or similar at the preprocessing/vectorizer level
    result = run_inference(raw_text="flood 洪水 inondation")
    assert result["probability"] is not None


@pytest.mark.p1
def test_B13_model_emoji_and_symbols():
    result = run_inference(raw_text="🌊 #flood @agency evacuate now")
    assert result["probability"] is not None  # must not raise


@pytest.mark.p1
def test_B14_model_url_only_text():
    result = run_inference(raw_text="https://example.com/a")
    result_empty = run_inference(raw_text="")
    assert result["cleaned_text"] == result_empty["cleaned_text"] == "", (
        "clean_text strips URLs - a bare URL in text should clean to empty, "
        "same path as B-01"
    )


@pytest.mark.p0
def test_B14b_model_url_field_populated():
    """
    The bundle has a dedicated 2048-column TF-IDF block for the url field
    itself (distinct from a URL appearing inside the text field, covered by
    B-14 above). This exercises that block directly.
    """
    result = run_inference(raw_text="flood report", url_text="https://phishing-example.com/verify-login")
    assert result["vocab_hit_counts"]["url"] >= 0  # must not raise
    print(f"B-14b url vocab hits: {result['vocab_hit_counts']['url']}, "
          f"probability: {result['probability']}")


@pytest.mark.p1
def test_B14c_model_empty_url_field():
    result = run_inference(raw_text="flood report", url_text="")
    assert result["vocab_hit_counts"]["url"] == 0, "Empty url field should produce an all-zero URL block"


@pytest.mark.p1
def test_B14d_model_malformed_url_field():
    """char_wb analyzer on url should tolerate malformed URL strings without raising."""
    result = run_inference(raw_text="flood report", url_text="not a valid url :::///")
    assert result["probability"] is not None


@pytest.mark.p0
def test_B_determinism_at_model_level():
    """Model-level equivalent of V-05 : confirms determinism lives in the
    model itself, not something the API adds (or accidentally breaks)."""
    results = [run_inference(raw_text="flood warning issued for downtown area") for _ in range(3)]
    labels = {r["label"] for r in results}
    probs = {round(r["probability"], 8) for r in results}
    assert len(labels) == 1 and len(probs) == 1, "Model output is non-deterministic for identical input"
