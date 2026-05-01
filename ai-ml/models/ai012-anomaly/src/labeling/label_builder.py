"""
Role C - Anomaly Definition and Label Builder
AI012 - Anomaly Detection Model | Project Phoenix

Author: Role C
Input:  ai-ml/features/ai004_features_output.csv  (engineered features from Role B / Sneha)
Output: data/processed/anomaly_labels_v1.csv

IMPORTANT:
  - Labels are for EVALUATION ONLY. Never pass them into unsupervised model training.
  - The Isolation Forest (Role D) and experimental models (Role E) are unsupervised.
    They find anomalies on their own. Role C labels are used AFTER training by Role F
    to check whether the models found the right things.
  - The AI008 Training Pipeline loads this output via its preprocessing module.
    It reads anomaly_labels_v1.csv as the "validation labels" dataset.

Anomaly Patterns Defined (PHOENIX domain):
  1. Extreme hazard intensity      - fire radiative power (FRP) is statistically extreme
  2. Extreme cyber activity        - cyber/URL event count is statistically extreme
  3. Cyber spike in low hazard     - disproportionate cyber activity during mild disaster
  4. Hazard-cyber mismatch         - strong hazard with zero cyber activity (rare pair)
  5. High-risk feature threshold   - any engineered risk/threat column exceeds 95th pct
  6. High z-score on key features  - statistical outlier on core numeric features
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Constants — calibrated from the actual dataset (do not change arbitrarily)
# ---------------------------------------------------------------------------

ZSCORE_THRESHOLD = 3.0          # standard deviations to flag as outlier
RISK_FEATURE_PERCENTILE = 0.95  # percentile threshold for risk-named features

# Key numeric features to run z-score checks on.
# If ai004_features_output.csv contains these, they are used directly.
# If not present, we fall back to the raw equivalents from the merged dataset.
KEY_FEATURE_COLUMNS = [
    # Engineered feature names (from AI004 / Sneha's feature_selector.py)
    "cyber_intensity",
    "hazard_severity",
    "temporal_spike",
    "geo_density",
    "cyber_zscore",
    "hazard_zscore",
    "rolling_cyber_mean",
    "lag_cyber",
    "combined_risk_index",
    "geo_risk_zone_score",
    "adaptive_risk_index",
    # Raw fallbacks (used when AI004 output is the raw merged CSV)
    "firms_avg_frp",
    "urlhaus_event_count",
    "firms_event_count",
]

# Feature name fragments that indicate a risk/threat column
RISK_COLUMN_KEYWORDS = ["risk", "threat", "suspicious", "malicious", "abuse", "severity", "intensity"]

# Feature name fragments to detect cyber activity
CYBER_COLUMN_KEYWORDS = ["cyber", "urlhaus", "url"]

# Feature name fragments to detect hazard activity
HAZARD_COLUMN_KEYWORDS = ["firms", "frp", "hazard", "fire", "brightness"]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _find_columns(df: pd.DataFrame, keywords: List[str], numeric_only: bool = True) -> List[str]:
    """Return columns whose names contain any of the given keywords."""
    result = []
    for col in df.columns:
        col_lower = col.lower()
        if any(kw in col_lower for kw in keywords):
            if numeric_only and not pd.api.types.is_numeric_dtype(df[col]):
                continue
            result.append(col)
    return result


def _safe_zscore(series: pd.Series) -> pd.Series:
    """Z-score normalise a series; return zeros if std is 0 or NaN."""
    std = series.std()
    if std == 0 or pd.isna(std):
        return pd.Series(0.0, index=series.index)
    return (series - series.mean()) / std


def _get_available(df: pd.DataFrame, candidates: List[str]) -> List[str]:
    """Return only columns that actually exist in df."""
    return [c for c in candidates if c in df.columns]


# ---------------------------------------------------------------------------
# Rule definitions (each returns a boolean Series + rule name string)
# ---------------------------------------------------------------------------

def _rule_extreme_zscore(df: pd.DataFrame) -> tuple[pd.Series, str]:
    """Flag rows where any key feature exceeds ZSCORE_THRESHOLD standard deviations."""
    cols = _get_available(df, KEY_FEATURE_COLUMNS)
    if not cols:
        return pd.Series(False, index=df.index), "extreme_zscore"

    flag = pd.Series(False, index=df.index)
    for col in cols:
        z = _safe_zscore(df[col].fillna(0))
        flag = flag | (z.abs() >= ZSCORE_THRESHOLD)
    return flag, "extreme_zscore"


def _rule_high_risk_feature(df: pd.DataFrame) -> tuple[pd.Series, str]:
    """Flag rows where an engineered risk/threat feature exceeds its 95th percentile."""
    cols = _find_columns(df, RISK_COLUMN_KEYWORDS, numeric_only=True)
    if not cols:
        return pd.Series(False, index=df.index), "high_risk_feature"

    flag = pd.Series(False, index=df.index)
    for col in cols:
        threshold = df[col].quantile(RISK_FEATURE_PERCENTILE)
        flag = flag | (df[col] >= threshold)
    return flag, "high_risk_feature"


def _rule_cyber_spike_low_hazard(df: pd.DataFrame) -> tuple[pd.Series, str]:
    """
    Cyber activity is disproportionately high relative to hazard intensity.
    Concretely: cyber_col > 0 AND hazard_col is below its median AND
    cyber-to-hazard ratio exceeds 0.5.
    """
    cyber_cols = _find_columns(df, CYBER_COLUMN_KEYWORDS)
    hazard_cols = _find_columns(df, HAZARD_COLUMN_KEYWORDS)

    if not cyber_cols or not hazard_cols:
        return pd.Series(False, index=df.index), "cyber_spike_low_hazard"

    cyber = df[cyber_cols[0]].fillna(0)
    hazard = df[hazard_cols[0]].fillna(0)
    hazard_median = hazard.median()
    safe_hazard = hazard.replace(0, np.nan)
    ratio = (cyber / safe_hazard).fillna(0)

    flag = (cyber > 0) & (hazard < hazard_median) & (ratio > 0.5)
    return flag, "cyber_spike_low_hazard"


def _rule_hazard_cyber_mismatch(df: pd.DataFrame) -> tuple[pd.Series, str]:
    """
    Extreme hazard with zero cyber events — statistically rare combination.
    Hazard must be in the top 5%; cyber must be 0.
    """
    hazard_cols = _find_columns(df, HAZARD_COLUMN_KEYWORDS)
    cyber_cols = _find_columns(df, CYBER_COLUMN_KEYWORDS)

    if not hazard_cols or not cyber_cols:
        return pd.Series(False, index=df.index), "hazard_cyber_mismatch"

    hazard = df[hazard_cols[0]].fillna(0)
    cyber = df[cyber_cols[0]].fillna(0)

    flag = (hazard >= hazard.quantile(0.95)) & (cyber == 0)
    return flag, "hazard_cyber_mismatch"


def _rule_risk_keyword_text(df: pd.DataFrame) -> tuple[pd.Series, str]:
    """
    Detect rows where any text column contains known threat keywords
    (malware, phishing, ransomware, etc).
    """
    keywords = ["malware", "phishing", "ransomware", "botnet", "exploit",
                "trojan", "suspicious", "blacklist", "abuse", "threat"]
    text_cols = [col for col in df.columns if df[col].dtype == object]

    if not text_cols:
        return pd.Series(False, index=df.index), "risk_keyword_text"

    flag = pd.Series(False, index=df.index)
    for col in text_cols:
        lowered = df[col].fillna("").astype(str).str.lower()
        flag = flag | lowered.apply(lambda v: any(kw in v for kw in keywords))
    return flag, "risk_keyword_text"


# ---------------------------------------------------------------------------
# Main public function
# ---------------------------------------------------------------------------

def build_anomaly_labels(
    input_path: str = "../../features/ai004_features_output.csv",
    output_path: str = "data/processed/anomaly_labels_v1.csv",
) -> pd.DataFrame:
    """
    Build rule-based anomaly validation labels from AI004 engineered features.

    This function is the single entry point for Role C. It:
      1. Loads the engineered feature dataset (ai004_features_output.csv)
      2. Applies 5 domain-specific anomaly rules
      3. Combines results into anomaly_flag and anomaly_reason columns
      4. Saves anomaly_labels_v1.csv
      5. Returns the label DataFrame

    Args:
        input_path:  Path to ai004_features_output.csv (from Role B / Sneha)
        output_path: Where to save anomaly_labels_v1.csv

    Returns:
        DataFrame with columns: row_id, anomaly_flag, anomaly_score, anomaly_reason
    """
    input_path = Path(input_path)
    output_path = Path(output_path)

    if not input_path.exists():
        raise FileNotFoundError(
            f"Feature dataset not found: {input_path}\n"
            "Make sure ai004_features_output.csv from Role B (Sneha) is available."
        )

    print(f"[label_builder] Loading: {input_path}")
    df = pd.read_csv(input_path, low_memory=False)
    print(f"[label_builder] Loaded {len(df):,} rows, {df.shape[1]} columns")

    # Apply all rules
    rules = [
        _rule_extreme_zscore(df),
        _rule_high_risk_feature(df),
        _rule_cyber_spike_low_hazard(df),
        _rule_hazard_cyber_mismatch(df),
        _rule_risk_keyword_text(df),
    ]

    # Build reasons list
    reasons: list[list[str]] = [[] for _ in range(len(df))]
    combined_flag = pd.Series(False, index=df.index)

    for flag, rule_name in rules:
        combined_flag = combined_flag | flag
        for idx in df.index[flag]:
            reasons[idx].append(rule_name)

    # Assemble output
    labels = pd.DataFrame({
        "row_id": df.index,
        "anomaly_flag": combined_flag.astype(int),
        "anomaly_score": pd.Series(
            [len(r) / len(rules) for r in reasons], index=df.index
        ).round(4),
        "anomaly_reason": [
            "; ".join(r) if r else "normal" for r in reasons
        ],
    })

    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    labels.to_csv(output_path, index=False)

    # Summary
    total = len(labels)
    flagged = labels["anomaly_flag"].sum()
    print(f"\n=== Label Summary ===")
    print(f"Total rows   : {total:,}")
    print(f"Anomalies    : {flagged:,}  ({flagged/total*100:.2f}%)")
    print(f"Normal       : {total - flagged:,}")
    print(f"Saved to     : {output_path}\n")

    return labels


# ---------------------------------------------------------------------------
# Pipeline integration — called by AI008 training pipeline (run.py)
# ---------------------------------------------------------------------------

def run(
    dataset_path: Optional[str] = None,
    output_path: str = "data/processed/anomaly_labels_v1.csv",
) -> pd.DataFrame:
    """
    Entry point used by AI008 Training Pipeline's run.py.

    The pipeline calls this as part of the preprocessing → labeling stage.
    dataset_path is injected by the pipeline config (anomaly_detection.yaml).
    """
    if dataset_path is None:
        dataset_path = "../../features/ai004_features_output.csv"
    return build_anomaly_labels(input_path=dataset_path, output_path=output_path)


if __name__ == "__main__":
    import sys
    inp = sys.argv[1] if len(sys.argv) > 1 else "../../features/ai004_features_output.csv"
    out = sys.argv[2] if len(sys.argv) > 2 else "data/processed/anomaly_labels_v1.csv"
    build_anomaly_labels(inp, out)
