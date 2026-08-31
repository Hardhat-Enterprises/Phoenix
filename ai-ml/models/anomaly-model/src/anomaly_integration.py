"""
AI019 – V2 Integration | Anomaly Detection
Role 1 – Backend Integration Engineer

File: src/anomaly_integration.py

WHAT THIS SCRIPT DOES
=====================
Takes input from the backend (fields defined by Sunain in the AI/backend
integrations chat), runs the anomaly detection model, and returns output
in the exact format Sunain specified.

This is a Python script the backend can call directly.
No FastAPI required — the backend imports predict() and calls it.

EXACT INPUT FORMAT 
==========================================
{
    "time_window": "2024-01-15 14:00:00",
    "region_id": "VIC_GIPPSLAND",
    "firms_event_count": 12,
    "firms_avg_brightness": 331.5,
    "fire_confidence_high_count": 5,
    "urlhaus_event_count": 18,
    "malicious_url_count": 9,
    "phishing_tag_count": 4,
    "threat_spike_ratio": 2.6,
    "hour_of_day": 14,
    "day_of_week": 1
}

EXACT OUTPUT FORMAT 
============================================
{
    "time_window": "2024-01-15 14:00:00",
    "region_id": "VIC_GIPPSLAND",
    "anomaly_score": 0.87,
    "is_anomaly": true,
    "risk_level": "High",
    "main_drivers": [
        "urlhaus_event_count spike",
        "high FIRMS fire activity",
        "phishing tags increased"
    ],
    "confidence_score": 0.78
}

HOW IT CONNECTS TO AI012 PREVIOUS WORK
=======================================
  Role A (Sunain)  → raw dataset columns map to input fields above
  Role B (Sneha)   → FeatureSelector logic re-applied here on incoming fields
  Role C (Preetham)→ 7 anomaly rules reused to flag records and build main_drivers
  Role E / AI012     → selected autoencoder checkpoint loaded and used for anomaly_score
  AI007            → risk_level bands: Low/Medium/High/Critical

USAGE FROM BACKEND
==================
  from anomaly_integration import predict, predict_batch

  # Single prediction
  result = predict(input_dict)

  # Batch prediction
  results = predict_batch([input_dict1, input_dict2, ...])
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Risk level bands (AI007 output design)
# ---------------------------------------------------------------------------
def _score_to_risk_level(score: float) -> str:
    """
    Convert anomaly_score (0.0–1.0) to risk_level string.
    Matches AI007 severity bands.
    """
    if score >= 0.75: return "Critical"
    if score >= 0.50: return "High"
    if score >= 0.25: return "Medium"
    return "Low"


AI012_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_AUTOENCODER_CHECKPOINT_PATH = (
    AI012_ROOT / "autoencoder" / "outputs" / "checkpoints" / "autoencoder_best.pt"
)
DEFAULT_AUTOENCODER_PREPROCESSING_PATH = (
    AI012_ROOT / "autoencoder" / "outputs" / "checkpoints" / "autoencoder_preprocessing.pkl"
)


def _resolve_checkpoint_path(checkpoint_path: str | Path) -> Path:
    path = Path(checkpoint_path)
    if path.exists():
        return path

    ai012_relative = AI012_ROOT / path
    if ai012_relative.exists():
        return ai012_relative

    return path


class AutoencoderModel:
    """Minimal runtime copy of the trained PyTorch autoencoder architecture."""

    def __init__(self, input_dim, encoder_layers, latent_dim, decoder_layers, dropout=0.0):
        import torch.nn as nn

        self.nn = nn
        self.input_dim = input_dim

        encoder = []
        previous = input_dim
        for layer_size in encoder_layers:
            encoder.append(nn.Linear(previous, layer_size))
            encoder.append(nn.ReLU())
            if dropout:
                encoder.append(nn.Dropout(dropout))
            previous = layer_size
        encoder.append(nn.Linear(previous, latent_dim))

        decoder = []
        previous = latent_dim
        for layer_size in decoder_layers:
            decoder.append(nn.Linear(previous, layer_size))
            decoder.append(nn.ReLU())
            if dropout:
                decoder.append(nn.Dropout(dropout))
            previous = layer_size
        decoder.append(nn.Linear(previous, input_dim))

        class _Module(nn.Module):
            def __init__(self, encoder_layers, decoder_layers):
                super().__init__()
                self.encoder = nn.Sequential(*encoder_layers)
                self.decoder = nn.Sequential(*decoder_layers)

            def forward(self, x):
                return self.decoder(self.encoder(x))

        self.module = _Module(encoder, decoder)


# ---------------------------------------------------------------------------
# Checkpoint loader
# ---------------------------------------------------------------------------
def _load_checkpoint(checkpoint_path: str | Path) -> dict:
    """Load the selected autoencoder checkpoint, with legacy joblib fallback."""
    path = _resolve_checkpoint_path(checkpoint_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Model checkpoint not found: {path}\n"
            f"Expected selected AI012 autoencoder checkpoint at {DEFAULT_AUTOENCODER_CHECKPOINT_PATH}"
        )

    if path.suffix.lower() in {".pt", ".pth"}:
        import joblib
        import torch

        checkpoint = torch.load(path, map_location="cpu")
        preprocessing_path = path.with_name("autoencoder_preprocessing.pkl")
        if not preprocessing_path.exists():
            preprocessing_path = DEFAULT_AUTOENCODER_PREPROCESSING_PATH
        if not preprocessing_path.exists():
            raise FileNotFoundError(
                f"Autoencoder preprocessing file not found: {preprocessing_path}"
            )

        preprocessing = joblib.load(preprocessing_path)
        config = checkpoint.get("config", {})
        hyperparameters = config.get("model", {}).get("hyperparameters", {})

        model_wrapper = AutoencoderModel(
            input_dim=checkpoint.get("input_dim", len(checkpoint.get("feature_columns", []))),
            encoder_layers=hyperparameters.get("encoder_layers", [128, 64, 32]),
            latent_dim=hyperparameters.get("latent_dim", 16),
            decoder_layers=hyperparameters.get("decoder_layers", [32, 64, 128]),
            dropout=hyperparameters.get("dropout", 0.1),
        )
        model = model_wrapper.module
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()

        return {
            "model_type": "autoencoder",
            "model": model,
            "preprocessor": preprocessing["preprocessor"],
            "feature_columns": preprocessing.get(
                "feature_columns",
                checkpoint.get("feature_columns", []),
            ),
            "threshold": preprocessing.get("threshold", checkpoint.get("threshold")),
        }

    import joblib
    return joblib.load(path)


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------
REQUIRED_FIELDS = ["time_window", "region_id"]

OPTIONAL_FIELDS_DEFAULTS = {
    "firms_event_count"        : 0.0,
    "firms_avg_brightness"     : 0.0,
    "fire_confidence_high_count": 0.0,
    "urlhaus_event_count"      : 0.0,
    "malicious_url_count"      : 0.0,
    "phishing_tag_count"       : 0.0,
    "threat_spike_ratio"       : 0.0,
    "hour_of_day"              : 0.0,
    "day_of_week"              : 0.0,
}

def validate_input(data: dict) -> list[str]:
    """
    Validate incoming JSON from the backend.
    Returns list of error strings. Empty = valid.
    """
    errors = []
    for field in REQUIRED_FIELDS:
        if field not in data or data[field] is None or data[field] == "":
            errors.append(f"Missing required field: '{field}'")

    numeric_fields = [f for f in OPTIONAL_FIELDS_DEFAULTS]
    for field in numeric_fields:
        if field in data:
            try:
                val = float(data[field])
                if val < 0:
                    errors.append(f"Field '{field}' cannot be negative, got {val}")
            except (TypeError, ValueError):
                errors.append(f"Field '{field}' must be numeric, got {data[field]!r}")

    return errors


def fill_missing(data: dict) -> dict:
    """
    Fill missing optional fields with 0.0.
    Handles incomplete data from the backend gracefully.
    """
    filled = dict(data)
    for field, default in OPTIONAL_FIELDS_DEFAULTS.items():
        if field not in filled or filled[field] is None:
            filled[field] = default
    return filled


# ---------------------------------------------------------------------------
# Feature engineering
# (maps Sunain's input fields to Sneha's engineered features)
# ---------------------------------------------------------------------------
def engineer_features(data: dict) -> dict:
    """
    Convert Sunain's input fields into the features the selected model expects.

    Sunain's fields → Sneha's FeatureSelector equivalents:
      firms_event_count          → firms_event_count (direct)
      firms_avg_brightness       → firms_avg_brightness (direct)
      fire_confidence_high_count → firms_avg_confidence proxy
      urlhaus_event_count        → urlhaus_event_count (direct)
      malicious_url_count        → urlhaus_unique_url_count equivalent
      phishing_tag_count         → urlhaus threats tag count
      threat_spike_ratio         → cyber_threat_density equivalent
      hour_of_day                → hour (direct)
      day_of_week                → day proxy

    Derived (matching Sneha's create_features() logic):
      firms_risk_index           = firms_event_count × firms_avg_brightness / 100
      cyber_risk_index           = urlhaus_event_count × malicious_url_count
      hazard_cyber_interaction   = firms_event_count × urlhaus_event_count
      risk_amplification_index   = firms_risk_index × cyber_risk_index
    """
    ec   = float(data.get("firms_event_count", 0))
    br   = float(data.get("firms_avg_brightness", 0))
    avg_confidence = data.get("firms_avg_confidence")
    conf = np.nan if avg_confidence in (None, "") else float(avg_confidence)
    uc   = float(data.get("urlhaus_event_count", 0))
    mu   = float(data.get("malicious_url_count", 0))
    pt   = float(data.get("phishing_tag_count", 0))
    tsr  = float(data.get("threat_spike_ratio", 0))
    hr   = float(data.get("hour_of_day", 0))
    dow  = float(data.get("day_of_week", 0))

    firms_risk_index         = ec * (br / 100.0)
    firms_intensity_score    = br * conf if not np.isnan(conf) else np.nan
    geo_area_proxy           = data.get("geo_area_proxy")
    geo_area_proxy           = np.nan if geo_area_proxy in (None, "") else float(geo_area_proxy)
    firms_geo_density        = ec / geo_area_proxy if geo_area_proxy and not np.isnan(geo_area_proxy) else np.nan
    cyber_risk_index         = uc * mu
    cyber_activity_score     = uc - (uc * 0.3)   # approximate: online minus offline
    hazard_cyber_interaction = ec * uc
    risk_amplification_index = firms_risk_index * cyber_risk_index

    features = {
        # Direct mappings
        "hour"              : hr,
        "day"               : dow,
        "geo_area_proxy"    : geo_area_proxy,
        "firms_event_count" : ec,
        "firms_avg_brightness": br,
        "firms_avg_confidence": conf,
        "urlhaus_event_count": uc,
        "urlhaus_unique_url_count": mu,
        "urlhaus_tags_encoded": pt,
        # FIRMS engineered
        "firms_risk_index"        : firms_risk_index,
        "firms_intensity_score"   : firms_intensity_score,
        "firms_geo_density"       : firms_geo_density,
        "firms_sensor_activity"   : ec,
        "firms_zscore"            : 0.0,   # z-score vs training mean not available per-record
        # Cyber engineered
        "cyber_risk_index"        : cyber_risk_index,
        "cyber_activity_score"    : cyber_activity_score,
        "cyber_threat_density"    : tsr,
        "cyber_zscore"            : 0.0,
        # Cross-domain
        "hazard_cyber_interaction"  : hazard_cyber_interaction,
        "risk_amplification_index"  : risk_amplification_index,
    }

    # Fill the selected autoencoder training columns when live/backend input does
    # not provide their raw equivalents. The fitted imputer/scaler then receives
    # a stable 50-column frame that matches the saved checkpoint.
    def optional_numeric(column: str) -> float:
        value = data.get(column, np.nan)
        if value in (None, ""):
            return np.nan
        return float(value)

    for column in (
        "region_lat_bin", "region_lon_bin",
        "region_min_latitude", "region_max_latitude",
        "region_min_longitude", "region_max_longitude",
        "firms_avg_latitude", "firms_avg_longitude",
        "firms_min_latitude", "firms_max_latitude",
        "firms_min_longitude", "firms_max_longitude",
        "firms_avg_frp", "firms_avg_bright_t31", "firms_avg_bright_ti4",
        "firms_avg_scan", "firms_avg_track", "firms_versions",
        "urlhaus_dateadded_hour_count", "urlhaus_last_online_hour_count",
        "urlhaus_online_count", "urlhaus_offline_count",
        "geo_width", "geo_height", "geo_center_lat", "geo_center_lon",
        "firms_instruments_encoded", "firms_satellites_encoded",
        "firms_types_encoded", "urlhaus_threats_encoded",
    ):
        features[column] = optional_numeric(column)

    return features


# ---------------------------------------------------------------------------
# Anomaly rules (Role C label_builder.py logic, adapted to Sunain's fields)
# ---------------------------------------------------------------------------
# Thresholds calibrated from training dataset
FRP_EXTREME_THRESHOLD     = 41.61   # firms_avg_frp 99th percentile
BRIGHTNESS_HIGH_THRESHOLD = 350.0   # firms_avg_brightness high value
URLHAUS_SPIKE_THRESHOLD   = 10.0    # urlhaus_event_count spike
PHISHING_THRESHOLD        = 3.0     # phishing_tag_count elevated
THREAT_RATIO_THRESHOLD    = 2.0     # threat_spike_ratio elevated
MALICIOUS_URL_THRESHOLD   = 5.0     # malicious_url_count elevated

def _apply_rules(data: dict) -> tuple[list[str], float]:
    """
    Apply Role C anomaly rules to Sunain's input fields.
    Returns (triggered_driver_strings, rule_score 0.0-1.0).
    """
    ec  = float(data.get("firms_event_count", 0))
    br  = float(data.get("firms_avg_brightness", 0))
    uc  = float(data.get("urlhaus_event_count", 0))
    mu  = float(data.get("malicious_url_count", 0))
    pt  = float(data.get("phishing_tag_count", 0))
    tsr = float(data.get("threat_spike_ratio", 0))

    rules = {
        "high FIRMS fire activity"       : br >= BRIGHTNESS_HIGH_THRESHOLD or ec >= 10,
        "urlhaus_event_count spike"      : uc >= URLHAUS_SPIKE_THRESHOLD,
        "phishing tags increased"        : pt >= PHISHING_THRESHOLD,
        "threat spike ratio elevated"    : tsr >= THREAT_RATIO_THRESHOLD,
        "high malicious URL count"       : mu >= MALICIOUS_URL_THRESHOLD,
        "hazard-cyber co-occurrence"     : ec > 0 and uc > 0,
        "sustained multi-threat pattern" : (uc >= 5 and pt >= 2 and ec >= 5),
    }

    triggered = [label for label, fired in rules.items() if fired]
    score     = round(len(triggered) / len(rules), 4)

    return triggered[:3], score   # top 3 drivers as Sunain's output shows


# ---------------------------------------------------------------------------
# Model scoring
# ---------------------------------------------------------------------------
ISOLATION_FOREST_FEATURE_ORDER = [
    "hour", "day", "geo_area_proxy",
    "firms_risk_index", "firms_intensity_score", "firms_geo_density", "firms_zscore",
    "cyber_risk_index", "cyber_activity_score", "cyber_threat_density", "cyber_zscore",
    "hazard_cyber_interaction", "risk_amplification_index",
]

def _isolation_forest_score(features: dict, ck: dict) -> float:
    """
    Run Isolation Forest model from checkpoint and return anomaly score (0.0–1.0).
    Higher = more anomalous.

    Expected checkpoint format:
      {
        "feature_columns": [...],
        "scaler": fitted scaler or None,
        "fitted_model": trained IsolationForest
      }

    Also supports plain sklearn IsolationForest objects if the checkpoint directly
    contains the model.
    """
    if isinstance(ck, dict):
        feat_cols = ck.get("feature_columns") or list(ISOLATION_FOREST_FEATURE_ORDER)
        scaler = ck.get("scaler")
        model = ck.get("fitted_model") or ck.get("model") or ck.get("isolation_forest")
    else:
        feat_cols = list(ISOLATION_FOREST_FEATURE_ORDER)
        scaler = None
        model = ck

    if model is None:
        return 0.0

    row = [float(features.get(col, 0.0)) for col in feat_cols]
    X = np.array([row])

    if scaler is not None:
        X = scaler.transform(X)

    try:
        # IsolationForest decision_function: negative = more anomalous, positive = more normal.
        decision_value = float(model.decision_function(X)[0])

        # Convert to 0–1 where higher means more anomalous.
        # The logistic transform keeps the score bounded and backend-friendly.
        anomaly_score = 1.0 / (1.0 + np.exp(5.0 * decision_value))
        return round(float(min(1.0, max(0.0, anomaly_score))), 4)
    except Exception:
        return 0.0


def _autoencoder_score(features: dict, ck: dict) -> float:
    """
    Run the selected PyTorch autoencoder and return a normalized anomaly score.

    The raw reconstruction error is compared with the saved training threshold.
    A score of about 0.5 means the reconstruction error is at the selected
    anomaly threshold; higher values are increasingly anomalous.
    """
    import torch

    feature_columns = ck["feature_columns"]
    row = pd.DataFrame(
        [{column: float(features.get(column, np.nan)) for column in feature_columns}],
        columns=feature_columns,
    )
    X = ck["preprocessor"].transform(row)
    X_tensor = torch.tensor(X, dtype=torch.float32)

    with torch.no_grad():
        reconstructed = ck["model"](X_tensor)
        raw_score = torch.mean((reconstructed - X_tensor) ** 2, dim=1).item()

    threshold = float(ck.get("threshold") or 0.0)
    if threshold <= 0:
        return round(float(min(1.0, max(0.0, raw_score))), 4)

    normalized = raw_score / (threshold * 2.0)
    return round(float(min(1.0, max(0.0, normalized))), 4)


def _model_score(features: dict, ck: dict) -> float:
    """Score features with the selected model, preserving legacy checkpoint support."""
    if isinstance(ck, dict) and ck.get("model_type") == "autoencoder":
        return _autoencoder_score(features, ck)
    return _isolation_forest_score(features, ck)

# ---------------------------------------------------------------------------
# Core predict function
# ---------------------------------------------------------------------------
_checkpoint_cache: dict = {}

def _get_checkpoint(checkpoint_path: str) -> dict:
    """Load and cache the checkpoint."""
    if checkpoint_path not in _checkpoint_cache:
        _checkpoint_cache[checkpoint_path] = _load_checkpoint(checkpoint_path)
    return _checkpoint_cache[checkpoint_path]


def predict(
    input_data: dict,
    checkpoint_path: str | Path = DEFAULT_AUTOENCODER_CHECKPOINT_PATH,
) -> dict:
    """
    Main integration function. Takes backend input, returns backend output.

    This is the function the backend calls.

    Args:
        input_data      : dict matching Sunain's anomaly detection input schema
        checkpoint_path : path to selected autoencoder checkpoint

    Returns:
        dict matching Sunain's anomaly detection output schema exactly:
        {
            "time_window"    : str,
            "region_id"      : str,
            "anomaly_score"  : float (0.0-1.0),
            "is_anomaly"     : bool,
            "risk_level"     : str (Low/Medium/High/Critical),
            "main_drivers"   : list[str],
            "confidence_score": float (0.0-1.0)
        }

    Raises:
        ValueError      : if required fields are missing or invalid
        FileNotFoundError: if checkpoint not found
    """
    # Step 1: Validate
    errors = validate_input(input_data)
    if errors:
        raise ValueError(f"Invalid input: {errors}")

    # Step 2: Fill missing optional fields
    data = fill_missing(input_data)

    # Step 3: Engineer features (Sneha's logic adapted to Sunain's input fields)
    features = engineer_features(data)

    # Step 4: Apply Role C rules → get main_drivers and rule_score
    main_drivers, rule_score = _apply_rules(data)

    # Step 5: Selected model score
    try:
        ck        = _get_checkpoint(checkpoint_path)
        model_score = _model_score(features, ck)
    except FileNotFoundError:
        # If checkpoint not found, fall back to rule-based score only
        model_score = rule_score

    # Step 6: Combine scores
    # Weight: 60% selected autoencoder (statistical), 40% rules (domain knowledge)
    anomaly_score = round((model_score * 0.6) + (rule_score * 0.4), 4)

    # Step 7: Build output in Sunain's exact format
    is_anomaly  = anomaly_score >= 0.25    # threshold: anything above Low is anomaly
    risk_level  = _score_to_risk_level(anomaly_score)

    # Confidence: higher when both selected model and rules agree
    if_agrees  = model_score >= 0.25
    rule_agrees = rule_score >= 0.25
    if if_agrees and rule_agrees:
        confidence = round(min(0.95, anomaly_score + 0.15), 2)
    elif if_agrees or rule_agrees:
        confidence = round(min(0.85, anomaly_score + 0.05), 2)
    else:
        confidence = round(max(0.60, 1.0 - anomaly_score), 2)

    return {
        "time_window"     : data["time_window"],
        "region_id"       : data["region_id"],
        "anomaly_score"   : anomaly_score,
        "is_anomaly"      : is_anomaly,
        "risk_level"      : risk_level,
        "main_drivers"    : main_drivers if main_drivers else ["no significant anomaly drivers detected"],
        "confidence_score": confidence,
    }


def predict_batch(
    records: list[dict],
    checkpoint_path: str | Path = DEFAULT_AUTOENCODER_CHECKPOINT_PATH,
) -> dict:
    """
    Batch prediction. Process multiple records and return all results.

    Args:
        records         : list of input dicts, each matching Sunain's input schema
        checkpoint_path : path to selected autoencoder checkpoint

    Returns:
        {
            "results"          : list of output dicts
            "total"            : int
            "anomalies_found"  : int
            "processed_at"     : ISO timestamp
        }
    """
    results        = []
    anomalies_found = 0

    for record in records:
        try:
            result = predict(record, checkpoint_path)
            results.append(result)
            if result["is_anomaly"]:
                anomalies_found += 1
        except (ValueError, KeyError) as e:
            results.append({
                "time_window" : record.get("time_window", "unknown"),
                "region_id"   : record.get("region_id", "unknown"),
                "error"       : str(e),
                "is_anomaly"  : False,
            })

    return {
        "results"          : results,
        "total"            : len(records),
        "anomalies_found"  : anomalies_found,
        "processed_at"     : datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Demo / quick test (run directly: python anomaly_integration.py)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("Phoenix AI019 – Anomaly Detection Integration Script")
    print("=" * 60)

    # Sunain's exact example input
    test_input = {
        "time_window"              : "2024-01-15 14:00:00",
        "region_id"                : "VIC_GIPPSLAND",
        "firms_event_count"        : 12,
        "firms_avg_brightness"     : 331.5,
        "fire_confidence_high_count": 5,
        "urlhaus_event_count"      : 18,
        "malicious_url_count"      : 9,
        "phishing_tag_count"       : 4,
        "threat_spike_ratio"       : 2.6,
        "hour_of_day"              : 14,
        "day_of_week"              : 1,
    }

    print("\n--- Input ---")
    print(json.dumps(test_input, indent=2))

    ck_path = DEFAULT_AUTOENCODER_CHECKPOINT_PATH

    result = predict(test_input, checkpoint_path=ck_path)

    print("\n--- Output ---")
    print(json.dumps(result, indent=2))

    print("\n--- Normal record test ---")
    normal_input = {
        "time_window"              : "2024-01-10 08:00:00",
        "region_id"                : "NSW_HUNTER",
        "firms_event_count"        : 3,
        "firms_avg_brightness"     : 312.0,
        "fire_confidence_high_count": 1,
        "urlhaus_event_count"      : 0,
        "malicious_url_count"      : 0,
        "phishing_tag_count"       : 0,
        "threat_spike_ratio"       : 0.1,
        "hour_of_day"              : 8,
        "day_of_week"              : 3,
    }
    normal_result = predict(normal_input, checkpoint_path=ck_path)
    print(json.dumps(normal_result, indent=2))

    print("\n--- Batch test (2 records) ---")
    batch_result = predict_batch([test_input, normal_input], checkpoint_path=ck_path)
    print(f"Total: {batch_result['total']}, Anomalies: {batch_result['anomalies_found']}")
