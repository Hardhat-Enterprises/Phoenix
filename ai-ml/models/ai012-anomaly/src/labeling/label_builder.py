"""
Role C – Anomaly Definition and Label Builder
AI012 – Anomaly Detection Model | Project Phoenix

Author : Role C (Preetham Chandu)
Inputs : 1. Role A dataset  → ai-ml/models/ai012-anomaly/data/processed/anomaly_dataset_v1.csv
                               (anomaly_detection_hourly_2020_2024.csv produced by Sunain)
         2. Role B features → ai-ml/features/ai004_features_output.csv
                               (engineered features produced by Sneha)
Output : data/processed/anomaly_labels_v1.csv

WHY TWO INPUTS?
  Role A (Sunain) built the merged dataset: raw FIRMS satellite fire data joined
  with URLhaus cyber threat data at hourly + regional resolution. It contains
  the ground-level signals: fire radiative power, satellite confidence scores,
  cyber URL counts, threat types, region geometry.

  Role B (Sneha) engineered higher-level features on top of that: rolling means,
  z-scores, spike indicators, geo risk scores, combined risk indices.

  Both are needed:
    - Role A columns give us direct domain signals (confidence, brightness, online URL count)
    - Role B columns give us derived statistical signals (z-scores, rolling spikes, risk indices)
  Together they produce richer, more defensible anomaly labels.

LABEL PURPOSE:
  Labels are for EVALUATION ONLY (Role F).
  They are NEVER passed into the Isolation Forest (Role D) or any unsupervised model.
  The models find anomalies on their own. Role C labels measure how well they did.

ANOMALY RULES (7 total):
  Rule 1 – Extreme fire intensity         : firms_avg_frp in top 1% of all observations
  Rule 2 – High confidence extreme fire   : high satellite confidence + extreme FRP
                                            (distinguishes real fires from noise)
  Rule 3 – Cyber spike vs low hazard      : cyber activity disproportionate to fire size
  Rule 4 – Hazard-cyber mismatch          : intense fire + zero cyber (rare, suspicious)
  Rule 5 – Active online threats          : urlhaus_online_count elevated (live threats)
  Rule 6 – Rare region suddenly active    : region that rarely appears becomes active
  Rule 7 – Engineered risk feature spike  : any Role B risk/spike column hits 95th pct
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional
import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Thresholds – derived from actual dataset statistics (do not change blindly)
# ---------------------------------------------------------------------------
FRP_P99             = 41.61   # firms_avg_frp 99th percentile  → extreme fire
FRP_P95             = 21.45   # firms_avg_frp 95th percentile  → strong fire
CONFIDENCE_HIGH     = 64.61   # firms_avg_confidence 95th pct  → satellite is sure
EVENT_COUNT_P95     = 251.0   # firms_event_count 95th pct     → high fire density
ONLINE_THRESH       = 1.0     # urlhaus_online_count 99th pct  → live URLs active
CYBER_HAZARD_RATIO  = 0.5     # cyber/hazard ratio threshold
RISK_FEATURE_PCT    = 0.95    # percentile for Role B risk columns
REGION_RARITY_PCT   = 0.10    # bottom 10% regions by frequency = rare


# Role B engineered feature column name fragments to look for
RISK_KEYWORDS   = ["risk", "threat", "spike", "intensity", "severity", "zscore",
                   "z_score", "anomaly", "suspicious", "rolling", "surge"]
CYBER_KEYWORDS  = ["cyber", "urlhaus", "url", "malicious"]
HAZARD_KEYWORDS = ["firms", "frp", "fire", "hazard", "brightness", "confidence"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _find_cols(df: pd.DataFrame, keywords: list[str], numeric_only: bool = True) -> list[str]:
    result = []
    for col in df.columns:
        if any(kw in col.lower() for kw in keywords):
            if numeric_only and not pd.api.types.is_numeric_dtype(df[col]):
                continue
            result.append(col)
    return result


def _safe_zscore(s: pd.Series) -> pd.Series:
    std = s.std()
    return (s - s.mean()) / std if std > 0 else pd.Series(0.0, index=s.index)


def _region_rarity_flag(df: pd.DataFrame) -> pd.Series:
    """True for regions whose total appearance count is in the bottom 10%."""
    if "region_id" not in df.columns:
        return pd.Series(False, index=df.index)
    counts = df["region_id"].value_counts()
    thresh = counts.quantile(REGION_RARITY_PCT)
    rare   = counts[counts <= thresh].index
    return df["region_id"].isin(rare)


# ---------------------------------------------------------------------------
# Rule functions  (each returns (bool Series, rule_name))
# ---------------------------------------------------------------------------

def rule_extreme_frp(df: pd.DataFrame):
    """Rule 1 – fire radiative power in top 1%: extreme wildfire intensity."""
    col = "firms_avg_frp"
    if col not in df.columns:
        return pd.Series(False, index=df.index), "extreme_fire_intensity"
    return df[col] >= FRP_P99, "extreme_fire_intensity"


def rule_high_confidence_extreme_fire(df: pd.DataFrame):
    """
    Rule 2 – satellite confidence is high AND FRP is in top 5%.
    This separates genuinely dangerous fires from low-confidence detections.
    Both columns come directly from Role A (firms_avg_confidence, firms_avg_frp).
    """
    frp_col  = "firms_avg_frp"
    conf_col = "firms_avg_confidence"
    if frp_col not in df.columns or conf_col not in df.columns:
        return pd.Series(False, index=df.index), "high_confidence_extreme_fire"
    flag = (df[frp_col] >= FRP_P95) & (df[conf_col] >= CONFIDENCE_HIGH)
    return flag, "high_confidence_extreme_fire"


def rule_cyber_spike_low_hazard(df: pd.DataFrame):
    """
    Rule 3 – cyber activity is disproportionately high relative to fire size.
    Uses urlhaus_event_count (Role A) vs firms_avg_frp (Role A).
    Pattern: opportunistic cyberattack during a small/moderate disaster.
    """
    cyber_col  = "urlhaus_event_count"
    hazard_col = "firms_avg_frp"
    if cyber_col not in df.columns or hazard_col not in df.columns:
        return pd.Series(False, index=df.index), "cyber_spike_low_hazard"
    cyber  = df[cyber_col].fillna(0)
    hazard = df[hazard_col].fillna(0)
    safe_h = hazard.replace(0, np.nan)
    ratio  = (cyber / safe_h).fillna(0)
    flag = (cyber > 0) & (hazard < FRP_P95) & (ratio > CYBER_HAZARD_RATIO)
    return flag, "cyber_spike_low_hazard"


def rule_hazard_cyber_mismatch(df: pd.DataFrame):
    """
    Rule 4 – extreme fire (top 5% FRP) with ZERO cyber activity.
    Statistically rare. Could indicate suppressed reporting or infrastructure damage.
    Both columns from Role A.
    """
    frp_col   = "firms_avg_frp"
    cyber_col = "urlhaus_event_count"
    if frp_col not in df.columns or cyber_col not in df.columns:
        return pd.Series(False, index=df.index), "hazard_cyber_mismatch"
    flag = (df[frp_col] >= FRP_P95) & (df[cyber_col].fillna(0) == 0)
    return flag, "hazard_cyber_mismatch"


def rule_active_online_threats(df: pd.DataFrame):
    """
    Rule 5 – urlhaus_online_count is elevated (URLs are currently live/active).
    This is a direct Role A column that signals live malicious infrastructure,
    not just historical records. Elevated = at or above 99th percentile.
    """
    col = "urlhaus_online_count"
    if col not in df.columns:
        return pd.Series(False, index=df.index), "active_online_threats"
    return df[col].fillna(0) >= ONLINE_THRESH, "active_online_threats"


def rule_rare_region_active(df: pd.DataFrame):
    """
    Rule 6 – a region that appears rarely in the dataset suddenly shows activity.
    Uses region_id (Role A) for rarity and firms_event_count (Role A) for activity.
    """
    if "region_id" not in df.columns or "firms_event_count" not in df.columns:
        return pd.Series(False, index=df.index), "rare_region_active"
    is_rare  = _region_rarity_flag(df)
    is_active = df["firms_event_count"].fillna(0) > 0
    return is_rare & is_active, "rare_region_active"


def rule_engineered_risk_spike(df: pd.DataFrame):
    """
    Rule 7 – any Role B engineered risk/spike/intensity column exceeds its 95th pct.
    This directly uses Sneha's feature engineering output (AI004).
    Examples: cyber_intensity, combined_risk_index, adaptive_risk_index, rolling_cyber_mean.
    Falls back gracefully if Role B features are not present.
    """
    risk_cols = _find_cols(df, RISK_KEYWORDS, numeric_only=True)
    # exclude raw Role A columns so this rule only fires on engineered features
    role_a_raw = [c for c in risk_cols if c.startswith("firms_") or c.startswith("urlhaus_")]
    risk_cols  = [c for c in risk_cols if c not in role_a_raw]

    if not risk_cols:
        return pd.Series(False, index=df.index), "engineered_risk_spike"

    flag = pd.Series(False, index=df.index)
    for col in risk_cols:
        thresh = df[col].quantile(RISK_FEATURE_PCT)
        flag   = flag | (df[col] >= thresh)
    return flag, "engineered_risk_spike"


# ---------------------------------------------------------------------------
# Core labeling function
# ---------------------------------------------------------------------------

def build_anomaly_labels(
    role_a_path: str,
    role_b_path: Optional[str] = None,
    output_path: str = "data/processed/anomaly_labels_v1.csv",
) -> pd.DataFrame:
    """
    Build rule-based anomaly validation labels from Role A + Role B data.

    Args:
        role_a_path : Path to Role A dataset (anomaly_detection_hourly_2020_2024.csv
                      or anomaly_dataset_v1.csv). Required.
        role_b_path : Path to Role B features (ai004_features_output.csv). Optional –
                      if not provided, Rule 7 is skipped gracefully.
        output_path : Where to save anomaly_labels_v1.csv.

    Returns:
        DataFrame with anomaly_flag, anomaly_score, anomaly_reason per row.
    """
    # --- Load Role A (required) ---
    role_a_path = Path(role_a_path)
    if not role_a_path.exists():
        raise FileNotFoundError(f"Role A dataset not found: {role_a_path}")
    print(f"[label_builder] Loading Role A dataset: {role_a_path.name}")
    df_a = pd.read_csv(role_a_path, low_memory=False)
    print(f"[label_builder] Role A: {len(df_a):,} rows, {df_a.shape[1]} columns")

    # --- Load Role B (optional) ---
    df_b = None
    if role_b_path is not None:
        role_b_path = Path(role_b_path)
        if role_b_path.exists():
            print(f"[label_builder] Loading Role B features: {role_b_path.name}")
            df_b = pd.read_csv(role_b_path, low_memory=False)
            print(f"[label_builder] Role B: {len(df_b):,} rows, {df_b.shape[1]} columns")
        else:
            print(f"[label_builder] Role B file not found ({role_b_path.name}), skipping Rule 7.")

    # --- Merge if Role B is available ---
    if df_b is not None:
        # Align on index (both cover same rows in same order from Role A's dataset)
        # Drop any columns that already exist in df_a to avoid duplicates
        new_cols = [c for c in df_b.columns if c not in df_a.columns]
        df = pd.concat([df_a.reset_index(drop=True),
                        df_b[new_cols].reset_index(drop=True)], axis=1)
        print(f"[label_builder] Merged dataset: {df.shape[1]} total columns")
    else:
        df = df_a.copy()

    # --- Apply all 7 rules ---
    all_rules = [
        rule_extreme_frp,
        rule_high_confidence_extreme_fire,
        rule_cyber_spike_low_hazard,
        rule_hazard_cyber_mismatch,
        rule_active_online_threats,
        rule_rare_region_active,
        rule_engineered_risk_spike,
    ]

    rule_results = []
    for rule_fn in all_rules:
        flag, name = rule_fn(df)
        rule_results.append((flag.reset_index(drop=True), name))
        fired = int(flag.sum())
        print(f"[label_builder]   {name:<40} {fired:>7,} rows flagged")

    # --- Combine ---
    n_rules = len(rule_results)
    reasons = [[] for _ in range(len(df))]
    combined = pd.Series(False, index=range(len(df)))

    for flag, name in rule_results:
        combined = combined | flag
        for idx in flag.index[flag]:
            reasons[idx].append(name)

    anomaly_score  = pd.Series([len(r) / n_rules for r in reasons]).round(4)
    anomaly_reason = ["none" if not r else " | ".join(r) for r in reasons]

    # --- Build output ---
    labels = pd.DataFrame({
        "row_id"        : range(len(df)),
        "time_window"   : df["time_window"].values if "time_window" in df.columns else None,
        "region_id"     : df["region_id"].values   if "region_id"   in df.columns else None,
        "anomaly_flag"  : combined.astype(int).values,
        "anomaly_score" : anomaly_score.values,
        "anomaly_reason": anomaly_reason,
    })

    # --- Save ---
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    labels.to_csv(output_path, index=False)

    # --- Summary ---
    total   = len(labels)
    flagged = int(labels["anomaly_flag"].sum())
    print(f"\n=== Label Summary ===")
    print(f"Total rows   : {total:,}")
    print(f"Anomalies    : {flagged:,}  ({flagged/total*100:.2f}%)")
    print(f"Normal       : {total - flagged:,}")
    print(f"Saved to     : {output_path}\n")
    return labels


# ---------------------------------------------------------------------------
# Pipeline integration – called by AI008 run.py
# ---------------------------------------------------------------------------

def run(
    dataset_path: Optional[str] = None,
    output_path: str = "data/processed/anomaly_labels_v1.csv",
) -> pd.DataFrame:
    """
    Entry point used by AI008 Training Pipeline's run.py.
    dataset_path is the Role A dataset injected via anomaly_detection.yaml config.
    Role B path is resolved automatically relative to the repo structure.
    """
    script_dir = Path(__file__).parent
    repo_root  = script_dir.parents[3]          # Phoenix/
    features_dir = repo_root / "ai-ml" / "features"

    if dataset_path is None:
        dataset_path = str(repo_root / "ai-ml" / "models" / "ai012-anomaly"
                           / "data" / "processed" / "anomaly_dataset_v1.csv")

    role_b = str(features_dir / "ai004_features_output.csv")

    return build_anomaly_labels(
        role_a_path=dataset_path,
        role_b_path=role_b,
        output_path=output_path,
    )


# ---------------------------------------------------------------------------
# Direct execution
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    script_dir = Path(__file__).resolve().parent
    repo_root  = script_dir.parents[3]

    # Default paths (resolved relative to this file's location in the repo)
    default_role_a = str(
        repo_root / "ai-ml" / "models" / "ai012-anomaly"
        / "data" / "processed" / "anomaly_dataset_v1.csv"
    )
    default_role_b = str(repo_root / "ai-ml" / "features" / "ai004_features_output.csv")
    default_output = str(
        repo_root / "ai-ml" / "models" / "ai012-anomaly"
        / "data" / "processed" / "anomaly_labels_v1.csv"
    )

    role_a = sys.argv[1] if len(sys.argv) > 1 else default_role_a
    role_b = sys.argv[2] if len(sys.argv) > 2 else default_role_b
    out    = sys.argv[3] if len(sys.argv) > 3 else default_output

    build_anomaly_labels(role_a_path=role_a, role_b_path=role_b, output_path=out)