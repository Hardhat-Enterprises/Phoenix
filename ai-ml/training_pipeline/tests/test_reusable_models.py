from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier

from src import TrainingPipeline
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


def test_training_config_supports_custom_model_instance() -> None:
    model = ExtraTreesClassifier(n_estimators=5, max_depth=2, random_state=42)

    training_config = TrainingConfig.from_custom_model(
        model=model,
        config={"training": {"epochs": 1, "batch_size": 4, "learning_rate": 0.001}},
        model_name="extra_trees_custom",
        verbose=False,
    )

    assert training_config.model_type == "sklearn"
    assert training_config.model_name == "extra_trees_custom"
    assert training_config.custom_model is model


def test_pipeline_supports_direct_ensemble_model(tmp_path) -> None:
    dataset_path = tmp_path / "dataset.csv"
    pd.DataFrame(
        {
            "temperature": [20, 22, 24, 26, 28, 30, 32, 34, 36, 38] * 2,
            "humidity": [70, 68, 66, 64, 62, 60, 58, 56, 54, 52] * 2,
            "label": [0, 0, 0, 0, 0, 1, 1, 1, 1, 1] * 2,
        }
    ).to_csv(dataset_path, index=False)

    ensemble = VotingClassifier(
        estimators=[
            ("lr", LogisticRegression(max_iter=100)),
            ("dt", DecisionTreeClassifier(max_depth=3, random_state=42)),
        ],
        voting="soft",
    )

    pipeline = TrainingPipeline(config_path="configs/default_config.yaml")
    pipeline.set_dataset(
        path=dataset_path,
        target_column="label",
        abnormal_path="",
        train_split=0.6,
        val_split=0.2,
        test_split=0.2,
    )
    pipeline.set_training(epochs=1, batch_size=4, learning_rate=0.001, verbose=False)
    pipeline.set_output(
        path=tmp_path / "checkpoints",
        log_path=tmp_path / "logs",
        reports_path=tmp_path / "reports",
        checkpoint_prefix="ensemble",
    )
    pipeline.set_model_instance(
        ensemble,
        model_name="voting_classifier",
        task_type="classification",
    )

    result = pipeline.run(run_id="ensemble_test", save_checkpoint=False)

    assert result["model"]["model_type"] == "sklearn"
    assert result["model"]["model_name"] == "voting_classifier"
    assert "validation" in result["metrics"]
