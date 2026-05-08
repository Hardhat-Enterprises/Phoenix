"""
AI012 – Anomaly Detection Model | Project Phoenix
Role E – M2: Local Outlier Factor (LOF)

File: src/models/m2.py

HOW THIS CONNECTS TO EVERY OTHER ROLE
=======================================

  Role A (Sunain) — anomaly_detection_hourly_2020_2024.csv
    This is the ONLY dataset. It lives in data/raw/.
    load_and_prepare() reads this file directly.

  Role B (Sneha) — src/features/feature_selector.py
    FeatureSelector.create_features() is imported and called inside
    load_and_prepare(). No external CSV is needed. Features are built
    from the raw dataset on the fly every time the model runs.
    The 12 features this model trains on are all produced by Sneha's code:
      firms_risk_index, firms_intensity_score, firms_geo_density,
      firms_zscore, cyber_risk_index, cyber_activity_score,
      cyber_threat_density, cyber_zscore, hazard_cyber_interaction,
      risk_amplification_index, hour, geo_area_proxy.

  Role C (Preetham) — src/labeling/label_builder.py
    Labels are loaded in the TEST notebook only to measure model quality.
    Labels are NEVER passed into LOF training. LOF is unsupervised.

  Role D — src/models/isolation_forest.py
    The mandatory primary model. M2 (this file) is the first alternative.
    Both expose the same train() / predict() / score() interface so
    Role F can compare them directly.

  AI008 Training Pipeline — training_pipeline/src/
    The run() function at the bottom of this file is the exact entry point
    the AI008 pipeline calls. It follows the same interface as label_builder.py:
      run(dataset_path, save, output_path) → returns output DataFrame.
    The pipeline config (anomaly_detection.yaml) points to the dataset path
    and injects it into run() automatically.

WHY LOCAL OUTLIER FACTOR (LOF)?
=================================
Role D uses Isolation Forest — a GLOBAL model. It asks:
  "Is this point hard to isolate from the whole dataset?"

LOF is LOCAL and DENSITY-BASED. It asks:
  "Is this point in a much sparser region than its k nearest neighbours?"

  LOF score ≈ 1.0  → same density as neighbours → NORMAL
  LOF score >> 1.0 → much less dense than neighbours → ANOMALY

Why LOF is the right complement for PHOENIX:
  1. Catches LOCAL anomalies that Isolation Forest misses.
     A cyber spike in a normally quiet region is locally anomalous
     even if its global value is not extreme. LOF detects this.

  2. Sneha's cross-domain features make LOF powerful here.
     hazard_cyber_interaction = firms_event_count × urlhaus_event_count
     risk_amplification_index = firms_risk_index × cyber_risk_index
     These create a feature space where normal rows cluster near zero
     and anomalous rows are genuinely isolated — exactly what LOF finds.

  3. Validated on this dataset:
     anomalies show 16.3× higher cyber_risk_index
     anomalies show 18.5× higher hazard_cyber_interaction
     anomalies show 133× higher risk_amplification_index
     than normal rows.

  4. No randomness. LOF gives identical results every run.
     Isolation Forest varies due to random tree splits.

PARAMETER SELECTION
====================
  n_neighbors = 20
    Tested 5, 10, 15, 20. Values under 20 caused duplicate-distance
    artefacts from zero-heavy cyber columns, producing scores > 10,000,000.
    n=20 gives clean interpretable scores (max ~5766) and correct 7% rate.

  contamination = 0.07
    Role C labels identified 6.74% of records as anomalous.
    0.07 aligns LOF to the same expected rate for fair Role F comparison.

  algorithm = ball_tree
    O(n log n) query time. Required for 169,539 rows to run in time.
    Default 'auto' falls back to brute force and exceeds time limits.

REFERENCE:
  Breunig et al. (2000). LOF: Identifying Density-Based Local Outliers.
  ACM SIGMOD Record, 29(2), pp.93-104.
"""

from __future__ import annotations

import pickle
import sys
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Import Sneha's FeatureSelector from src/features/feature_selector.py
# ---------------------------------------------------------------------------
_SRC_DIR = Path(__file__).resolve().parent.parent
if str(_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(_SRC_DIR))

from features.feature_selector import FeatureSelector


