"""
AI012 – Anomaly Detection Model | Project Phoenix
Role C – Anomaly Definition and Label Builder

Author  : Role C (Preetham Chandu)
Dataset : anomaly_detection_hourly_2020_2024.csv  (built by Sunain in Role A)

What this script does
---------------------
This script reads the Role A dataset (the merged FIRMS fire + URLhaus cyber
dataset created by the team lead) and produces TWO outputs as DataFrames:

  1. features_df  – a selected and prepared set of numeric features suitable
                    for anomaly detection (used by Role D for Isolation Forest)

  2. labels_df    – rule-based anomaly labels for every record in the dataset
                    (used by Role F for evaluation only, NOT for model training)

These two outputs are returned separately so they can be combined or used
independently by downstream roles (D, E, F) as needed.

No CSV is saved automatically. The caller decides what to do with the output.

Pipeline flow (as required by AI008 and AI012 spec)
----------------------------------------------------
load_data -> engineer_features -> detect_anomalies -> save_outputs

Anomaly definitions (what counts as anomalous in PHOENIX)
----------------------------------------------------------
Rule 1 – extreme_fire_intensity
    fires_avg_frp is in the top 1% of all readings.
    Reason: extreme fire radiative power is a rare, high-risk event.

Rule 2 – high_confidence_extreme_fire
    firms_avg_frp is in the top 5% AND firms_avg_confidence is also high.
    Reason: when the satellite is confident and the fire is intense, it is
    genuinely dangerous, not a noisy reading.

Rule 3 – cyber_spike_low_hazard
    urlhaus_event_count is active but firms_avg_frp is below its median,
    AND the ratio of cyber to hazard exceeds 0.5.
    Reason: disproportionate cyber activity during a mild disaster is a
    classic opportunistic attack pattern.

Rule 4 – hazard_cyber_mismatch
    firms_avg_frp is in the top 5% but urlhaus_event_count is zero.
    Reason: extreme fire with zero cyber activity is statistically rare
    and may indicate suppressed reporting or infrastructure damage.

Rule 5 – active_online_threats
    urlhaus_online_count is above its 99th percentile.
    Reason: live active malicious URLs indicate real ongoing threat
    infrastructure, not just historical records.

Rule 6 – rare_region_active
    region_id appears in the bottom 10% of all regions by frequency, but
    firms_event_count is greater than zero.
    Reason: a region that almost never appears suddenly showing fire
    activity is inherently unusual.

Rule 7 – cyber_volume_spike
    urlhaus_unique_url_count is above its 99th percentile.
    Reason: an unusually large number of unique malicious URLs in a single
    time window indicates a coordinated attack event.

Why these rules and not more?
    These 7 rules cover the anomaly types explicitly listed in the AI012 task
    guide: cyber spikes, hazard-cyber mismatches, rare region events, and
    suspicious outlier combinations. Adding more rules risks over-labelling
    normal events. The resulting ~7-8% anomaly rate is intentionally within
    the 1-10% contamination range that Role D will test for Isolation Forest.

How this connects to AI008 Training Pipeline
    The run() function at the bottom is the entry point the pipeline calls.
    It follows the exact interface: load -> feature engineering -> labeling.
    Role D passes the features_df into Isolation Forest for training.
    Role F uses labels_df to evaluate model performance after training.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Thresholds – computed from the actual dataset (do not change arbitrarily)
# ---------------------------------------------------------------------------
FRP_P99            = 41.61   # firms_avg_frp 99th percentile  (extreme fire)
FRP_P95            = 21.45   # firms_avg_frp 95th percentile  (strong fire)
CONFIDENCE_P95     = 64.61   # firms_avg_confidence 95th percentile
ONLINE_P99         = 1.0     # urlhaus_online_count 99th percentile
UNIQUE_URL_P99     = 1.0     # urlhaus_unique_url_count 99th percentile
CYBER_HAZARD_RATIO = 0.5     # suspicious cyber-to-hazard ratio
REGION_RARITY_PCT  = 0.10    # bottom 10% regions by appearance count = rare

# Features selected for anomaly detection model (Role D input)
# These are the numeric columns from the dataset most relevant to
# detecting unusual hazard + cyber behaviour
ANOMALY_FEATURES = [
    "firms_event_count",
    "firms_avg_frp",
    "firms_avg_brightness",
    "firms_avg_confidence",
    "firms_avg_bright_t31",
    "firms_avg_bright_ti4",
    "urlhaus_event_count",
    "urlhaus_unique_url_count",
    "urlhaus_online_count",
    "urlhaus_offline_count",
    "urlhaus_dateadded_hour_count",
]


# ---------------------------------------------------------------------------
# Step 1 – Load data
# ---------------------------------------------------------------------------

def load_data(dataset_path: str) -> pd.DataFrame:
    """
    Load the Role A dataset (anomaly_detection_hourly_2020_2024.csv).
    This is the merged FIRMS + URLhaus dataset built by the team lead.
    """
    path = Path(dataset_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {path}\n"
            "Expected: anomaly_detection_hourly_2020_2024.csv (Role A dataset)"
        )
    print(f"[label_builder] Loading dataset: {path.name}")
    df = pd.read_csv(path, low_memory=False)
    print(f"[label_builder] Loaded {len(df):,} rows, {df.shape[1]} columns")
    return df


# ---------------------------------------------------------------------------
# Step 2 – Engineer features for anomaly detection
# ---------------------------------------------------------------------------

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Select and prepare numeric features from the dataset for anomaly detection.

    This produces the features_df that Role D will pass into Isolation Forest.
    Features are selected based on the AI012 task guide guidance:
      - cyber incident intensity features
      - temporal and geo density features
      - combined hazard + cyber signals

    Note: if AI004 feature engineering output (Sneha's file) is available,
    it will be merged in by the run() function before this step, and any
    additional engineered columns will automatically be included here.

    Returns a DataFrame with only numeric, model-ready features.
    """
    available = [col for col in ANOMALY_FEATURES if col in df.columns]
    features_df = df[available].copy()

    # Fill missing values with 0 (most NaN here = no event occurred)
    features_df = features_df.fillna(0)

    # Add a derived feature: ratio of cyber events to fire events
    # Captures disproportionate cyber activity relative to disaster intensity
    safe_firms = features_df["firms_event_count"].replace(0, np.nan)
    features_df["cyber_to_hazard_ratio"] = (
        features_df["urlhaus_event_count"] / safe_firms
    ).fillna(0).round(6)

    # Add total cyber signal (online + unique URLs)
    features_df["total_cyber_signal"] = (
        features_df["urlhaus_online_count"] +
        features_df["urlhaus_unique_url_count"]
    )

    print(f"[label_builder] Feature set prepared: {features_df.shape[1]} features, "
          f"{len(features_df):,} records")
    return features_df


