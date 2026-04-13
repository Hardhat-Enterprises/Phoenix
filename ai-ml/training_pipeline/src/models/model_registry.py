from typing import Any, Dict

try:
    import torch
    from torch import nn
except Exception:
    torch = None
    nn = None


# Sklearn Model Load
def load_sklearn_model(model_name: str, model_params: Dict[str, Any]) -> Any:
    from sklearn.ensemble import RandomForestClassifier, IsolationForest
    from sklearn.neural_network import MLPClassifier

    registry = {
        "random_forest": RandomForestClassifier,
        "isolation_forest": IsolationForest,
        "mlp": MLPClassifier,
    }

    if model_name not in registry:
        raise ValueError(f"Unsupported sklearn model: {model_name}")

    return registry[model_name](**model_params)


# PyTorch Model Load
class SimpleMLP(nn.Module if nn is not None else object): # type: ignore
    def __init__(self, input_dim: int, hidden_dim: int = 64, output_dim: int = 2):
        if nn is None:
            raise ImportError("PyTorch is not installed.")
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim)
        )

    def forward(self, x):
        return self.net(x)


def load_pytorch_model(model_name: str, model_params: Dict[str, Any]) -> Any:
    if torch is None:
        raise ImportError("PyTorch is not installed.")

    registry = {
        "simple_mlp": SimpleMLP,
    }

    if model_name not in registry:
        raise ValueError(f"Unsupported pytorch model: {model_name}")

    return registry[model_name](**model_params)
