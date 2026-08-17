"""
AI012 – Anomaly Detection Model | Project Phoenix
Role C – Anomaly Label Builder

Author  : Role C (Preetham Chandu)
Dataset : anomaly_detection_hourly_2020_2024.csv  (Role A – built by Sunain)

What this script does
---------------------
Reads the Role A dataset and produces ONE output:

    labels_df – a rule-based anomaly label for every record in the dataset.

Features are handled by Role B (Sneha's feature engineering).
This script is only responsible for defining what counts as anomalous
and stamping each row accordingly.

Labels are for EVALUATION ONLY (Role F).
They are never used for model training — the Isolation Forest (Role D)
is unsupervised and finds anomalies on its own. Role F uses these labels
afterwards to measure how accurately the model detected real anomalies.

Pipeline flow
-------------
load_data -> build_labels -> (optional) save_labels

Output columns
--------------
time_window    : hourly timestamp from the original dataset
region_id      : geographic region identifier
anomaly_flag   : 1 = anomalous, 0 = normal
anomaly_score  : proportion of rules that fired (0.0 to 1.0)
anomaly_reason : pipe-separated list of which rules fired

Anomaly rules (7 total, covering all AI012 task guide anomaly types)
---------------------------------------------------------------------
Rule 1 – extreme_fire_intensity        : FRP in top 1%
Rule 2 – high_confidence_extreme_fire  : FRP top 5% + satellite confidence high
Rule 3 – cyber_spike_low_hazard        : cyber active, hazard mild, ratio suspicious
Rule 4 – hazard_cyber_mismatch         : extreme fire + zero cyber activity
Rule 5 – active_online_threats         : live malicious URLs above 99th pct
Rule 6 – rare_region_active            : rarely-seen region suddenly shows fire
Rule 7 – cyber_volume_spike            : unique malicious URL count above 99th pct
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Thresholds – derived from actual dataset statistics
# ---------------------------------------------------------------------------
FRP_P99            = 41.61
FRP_P95            = 21.45
CONFIDENCE_P95     = 64.61
ONLINE_P99         = 1.0
UNIQUE_URL_P99     = 1.0
CYBER_HAZARD_RATIO = 0.5
REGION_RARITY_PCT  = 0.10


def load_data(dataset_path: str) -> pd.DataFrame:
    """Load the Role A dataset (anomaly_detection_hourly_2020_2024.csv)."""
    path = Path(dataset_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {path}\n"
            "Expected: anomaly_detection_hourly_2020_2024.csv (Role A dataset)"
        )
    print(f"[label_builder] Loading: {path.name}")
    df = pd.read_csv(path, low_memory=False)
    print(f"[label_builder] Loaded {len(df):,} rows, {df.shape[1]} columns")
    return df


def _region_rarity(df: pd.DataFrame) -> pd.Series:
    if "region_id" not in df.columns:
        return pd.Series(False, index=df.index)
    counts = df["region_id"].value_counts()
    threshold = counts.quantile(REGION_RARITY_PCT)
    rare_regions = counts[counts <= threshold].index
    return df["region_id"].isin(rare_regions)


def build_labels(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply all 7 anomaly rules to every record and return labels_df.
    This is the only output Role C produces.
    """
    rules = pd.DataFrame(index=df.index)

    rules["extreme_fire_intensity"] = df["firms_avg_frp"].fillna(0) >= FRP_P99

    rules["high_confidence_extreme_fire"] = (
        (df["firms_avg_frp"].fillna(0) >= FRP_P95) &
        (df["firms_avg_confidence"].fillna(0) >= CONFIDENCE_P95)
    )

    cyber      = df["urlhaus_event_count"].fillna(0)
    hazard     = df["firms_avg_frp"].fillna(0)
    ratio      = (cyber / hazard.replace(0, np.nan)).fillna(0)
    rules["cyber_spike_low_hazard"] = (
        (cyber > 0) & (hazard < hazard.median()) & (ratio > CYBER_HAZARD_RATIO)
    )

    rules["hazard_cyber_mismatch"] = (hazard >= FRP_P95) & (cyber == 0)

    rules["active_online_threats"] = df["urlhaus_online_count"].fillna(0) >= ONLINE_P99

    rules["rare_region_active"] = (
        _region_rarity(df) & (df["firms_event_count"].fillna(0) > 0)
    )

    rules["cyber_volume_spike"] = (
        df["urlhaus_unique_url_count"].fillna(0) >= UNIQUE_URL_P99
    )

    print("[label_builder] Rule breakdown:")
    for col in rules.columns:
        print(f"[label_builder]   {col:<40} {int(rules[col].sum()):>7,} rows")

    n_rules       = len(rules.columns)
    anomaly_flag  = rules.any(axis=1).astype(int)
    anomaly_score = (rules.sum(axis=1) / n_rules).round(4)
    anomaly_reason = rules.apply(
        lambda row: " | ".join([c for c in rules.columns if row[c]]) or "none",
        axis=1
    )

    labels_df = pd.DataFrame({
        "time_window"   : df["time_window"].values   if "time_window" in df.columns else None,
        "region_id"     : df["region_id"].values     if "region_id"   in df.columns else None,
        "anomaly_flag"  : anomaly_flag.values,
        "anomaly_score" : anomaly_score.values,
        "anomaly_reason": anomaly_reason.values,
    })

    total   = len(labels_df)
    flagged = int(labels_df["anomaly_flag"].sum())
    print(f"\n[label_builder] Summary:")
    print(f"  Total rows : {total:,}")
    print(f"  Anomalies  : {flagged:,}  ({flagged / total * 100:.2f}%)")
    print(f"  Normal     : {total - flagged:,}")

    return labels_df


def save_labels(labels_df: pd.DataFrame, output_path: str) -> None:
    """Save labels_df to CSV. Not called automatically — use when needed."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    labels_df.to_csv(out, index=False)
    print(f"[label_builder] Saved → {out}")


def run(
    dataset_path: Optional[str] = None,
    save: bool = False,
    output_path: str = "data/processed/anomaly_labels_v1.csv",
) -> pd.DataFrame:
    """
    Pipeline entry point — called by AI008 run.py.
    Flow: load_data -> build_labels -> (optional) save_labels
    Returns labels_df only.
    """
    if dataset_path is None:
        repo_root    = Path(__file__).resolve().parents[3]
        dataset_path = str(
            repo_root / "ai-ml" / "datasets" /
            "anomaly_detection_hourly_2020_2024.csv"
        )

    df        = load_data(dataset_path)
    labels_df = build_labels(df)

    if save:
        save_labels(labels_df, output_path)

    return labels_df


if __name__ == "__main__":
    import sys

    repo_root    = Path(__file__).resolve().parents[3]
    default_data = str(repo_root / "ai-ml" / "datasets" / "anomaly_detection_hourly_2020_2024.csv")
    default_out  = str(repo_root / "ai-ml" / "models" / "ai012-anomaly" / "data" / "processed" / "anomaly_labels_v1.csv")

    dataset  = sys.argv[1] if len(sys.argv) > 1 else default_data
    out_path = sys.argv[2] if len(sys.argv) > 2 else default_out

    labels_df = run(dataset_path=dataset, save="--save" in sys.argv, output_path=out_path)

    print("\nSample anomalous rows:")
    print(labels_df[labels_df["anomaly_flag"] == 1].head(5).to_string())
