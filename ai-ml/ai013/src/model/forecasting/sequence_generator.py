import numpy as np
import pandas as pd


def create_sequences(df: pd.DataFrame, target_col: str = 'severity_score',
                     sequence_length: int = 5) -> tuple:
    """
    Convert time-series dataframe into sequences for model input.

    Args:
        df: prepared dataframe from dataset_builder
        target_col: column to predict
        sequence_length: number of past steps to use as input

    Returns:
        X: input sequences (samples, sequence_length, features)
        y: target values (samples,)
    """
    feature_cols = ['severity_score', 'risk_level_encoded', 'hour', 'day_of_week', 'month']
    data = df[feature_cols].values
    target = df[target_col].values

    X, y = [], []
    for i in range(len(data) - sequence_length):
        X.append(data[i:i + sequence_length])
        y.append(target[i + sequence_length])

    return np.array(X), np.array(y)


def train_test_split_sequences(X: np.ndarray, y: np.ndarray,
                                test_ratio: float = 0.2) -> tuple:
    """Split sequences into train and test sets (no shuffle — preserves time order)."""
    split = int(len(X) * (1 - test_ratio))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    print(f"Train: {len(X_train)} sequences | Test: {len(X_test)} sequences")
    return X_train, X_test, y_train, y_test


if __name__ == "__main__":
    from dataset_builder import build_dataset
    from pathlib import Path

    data_path = Path(__file__).resolve().parents[5] / "cleaning" / "data" / "output" / "cleaned_data.csv"
    df = build_dataset(str(data_path))
    X, y = create_sequences(df)
    print(f"X shape: {X.shape}, y shape: {y.shape}")
    X_train, X_test, y_train, y_test = train_test_split_sequences(X, y)
