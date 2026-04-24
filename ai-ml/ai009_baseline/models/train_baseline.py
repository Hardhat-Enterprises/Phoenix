import joblib
from pathlib import Path

import pandas as pd
import yaml
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split


def load_config(config_path: str) -> dict:
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def ensure_parent_dir(path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)


def main():
    config_path = "ai-ml/ai009_baseline/configs/config.yaml"
    config = load_config(config_path)

    input_path = config["data"]["input_path"]
    target_column = config["data"]["target_column"]
    feature_columns = config["data"]["feature_columns"]

    model_path = config["model"]["save_path"]

    seed = config["training"]["seed"]
    test_size = config["training"]["test_size"]
    val_size = config["training"]["val_size"]

    ensure_parent_dir(model_path)

    df = pd.read_csv(input_path)

    X = df[feature_columns]
    y = df[target_column]

    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=seed,
        stratify=y,
    )

    adjusted_val_size = val_size / (1 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val,
        y_train_val,
        test_size=adjusted_val_size,
        random_state=seed,
        stratify=y_train_val,
    )

    model = LogisticRegression(random_state=seed)
    model.fit(X_train, y_train)

    joblib.dump(model, model_path)

    print("P5 training completed successfully.")
    print(f"Model saved to: {model_path}")
    print(f"Train shape: {X_train.shape}")
    print(f"Validation shape: {X_val.shape}")
    print(f"Test shape: {X_test.shape}")


if __name__ == "__main__":
    main()