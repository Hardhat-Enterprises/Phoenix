from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def _classification_average(y_true: np.ndarray) -> str:
    unique_labels = np.unique(y_true)
    return "binary" if unique_labels.size <= 2 else "weighted"


def _classification_metric_kwargs(
    y_true: np.ndarray,
    y_pred: np.ndarray,
) -> dict[str, object]:
    labels = np.unique(np.concatenate([y_true, y_pred]))
    if labels.size <= 2:
        # sklearn defaults pos_label=1, which fails for labels like {0,2}.
        pos_label = 1 if 1 in labels else labels[-1]
        return {"average": "binary", "pos_label": pos_label, "zero_division": 0}
    return {"average": "weighted", "zero_division": 0}


def _prepare_auc_scores(y_prob: np.ndarray | None) -> np.ndarray | None:
    if y_prob is None:
        return None

    y_prob = np.asarray(y_prob)
    if y_prob.ndim == 2 and y_prob.shape[1] == 2:
        return y_prob[:, 1]
    return y_prob


def evaluate_classification(y_true, y_pred, y_prob=None):
    y_true_arr = np.asarray(y_true)
    y_pred_arr = np.asarray(y_pred)
    metric_kwargs = _classification_metric_kwargs(y_true_arr, y_pred_arr)

    results = {
        "accuracy": accuracy_score(y_true_arr, y_pred_arr),
        "precision": precision_score(y_true_arr, y_pred_arr, **metric_kwargs), # type: ignore
        "recall": recall_score(y_true_arr, y_pred_arr, **metric_kwargs), # type: ignore
        "f1": f1_score(y_true_arr, y_pred_arr, **metric_kwargs), # type: ignore
        "confusion_matrix": confusion_matrix(y_true_arr, y_pred_arr).tolist(),
    }

    prob_scores = _prepare_auc_scores(y_prob)
    if prob_scores is None:
        results["auc"] = None
        return results

    try:
        prob_scores_arr = np.asarray(prob_scores)
        if prob_scores_arr.ndim == 1:
            results["auc"] = roc_auc_score(y_true_arr, prob_scores_arr)
        else:
            results["auc"] = roc_auc_score(
                y_true_arr,
                prob_scores_arr,
                multi_class="ovr",
                average="weighted",
            )
    except Exception:
        results["auc"] = None

    return results


def evaluate_anomaly_detection(y_true, y_pred):
    y_true_arr = np.asarray(y_true)
    y_pred_arr = np.asarray(y_pred)
    metric_kwargs = _classification_metric_kwargs(y_true_arr, y_pred_arr)
    return {
        "accuracy": accuracy_score(y_true_arr, y_pred_arr),
        "precision": precision_score(y_true_arr, y_pred_arr, **metric_kwargs), # type: ignore
        "recall": recall_score(y_true_arr, y_pred_arr, **metric_kwargs), # type: ignore
        "f1": f1_score(y_true_arr, y_pred_arr, **metric_kwargs), # type: ignore
        "confusion_matrix": confusion_matrix(y_true_arr, y_pred_arr).tolist(),
    }
