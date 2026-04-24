from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Optional
import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    auc,
    classification_report,
    confusion_matrix,
    precision_recall_curve,
    roc_curve,
)

try:
    from torch.utils.tensorboard import SummaryWriter
except Exception:
    SummaryWriter = None


def ensure_output_dir(path_like: str | Path) -> Path:
    output_dir = Path(path_like).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def _prepare_binary_scores(y_score: Any | None) -> Optional[np.ndarray]:
    if y_score is None:
        return None

    score_array = np.asarray(y_score)

    if score_array.ndim == 1:
        return score_array.astype(float)

    if score_array.ndim == 2:
        if score_array.shape[1] == 2:
            return score_array[:, 1].astype(float)
        if score_array.shape[1] == 1:
            return score_array[:, 0].astype(float)

    return None


def _prepare_feature_importance(
    importance_df: Optional[pd.DataFrame] = None,
    model: Any | None = None,
    feature_names: Optional[list[str]] = None,
    feature_names_path: str | Path | None = None,
) -> Optional[pd.DataFrame]:
    if importance_df is not None:
        df = importance_df.copy()

        if "feature" not in df.columns or "importance" not in df.columns:
            raise ValueError(
                "importance_df must contain 'feature' and 'importance' columns."
            )

        df["importance"] = df["importance"].astype(float)
        df["importance_abs"] = df["importance"].abs()
        return df[["feature", "importance", "importance_abs"]]

    if model is None:
        return None

    resolved_feature_names = feature_names
    if resolved_feature_names is None and feature_names_path is not None:
        resolved_feature_names = load_feature_names(feature_names_path)

    if hasattr(model, "feature_importances_"):
        importance = np.asarray(model.feature_importances_, dtype=float)
    elif hasattr(model, "coef_"):
        coef = np.asarray(model.coef_, dtype=float)
        if coef.ndim == 2:
            importance = np.mean(np.abs(coef), axis=0)
        else:
            importance = np.abs(coef)
    else:
        return None

    if resolved_feature_names is None:
        resolved_feature_names = [f"feature_{i}" for i in range(len(importance))]

    if len(resolved_feature_names) != len(importance):
        raise ValueError(
            "Number of feature names does not match number of importance values."
        )

    return pd.DataFrame(
        {
            "feature": resolved_feature_names,
            "importance": importance,
            "importance_abs": np.abs(importance),
        }
    )


def load_feature_names(path_like: str | Path) -> list[str]:
    path = Path(path_like).resolve()

    if path.suffix.lower() == ".json":
        with open(path, "r", encoding="utf-8") as file_obj:
            data = json.load(file_obj)

        if isinstance(data, list):
            return [str(item) for item in data]

        if isinstance(data, dict):
            if "feature_names" in data and isinstance(data["feature_names"], list):
                return [str(item) for item in data["feature_names"]]

        raise ValueError("Unsupported JSON feature names format.")

    if path.suffix.lower() in {".txt", ".csv"}:
        with open(path, "r", encoding="utf-8") as file_obj:
            return [line.strip() for line in file_obj if line.strip()]

    raise ValueError("Feature names file must be .json, .txt, or .csv.")


def save_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    output_dir: Path,
    writer: SummaryWriter | None = None,
    prefix: str = "test",
) -> str:
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    disp = ConfusionMatrixDisplay(confusion_matrix=cm)
    disp.plot(ax=ax, colorbar=False)
    ax.set_title("Confusion Matrix")
    fig.tight_layout()

    file_path = output_dir / f"{prefix}_confusion_matrix.png"
    fig.savefig(file_path, dpi=300, bbox_inches="tight")

    if writer is not None:
        writer.add_figure(f"{prefix}/confusion_matrix", fig)

    plt.close(fig)
    return str(file_path)


def save_roc_curve(
    y_true: np.ndarray,
    y_score: Optional[np.ndarray],
    output_dir: Path,
    writer: SummaryWriter | None = None,
    prefix: str = "test",
) -> tuple[Optional[float], Optional[str]]:
    if y_score is None:
        return None, None

    unique_classes = np.unique(y_true)
    if len(unique_classes) != 2:
        return None, None

    fpr, tpr, _ = roc_curve(y_true, y_score)
    roc_auc = auc(fpr, tpr)

    fig, ax = plt.subplots(figsize=(6, 5))
    ax.plot(fpr, tpr, label=f"AUC = {roc_auc:.4f}")
    ax.plot([0, 1], [0, 1], linestyle="--")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve")
    ax.legend()
    fig.tight_layout()

    file_path = output_dir / f"{prefix}_roc_curve.png"
    fig.savefig(file_path, dpi=300, bbox_inches="tight")

    if writer is not None:
        writer.add_figure(f"{prefix}/roc_curve", fig)
        writer.add_scalar(f"{prefix}/roc_auc", float(roc_auc))

    plt.close(fig)
    return float(roc_auc), str(file_path)


