from __future__ import annotations

import numpy as np
import pandas as pd

from src.core.trainer import TrainingConfig
from src.evaluation.validator import validate_predictions


def test_training_config_supports_explicit_sklearn_model() -> None:
    config = {
        "model": {
            "type": "sklearn",
            "name": "logistic_regression",
            "hyperparameters": {"max_iter": 50},
        },
        "training": {"epochs": 1, "batch_size": 4, "learning_rate": 0.001},
    }

    training_config = TrainingConfig.from_pipeline_config(config=config, verbose=False)
    assert training_config.model_type == "sklearn"
    assert training_config.model_name == "logistic_regression"
    assert training_config.task_type == "classification"


def test_anomaly_validator_normalizes_isolation_forest_predictions() -> None:
    y_true = pd.Series([0, 1, 0, 1, 0, 1])
    y_pred = np.array([1, -1, 1, -1, 1, -1])  # 1=normal, -1=anomaly

    result = validate_predictions(y_true, y_pred, task_type="anomaly")

    assert result["accuracy"] == 1.0
    assert result["f1"] == 1.0
    assert result["confusion_matrix"] == [[3, 0], [0, 3]]
