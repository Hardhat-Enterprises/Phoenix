from __future__ import annotations

from typing import Tuple

import numpy as np
import pandas as pd


def create_sequences(
    df: pd.DataFrame,
    feature_columns: list[str],
    target_column: str,
    window_size: int = 10,
    prediction_horizon: int = 1,
) -> Tuple[np.ndarray, np.ndarray]:


    if window_size <= 0:
        raise ValueError("window_size must be greater than 0.")

    if prediction_horizon <= 0:
        raise ValueError("prediction_horizon must be greater than 0.")

    missing_features = [col for col in feature_columns if col not in df.columns]
    if missing_features:
        raise ValueError(f"Missing feature columns: {missing_features}")

    if target_column not in df.columns:
        raise ValueError(f"Missing target column: {target_column}")

    features = df[feature_columns].to_numpy(dtype=np.float32)
    target = df[target_column].to_numpy(dtype=np.float32)

    X_sequences = []
    y_sequences = []

    max_start = len(df) - window_size - prediction_horizon + 1

    if max_start <= 0:
        raise ValueError(
            "Not enough rows to create sequences. "
            f"Rows={len(df)}, window_size={window_size}, "
            f"prediction_horizon={prediction_horizon}"
        )

    for start_idx in range(max_start):
        end_idx = start_idx + window_size
        target_idx = end_idx + prediction_horizon - 1

        X_window = features[start_idx:end_idx]
        y_value = target[target_idx]

        X_sequences.append(X_window)
        y_sequences.append(y_value)

    return np.array(X_sequences, dtype=np.float32), np.array(y_sequences, dtype=np.float32)


def split_sequences(
    X: np.ndarray,
    y: np.ndarray,
    train_split: float = 0.7,
    val_split: float = 0.15,
    test_split: float = 0.15,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:


    if not np.isclose(train_split + val_split + test_split, 1.0):
        raise ValueError("train_split + val_split + test_split must equal 1.0.")

    total_samples = len(X)

    train_end = int(total_samples * train_split)
    val_end = train_end + int(total_samples * val_split)

    X_train = X[:train_end]
    y_train = y[:train_end]

    X_val = X[train_end:val_end]
    y_val = y[train_end:val_end]

    X_test = X[val_end:]
    y_test = y[val_end:]

    return X_train, y_train, X_val, y_val, X_test, y_test


def generate_train_val_test_sequences(
    df: pd.DataFrame,
    feature_columns: list[str],
    target_column: str,
    window_size: int = 10,
    prediction_horizon: int = 1,
    train_split: float = 0.7,
    val_split: float = 0.15,
    test_split: float = 0.15,
) -> dict[str, np.ndarray]:


    X, y = create_sequences(
        df=df,
        feature_columns=feature_columns,
        target_column=target_column,
        window_size=window_size,
        prediction_horizon=prediction_horizon,
    )

    X_train, y_train, X_val, y_val, X_test, y_test = split_sequences(
        X=X,
        y=y,
        train_split=train_split,
        val_split=val_split,
        test_split=test_split,
    )

    return {
        "X_train": X_train,
        "y_train": y_train,
        "X_val": X_val,
        "y_val": y_val,
        "X_test": X_test,
        "y_test": y_test,
    }