"""
validation_label_builder.py
Builds classification labels from continuous fire intensity (frp_mw) values.
Used to validate whether the model's predictions land in the correct severity band.
"""

import numpy as np
import pandas as pd


# FRP thresholds based on wildfire dataset distribution
SEVERITY_THRESHOLDS = {
    'Low'      : (0,    20),
    'Moderate' : (20,   60),
    'High'     : (60,  200),
    'Extreme'  : (200, float('inf'))
}


def frp_to_label(frp_value: float) -> str:
    for label, (low, high) in SEVERITY_THRESHOLDS.items():
        if low <= frp_value < high:
            return label
    return 'Extreme'


def build_labels(values: np.ndarray) -> np.ndarray:
    """
    Convert array of frp_mw values to severity label strings.
    """
    return np.array([frp_to_label(v) for v in values.flatten()])


def encode_labels(labels: np.ndarray) -> np.ndarray:
    """
    Encode string labels to integers: Low=0, Moderate=1, High=2, Extreme=3
    """
    mapping = {'Low': 0, 'Moderate': 1, 'High': 2, 'Extreme': 3}
    return np.array([mapping[l] for l in labels])


def label_accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Check what % of predictions land in the same severity band as actual.
    """
    true_labels = build_labels(y_true)
    pred_labels = build_labels(y_pred)
    return (true_labels == pred_labels).mean()


def build_validation_report(y_true: np.ndarray, y_pred: np.ndarray) -> pd.DataFrame:
    """
    Returns a row-by-row validation table with actual, predicted, and label match.
    """
    df = pd.DataFrame({
        'actual'       : y_true.flatten(),
        'predicted'    : y_pred.flatten(),
        'actual_label' : build_labels(y_true),
        'pred_label'   : build_labels(y_pred),
    })
    df['label_match'] = df['actual_label'] == df['pred_label']
    return df
