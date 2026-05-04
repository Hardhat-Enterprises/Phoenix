"""Helper functions for AI014 metric execution.

This module loads prediction outputs, validates the needed columns,
runs metric functions from generic_metrics.py, and saves the result as JSON.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

try:
    from .generic_metrics import classification_metrics
except ImportError:  # Allows direct script execution during local testing.
    from generic_metrics import classification_metrics


DEFAULT_ACTUAL_COLUMN = "actual_label"
DEFAULT_PREDICTED_COLUMN = "predicted_label"
DEFAULT_PROBABILITY_COLUMN = "predicted_probability"


def load_predictions_csv(csv_path: str | Path) -> pd.DataFrame:
    """Load a prediction CSV file into a pandas DataFrame."""
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"Prediction file not found: {path}")
    return pd.read_csv(path)


def validate_required_columns(
    df: pd.DataFrame,
    actual_col: str = DEFAULT_ACTUAL_COLUMN,
    predicted_col: str = DEFAULT_PREDICTED_COLUMN,
) -> None:
    """Check the DataFrame has the required actual and prediction columns."""
    missing = [column for column in [actual_col, predicted_col] if column not in df.columns]
    if missing:
        available = ", ".join(df.columns)
        raise ValueError(
            f"Missing required column(s): {missing}. Available columns: {available}"
        )
    if df.empty:
        raise ValueError("Prediction data is empty.")


def get_probability_column(
    df: pd.DataFrame,
    probability_col: Optional[str] = DEFAULT_PROBABILITY_COLUMN,
) -> Optional[str]:
    """Return the available probability column name, if one exists."""
    candidates = [
        probability_col,
        "predicted_probability",
        "probability",
        "prediction_probability",
        "score",
        "y_score",
    ]
    for candidate in candidates:
        if candidate and candidate in df.columns:
            return candidate
    return None


def evaluate_prediction_dataframe(
    df: pd.DataFrame,
    actual_col: str = DEFAULT_ACTUAL_COLUMN,
    predicted_col: str = DEFAULT_PREDICTED_COLUMN,
    probability_col: Optional[str] = DEFAULT_PROBABILITY_COLUMN,
    positive_label: int = 1,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Run metric execution on an already loaded DataFrame."""
    validate_required_columns(df, actual_col, predicted_col)
    detected_probability_col = get_probability_column(df, probability_col)

    y_true = df[actual_col]
    y_pred = df[predicted_col]
    y_score = df[detected_probability_col] if detected_probability_col else None

    metrics = classification_metrics(
        y_true=y_true,
        y_pred=y_pred,
        y_score=y_score,
        positive_label=positive_label,
    )

    return {
        "task": "AI014 - Implement metric execution",
        "created_by": "Asad Ullah",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "input_columns": list(df.columns),
        "actual_column": actual_col,
        "predicted_column": predicted_col,
        "probability_column": detected_probability_col,
        "positive_label": positive_label,
        "metrics": metrics,
        "metadata": metadata or {},
    }


def save_metrics_json(result: Dict[str, Any], output_path: str | Path) -> Path:
    """Save metric results to a JSON file."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return path


def run_metric_execution(
    csv_path: str | Path,
    output_path: str | Path,
    actual_col: str = DEFAULT_ACTUAL_COLUMN,
    predicted_col: str = DEFAULT_PREDICTED_COLUMN,
    probability_col: Optional[str] = DEFAULT_PROBABILITY_COLUMN,
    positive_label: int = 1,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Load predictions, calculate metrics, and save the JSON result."""
    df = load_predictions_csv(csv_path)
    result = evaluate_prediction_dataframe(
        df=df,
        actual_col=actual_col,
        predicted_col=predicted_col,
        probability_col=probability_col,
        positive_label=positive_label,
        metadata={"source_file": str(csv_path), **(metadata or {})},
    )
    save_metrics_json(result, output_path)
    return result
