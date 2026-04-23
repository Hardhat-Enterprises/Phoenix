from __future__ import annotations
import argparse
import json
from pathlib import Path
from typing import Optional
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate static visualization reports from trainer/eval outputs."
    )

    parser.add_argument(
        "--predictions",
        required=True,
        help="Path to CSV containing prediction outputs.",
    )

    parser.add_argument(
        "--output-dir",
        default="ai-ml/training_pipeline/reports",
        help="Directory where plots will be saved.",
    )

    parser.add_argument(
        "--true-col",
        default="y_true",
        help="Column name for true labels in predictions CSV.",
    )
    parser.add_argument(
        "--pred-col",
        default="y_pred",
        help="Column name for predicted labels in predictions CSV.",
    )
    parser.add_argument(
    "--score-col",
    default="y_score",
        help="Optional column name for predicted probability/score used for ROC, PR, and score distribution.",
    )

    parser.add_argument(
        "--importance-csv",
        default=None,
        help="Optional CSV with feature importance values. Must contain feature and importance columns.",
    )
    parser.add_argument(
        "--importance-feature-col",
        default="feature",
        help="Column name for feature names in importance CSV.",
    )
    parser.add_argument(
        "--importance-value-col",
        default="importance",
        help="Column name for importance values in importance CSV.",
    )
    parser.add_argument(
        "--model-path",
        default=None,
        help="Optional joblib model path. Used for feature importance if importance CSV is not supplied.",
    )
    parser.add_argument(
        "--feature-names-path",
        default=None,
        help="Optional JSON or TXT file containing feature names, used with --model-path.",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=20,
        help="Number of top features to show in feature importance chart.",
    )

    return parser.parse_args()


def ensure_output_dir(path_str: str) -> Path:
    output_dir = Path(path_str).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def load_predictions(
    csv_path: str,
    true_col: str,
    pred_col: str,
    score_col: Optional[str],
) -> tuple[np.ndarray, np.ndarray, Optional[np.ndarray]]:
    df = pd.read_csv(csv_path)

    required = [true_col, pred_col]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required prediction columns: {missing}")

    y_true = df[true_col].to_numpy()
    y_pred = df[pred_col].to_numpy()

    y_score: Optional[np.ndarray] = None
    if score_col is not None:
        if score_col not in df.columns:
            raise ValueError(f"Score column '{score_col}' not found in predictions CSV.")
        y_score = df[score_col].to_numpy()

    return y_true, y_pred, y_score


def save_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    output_dir: Path,
) -> None:
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    disp = ConfusionMatrixDisplay(confusion_matrix=cm)
    disp.plot(ax=ax, colorbar=False)
    ax.set_title("Confusion Matrix")
    fig.tight_layout()
    fig.savefig(output_dir / "confusion_matrix.png", dpi=300, bbox_inches="tight")
    plt.close(fig)


def save_roc_curve(
    y_true: np.ndarray,
    y_score: Optional[np.ndarray],
    output_dir: Path,
) -> Optional[float]:
    if y_score is None:
        return None

    unique_classes = np.unique(y_true)
    if len(unique_classes) != 2:
        return None

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
    fig.savefig(output_dir / "roc_curve.png", dpi=300, bbox_inches="tight")
    plt.close(fig)

    return float(roc_auc)


def save_precision_recall_curve(
    y_true: np.ndarray,
    y_score: Optional[np.ndarray],
    output_dir: Path,
) -> Optional[float]:
    if y_score is None:
        return None

    unique_classes = np.unique(y_true)
    if len(unique_classes) != 2:
        return None

    precision, recall, _ = precision_recall_curve(y_true, y_score)
    pr_auc = auc(recall, precision)

    fig, ax = plt.subplots(figsize=(6, 5))
    ax.plot(recall, precision, label=f"AUC = {pr_auc:.4f}")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("Precision-Recall Curve")
    ax.legend()
    fig.tight_layout()
    fig.savefig(output_dir / "precision_recall_curve.png", dpi=300, bbox_inches="tight")
    plt.close(fig)

    return float(pr_auc)


def save_prediction_distribution(
    y_pred: np.ndarray,
    y_score: Optional[np.ndarray],
    output_dir: Path,
) -> None:
    fig, ax = plt.subplots(figsize=(7, 5))

    if y_score is not None:
        # Histogram
        ax.hist(y_score, bins=20, density=True, alpha=0.5, label="Histogram")

        # Smooth density line (KDE)
        try:
            from scipy.stats import gaussian_kde

            kde = gaussian_kde(y_score)
            x_vals = np.linspace(min(y_score), max(y_score), 200)
            y_vals = kde(x_vals)

            ax.plot(x_vals, y_vals, label="Density Curve")
        except ImportError:
            print("scipy not installed, skipping density curve")

        ax.set_title("Prediction Score Distribution")
        ax.set_xlabel("Predicted Score / Probability")

    else:
        labels, counts = np.unique(y_pred, return_counts=True)
        ax.bar(labels.astype(str), counts)
        ax.set_title("Prediction Distribution")
        ax.set_xlabel("Predicted Class")

    ax.set_ylabel("Density / Frequency")
    ax.legend()
    fig.tight_layout()
    fig.savefig(output_dir / "prediction_distribution.png", dpi=300, bbox_inches="tight")
    plt.close(fig)


