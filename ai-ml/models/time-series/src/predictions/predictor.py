"""
predictor.py  — AI013 Forecasting
Handles loading a trained model and generating test + future predictions.
"""

import os
import numpy as np
import pandas as pd
import torch

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.model import LSTMForecaster
from scoring.forecasting_scoring import load_checkpoint


def load_model(checkpoint_path: str, device: str = 'cpu') -> tuple:
    """
    Load trained model from checkpoint.
    Returns (model, checkpoint_dict).
    """
    ckpt  = load_checkpoint(checkpoint_path)
    model = LSTMForecaster(
        input_size  = ckpt['input_size'],
        hidden_size = ckpt['hidden_size']
    ).to(device)
    model.load_state_dict(ckpt['model_state'])
    model.eval()
    return model, ckpt


def predict_test(model, X_test: torch.Tensor, target_scaler, device: str = 'cpu') -> np.ndarray:
    """
    Run model on test sequences and return predictions in original scale.
    """
    model.eval()
    with torch.no_grad():
        pred_scaled = model(X_test.to(device)).cpu().numpy()
    return target_scaler.inverse_transform(pred_scaled)


def forecast_future(model, seed_window: np.ndarray, steps: int,
                    target_scaler, device: str = 'cpu') -> np.ndarray:
    """
    Multi-step autoregressive forecast.
    Each predicted value feeds back as the first feature of the next window.

    Args:
        seed_window   : (window, n_features) numpy array — last known window
        steps         : number of future steps to predict
        target_scaler : to inverse-transform predictions

    Returns:
        (steps,) numpy array of predictions in original scale
    """
    model.eval()
    preds  = []
    window = seed_window.copy()

    with torch.no_grad():
        for _ in range(steps):
            inp  = torch.tensor(window[np.newaxis], dtype=torch.float32).to(device)
            p    = model(inp).cpu().numpy()[0][0]
            preds.append(p)
            next_row    = window[-1].copy()
            next_row[0] = p                       # feed prediction back as first feature
            window      = np.vstack([window[1:], next_row])

    return target_scaler.inverse_transform(np.array(preds).reshape(-1, 1)).flatten()


def build_future_dataframe(predictions: np.ndarray, last_date: pd.Timestamp,
                           freq: str = 'D') -> pd.DataFrame:
    """
    Wrap future predictions in a DataFrame with dates.
    """
    future_dates = pd.date_range(start=last_date, periods=len(predictions) + 1, freq=freq)[1:]
    return pd.DataFrame({
        'date'            : future_dates,
        'predicted_frp_mw': predictions
    })
