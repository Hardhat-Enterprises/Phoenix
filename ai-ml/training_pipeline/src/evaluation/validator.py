"""Validation engine for W6-T6."""

from __future__ import annotations

from typing import Any, Dict, Optional

import numpy as np

from .metrics import evaluate_anomaly_detection, evaluate_classification


def _normalize_anomaly_predictions(y_pred: Any) -> np.ndarray:
    values = np.asarray(y_pred)
    unique_values = set(np.unique(values))

    # IsolationForest convention: -1 = anomaly, 1 = normal.
    if unique_values.issubset({-1, 1}):
        return np.where(values == -1, 1, 0)

    return values


def validate_predictions(
    y_true: Any,
    y_pred: Any,
    y_prob: Optional[Any] = None,
    task_type: str = "classification",
) -> Dict[str, Any]:
    """Validate prediction outputs using evaluation metrics."""
    normalized_task_type = str(task_type).strip().lower()

    if y_true is None:
        raise ValueError("y_true cannot be None for evaluation.")
    if y_pred is None:
        raise ValueError("y_pred cannot be None for evaluation.")

    if normalized_task_type == "classification":
        return evaluate_classification(y_true, y_pred, y_prob)

    if normalized_task_type in {"anomaly", "anomaly_detection"}:
        normalized_preds = _normalize_anomaly_predictions(y_pred)
        return evaluate_anomaly_detection(y_true, normalized_preds)

    raise ValueError(f"Unsupported task_type: {task_type}")
