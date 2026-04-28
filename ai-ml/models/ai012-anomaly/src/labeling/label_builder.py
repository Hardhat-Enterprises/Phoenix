"""
Role C - Anomaly Definition and Label Builder

This module creates validation labels for the AI012 anomaly detection task.

Important:
- These labels are only for validation and evaluation.
- They must not be used for unsupervised anomaly model training.
- The output file is anomaly_labels_v1.csv.
"""

from pathlib import Path
from typing import List

import numpy as np
import pandas as pd


def _find_numeric_columns(df: pd.DataFrame) -> List[str]:
    ignore_cols = {
        "id",
        "event_id",
        "record_id",
        "label",
        "anomaly_label",
        "is_anomaly",
        "anomaly_flag",
    }

    numeric_cols = []

    for col in df.columns:
        if col.lower() not in ignore_cols and pd.api.types.is_numeric_dtype(df[col]):
            numeric_cols.append(col)

    return numeric_cols


def _safe_zscore(series: pd.Series) -> pd.Series:
    std = series.std()

    if std == 0 or pd.isna(std):
        return pd.Series(0, index=series.index)

    return (series - series.mean()) / std


def build_anomaly_labels(
    input_path: str = "data/processed/anomaly_dataset_v1.csv",
    output_path: str = "data/processed/anomaly_labels_v1.csv",
    zscore_threshold: float = 3.0,
) -> pd.DataFrame:

    input_path = Path(input_path)
    output_path = Path(output_path)

    if not input_path.exists():
        raise FileNotFoundError(
            f"Input dataset not found: {input_path}. "
            "Please make sure Role A/B output anomaly_dataset_v1.csv exists."
        )

    df = pd.read_csv(input_path)

    labels = pd.DataFrame()
    labels["row_id"] = df.index
    labels["anomaly_label"] = 0
    labels["anomaly_reason"] = "normal"

    reasons = [[] for _ in range(len(df))]

    # --------------------------
    # Z-SCORE ANOMALIES
    # --------------------------
    numeric_cols = _find_numeric_columns(df)

    for col in numeric_cols:
        zscores = _safe_zscore(df[col])
        mask = zscores.abs() >= zscore_threshold

        labels.loc[mask, "anomaly_label"] = 1

        for idx in df.index[mask]:
            reasons[idx].append(f"high_zscore_{col}")

    # --------------------------
    # KEYWORD BASED ANOMALIES
    # --------------------------
    risk_keywords = [
        "malware",
        "phishing",
        "ransomware",
        "botnet",
        "exploit",
        "trojan",
        "suspicious",
        "blacklist",
        "urlhaus",
        "abuse",
        "threat",
    ]

    text_cols = [col for col in df.columns if df[col].dtype == "object"]

    for col in text_cols:
        # FIX: handle floats, NaNs safely
        lowered = df[col].fillna("").astype(str).str.lower()

        keyword_mask = lowered.apply(
            lambda value: any(keyword in value for keyword in risk_keywords)
        )

        labels.loc[keyword_mask, "anomaly_label"] = 1

        for idx in df.index[keyword_mask]:
            reasons[idx].append(f"risk_keyword_{col}")

    # --------------------------
    # RISK COLUMN ANOMALIES
    # --------------------------
    risk_like_cols = [
        col
        for col in df.columns
        if any(word in col.lower() for word in ["risk", "threat", "suspicious", "malicious", "abuse"])
        and pd.api.types.is_numeric_dtype(df[col])
    ]

    for col in risk_like_cols:
        threshold = df[col].quantile(0.95)
        mask = df[col] >= threshold

        labels.loc[mask, "anomaly_label"] = 1

        for idx in df.index[mask]:
            reasons[idx].append(f"high_risk_value_{col}")

    # --------------------------
    # FINAL REASON COLUMN
    # --------------------------
    labels["anomaly_reason"] = [
        ";".join(reason_list) if reason_list else "normal"
        for reason_list in reasons
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    labels.to_csv(output_path, index=False)

    return labels


if __name__ == "__main__":
    result = build_anomaly_labels()
    print("Anomaly labels created successfully.")
    print(result["anomaly_label"].value_counts())
    print(result.head())
