"""Evaluation metrics placeholder for W6-T6."""

from typing import Any, Dict


def compute_metrics(y_true: Any, y_pred: Any, y_score: Any | None = None) -> Dict[str, float]:
    """Compute core metrics for classification or anomaly detection."""
    raise NotImplementedError("W6-T6 will implement metric calculations here.")
