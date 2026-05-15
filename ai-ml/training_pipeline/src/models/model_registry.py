from __future__ import annotations

from typing import Any, Dict

try:
    import torch
    from torch import nn
except Exception:
    torch = None
    nn = None


SKLEARN_MODEL_ALIASES = {
    "randomforest": "random_forest",
    "rf": "random_forest",
    "isoforest": "isolation_forest",
    "iforest": "isolation_forest",
    "logreg": "logistic_regression",
    "decisiontree": "decision_tree",
    "gradientboosting": "gradient_boosting",
    "extratrees": "extra_trees",
}

SKLEARN_TASK_TYPE_HINTS = {
    "random_forest": "classification",
    "mlp": "classification",
    "logistic_regression": "classification",
    "decision_tree": "classification",
    "gradient_boosting": "classification",
    "extra_trees": "classification",
    "isolation_forest": "anomaly",
}


def _normalize_model_name(model_name: str) -> str:
    normalized = str(model_name).strip().lower()
    return SKLEARN_MODEL_ALIASES.get(normalized, normalized)


def infer_task_type_from_model(model_name: str, default: str = "classification") -> str:
    normalized = _normalize_model_name(model_name)
    return SKLEARN_TASK_TYPE_HINTS.get(normalized, default)


def list_supported_models(model_type: str = "sklearn") -> list[str]:
    model_type = str(model_type).strip().lower()
    if model_type == "sklearn":
        return sorted(SKLEARN_TASK_TYPE_HINTS.keys())
    if model_type == "pytorch":
        return ["simple_mlp"]
    raise ValueError("model_type must be either 'sklearn' or 'pytorch'")


def load_sklearn_model(model_name: str, model_params: Dict[str, Any]) -> Any:
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

    normalized_name = _normalize_model_name(model_name)
    if normalized_name not in registry:
        supported = ", ".join(sorted(registry.keys()))
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

    normalized_name = str(model_name).strip().lower()
    if normalized_name not in registry:
        supported = ", ".join(sorted(registry.keys()))
        raise ValueError(
            f"Unsupported pytorch model: {model_name!r}. Supported models: {supported}"
        )

    return registry[normalized_name](**model_params)
