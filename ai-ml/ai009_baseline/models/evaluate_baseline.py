import json
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import pandas as pd
import yaml
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
from sklearn.model_selection import train_test_split


def load_config(config_path: str) -> dict:
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def ensure_parent_dirs(paths: list[str]) -> None:
    for path in paths:
        Path(path).parent.mkdir(parents=True, exist_ok=True)


def load_dataset(input_path: str) -> pd.DataFrame:
    return pd.read_csv(input_path)


def split_data(
    df: pd.DataFrame,
    feature_columns: list[str],
    target_column: str,
    seed: int,
    test_size: float,
    val_size: float,
):
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

    return X_train, X_val, X_test, y_train, y_val, y_test


def compute_metrics(y_true, y_pred) -> dict:
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_true, y_pred, zero_division=0)),
        "classification_report": classification_report(
            y_true, y_pred, zero_division=0, output_dict=True
        ),
    }


def save_json(data: dict, output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)


def save_predictions(X: pd.DataFrame, y_true, y_pred, output_path: str) -> None:
    out_df = X.copy()
    out_df["actual_label"] = y_true.values
    out_df["predicted_label"] = y_pred
    out_df.to_csv(output_path, index=False)


def save_confusion_matrix(y_true, y_pred, output_path: str) -> None:
    cm = confusion_matrix(y_true, y_pred)

    fig, ax = plt.subplots(figsize=(5, 4))
    ax.imshow(cm)
    ax.set_title("Confusion Matrix - Test Set")
    ax.set_xlabel("Predicted Label")
    ax.set_ylabel("True Label")
    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center")

    plt.tight_layout()
    plt.savefig(output_path)
    plt.close(fig)


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

    metrics_val_path = config["outputs"]["metrics_val"]
    metrics_test_path = config["outputs"]["metrics_test"]
    predictions_val_path = config["outputs"]["predictions_val"]
    predictions_test_path = config["outputs"]["predictions_test"]
    conf_matrix_test_path = config["outputs"]["conf_matrix_test"]

    ensure_parent_dirs([
        model_path,
        metrics_val_path,
        metrics_test_path,
        predictions_val_path,
        predictions_test_path,
        conf_matrix_test_path,
    ])

    df = load_dataset(input_path)

    X_train, X_val, X_test, y_train, y_val, y_test = split_data(
        df=df,
        feature_columns=feature_columns,
        target_column=target_column,
        seed=seed,
        test_size=test_size,
        val_size=val_size,
    )

    if not Path(model_path).exists():
        raise FileNotFoundError(
            f"Saved model not found at: {model_path}\n"
            "Please make sure P5 training has produced the baseline model first."
        )

    model = joblib.load(model_path)

    y_val_pred = model.predict(X_val)
    y_test_pred = model.predict(X_test)

    val_metrics = compute_metrics(y_val, y_val_pred)
    test_metrics = compute_metrics(y_test, y_test_pred)

    save_json(val_metrics, metrics_val_path)
    save_json(test_metrics, metrics_test_path)

    save_predictions(X_val, y_val, y_val_pred, predictions_val_path)
    save_predictions(X_test, y_test, y_test_pred, predictions_test_path)

    save_confusion_matrix(y_test, y_test_pred, conf_matrix_test_path)

    print("P6 evaluation completed successfully.")
    print(f"Validation metrics saved to: {metrics_val_path}")
    print(f"Test metrics saved to: {metrics_test_path}")
    print(f"Predictions saved to: {predictions_val_path} and {predictions_test_path}")
    print(f"Confusion matrix saved to: {conf_matrix_test_path}")


if __name__ == "__main__":
    main()