def save_precision_recall_curve(
    y_true: np.ndarray,
    y_score: Optional[np.ndarray],
    output_dir: Path,
    writer: SummaryWriter | None = None,
    prefix: str = "test",
) -> tuple[Optional[float], Optional[str]]:
    if y_score is None:
        return None, None

    unique_classes = np.unique(y_true)
    if len(unique_classes) != 2:
        return None, None

    precision, recall, _ = precision_recall_curve(y_true, y_score)
    pr_auc = auc(recall, precision)

    fig, ax = plt.subplots(figsize=(6, 5))
    ax.plot(recall, precision, label=f"AUC = {pr_auc:.4f}")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("Precision-Recall Curve")
    ax.legend()
    fig.tight_layout()

    file_path = output_dir / f"{prefix}_precision_recall_curve.png"
    fig.savefig(file_path, dpi=300, bbox_inches="tight")

    if writer is not None:
        writer.add_figure(f"{prefix}/precision_recall_curve", fig)
        writer.add_scalar(f"{prefix}/pr_auc", float(pr_auc))

    plt.close(fig)
    return float(pr_auc), str(file_path)


def save_prediction_distribution(
    y_pred: np.ndarray,
    y_score: Optional[np.ndarray],
    output_dir: Path,
    writer: SummaryWriter | None = None,
    prefix: str = "test",
) -> str:
    fig, ax = plt.subplots(figsize=(7, 5))

    if y_score is not None:
        ax.hist(y_score, bins=20, alpha=0.7)
        ax.set_title("Prediction Score Distribution")
        ax.set_xlabel("Predicted Score / Probability")

        if writer is not None:
            writer.add_histogram(f"{prefix}/prediction_scores", y_score)
    else:
        labels, counts = np.unique(y_pred, return_counts=True)
        ax.bar(labels.astype(str), counts)
        ax.set_title("Prediction Distribution")
        ax.set_xlabel("Predicted Class")

        if writer is not None:
            writer.add_histogram(f"{prefix}/predicted_classes", y_pred)

    ax.set_ylabel("Frequency")
    fig.tight_layout()

    file_path = output_dir / f"{prefix}_prediction_distribution.png"
    fig.savefig(file_path, dpi=300, bbox_inches="tight")

    if writer is not None:
        writer.add_figure(f"{prefix}/prediction_distribution", fig)

    plt.close(fig)
    return str(file_path)


def save_feature_importance(
    importance_df: pd.DataFrame,
    output_dir: Path,
    top_n: int = 20,
    writer: SummaryWriter | None = None,
    prefix: str = "test",
) -> Optional[str]:
    if importance_df.empty:
        return None

    plot_df = (
        importance_df.sort_values("importance_abs", ascending=False)
        .head(top_n)
        .sort_values("importance_abs", ascending=True)
    )

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.barh(plot_df["feature"], plot_df["importance_abs"])
    ax.set_title("Feature Importance")
    ax.set_xlabel("Importance")
    ax.set_ylabel("Feature")
    fig.tight_layout()

    file_path = output_dir / f"{prefix}_feature_importance.png"
    fig.savefig(file_path, dpi=300, bbox_inches="tight")

    if writer is not None:
        writer.add_figure(f"{prefix}/feature_importance", fig)
        writer.add_histogram(
            f"{prefix}/feature_importance_values",
            plot_df["importance_abs"].to_numpy(dtype=float),
        )

    plt.close(fig)
    return str(file_path)


