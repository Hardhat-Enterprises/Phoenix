"""Generic metric functions for AI014.

This module contains small reusable metric functions for binary classification
outputs. It does not depend on a trained model. It only needs true labels,
predicted labels, and optional prediction probabilities.
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Sequence


def _as_list(values: Iterable[Any]) -> List[Any]:
    """Convert an iterable to a plain Python list."""
    if values is None:
        return []
    if hasattr(values, "tolist"):
        return list(values.tolist())
    return list(values)


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide two numbers and avoid ZeroDivisionError."""
    if denominator == 0:
        return default
    return numerator / denominator


def confusion_matrix_counts(
    y_true: Sequence[Any],
    y_pred: Sequence[Any],
    positive_label: Any = 1,
    negative_label: Any = 0,
) -> Dict[str, int]:
    """Return TP, TN, FP and FN counts for binary classification."""
    true_values = _as_list(y_true)
    pred_values = _as_list(y_pred)

    if len(true_values) != len(pred_values):
        raise ValueError("y_true and y_pred must have the same length.")
    if len(true_values) == 0:
        raise ValueError("At least one prediction row is required.")

    tp = tn = fp = fn = 0
    for actual, predicted in zip(true_values, pred_values):
        if actual == positive_label and predicted == positive_label:
            tp += 1
        elif actual == negative_label and predicted == negative_label:
            tn += 1
        elif actual == negative_label and predicted == positive_label:
            fp += 1
        elif actual == positive_label and predicted == negative_label:
            fn += 1
        else:
            # For labels outside the expected binary labels, count exact match as TN-like
            # only when actual and predicted match. Otherwise treat it as a wrong prediction.
            if actual == predicted:
                tn += 1
            else:
                fp += 1
    return {"tp": tp, "tn": tn, "fp": fp, "fn": fn}


def confusion_matrix_binary(
    y_true: Sequence[Any],
    y_pred: Sequence[Any],
    positive_label: Any = 1,
    negative_label: Any = 0,
) -> List[List[int]]:
    """Return a 2x2 confusion matrix in sklearn style: [[TN, FP], [FN, TP]]."""
    counts = confusion_matrix_counts(y_true, y_pred, positive_label, negative_label)
    return [[counts["tn"], counts["fp"]], [counts["fn"], counts["tp"]]]


def accuracy_score(y_true: Sequence[Any], y_pred: Sequence[Any]) -> float:
    """Return accuracy: correct predictions divided by all predictions."""
    true_values = _as_list(y_true)
    pred_values = _as_list(y_pred)
    if len(true_values) != len(pred_values):
        raise ValueError("y_true and y_pred must have the same length.")
    return safe_divide(sum(a == p for a, p in zip(true_values, pred_values)), len(true_values))


def precision_score(
    y_true: Sequence[Any],
    y_pred: Sequence[Any],
    positive_label: Any = 1,
) -> float:
    """Return precision: TP / (TP + FP)."""
    counts = confusion_matrix_counts(y_true, y_pred, positive_label=positive_label)
    return safe_divide(counts["tp"], counts["tp"] + counts["fp"])


def recall_score(
    y_true: Sequence[Any],
    y_pred: Sequence[Any],
    positive_label: Any = 1,
) -> float:
    """Return recall: TP / (TP + FN)."""
    counts = confusion_matrix_counts(y_true, y_pred, positive_label=positive_label)
    return safe_divide(counts["tp"], counts["tp"] + counts["fn"])


def f1_score(
    y_true: Sequence[Any],
    y_pred: Sequence[Any],
    positive_label: Any = 1,
) -> float:
    """Return F1 score: harmonic mean of precision and recall."""
    precision = precision_score(y_true, y_pred, positive_label)
    recall = recall_score(y_true, y_pred, positive_label)
    return safe_divide(2 * precision * recall, precision + recall)


def false_positive_rate(
    y_true: Sequence[Any],
    y_pred: Sequence[Any],
    positive_label: Any = 1,
) -> float:
    """Return false positive rate: FP / (FP + TN)."""
    counts = confusion_matrix_counts(y_true, y_pred, positive_label=positive_label)
    return safe_divide(counts["fp"], counts["fp"] + counts["tn"])


def false_negative_rate(
    y_true: Sequence[Any],
    y_pred: Sequence[Any],
    positive_label: Any = 1,
) -> float:
    """Return false negative rate: FN / (FN + TP)."""
    counts = confusion_matrix_counts(y_true, y_pred, positive_label=positive_label)
    return safe_divide(counts["fn"], counts["fn"] + counts["tp"])


def roc_auc_score_binary(
    y_true: Sequence[Any],
    y_score: Optional[Sequence[float]],
    positive_label: Any = 1,
) -> Optional[float]:
    """Return binary ROC AUC using rank calculation.

    Returns None when probabilities are missing or when only one class is present.
    """
    if y_score is None:
        return None

    true_values = _as_list(y_true)
    score_values = [float(x) for x in _as_list(y_score)]
    if len(true_values) != len(score_values):
        raise ValueError("y_true and y_score must have the same length.")

    positives = [i for i, value in enumerate(true_values) if value == positive_label]
    negatives = [i for i, value in enumerate(true_values) if value != positive_label]
    n_pos = len(positives)
    n_neg = len(negatives)
    if n_pos == 0 or n_neg == 0:
        return None

    # Average ranks for tied scores.
    sorted_pairs = sorted(enumerate(score_values), key=lambda item: item[1])
    ranks = [0.0] * len(score_values)
    i = 0
    while i < len(sorted_pairs):
        j = i
        while j + 1 < len(sorted_pairs) and sorted_pairs[j + 1][1] == sorted_pairs[i][1]:
            j += 1
        average_rank = (i + 1 + j + 1) / 2.0
        for k in range(i, j + 1):
            original_index = sorted_pairs[k][0]
            ranks[original_index] = average_rank
        i = j + 1

    sum_positive_ranks = sum(ranks[i] for i in positives)
    auc = (sum_positive_ranks - (n_pos * (n_pos + 1) / 2.0)) / (n_pos * n_neg)
    return auc


def classification_metrics(
    y_true: Sequence[Any],
    y_pred: Sequence[Any],
    y_score: Optional[Sequence[float]] = None,
    positive_label: Any = 1,
    round_digits: int = 6,
) -> Dict[str, Any]:
    """Run all supported binary classification metrics."""
    counts = confusion_matrix_counts(y_true, y_pred, positive_label=positive_label)
    auc = roc_auc_score_binary(y_true, y_score, positive_label=positive_label) if y_score is not None else None

    metrics: Dict[str, Any] = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, positive_label),
        "recall": recall_score(y_true, y_pred, positive_label),
        "f1_score": f1_score(y_true, y_pred, positive_label),
        "false_positive_rate": false_positive_rate(y_true, y_pred, positive_label),
        "false_negative_rate": false_negative_rate(y_true, y_pred, positive_label),
        "roc_auc": auc,
        "confusion_matrix": confusion_matrix_binary(y_true, y_pred, positive_label=positive_label),
        "counts": counts,
        "rows_evaluated": len(_as_list(y_true)),
    }

    for key, value in list(metrics.items()):
        if isinstance(value, float):
            metrics[key] = round(value, round_digits)
    if metrics["roc_auc"] is not None:
        metrics["roc_auc"] = round(float(metrics["roc_auc"]), round_digits)
    return metrics