# ---------------------------------------------------------------------------
# Step 3 – Define and apply anomaly rules
# ---------------------------------------------------------------------------

def _region_rarity(df: pd.DataFrame) -> pd.Series:
    """Return True for regions in the bottom 10% by appearance frequency."""
    if "region_id" not in df.columns:
        return pd.Series(False, index=df.index)
    counts = df["region_id"].value_counts()
    threshold = counts.quantile(REGION_RARITY_PCT)
    rare_regions = counts[counts <= threshold].index
    return df["region_id"].isin(rare_regions)


def _apply_rules(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply all 7 anomaly rules to the dataset.
    Returns a DataFrame of boolean columns, one per rule.
    """
    rules = pd.DataFrame(index=df.index)

    # Rule 1 – extreme fire intensity (top 1% FRP)
    rules["extreme_fire_intensity"] = (
        df["firms_avg_frp"].fillna(0) >= FRP_P99
    )

    # Rule 2 – high confidence extreme fire (top 5% FRP + high satellite confidence)
    rules["high_confidence_extreme_fire"] = (
        (df["firms_avg_frp"].fillna(0) >= FRP_P95) &
        (df["firms_avg_confidence"].fillna(0) >= CONFIDENCE_P95)
    )

    # Rule 3 – cyber spike during low hazard
    cyber   = df["urlhaus_event_count"].fillna(0)
    hazard  = df["firms_avg_frp"].fillna(0)
    safe_h  = hazard.replace(0, np.nan)
    ratio   = (cyber / safe_h).fillna(0)
    frp_median = hazard.median()
    rules["cyber_spike_low_hazard"] = (
        (cyber > 0) &
        (hazard < frp_median) &
        (ratio > CYBER_HAZARD_RATIO)
    )

    # Rule 4 – extreme hazard with zero cyber activity
    rules["hazard_cyber_mismatch"] = (
        (hazard >= FRP_P95) &
        (cyber == 0)
    )

    # Rule 5 – active online threats above 99th percentile
    rules["active_online_threats"] = (
        df["urlhaus_online_count"].fillna(0) >= ONLINE_P99
    )

    # Rule 6 – rare region suddenly active
    is_rare   = _region_rarity(df)
    is_active = df["firms_event_count"].fillna(0) > 0
    rules["rare_region_active"] = is_rare & is_active

    # Rule 7 – high volume of unique malicious URLs (coordinated attack signal)
    rules["cyber_volume_spike"] = (
        df["urlhaus_unique_url_count"].fillna(0) >= UNIQUE_URL_P99
    )

    return rules


def build_labels(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply anomaly rules to every record in the dataset and return labels_df.

    The output includes:
      - time_window, region_id   : identifiers for joining back to source data
      - anomaly_flag             : 1 if any rule fired, 0 otherwise
      - anomaly_score            : proportion of rules that fired (0.0 to 1.0)
      - anomaly_reason           : pipe-separated list of rules that fired

    These labels are for Role F evaluation only. They tell us what we expect
    to be anomalous so we can measure how well the Isolation Forest found them.
    """
    rules = _apply_rules(df)
    n_rules = len(rules.columns)

    # Print per-rule counts
    print("[label_builder] Rule results:")
    for col in rules.columns:
        print(f"[label_builder]   {col:<40} {int(rules[col].sum()):>7,} rows flagged")

    # Combine
    anomaly_flag  = rules.any(axis=1).astype(int)
    anomaly_score = (rules.sum(axis=1) / n_rules).round(4)

    def _reasons(row):
        triggered = [col for col in rules.columns if row[col]]
        return " | ".join(triggered) if triggered else "none"

    anomaly_reason = rules.apply(_reasons, axis=1)

    labels_df = pd.DataFrame({
        "time_window"   : df["time_window"].values   if "time_window" in df.columns else None,
        "region_id"     : df["region_id"].values     if "region_id"   in df.columns else None,
        "anomaly_flag"  : anomaly_flag.values,
        "anomaly_score" : anomaly_score.values,
        "anomaly_reason": anomaly_reason.values,
    })

    total   = len(labels_df)
    flagged = int(labels_df["anomaly_flag"].sum())
    print(f"\n[label_builder] Label summary:")
    print(f"  Total rows : {total:,}")
    print(f"  Anomalies  : {flagged:,}  ({flagged/total*100:.2f}%)")
    print(f"  Normal     : {total - flagged:,}")

    return labels_df


# ---------------------------------------------------------------------------
# Step 4 – Save outputs (optional, called by the user or pipeline)
# ---------------------------------------------------------------------------

def save_outputs(
    features_df: pd.DataFrame,
    labels_df: pd.DataFrame,
    output_dir: str = "data/processed",
) -> None:
    """
    Optionally save features and labels to CSV.

    The pipeline does NOT call this automatically.
    It is provided so contributors and Role F can persist results when needed.

    Args:
        features_df : output of engineer_features()
        labels_df   : output of build_labels()
        output_dir  : folder to save into (created if it doesn't exist)
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    features_path = out / "anomaly_features_v1.csv"
    labels_path   = out / "anomaly_labels_v1.csv"

    features_df.to_csv(features_path, index=False)
    labels_df.to_csv(labels_path, index=False)

    print(f"[label_builder] Saved features → {features_path}")
    print(f"[label_builder] Saved labels   → {labels_path}")


# ---------------------------------------------------------------------------
# Main pipeline function – called by AI008 run.py
# ---------------------------------------------------------------------------

def run(
    dataset_path: Optional[str] = None,
    features_path: Optional[str] = None,   # optional Role B feature file
    save: bool = False,
    output_dir: str = "data/processed",
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Full Role C pipeline. Entry point for AI008 training pipeline.

    Flow: load_data -> engineer_features -> detect_anomalies -> (optional) save_outputs

    Args:
        dataset_path  : path to anomaly_detection_hourly_2020_2024.csv (Role A).
                        Resolved automatically from repo structure if not given.
        features_path : optional path to ai004_features_output.csv (Role B / Sneha).
                        If provided, engineered features are merged in before labeling.
        save          : if True, writes CSVs to output_dir.
        output_dir    : where to save CSVs if save=True.

    Returns:
        (features_df, labels_df) – two separate DataFrames.
        Role D uses features_df for Isolation Forest training.
        Role F uses labels_df for evaluation after training.
    """
    # Resolve default dataset path from repo structure
    if dataset_path is None:
        script_dir   = Path(__file__).resolve().parent
        repo_root    = script_dir.parents[3]      # Phoenix/
        dataset_path = str(
            repo_root / "ai-ml" / "datasets" /
            "anomaly_detection_hourly_2020_2024.csv"
        )

    # Step 1 – Load Role A dataset
    df = load_data(dataset_path)

    # Step 2 – Optionally merge Role B engineered features (Sneha's output)
    if features_path is not None:
        fp = Path(features_path)
        if fp.exists():
            print(f"[label_builder] Merging Role B features: {fp.name}")
            df_b     = pd.read_csv(fp, low_memory=False)
            new_cols = [c for c in df_b.columns if c not in df.columns]
            df       = pd.concat(
                [df.reset_index(drop=True), df_b[new_cols].reset_index(drop=True)],
                axis=1
            )
            print(f"[label_builder] After merge: {df.shape[1]} total columns")
        else:
            print(f"[label_builder] Role B file not found ({fp.name}), skipping merge.")

    # Step 3 – Engineer features for anomaly model
    features_df = engineer_features(df)

    # Step 4 – Build anomaly labels
    labels_df = build_labels(df)

    # Step 5 – Optionally save
    if save:
        save_outputs(features_df, labels_df, output_dir)

    return features_df, labels_df


# ---------------------------------------------------------------------------
# Direct execution
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    # Resolve dataset path
    script_dir   = Path(__file__).resolve().parent
    repo_root    = script_dir.parents[3]
    default_data = str(
        repo_root / "ai-ml" / "datasets" /
        "anomaly_detection_hourly_2020_2024.csv"
    )

    dataset  = sys.argv[1] if len(sys.argv) > 1 else default_data
    save_out = "--save" in sys.argv

    features_df, labels_df = run(
        dataset_path=dataset,
        save=save_out,
        output_dir=str(script_dir.parents[1] / "data" / "processed"),
    )

    print("\n[label_builder] features_df shape:", features_df.shape)
    print("[label_builder] labels_df shape  :", labels_df.shape)
    print("\nFeatures preview:")
    print(features_df.head(3).to_string())
    print("\nLabels preview (anomalies only):")
    print(labels_df[labels_df["anomaly_flag"] == 1].head(5).to_string())