def save_classification_report(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    output_dir: Path,
    writer: SummaryWriter | None = None,
    prefix: str = "test",
) -> tuple[dict[str, Any], str, str]:
    report_dict = classification_report(
        y_true,
        y_pred,
        output_dict=True,
        zero_division=0,
    )

    report_df = pd.DataFrame(report_dict).transpose()

    csv_path = output_dir / f"{prefix}_classification_report.csv"
    json_path = output_dir / f"{prefix}_classification_report.json"
    png_path = output_dir / f"{prefix}_classification_report.png"

    report_df.to_csv(csv_path, index=True)

    with open(json_path, "w", encoding="utf-8") as file_obj:
        json.dump(report_dict, file_obj, indent=2)

    metric_rows = [
        row for row in report_df.index
        if row not in {"accuracy", "macro avg", "weighted avg"}
    ]
    summary_rows = [
        row for row in ["macro avg", "weighted avg"]
        if row in report_df.index
    ]
    rows_to_plot = metric_rows + summary_rows

    cols_to_plot = [
        col for col in ["precision", "recall", "f1-score", "support"]
        if col in report_df.columns
    ]
    plot_df = report_df.loc[rows_to_plot, cols_to_plot].copy()

    fig_height = max(4, 0.6 * len(plot_df) + 1.5)
    fig, ax = plt.subplots(figsize=(8, fig_height))
    ax.axis("off")

    rounded_df = plot_df.copy()
    for col in rounded_df.columns:
        if col != "support":
            rounded_df[col] = rounded_df[col].astype(float).round(3)
        else:
            rounded_df[col] = rounded_df[col].astype(float).round(0).astype(int)

    table = ax.table(
        cellText=rounded_df.values,
        rowLabels=rounded_df.index,
        colLabels=rounded_df.columns,
        loc="center",
        cellLoc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1.1, 1.4)

    ax.set_title("Classification Report", pad=20)
    fig.tight_layout()
    fig.savefig(png_path, dpi=300, bbox_inches="tight")

    if writer is not None:
        writer.add_figure(f"{prefix}/classification_report", fig)

        accuracy_value = report_dict.get("accuracy")
        if accuracy_value is not None:
            writer.add_scalar(f"{prefix}/accuracy", float(accuracy_value))

        for avg_name in ["macro avg", "weighted avg"]:
            avg_metrics = report_dict.get(avg_name, {})
            for metric_name in ["precision", "recall", "f1-score"]:
                metric_value = avg_metrics.get(metric_name)
                if metric_value is not None:
                    writer.add_scalar(
                        f"{prefix}/{avg_name.replace(' ', '_')}_{metric_name}",
                        float(metric_value),
                    )

    plt.close(fig)
    return report_dict, str(csv_path), str(png_path)


def build_summary(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    roc_auc_value: Optional[float],
    pr_auc_value: Optional[float],
    feature_importance_created: bool,
    classification_report_created: bool,
    artifact_paths: dict[str, Any],
    prefix: str,
) -> dict[str, Any]:
    accuracy = float((y_true == y_pred).mean())

    return {
        "split": prefix,
        "num_rows": int(len(y_true)),
        "accuracy": accuracy,
        "roc_auc": roc_auc_value,
        "pr_auc": pr_auc_value,
        "feature_importance_created": feature_importance_created,
        "classification_report_created": classification_report_created,
        "classes": [str(item) for item in np.unique(y_true)],
        "artifacts": artifact_paths,
    }


