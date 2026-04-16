from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
)


def evaluate_classification(y_true, y_pred, y_prob=None):
    results = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }

    if y_prob is not None:
        try:
            results["auc"] = roc_auc_score(y_true, y_prob)
        except Exception:
            results["auc"] = None
    else:
        results["auc"] = None

    return results


def evaluate_anomaly_detection(y_true, y_pred):
    return {
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }


if __name__ == "__main__":
    # mock classification example
    y_true = [0, 1, 1, 0, 1, 0, 1, 0]
    y_pred = [0, 1, 0, 0, 1, 0, 1, 1]
    y_prob = [0.10, 0.85, 0.40, 0.20, 0.90, 0.15, 0.78, 0.65]

    print("Classification Evaluation:")
    print(evaluate_classification(y_true, y_pred, y_prob))

    # mock anomaly example
    anomaly_true = [0, 1, 0, 1, 0, 0, 1, 1]
    anomaly_pred = [0, 1, 0, 0, 0, 1, 1, 1]

    print("\nAnomaly Evaluation:")
    print(evaluate_anomaly_detection(anomaly_true, anomaly_pred))