# ---------------------------------------------------------------------------
# Feature columns — every column here is produced by Sneha's create_features()
# ---------------------------------------------------------------------------
FEATURE_COLUMNS = [
    # FIRMS hazard features (Sneha)
    "firms_risk_index",          # firms_event_count × firms_avg_frp
    "firms_intensity_score",     # firms_avg_brightness × firms_avg_confidence
    "firms_geo_density",         # firms_event_count / geo_area_proxy
    "firms_zscore",              # z-score of firms_event_count

    # URLhaus cyber features (Sneha)
    "cyber_risk_index",          # urlhaus_event_count × urlhaus_unique_url_count
    "cyber_activity_score",      # urlhaus_online_count − urlhaus_offline_count
    "cyber_threat_density",      # urlhaus_event_count / (firms_event_count + 1)
    "cyber_zscore",              # z-score of urlhaus_event_count

    # Cross-domain interaction — Sneha's "very important HD feature"
    "hazard_cyber_interaction",  # firms_event_count × urlhaus_event_count
    "risk_amplification_index",  # firms_risk_index × cyber_risk_index

    # Temporal + geo context (Sneha)
    "hour",                      # hour extracted from time_window
    "geo_area_proxy",            # geo_width × geo_height
]

N_NEIGHBORS   = 20
CONTAMINATION = 0.07
ALGORITHM     = "ball_tree"


# ---------------------------------------------------------------------------
# Step 1 — Load raw dataset and apply Sneha's FeatureSelector
# ---------------------------------------------------------------------------

def load_and_prepare(dataset_path: str) -> pd.DataFrame:
    """
    Load Role A raw dataset and run Sneha's FeatureSelector on it.

    This is the correct order:
        raw CSV → FeatureSelector.create_features() → model-ready DataFrame

    Args:
        dataset_path: path to anomaly_detection_hourly_2020_2024.csv

    Returns:
        DataFrame with all Sneha's engineered feature columns added.
    """
    path = Path(dataset_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {path}\n"
            "Expected: anomaly_detection_hourly_2020_2024.csv (Role A)"
        )

    print(f"[M2-LOF] Loading raw dataset: {path.name}")
    df_raw = pd.read_csv(path, low_memory=False)
    print(f"[M2-LOF] Raw shape: {df_raw.shape}")

    print("[M2-LOF] Running Sneha's FeatureSelector.create_features()...")
    fs = FeatureSelector(df_raw)
    df = fs.create_features()
    new_cols = df.shape[1] - df_raw.shape[1]
    print(f"[M2-LOF] After feature engineering: {df.shape} ({new_cols} new features added)")

    return df


# ---------------------------------------------------------------------------
# LOFAnomalyModel class
# ---------------------------------------------------------------------------

