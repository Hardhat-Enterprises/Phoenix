from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd


def predict_from_sequences(trainer, X) -> np.ndarray:

    return trainer.predict(X)


def build_prediction_comparison(
    y_true,
    y_pred,
    time_values: Optional[list | np.ndarray | pd.Series] = None,
) -> pd.DataFrame:


    y_true = np.asarray(y_true).reshape(-1)
    y_pred = np.asarray(y_pred).reshape(-1)

    if len(y_true) != len(y_pred):
        raise ValueError(
            f"Length mismatch: y_true={len(y_true)}, y_pred={len(y_pred)}"
        )

    comparison_df = pd.DataFrame(
        {
            "actual": y_true,
            "predicted": y_pred,
            "error": y_true - y_pred,
            "absolute_error": np.abs(y_true - y_pred),
        }
    )

    if time_values is not None:
        time_values = np.asarray(time_values)
        comparison_df.insert(0, "timestamp", time_values[-len(comparison_df):])

    return comparison_df


def predict_next_step(trainer, latest_sequence) -> float:


    latest_sequence = np.asarray(latest_sequence, dtype=np.float32)

    if latest_sequence.ndim == 2:
        latest_sequence = np.expand_dims(latest_sequence, axis=0)

    if latest_sequence.ndim != 3:
        raise ValueError(
            "latest_sequence must have shape "
            "(window_size, input_dim) or (1, window_size, input_dim)"
        )

    prediction = np.asarray(trainer.predict(latest_sequence)).reshape(-1)

    return float(prediction[0])


def predict_future_steps(
    trainer,
    latest_sequence,
    periods: int = 3,
    target_feature_index: int = -1,
) -> pd.DataFrame:

    if periods <= 0:
        raise ValueError("periods must be greater than 0.")

    current_sequence = np.asarray(latest_sequence, dtype=np.float32)

    if current_sequence.ndim == 3:
        current_sequence = current_sequence[0]

    if current_sequence.ndim != 2:
        raise ValueError(
            "latest_sequence must have shape "
            "(window_size, input_dim) or (1, window_size, input_dim)"
        )

    predictions = []

    for step in range(1, periods + 1):
        predicted_value = predict_next_step(trainer, current_sequence)

        predictions.append(
            {
                "step": step,
                "predicted": predicted_value,
            }
        )

        # Take the most recent feature row
        next_row = current_sequence[-1].copy()

        # Replace the target feature with the new predicted value
        next_row[target_feature_index] = predicted_value

        # Slide window forward:
        # remove oldest timestep, append predicted timestep
        current_sequence = np.vstack(
            [
                current_sequence[1:],
                next_row,
            ]
        )

    return pd.DataFrame(predictions)