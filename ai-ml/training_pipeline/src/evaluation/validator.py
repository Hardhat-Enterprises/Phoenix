"""Validation engine for W6-T6."""

from typing import Any, Dict, Optional
from .metrics import evaluate_classification, evaluate_anomaly_detection


def validate_predictions(
    y_true: Any,
    y_pred: Any,
    y_prob: Optional[Any] = None,
    task_type: str = "classification",
) -> Dict[str, float]:
    """Validate prediction outputs using evaluation metrics."""
    if task_type == "classification":
        return evaluate_classification(y_true, y_pred, y_prob)
    elif task_type == "anomaly":
        return evaluate_anomaly_detection(y_true, y_pred)
    else:
        raise ValueError(f"Unsupported task_type: {task_type}")


if __name__ == "__main__":
    y_true = [0, 1, 1, 0, 1, 0, 1, 0]
    y_pred = [0, 1, 0, 0, 1, 0, 1, 1]
    y_prob = [0.10, 0.85, 0.40, 0.20, 0.90, 0.15, 0.78, 0.65]

    print("Validator Classification Test:")
    print(validate_predictions(y_true, y_pred, y_prob, task_type="classification"))