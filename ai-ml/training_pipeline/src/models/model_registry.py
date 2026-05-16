from __future__ import annotations

from typing import Any, Dict

try:
    import torch
    from torch import nn
except Exception:
    torch = None
    nn = None


try:
    from models.ai013_forecasting.models.model import LSTMForecaster
except ImportError:
        LSTMForecaster = None


SKLEARN_MODEL_ALIASES = {
    "randomforest": "random_forest",
    "rf": "random_forest",
    "isoforest": "isolation_forest",
    "iforest": "isolation_forest",
    "logreg": "logistic_regression",
    "decisiontree": "decision_tree",
    "gradientboosting": "gradient_boosting",
    "extratrees": "extra_trees",
    "xgb": "xgboost",
    "xgboost": "xgboost",
}

SKLEARN_TASK_TYPE_HINTS = {
    "random_forest": "classification",
    "mlp": "classification",
    "logistic_regression": "classification",
    "decision_tree": "classification",
    "gradient_boosting": "classification",
    "extra_trees": "classification",
    "isolation_forest": "anomaly",
    "xgboost": "classification",
}


PYTORCH_TASK_TYPE_HINTS = {
    "simple_mlp": "classification",
    "pytorch_mlp": "classification",
    "lstm_forecaster": "forecasting",
    "lstm": "forecasting",
}


def _normalize_model_name(model_name: str) -> str:
    normalized = str(model_name).strip().lower()
    return SKLEARN_MODEL_ALIASES.get(normalized, normalized)


def _normalize_pytorch_model_name(model_name: str) -> str:
    normalized = str(model_name).strip().lower()

    aliases = {
        "lstm": "lstm_forecaster",
        "forecasting_lstm": "lstm_forecaster",
        "lstmforecaster": "lstm_forecaster",
    }

    return aliases.get(normalized, normalized)


def infer_task_type_from_model(model_name: str, default: str = "classification") -> str:
    normalized_sklearn = _normalize_model_name(model_name)

    if normalized_sklearn in SKLEARN_TASK_TYPE_HINTS:
        return SKLEARN_TASK_TYPE_HINTS.get(normalized_sklearn, default)

    normalized_pytorch = _normalize_pytorch_model_name(model_name)
    return PYTORCH_TASK_TYPE_HINTS.get(normalized_pytorch, default)


def list_supported_models(model_type: str = "sklearn") -> list[str]:
    model_type = str(model_type).strip().lower()

    if model_type == "sklearn":
        return sorted(SKLEARN_TASK_TYPE_HINTS.keys())

    if model_type == "pytorch":
        supported = ["simple_mlp", "pytorch_mlp"]

        if LSTMForecaster is not None:
            supported.extend(["lstm_forecaster", "lstm"])

        return sorted(supported)

    raise ValueError("model_type must be either 'sklearn' or 'pytorch'")


def load_sklearn_model(model_name: str, model_params: Dict[str, Any]) -> Any:
    normalized_name = _normalize_model_name(model_name)

    from sklearn.ensemble import (
        ExtraTreesClassifier,
        GradientBoostingClassifier,
        IsolationForest,
        RandomForestClassifier,
    )
    from sklearn.linear_model import LogisticRegression
    from sklearn.neural_network import MLPClassifier
    from sklearn.tree import DecisionTreeClassifier

    registry = {
        "random_forest": RandomForestClassifier,
        "isolation_forest": IsolationForest,
        "mlp": MLPClassifier,
        "logistic_regression": LogisticRegression,
        "decision_tree": DecisionTreeClassifier,
        "gradient_boosting": GradientBoostingClassifier,
        "extra_trees": ExtraTreesClassifier,
    }

    if normalized_name == "xgboost":
        try:
            from xgboost import XGBClassifier
        except ImportError as exc:
            raise ImportError(
                "XGBoost requested but package is not installed in phoenix environment"
            ) from exc
        registry["xgboost"] = XGBClassifier

    if normalized_name not in registry:
        supported = ", ".join(sorted([*registry.keys(), "xgboost"]))
        raise ValueError(
            f"Unsupported sklearn model: {model_name!r}. Supported models: {supported}"
        )

    return registry[normalized_name](**model_params)


class SimpleMLP(nn.Module if nn is not None else object):  # type: ignore
    def __init__(self, input_dim: int, hidden_dim: int = 64, output_dim: int = 2):
        if nn is None:
            raise ImportError("PyTorch is not installed.")

        super().__init__()

        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim),
        )

    def forward(self, x):
        return self.net(x)


def load_pytorch_model(model_name: str, model_params: Dict[str, Any]) -> Any:
    if torch is None:
        raise ImportError("PyTorch is not installed.")

    registry = {
        "simple_mlp": SimpleMLP,
        "pytorch_mlp": SimpleMLP,
    }

    if LSTMForecaster is not None:
        registry.update(
            {
                "lstm_forecaster": LSTMForecaster,
                "lstm": LSTMForecaster,
            }
        )

    normalized_name = _normalize_pytorch_model_name(model_name)

    if normalized_name not in registry:
        supported = ", ".join(sorted(registry.keys()))
        raise ValueError(
            f"Unsupported pytorch model: {model_name!r}. Supported models: {supported}"
        )

    return registry[normalized_name](**model_params)