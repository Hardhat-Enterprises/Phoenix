"""
forecasting_scoring.py  — AI013 Forecasting
Scoring wrapper: loads a trained model, runs prediction, and returns evaluation metrics.
"""

import os
import numpy as np
import torch
import pickle

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from evaluation.evaluate import compute_metrics


def score_model(model, X_test: torch.Tensor, y_test_actual: np.ndarray,
                target_scaler, device: str = 'cpu') -> dict:
    """
    Run model inference on test set and return metrics dict.

    Args:
        model         : trained LSTMForecaster
        X_test        : (n, window, features) tensor
        y_test_actual : (n, 1) numpy array in original scale
        target_scaler : fitted MinMaxScaler for inverse transform
        device        : 'cpu' or 'cuda'

    Returns:
        dict with MAE, RMSE, R2, MAPE keys
    """
    model.eval()
    with torch.no_grad():
        pred_scaled = model(X_test.to(device)).cpu().numpy()

    pred_actual = target_scaler.inverse_transform(pred_scaled)
    metrics     = compute_metrics(y_test_actual, pred_actual)
    return metrics, pred_actual


def score_baseline(y_scaled: np.ndarray, split: int, window: int,
                   n_test: int, target_scaler) -> tuple:
    """
    Rolling mean baseline: average of last `window` training values.
    Returns (metrics dict, baseline_actual array).
    """
    baseline_scaled = np.array([
        y_scaled[split + i - window : split + i].mean()
        for i in range(n_test)
    ]).reshape(-1, 1)

    baseline_actual = target_scaler.inverse_transform(baseline_scaled)
    y_test_actual   = target_scaler.inverse_transform(
        y_scaled[split + window : split + window + n_test].reshape(-1, 1)
    )
    metrics = compute_metrics(y_test_actual, baseline_actual)
    return metrics, baseline_actual


def load_checkpoint(checkpoint_path: str) -> dict:
    """
    Load a saved checkpoint dict (saved with pickle).
    Returns dict with keys: model_state, input_size, hidden_size, window, feature_cols, target_col.
    """
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"No checkpoint found at: {checkpoint_path}")
    with open(checkpoint_path, 'rb') as f:
        checkpoint = pickle.load(f)
    return checkpoint


def save_checkpoint(checkpoint: dict, checkpoint_path: str):
    """
    Save model checkpoint dict as pickle.
    """
    os.makedirs(os.path.dirname(checkpoint_path), exist_ok=True)
    with open(checkpoint_path, 'wb') as f:
        pickle.dump(checkpoint, f)
    print(f"checkpoint saved → {checkpoint_path}")
