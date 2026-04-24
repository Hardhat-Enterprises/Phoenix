import yaml
import pandas as pd
from pathlib import Path
from sklearn.linear_model import LogisticRegression
import joblib

BASELINE_ROOT = Path(__file__).resolve().parents[1]

def load_config(path):
    with open(path, 'r', encoding="utf-8") as f:
        return yaml.safe_load(f)

def _resolve_from_root(root: Path, maybe_relative: str | Path) -> Path:
    p = Path(maybe_relative)
    return p if p.is_absolute() else (root / p)


def load_training_data(
    features_path: str | Path = "outputs/p3_features_X.csv",
    target_path: str | Path = "outputs/p3_target_y.csv",
    *,
    root: Path = BASELINE_ROOT,
):
    """
    P3 helper: load pre-split X/y artifacts.

    Kept separate from P4 so model initialization doesn't depend on data files.
    """
    features_path = _resolve_from_root(root, features_path)
    target_path = _resolve_from_root(root, target_path)
    X = pd.read_csv(features_path)
    y = pd.read_csv(target_path).squeeze()
    return X, y

def setup_model(
    config_path: str | Path = "configs/config.yaml",
    *,
    root: Path = BASELINE_ROOT,
):
    """
    P4: initialize model from config only.

    Returns (model, model_save_path, config).
    """
    config_path = _resolve_from_root(root, config_path)
    config = load_config(config_path)

    model_name = config["model"]["name"]
    model_version = config["model"]["version"]
    model_save_path = _resolve_from_root(root, config["model"]["save_path"])

    if model_name == "baseline_model":
        model = LogisticRegression(random_state=config["training"]["seed"])
    else:
        raise ValueError(f"Unknown model name: {model_name}")

    print(f"Model initialized: {model}")
    print(f"Model version: {model_version}")
    print(f"Model save path: {model_save_path}")
    return model, model_save_path, config