"""
sequence_generator.py
Converts a flat time series DataFrame into sliding window sequences for LSTM.
"""

import numpy as np
import torch
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import MinMaxScaler


def make_sequences(features: np.ndarray, target: np.ndarray, window: int):
    """
    Sliding window: X = window past rows, y = next value.
    Returns (X_array, y_array).
    """
    X, y = [], []
    for i in range(len(features) - window):
        X.append(features[i : i + window])
        y.append(target[i + window])
    return np.array(X), np.array(y)


def prepare_sequences(df, feature_cols, target_col, window=10, train_split=0.80, batch_size=32):
    """
    Full pipeline: scale → make sequences → split → return tensors + loaders + scalers.

    Returns dict with keys:
        X_train_t, y_train_t, X_test_t, y_test_t,
        train_loader, feat_scaler, target_scaler, split_idx
    """
    feat_scaler   = MinMaxScaler()
    target_scaler = MinMaxScaler()

    X_scaled = feat_scaler.fit_transform(df[feature_cols].values)
    y_scaled = target_scaler.fit_transform(df[[target_col]].values)

    X_seq, y_seq = make_sequences(X_scaled, y_scaled, window)

    split = int(len(X_seq) * train_split)
    X_train, X_test = X_seq[:split], X_seq[split:]
    y_train, y_test = y_seq[:split], y_seq[split:]

    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    y_train_t = torch.tensor(y_train, dtype=torch.float32)
    X_test_t  = torch.tensor(X_test,  dtype=torch.float32)
    y_test_t  = torch.tensor(y_test,  dtype=torch.float32)

    # shuffle=False preserves time order
    train_loader = DataLoader(
        TensorDataset(X_train_t, y_train_t),
        batch_size=batch_size,
        shuffle=False
    )

    print(f"sequences: {len(X_seq)} total | train: {len(X_train)} | test: {len(X_test)}")

    return {
        'X_train_t'     : X_train_t,
        'y_train_t'     : y_train_t,
        'X_test_t'      : X_test_t,
        'y_test_t'      : y_test_t,
        'train_loader'  : train_loader,
        'feat_scaler'   : feat_scaler,
        'target_scaler' : target_scaler,
        'split_idx'     : split,
        'X_scaled'      : X_scaled,
        'y_scaled'      : y_scaled
    }