def load_feature_names(path_str: str) -> list[str]:
    path = Path(path_str).resolve()

    if path.suffix.lower() == ".json":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, list):
            return [str(x) for x in data]

        if isinstance(data, dict):
            if "feature_names" in data and isinstance(data["feature_names"], list):
                return [str(x) for x in data["feature_names"]]

        raise ValueError("Unsupported JSON feature names format.")

    if path.suffix.lower() in {".txt", ".csv"}:
        with open(path, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f if line.strip()]
        return lines

    raise ValueError("Feature names file must be .json, .txt, or .csv.")


def get_importance_from_csv(
    importance_csv: str,
    feature_col: str,
    value_col: str,
) -> pd.DataFrame:
    df = pd.read_csv(importance_csv)

    missing = [col for col in [feature_col, value_col] if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required importance CSV columns: {missing}")

    result = df[[feature_col, value_col]].copy()
    result.columns = ["feature", "importance"]
    result["importance"] = result["importance"].astype(float)
    result["importance_abs"] = result["importance"].abs()
    return result


def get_importance_from_model(
    model_path: str,
    feature_names_path: str,
) -> pd.DataFrame:
    model = joblib.load(model_path)
    feature_names = load_feature_names(feature_names_path)

    if hasattr(model, "feature_importances_"):
        importance = np.asarray(model.feature_importances_, dtype=float)
    elif hasattr(model, "coef_"):
        coef = np.asarray(model.coef_, dtype=float)
        if coef.ndim == 2:
            importance = np.mean(np.abs(coef), axis=0)
        else:
            importance = np.abs(coef)
    else:
        raise ValueError(
            "Model does not expose feature_importances_ or coef_. "
            "Provide --importance-csv instead."
        )

    if len(feature_names) != len(importance):
        raise ValueError(
            "Number of feature names does not match number of importance values."
        )

    df = pd.DataFrame(
        {
            "feature": feature_names,
            "importance": importance,
            "importance_abs": np.abs(importance),
        }
    )
    return df


def save_feature_importance(
    importance_df: pd.DataFrame,
    output_dir: Path,
    top_n: int,
) -> None:
    if importance_df.empty:
        return

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
    fig.savefig(output_dir / "feature_importance.png", dpi=300, bbox_inches="tight")
    plt.close(fig)


def save_classification_report(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    output_dir: Path,
) -> dict:
    report_dict = classification_report(
        y_true,
        y_pred,
        output_dict=True,
        zero_division=0,
    )

    report_df = pd.DataFrame(report_dict).transpose()
    report_df.to_csv(output_dir / "classification_report.csv", index=True)

    metric_rows = [
        row for row in report_df.index
        if row not in {"accuracy", "macro avg", "weighted avg"}
    ]
    summary_rows = [row for row in ["macro avg", "weighted avg"] if row in report_df.index]
    rows_to_plot = metric_rows + summary_rows

    cols_to_plot = [col for col in ["precision", "recall", "f1-score", "support"] if col in report_df.columns]
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
    fig.savefig(output_dir / "classification_report.png", dpi=300, bbox_inches="tight")
    plt.close(fig)

    return report_dict


def build_summary(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    roc_auc_value: Optional[float],
    pr_auc_value: Optional[float],
    feature_importance_created: bool,
    classification_report_created: bool,
) -> dict:
    accuracy = float((y_true == y_pred).mean())

    return {
        "num_rows": int(len(y_true)),
        "accuracy": accuracy,
        "roc_auc": roc_auc_value,
        "pr_auc": pr_auc_value,
        "feature_importance_created": feature_importance_created,
        "classification_report_created": classification_report_created,
        "classes": [str(x) for x in np.unique(y_true)],
    }


def main() -> None:
    args = parse_args()
    output_dir = ensure_output_dir(args.output_dir)

    y_true, y_pred, y_score = load_predictions(
        csv_path=args.predictions,
        true_col=args.true_col,
        pred_col=args.pred_col,
        score_col=args.score_col,
    )

    save_confusion_matrix(y_true, y_pred, output_dir)
    roc_auc_value = save_roc_curve(y_true, y_score, output_dir)
    pr_auc_value = save_precision_recall_curve(y_true, y_score, output_dir)
    save_prediction_distribution(y_pred, y_score, output_dir)

    classification_report_dict = save_classification_report(y_true, y_pred, output_dir)
    classification_report_created = classification_report_dict is not None

    feature_importance_created = False
    importance_df: Optional[pd.DataFrame] = None

    if args.importance_csv is not None:
        importance_df = get_importance_from_csv(
            importance_csv=args.importance_csv,
            feature_col=args.importance_feature_col,
            value_col=args.importance_value_col,
        )
    elif args.model_path is not None and args.feature_names_path is not None:
        importance_df = get_importance_from_model(
            model_path=args.model_path,
            feature_names_path=args.feature_names_path,
        )

    if importance_df is not None:
        save_feature_importance(
            importance_df=importance_df,
            output_dir=output_dir,
            top_n=args.top_n,
        )
        feature_importance_created = True

    summary = build_summary(
        y_true=y_true,
        y_pred=y_pred,
        roc_auc_value=roc_auc_value,
        pr_auc_value=pr_auc_value,
        feature_importance_created=feature_importance_created,
        classification_report_created=classification_report_created,
    )

    with open(output_dir / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    with open(output_dir / "classification_report.json", "w", encoding="utf-8") as f:
        json.dump(classification_report_dict, f, indent=2)

    print("Visualization report generation complete.")
    print(f"Outputs saved to: {output_dir}")


if __name__ == "__main__":
    main()