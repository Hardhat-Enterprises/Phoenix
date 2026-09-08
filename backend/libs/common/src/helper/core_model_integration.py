"""
PHOENIX M7 Core Model Integration.

Loads the packaged M7 preprocessing and prediction pipeline, validates
the model feature schema, and returns the predicted label, confidence,
class probabilities, model version, target, and production status.

Expected input payload

{
    "text": "Urgent flood relief donation needed.",
    "hazard_type": "flood",
    "hazard_location": "VIC",
    "hazard_status": "active",
    "source": "OpenPhish"
}

The package predicts hazard_severity. Derived prediction fields such as
alert_level must not be supplied as model inputs.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd


DEFAULT_MODEL_PATH = "m7_xgb_legacy_baseline.joblib"



MODEL_CACHE: dict[str, Any] = {}
M7_SCHEMA_VERSION = "phoenix.m7.model-package.v1"


def _is_m7_bundle(model: Any) -> bool:
    """Return True when the loaded object is an M7 packaged pipeline."""
    return (
        isinstance(model, dict)
        and model.get("schema_version") == M7_SCHEMA_VERSION
        and "pipeline" in model
        and "feature_columns" in model
        and "label_classes" in model
        and "metadata" in model
    )


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

def _predict_m7_bundle(bundle: dict[str, Any], input_data: dict) -> dict:
    """Run prediction using the packaged M7 preprocessing pipeline."""
    if not isinstance(input_data, dict):
        raise ValueError("Input must be a dictionary/JSON object")

    features = list(bundle["feature_columns"])
    missing = sorted(
        name
        for name in features
        if name not in input_data
    )

    if missing:
        raise ValueError(
            f"Prediction input is missing required fields: {missing}"
        )

    row = pd.DataFrame([
        {
            name: ""
            if input_data[name] is None
            else str(input_data[name])
            for name in features
        }
    ])

    pipeline = bundle["pipeline"]
    encoded = int(pipeline.predict(row)[0])
    probabilities = np.asarray(
        pipeline.predict_proba(row)[0],
        dtype=float,
    )
    classes = [str(value) for value in bundle["label_classes"]]

    if encoded < 0 or encoded >= len(classes):
        raise ValueError("Model returned an unknown class index")

    if len(probabilities) != len(classes):
        raise ValueError("Model probability output does not match its labels")

    return {
        "predicted_label": classes[encoded],
        "confidence_score": round(float(probabilities.max()), 6),
        "class_probabilities": {
            label: round(float(probability), 6)
            for label, probability in zip(classes, probabilities)
        },
        "model_version": str(bundle["model_version"]),
        "package_schema_version": str(bundle["schema_version"]),
        "target": str(bundle["metadata"]["target_column"]),
        "production_eligible": bool(
            bundle["metadata"]["production_eligible"]
        ),
    }


def predict(
    input_data: dict,
    model_path: str = DEFAULT_MODEL_PATH,
) -> dict:
    """Run prediction using a supported M7 packaged pipeline."""
    model = _load_model(model_path)

    if not _is_m7_bundle(model):
        raise ValueError(
            "Unsupported core model format. "
            f"Expected schema_version '{M7_SCHEMA_VERSION}'."
        )

    return _predict_m7_bundle(model, input_data)


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