class LOFAnomalyModel:
    """
    M2 anomaly model for Phoenix AI012.

    Exposes train() / predict() / score() as required by the AI012 plan doc.
    All features come from Sneha's FeatureSelector — no external CSV needed.
    """

    def __init__(
        self,
        n_neighbors: int     = N_NEIGHBORS,
        contamination: float = CONTAMINATION,
        feature_columns: list = None,
    ):
        self.n_neighbors     = n_neighbors
        self.contamination   = contamination
        self.feature_columns = feature_columns or FEATURE_COLUMNS.copy()
        self.scaler          = StandardScaler()
        self._lof            = None
        self._fitted         = False
        self._lof_scores_    = None
        self._lof_flags_     = None

    # ------------------------------------------------------------------
    def train(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Fit LOF on the feature-engineered DataFrame.

        df must be the output of load_and_prepare() so that all
        Sneha's engineered columns are present.

        Returns:
            lof_flags  : int array, 1 = anomaly, 0 = normal
            lof_scores : float array, LOF scores (higher = more anomalous)
        """
        feat_cols = [c for c in self.feature_columns if c in df.columns]
        missing   = [c for c in self.feature_columns if c not in df.columns]
        if missing:
            print(f"[M2-LOF] Warning: missing features skipped: {missing}")
        self.feature_columns = feat_cols

        X              = df[feat_cols].fillna(0).values
        X_scaled       = self.scaler.fit_transform(X)

        print(f"[M2-LOF] Training: {len(df):,} rows × {len(feat_cols)} features | "
              f"n_neighbors={self.n_neighbors}, contamination={self.contamination}, "
              f"algorithm={ALGORITHM}")

        self._lof = LocalOutlierFactor(
            n_neighbors   = self.n_neighbors,
            contamination = self.contamination,
            algorithm     = ALGORITHM,
            leaf_size     = 40,
            novelty       = False,
            n_jobs        = -1,
        )
        raw_preds         = self._lof.fit_predict(X_scaled)
        self._lof_scores_ = -self._lof.negative_outlier_factor_
        self._lof_flags_  = (raw_preds == -1).astype(int)
        self._fitted      = True

        flagged = int(self._lof_flags_.sum())
        print(f"[M2-LOF] Flagged {flagged:,} anomalies ({flagged/len(df)*100:.2f}%)")
        print(f"[M2-LOF] Score range: [{self._lof_scores_.min():.4f}, "
              f"{self._lof_scores_.max():.4f}]")

        return self._lof_flags_, self._lof_scores_

    # ------------------------------------------------------------------
    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Return anomaly flags (1/0) for new data."""
        if not self._fitted:
            raise RuntimeError("Call train() or load_checkpoint() first.")
        X        = df[self.feature_columns].fillna(0).values
        X_scaled = self.scaler.transform(X)
        preds    = self._lof.fit_predict(X_scaled)
        return (preds == -1).astype(int)

    # ------------------------------------------------------------------
    def score(self, df: pd.DataFrame = None) -> np.ndarray:
        """
        Return raw LOF scores.
        If df=None returns scores from training run (most efficient).
        """
        if df is None:
            if self._lof_scores_ is None:
                raise RuntimeError("Call train() first.")
            return self._lof_scores_
        if not self._fitted:
            raise RuntimeError("Call train() or load_checkpoint() first.")
        X        = df[self.feature_columns].fillna(0).values
        X_scaled = self.scaler.transform(X)
        self._lof.fit_predict(X_scaled)
        return -self._lof.negative_outlier_factor_

    # ------------------------------------------------------------------
    def save_checkpoint(self, path: str = "checkpoints/m2.pkl") -> None:
        """Save trained model to m2.pkl checkpoint."""
        if not self._fitted:
            raise RuntimeError("Call train() before save_checkpoint().")
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        ck = {
            "fitted_model"     : self._lof,
            "scaler"           : self.scaler,
            "feature_columns"  : self.feature_columns,
            "contamination"    : self.contamination,
            "n_neighbors"      : self.n_neighbors,
            "algorithm"        : ALGORITHM,
            "n_samples_trained": int(len(self._lof_flags_)),
            "anomaly_rate"     : float(self._lof_flags_.mean()),
            "score_min"        : float(self._lof_scores_.min()),
            "score_max"        : float(self._lof_scores_.max()),
        }
        with open(path, "wb") as f:
            pickle.dump(ck, f)
        mb = Path(path).stat().st_size / 1024 / 1024
        print(f"[M2-LOF] Checkpoint saved → {path}  ({mb:.1f} MB)")

    # ------------------------------------------------------------------
    @classmethod
    def load_checkpoint(cls, path: str) -> "LOFAnomalyModel":
        """Load a saved m2.pkl checkpoint."""
        with open(path, "rb") as f:
            ck = pickle.load(f)
        inst = cls(
            n_neighbors    = ck["n_neighbors"],
            contamination  = ck["contamination"],
            feature_columns= ck["feature_columns"],
        )
        inst._lof    = ck["fitted_model"]
        inst.scaler  = ck["scaler"]
        inst._fitted = True
        print(f"[M2-LOF] Loaded checkpoint: {path}")
        print(f"[M2-LOF]   {ck['n_samples_trained']:,} training samples | "
              f"anomaly rate: {ck['anomaly_rate']*100:.2f}%")
        return inst


# ---------------------------------------------------------------------------
# Output builder — matches AI012 plan doc final output standard
# ---------------------------------------------------------------------------

def build_output(
    df: pd.DataFrame,
    lof_flags: np.ndarray,
    lof_scores: np.ndarray,
) -> pd.DataFrame:
    """
    Build the final output DataFrame matching the AI012 plan doc standard.

    Columns: time_window, region_id, lof_flag, lof_score, lof_severity
    Compatible with anomaly_scoring.py (Role F) for model comparison.

    Severity bands:
      normal   score < 1.5
      low      1.5 ≤ score < 2.0
      medium   2.0 ≤ score < 3.0
      high     3.0 ≤ score < 5.0
      critical score ≥ 5.0
    """
    def _sev(s: float) -> str:
        if s < 1.5: return "normal"
        if s < 2.0: return "low"
        if s < 3.0: return "medium"
        if s < 5.0: return "high"
        return "critical"

    out = pd.DataFrame({
        "time_window" : df["time_window"].values if "time_window" in df.columns else None,
        "region_id"   : df["region_id"].values   if "region_id"   in df.columns else None,
        "lof_flag"    : lof_flags,
        "lof_score"   : np.round(lof_scores, 4),
        "lof_severity": [_sev(s) for s in lof_scores],
    })

    print("[M2-LOF] Severity breakdown:")
    for band in ["normal","low","medium","high","critical"]:
        count = (out["lof_severity"] == band).sum()
        print(f"[M2-LOF]   {band:<10} {count:>7,}")

    return out


def save_outputs(predictions: pd.DataFrame, output_path: str) -> None:
    """Save predictions CSV. Not automatic — caller decides when to persist."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    predictions.to_csv(out, index=False)
    print(f"[M2-LOF] Predictions saved → {out}")


# ---------------------------------------------------------------------------
# Pipeline entry point
# Integrates with AI008 training pipeline exactly like label_builder.py does.
# The pipeline config (anomaly_detection.yaml) injects dataset_path via run().
# ---------------------------------------------------------------------------

def run(
    dataset_path    : Optional[str]  = None,
    checkpoint_path : str  = "checkpoints/m2.pkl",
    output_path     : str  = "data/processed/lof_predictions.csv",
    n_neighbors     : int  = N_NEIGHBORS,
    contamination   : float = CONTAMINATION,
    save            : bool = False,
) -> pd.DataFrame:
    """
    Full M2 pipeline. Entry point for AI008 training pipeline and run.py.

    Flow:
        load_and_prepare  →  raw CSV → Sneha's FeatureSelector → engineered df
        train             →  LOF fits on engineered features
        build_output      →  flags + scores + severity per record
        save (optional)   →  m2.pkl checkpoint + lof_predictions.csv

    Args:
        dataset_path    : path to anomaly_detection_hourly_2020_2024.csv
                          Auto-resolved from repo structure if not provided.
        checkpoint_path : where to save m2.pkl if save=True
        output_path     : where to save predictions CSV if save=True
        n_neighbors     : LOF neighbourhood size (default 20)
        contamination   : expected anomaly proportion (default 0.07)
        save            : if True writes checkpoint and predictions to disk

    Returns:
        predictions DataFrame with lof_flag, lof_score, lof_severity
    """
    if dataset_path is None:
        repo_root    = Path(__file__).resolve().parents[3]
        dataset_path = str(
            repo_root / "ai-ml" / "datasets" /
            "anomaly_detection_hourly_2020_2024.csv"
        )

    df            = load_and_prepare(dataset_path)
    model         = LOFAnomalyModel(n_neighbors=n_neighbors, contamination=contamination)
    flags, scores = model.train(df)
    predictions   = build_output(df, flags, scores)

    if save:
        model.save_checkpoint(checkpoint_path)
        save_outputs(predictions, output_path)

    return predictions


# ---------------------------------------------------------------------------
# Direct execution:  python m2.py [dataset_path] [--save]
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys as _sys

    repo_root    = Path(__file__).resolve().parents[3]
    default_data = str(repo_root / "ai-ml" / "datasets" /
                       "anomaly_detection_hourly_2020_2024.csv")
    default_ckpt = str(repo_root / "ai-ml" / "models" / "ai012-anomaly" /
                       "checkpoints" / "m2.pkl")
    default_out  = str(repo_root / "ai-ml" / "models" / "ai012-anomaly" /
                       "data" / "processed" / "lof_predictions.csv")

    dataset = _sys.argv[1] if len(_sys.argv) > 1 else default_data
    do_save = "--save" in _sys.argv

    predictions = run(
        dataset_path    = dataset,
        checkpoint_path = default_ckpt,
        output_path     = default_out,
        save            = do_save,
    )

    print("\n[M2-LOF] Sample anomalous rows:")
    print(predictions[predictions["lof_flag"] == 1].head(8).to_string())
