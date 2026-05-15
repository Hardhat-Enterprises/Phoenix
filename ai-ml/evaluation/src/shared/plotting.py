'''
Created on Sun May  3 12:53:23 2026

@author: Trey

A utility module to create plots for, as of now, confusion matrix and ROC/AUC 
'''



from __future__ import annotations

import sys
import os
from typing import List, Sequence, Optional
from pathlib import Path

evaluation_root = Path(__file__).resolve().parents[2]

try:
    from ..metrics.generic_metrics import roc_auc_score_binary
except ImportError:  # Allows direct script execution during local testing.
    from metrics.generic_metrics import roc_auc_score_binary

try:
    from ..core.io_utils import ensure_dir, get_timestamp
except ImportError:  # '' ''
    from core.io_utils import ensure_dir, get_timestamp

import matplotlib.pyplot as plt
import numpy as np






# Confusion Matrix Plot

def plot_confusion_matrix(cm: List[List[int]], labels: Optional[List[str]] = None,
    title: str = "Confusion Matrix", save_path: Optional[str] = None,
):
    """
    Plot a 2x2 confusion matrix.
    cm format: [[TN, FP], [FN, TP]]
    """

    cm_array = np.array(cm)

    plt.figure()
    plt.imshow(cm_array)
    plt.title(title)
    plt.colorbar()

    tick_marks = np.arange(len(cm_array))
    labels = labels or ["Negative", "Positive"]

    plt.xticks(tick_marks, labels)
    plt.yticks(tick_marks, labels)

    # Annotate values
    for i in range(cm_array.shape[0]):
        for j in range(cm_array.shape[1]):
            plt.text(j, i, cm_array[i, j], ha="center", va="center")

    plt.ylabel("Actual")
    plt.xlabel("Predicted")

    if save_path:
        ensure_dir(os.path.dirname(save_path))
        plt.savefig(save_path)

    plt.close()
    
    

# ROC Curve Plot


def plot_roc_curve(y_true, y_prob, title="ROC Curve", save_path=None):
    y_true = np.array(y_true)
    y_prob = np.array(y_prob)

    # Sort by descending probability
    sorted_indices = np.argsort(-y_prob)
    y_true = y_true[sorted_indices]
    y_prob = y_prob[sorted_indices]

    # Total positives and negatives
    P = np.sum(y_true == 1)
    N = np.sum(y_true == 0)

    tpr_list = [0.0]
    fpr_list = [0.0]

    tp = 0
    fp = 0

    # Walk through sorted predictions
    for i in range(len(y_true)):
        if y_true[i] == 1:
            tp += 1
        else:
            fp += 1

        tpr = tp / P if P > 0 else 0
        fpr = fp / N if N > 0 else 0

        tpr_list.append(tpr)
        fpr_list.append(fpr)

    # Ensure curve ends at (1,1)
    tpr_list.append(1.0)
    fpr_list.append(1.0)

    # AUC
    auc = roc_auc_score_binary(y_true, y_prob)

    # Plot
    plt.figure()
    plt.plot(fpr_list, tpr_list, label=f"ROC Curve (AUC = {auc:.3f})")
    plt.plot([0, 1], [0, 1], linestyle="--", label="Random Classifier")

    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title(title)
    plt.legend(loc="lower right")

    if save_path:
        ensure_dir(os.path.dirname(save_path))
        plt.savefig(save_path)

    plt.close()


# Combined Helper

def generate_evaluation_plots(results: dict, y_true: Sequence[int],
    y_prob: Optional[Sequence[float]], model_name: str, dataset_name: str,
):
    """
    Generate and save all plots for a model evaluation.
    """

    base_dir = evaluation_root /  "outputs" / "plots" / f"{model_name}_{dataset_name}"

    timestamp = get_timestamp()

    # Confusion Matrix
    cm = results.get("confusion_matrix")
    if cm:
        cm_path = os.path.join(base_dir, f"confusion_matrix_{timestamp}.png")
        plot_confusion_matrix(cm, save_path=cm_path)

    # ROC Curve
    if y_prob is not None:
        roc_path = os.path.join(base_dir, f"roc_curve_{timestamp}.png")
        plot_roc_curve(y_true, y_prob, save_path=roc_path)