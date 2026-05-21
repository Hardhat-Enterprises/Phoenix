"""
PHOENIX Core Model Integration Script:
Loads the trained core XGBoost model, prepares backend input payloads,
runs prediction, and returns risk scoring output.

Backend usage

    from core_model_integration import predict, predict_batch

    result = predict(input_dict)

Expected input payload

{
    "url": "https://example.com/donate-now",
    "text": "Urgent flood relief donation needed.",
    "timestamp": "2026-05-02T10:30:00Z",
    "hazard_type": "flood",
    "hazard_severity": 0.8,
    "hazard_timestamp": "2026-05-02T08:00:00Z",
    "hazard_location": "VIC",
    "hazard_status": "active",
    "alert_level": "emergency",
    "source": "cyber_extraction"
}

Output

{
    "risk_score": 0.87,
    "confidence_score": 0.76,
    "predicted_class": 3,
    "risk_level": "Critical"
}

Notes

- The uploaded XGBoost model expects one-hot encoded feature columns.
- This script builds a zero-filled row using model.feature_names_in_ and switches
  matching one-hot columns to 1.
- Unknown values are handled safely by leaving their one-hot columns as 0.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd


DEFAULT_MODEL_PATH = "final_core_xgb_xgboost_trey_xgb_core_v2_epoch_100.joblib"

REQUIRED_FIELDS = [
    "url",
    "text",
    "timestamp",
    "hazard_type",
    "hazard_timestamp",
    "hazard_location",
    "hazard_status",
    "alert_level",
    "source",
]

# Known value mapping from backend/plain-language payload values into the values
# used in the model's one-hot feature columns.
HAZARD_TYPE_ALIASES = {
    "flood": "disaster_event",
    "bushfire": "wildfire",
    "fire": "wildfire",
    "wildfire": "wildfire",
    "weather": "weather_hazard",
    "storm": "weather_hazard",
    "cyclone": "weather_hazard",
    "earthquake": "disaster_event",
    "disaster": "disaster_event",
    "disaster_event": "disaster_event",
    "cyber": "cyber_threat",
    "cyber_threat": "cyber_threat",
    "phishing": "cyber_threat",
    "misinformation": "misinformation",
}

ALERT_LEVEL_ALIASES = {
    "emergency": "critical",
    "critical": "critical",
    "high": "high",
    "medium": "high",  # model has low/high/critical only
    "low": "low",
}

SOURCE_ALIASES = {
    "cyber_extraction": "URLhaus",
    "urlhaus": "URLhaus",
    "openphish": "OpenPhish",
    "phishtank": "PhishTank",
    "spamhaus": "Spamhaus (SBL/XBL/PBL)",
    "firms": "NASA FIRMS (MODIS/VIIRS)",
    "nasa firms": "NASA FIRMS (MODIS/VIIRS)",
    "open-meteo": "Open-Meteo",
    "openmeteo": "Open-Meteo",
    "noaa": "NOAA",
    "nifc": "NIFC",
    "wmo": "WMO",
    "usda": "USDA Forest Service",
    "social_media": "Social Media Disaster Tweets Dataset",
    "misinformation": "Misinformation in Disaster Posts Dataset",
    "claim_fraud": "Claim Fraud Detection Dataset",
}

MODEL_CACHE: dict[str, Any] = {}


def _load_model(model_path: str = DEFAULT_MODEL_PATH) -> Any:
    """Load and cache the trained XGBoost .joblib model."""
    path = Path(model_path)

    if not path.exists():
        # Try path relative to this script.
        script_relative = Path(__file__).resolve().parent / model_path
        if script_relative.exists():
            path = script_relative
        else:
            raise FileNotFoundError(
                f"Core model file not found: {model_path}. "
                "Place the .joblib file in the same folder as this script or pass model_path explicitly."
            )

    cache_key = str(path.resolve())
    if cache_key not in MODEL_CACHE:
        MODEL_CACHE[cache_key] = joblib.load(path)
    return MODEL_CACHE[cache_key]


def _normalise_string(value: Any) -> str:
    """Convert input value to a clean string."""
    if value is None:
        return ""
    return str(value).strip()


def _normalise_date(value: Any) -> str:
    """
    Convert ISO timestamps into the date style used by the training features:
    Example: "2026-05-02T10:30:00Z" - "May 02, 2026"

    If parsing fails, return the original string.
    """
    raw = _normalise_string(value)
    if not raw:
        return ""

    candidates = [
        raw,
        raw.replace("Z", "+00:00"),
    ]

    for candidate in candidates:
        try:
            dt = datetime.fromisoformat(candidate)
            return dt.strftime("%B %d, %Y")
        except ValueError:
            pass

    # Try common date-only format.
    try:
        dt = datetime.strptime(raw[:10], "%Y-%m-%d")
        return dt.strftime("%B %d, %Y")
    except ValueError:
        return raw


def _alias_lookup(value: Any, aliases: dict[str, str]) -> str:
    """Map backend/plain values to known model category values where possible."""
    raw = _normalise_string(value)
    key = raw.lower().replace("-", "_").replace(" ", "_")
    return aliases.get(key, aliases.get(raw.lower(), raw))


def validate_input(input_data: dict) -> list[str]:
    """Return a list of validation errors. Empty list means valid enough to run."""
    errors = []

    if not isinstance(input_data, dict):
        return ["Input must be a dictionary/JSON object"]

    for field in REQUIRED_FIELDS:
        if field not in input_data or input_data[field] in (None, ""):
            errors.append(f"Missing required field: '{field}'")

    if "hazard_severity" in input_data and input_data["hazard_severity"] not in (None, ""):
        try:
            severity = float(input_data["hazard_severity"])
            if severity < 0 or severity > 1:
                errors.append("hazard_severity should be between 0 and 1")
        except (TypeError, ValueError):
            errors.append("hazard_severity must be numeric")

    return errors


def _set_one_hot(row: dict[str, float], column: str) -> None:
    """Set one-hot column to 1 if the model contains that column."""
    if column in row:
        row[column] = 1.0


def build_feature_row(input_data: dict, model: Any) -> pd.DataFrame:
    """
    Build a one-row DataFrame in the exact column order expected by the model.
    """
    feature_names = list(model.feature_names_in_)
    row = {feature: 0.0 for feature in feature_names}

    url = _normalise_string(input_data.get("url"))
    text = _normalise_string(input_data.get("text"))
    timestamp = _normalise_date(input_data.get("timestamp"))
    hazard_timestamp = _normalise_date(input_data.get("hazard_timestamp"))

    hazard_type = _alias_lookup(input_data.get("hazard_type"), HAZARD_TYPE_ALIASES)
    hazard_location = _normalise_string(input_data.get("hazard_location"))
    hazard_status = _normalise_string(input_data.get("hazard_status")).lower()
    alert_level = _alias_lookup(input_data.get("alert_level"), ALERT_LEVEL_ALIASES).lower()
    source = _alias_lookup(input_data.get("source"), SOURCE_ALIASES)

    # One-hot encoded fields expected by this model
    _set_one_hot(row, f"url_{url}")
    _set_one_hot(row, f"text_{text}")
    _set_one_hot(row, f"timestamp_{timestamp}")
    _set_one_hot(row, f"hazard_timestamp_{hazard_timestamp}")
    _set_one_hot(row, f"hazard_type_{hazard_type}")
    _set_one_hot(row, f"hazard_location_{hazard_location}")
    _set_one_hot(row, f"hazard_status_{hazard_status}")
    _set_one_hot(row, f"alert_level_{alert_level}")
    _set_one_hot(row, f"source_{source}")

    # Fallbacks for unseen values
    if f"url_{url}" not in row:
        _set_one_hot(row, "url_not_available")
    if f"hazard_location_{hazard_location}" not in row:
        _set_one_hot(row, "hazard_location_unknown")

    return pd.DataFrame([row], columns=feature_names)


def _class_to_risk_score(predicted_class: int, probabilities: np.ndarray | None = None) -> float:
    """
    Convert class prediction into a 0.0-1.0 risk score.

    If probabilities are available, use weighted average of class probabilities.
    Otherwise, use class / max_class.
    """
    if probabilities is not None and len(probabilities) > 0:
        classes = np.arange(len(probabilities), dtype=float)
        weighted_score = float(np.dot(classes, probabilities) / max(1, len(probabilities) - 1))
        return round(min(1.0, max(0.0, weighted_score)), 4)

    return round(min(1.0, max(0.0, predicted_class / 3.0)), 4)


def _risk_level(score: float) -> str:
    """Convert score into AI007-style severity level."""
    if score >= 0.75:
        return "Critical"
    if score >= 0.50:
        return "High"
    if score >= 0.25:
        return "Medium"
    return "Low"


def predict(
    input_data: dict,
    model_path: str = DEFAULT_MODEL_PATH,
) -> dict:
    """Run Prediction using the saved core XCBoost model."""
    errors = validate_input(input_data)
    if errors:
        raise ValueError(f"Invalid input: {errors}")

    model = _load_model(model_path)
    features_df = build_feature_row(input_data, model)

    predicted_class = int(model.predict(features_df)[0])

    probabilities = None
    confidence_score = 0.70  # fallback when predict_proba is unavailable

    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(features_df)[0]
        probabilities = np.asarray(proba, dtype=float)
        confidence_score = round(float(np.max(probabilities)), 4)

    risk_score = _class_to_risk_score(predicted_class, probabilities)

    return {
        "risk_score": risk_score,
        "confidence_score": confidence_score,
        "predicted_class": predicted_class,
        "risk_level": _risk_level(risk_score),
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }


def predict_batch(
    records: list[dict],
    model_path: str = DEFAULT_MODEL_PATH,
) -> dict:
    """Run prediction on multiple backend records."""
    results = []

    for record in records:
        try:
            results.append(predict(record, model_path=model_path))
        except Exception as exc:
            results.append({
                "error": str(exc),
                "risk_score": None,
                "confidence_score": None,
            })

    return {
        "results": results,
        "total": len(records),
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    import json
    import sys

    try:
        if len(sys.argv) < 2:
            raise ValueError("Model path argument is required")

        model_path = sys.argv[1]

        raw_input = sys.stdin.read()

        if not raw_input:
            raise ValueError("No input JSON received from backend")

        input_payload = json.loads(raw_input)

        if isinstance(input_payload, list):
            result = predict_batch(input_payload, model_path=model_path)
        else:
            result = predict(input_payload, model_path=model_path)

        print(json.dumps({
            "success": True,
            "data": result
        }))

    except Exception as exc:
        print(json.dumps({
            "success": False,
            "error": str(exc)
        }))
        sys.exit(1)