def generate_visualization_report(
    *,
    y_true: Any,
    y_pred: Any,
    y_score: Any | None = None,
    output_dir: str | Path,
    prefix: str = "test",
    tensorboard_enabled: bool = False,
    tensorboard_log_dir: str | Path | None = None,
    run_id: str | None = None,
    importance_df: Optional[pd.DataFrame] = None,
    model: Any | None = None,
    feature_names: Optional[list[str]] = None,
    feature_names_path: str | Path | None = None,
    top_n: int = 20,
    extra_metrics: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    resolved_output_dir = ensure_output_dir(output_dir)

    y_true_np = np.asarray(y_true)
    y_pred_np = np.asarray(y_pred)
    y_score_np = _prepare_binary_scores(y_score)

    writer = None
    tensorboard_status = "disabled"
    tb_run_dir = None

    if tensorboard_enabled:
        if SummaryWriter is None:
            tensorboard_status = "unavailable"
        else:
            base_tb_dir = Path(tensorboard_log_dir or (resolved_output_dir / "tensorboard"))
            tb_run_dir = (
                (base_tb_dir / run_id / prefix).resolve()
                if run_id
                else (base_tb_dir / prefix).resolve()
            )
            tb_run_dir.mkdir(parents=True, exist_ok=True)
            writer = SummaryWriter(log_dir=str(tb_run_dir))
            tensorboard_status = "enabled"

    artifact_paths: dict[str, Any] = {}

    artifact_paths["confusion_matrix"] = save_confusion_matrix(
        y_true=y_true_np,
        y_pred=y_pred_np,
        output_dir=resolved_output_dir,
        writer=writer,
        prefix=prefix,
    )

    roc_auc_value, roc_path = save_roc_curve(
        y_true=y_true_np,
        y_score=y_score_np,
        output_dir=resolved_output_dir,
        writer=writer,
        prefix=prefix,
    )
    artifact_paths["roc_curve"] = roc_path

    pr_auc_value, pr_path = save_precision_recall_curve(
        y_true=y_true_np,
        y_score=y_score_np,
        output_dir=resolved_output_dir,
        writer=writer,
        prefix=prefix,
    )
    artifact_paths["precision_recall_curve"] = pr_path

    artifact_paths["prediction_distribution"] = save_prediction_distribution(
        y_pred=y_pred_np,
        y_score=y_score_np,
        output_dir=resolved_output_dir,
        writer=writer,
        prefix=prefix,
    )

    report_dict, report_csv_path, report_png_path = save_classification_report(
        y_true=y_true_np,
        y_pred=y_pred_np,
        output_dir=resolved_output_dir,
        writer=writer,
        prefix=prefix,
    )
    artifact_paths["classification_report_csv"] = report_csv_path
    artifact_paths["classification_report_png"] = report_png_path
    artifact_paths["classification_report_json"] = str(
        resolved_output_dir / f"{prefix}_classification_report.json"
    )

    feature_importance_created = False
    resolved_importance_df = _prepare_feature_importance(
        importance_df=importance_df,
        model=model,
        feature_names=feature_names,
        feature_names_path=feature_names_path,
    )

    if resolved_importance_df is not None:
        importance_csv_path = resolved_output_dir / f"{prefix}_feature_importance.csv"
        resolved_importance_df.to_csv(importance_csv_path, index=False)
        artifact_paths["feature_importance_csv"] = str(importance_csv_path)

        feature_plot_path = save_feature_importance(
            importance_df=resolved_importance_df,
            output_dir=resolved_output_dir,
            top_n=top_n,
            writer=writer,
            prefix=prefix,
        )
        artifact_paths["feature_importance_png"] = feature_plot_path
        feature_importance_created = feature_plot_path is not None
    else:
        artifact_paths["feature_importance_csv"] = None
        artifact_paths["feature_importance_png"] = None

    if writer is not None and extra_metrics:
        for metric_name, metric_value in extra_metrics.items():
            if isinstance(metric_value, (int, float, np.integer, np.floating)):
                writer.add_scalar(f"{prefix}/metric_{metric_name}", float(metric_value))

    summary = build_summary(
        y_true=y_true_np,
        y_pred=y_pred_np,
        roc_auc_value=roc_auc_value,
        pr_auc_value=pr_auc_value,
        feature_importance_created=feature_importance_created,
        classification_report_created=report_dict is not None,
        artifact_paths=artifact_paths,
        prefix=prefix,
    )

    if extra_metrics:
        summary["extra_metrics"] = extra_metrics

    summary["tensorboard"] = {
        "enabled": tensorboard_enabled,
        "status": tensorboard_status,
        "log_dir": str(tb_run_dir) if tb_run_dir is not None else None,
    }

    summary_path = resolved_output_dir / f"{prefix}_summary.json"
    with open(summary_path, "w", encoding="utf-8") as file_obj:
        json.dump(summary, file_obj, indent=2)
    artifact_paths["summary_json"] = str(summary_path)

    if writer is not None:
        writer.flush()
        writer.close()

    return summary


def generate_split_visualizations(
    *,
    y_true: Any,
    y_pred: Any,
    y_score: Any | None = None,
    base_output_dir: str | Path,
    split_name: str,
    tensorboard_enabled: bool = False,
    tensorboard_log_dir: str | Path | None = None,
    run_id: str | None = None,
    importance_df: Optional[pd.DataFrame] = None,
    model: Any | None = None,
    feature_names: Optional[list[str]] = None,
    feature_names_path: str | Path | None = None,
    top_n: int = 20,
    extra_metrics: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    split_output_dir = ensure_output_dir(Path(base_output_dir) / split_name)

    return generate_visualization_report(
        y_true=y_true,
        y_pred=y_pred,
        y_score=y_score,
        output_dir=split_output_dir,
        prefix=split_name,
        tensorboard_enabled=tensorboard_enabled,
        tensorboard_log_dir=tensorboard_log_dir,
        run_id=run_id,
        importance_df=importance_df,
        model=model,
        feature_names=feature_names,
        feature_names_path=feature_names_path,
        top_n=top_n,
        extra_metrics=extra_metrics,
    )