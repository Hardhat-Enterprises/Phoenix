"""
AI012 – Anomaly Detection Model | Project Phoenix
Role E – M2 Model: Production-ready Local Outlier Factor (LOF)

File   : src/models/m2.py
Author : Role E (Preetham Chandu)
Updated: Production-ready version

This module exposes the standard AI012 interface:
    train(df)             -> fits LOF and returns flags/scores
    predict(df)           -> returns flags for the given data
    score(df=None)        -> returns raw LOF scores
    save_checkpoint(path) -> saves m2.pkl
    load_checkpoint(path) -> loads m2.pkl
    run(...)              -> full pipeline entry point

Production changes in this version:
    - Uses LocalOutlierFactor(novelty=True), so saved checkpoints can perform
      real inference on future/unseen data.
    - predict() and score() no longer re-fit the model.
    - Adds strict feature validation with clear error messages.
    - Stores training metadata and feature statistics in the checkpoint.
    - Uses Python logging instead of print-only status messages.
    - Adds a robust CLI with argparse.
    - Adds safer output construction and input validation.
"""

from __future__ import annotations

import argparse
import logging
import pickle
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler


LOGGER = logging.getLogger(__name__)


FEATURE_COLUMNS = [
    # Role A – raw fire signals (FIRMS satellite data)
    "firms_event_count",
    "firms_avg_frp",
    "firms_avg_confidence",

    # Role A – raw cyber signals (URLhaus data)
    "urlhaus_event_count",
    "urlhaus_online_count",

    # Role A – geographic location
    "region_lat_bin",
    "region_lon_bin",

    # Role B – engineered features
    "cyber_intensity",
    "hazard_severity",
    "cyber_zscore",
    "hazard_zscore",
    "combined_risk_index",
    "temporal_spike",
]

N_NEIGHBORS = 20
CONTAMINATION = 0.07
METRIC = "euclidean"
EPSILON = 1e-9


@dataclass(frozen=True)
class ModelMetadata:
    """Serializable metadata stored with the checkpoint."""

    model_name: str
    sklearn_model: str
    novelty: bool
    metric: str
    n_neighbors: int
    contamination: float
    feature_columns: list[str]
    n_samples_trained: int
    anomaly_rate: float
    score_min: float
    score_max: float
    score_mean: float
    score_std: float


class LOFAnomalyModel:
    """
    Production-ready Local Outlier Factor anomaly detector.

    Important:
        This class uses novelty=True, which is required for real inference.
        With novelty=True, the fitted LOF model supports predict() and
        score_samples() on future/unseen data without re-fitting.
    """

    def __init__(
        self,
        n_neighbors: int = N_NEIGHBORS,
        contamination: float = CONTAMINATION,
        feature_columns: Optional[list[str]] = None,
        metric: str = METRIC,
    ) -> None:
        self._validate_hyperparameters(n_neighbors, contamination)
        self.n_neighbors = n_neighbors
        self.contamination = contamination
        self.feature_columns = list(feature_columns or FEATURE_COLUMNS)
        self.metric = metric

        self.scaler = StandardScaler()
        self._lof: Optional[LocalOutlierFactor] = None
        self._fitted = False
        self._lof_scores_: Optional[np.ndarray] = None
        self._lof_flags_: Optional[np.ndarray] = None
        self.metadata_: Optional[ModelMetadata] = None

    @staticmethod
    def _validate_hyperparameters(n_neighbors: int, contamination: float) -> None:
        if not isinstance(n_neighbors, int) or n_neighbors < 2:
            raise ValueError("n_neighbors must be an integer >= 2.")
        if not 0 < contamination < 0.5:
            raise ValueError("contamination must be between 0 and 0.5.")

    def _validate_columns(self, df: pd.DataFrame, *, allow_subset: bool = False) -> list[str]:
        if not isinstance(df, pd.DataFrame):
            raise TypeError("Input must be a pandas DataFrame.")
        if df.empty:
            raise ValueError("Input DataFrame is empty.")

        if allow_subset:
            selected = [c for c in self.feature_columns if c in df.columns]
            if not selected:
                raise ValueError(
                    "No matching feature columns found in DataFrame. "
                    f"Expected at least one of: {self.feature_columns}"
                )
            return selected

        missing = [c for c in self.feature_columns if c not in df.columns]
        if missing:
            raise ValueError(
                "Input DataFrame is missing required feature columns: "
                f"{missing}. Required columns are: {self.feature_columns}"
            )
        return self.feature_columns

    @staticmethod
    def _coerce_numeric_features(df: pd.DataFrame, columns: Iterable[str]) -> pd.DataFrame:
        X = df.loc[:, list(columns)].copy()
        for column in X.columns:
            X[column] = pd.to_numeric(X[column], errors="coerce")
        return X.replace([np.inf, -np.inf], np.nan).fillna(0.0)

    def _prepare_for_training(self, df: pd.DataFrame) -> np.ndarray:
        selected_columns = self._validate_columns(df, allow_subset=True)
        if len(selected_columns) != len(self.feature_columns):
            LOGGER.warning(
                "Training with %d/%d configured feature columns. Missing columns will not be used.",
                len(selected_columns),
                len(self.feature_columns),
            )
        self.feature_columns = selected_columns
        X = self._coerce_numeric_features(df, self.feature_columns)
        return X.to_numpy(dtype=float)

    def _prepare_for_inference(self, df: pd.DataFrame) -> np.ndarray:
        self._validate_columns(df, allow_subset=False)
        X = self._coerce_numeric_features(df, self.feature_columns)
        return X.to_numpy(dtype=float)

    def train(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Fit LOF on the full dataset and compute anomaly flags/scores.

        Returns:
            lof_flags: int array where 1 = anomaly and 0 = normal
            lof_scores: float array where higher = more anomalous
        """
        if len(df) <= self.n_neighbors:
            raise ValueError(
                f"LOF requires more rows than n_neighbors. Got {len(df)} rows "
                f"and n_neighbors={self.n_neighbors}."
            )

        LOGGER.info(
            "Training M2 LOF model with n_neighbors=%s, contamination=%s, novelty=True",
            self.n_neighbors,
            self.contamination,
        )

        X = self._prepare_for_training(df)
        X_scaled = self.scaler.fit_transform(X)

        self._lof = LocalOutlierFactor(
            n_neighbors=self.n_neighbors,
            contamination=self.contamination,
            metric=self.metric,
            novelty=True,
            n_jobs=-1,
        )
        self._lof.fit(X_scaled)

        raw_preds = self._lof.predict(X_scaled)
        self._lof_scores_ = -self._lof.score_samples(X_scaled)
        self._lof_flags_ = (raw_preds == -1).astype(int)
        self._fitted = True

        flagged = int(self._lof_flags_.sum())
        anomaly_rate = float(self._lof_flags_.mean())
        self.metadata_ = ModelMetadata(
            model_name="M2 Local Outlier Factor",
            sklearn_model="sklearn.neighbors.LocalOutlierFactor",
            novelty=True,
            metric=self.metric,
            n_neighbors=self.n_neighbors,
            contamination=self.contamination,
            feature_columns=self.feature_columns,
            n_samples_trained=int(len(df)),
            anomaly_rate=anomaly_rate,
            score_min=float(np.min(self._lof_scores_)),
            score_max=float(np.max(self._lof_scores_)),
            score_mean=float(np.mean(self._lof_scores_)),
            score_std=float(np.std(self._lof_scores_)),
        )

        LOGGER.info(
            "M2 LOF flagged %s anomalies out of %s rows (%.2f%%). Score range: [%.4f, %.4f]",
            f"{flagged:,}",
            f"{len(df):,}",
            anomaly_rate * 100,
            self.metadata_.score_min,
            self.metadata_.score_max,
        )
        return self._lof_flags_, self._lof_scores_

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Return anomaly flags for data without re-fitting the model."""
        self._require_fitted()
        X = self._prepare_for_inference(df)
        X_scaled = self.scaler.transform(X)
        raw_preds = self._lof.predict(X_scaled)
        return (raw_preds == -1).astype(int)

    def score(self, df: Optional[pd.DataFrame] = None) -> np.ndarray:
        """Return raw LOF scores where higher means more anomalous."""
        if df is None:
            if self._lof_scores_ is None:
                raise RuntimeError("Call train() first or pass a DataFrame.")
            return self._lof_scores_.copy()

        self._require_fitted()
        X = self._prepare_for_inference(df)
        X_scaled = self.scaler.transform(X)
        return -self._lof.score_samples(X_scaled)

    def save_checkpoint(self, path: str | Path) -> None:
        """Save the fitted model, scaler, features, and metadata to disk."""
        self._require_fitted()
        checkpoint_path = Path(path)
        checkpoint_path.parent.mkdir(parents=True, exist_ok=True)

        checkpoint = {
            "fitted_model": self._lof,
            "scaler": self.scaler,
            "feature_columns": self.feature_columns,
            "n_neighbors": self.n_neighbors,
            "contamination": self.contamination,
            "metric": self.metric,
            "metadata": asdict(self.metadata_) if self.metadata_ else None,
        }
        with checkpoint_path.open("wb") as f:
            pickle.dump(checkpoint, f)

        size_mb = checkpoint_path.stat().st_size / 1024 / 1024
        LOGGER.info("Checkpoint saved to %s (%.2f MB)", checkpoint_path, size_mb)

    @classmethod
    def load_checkpoint(cls, path: str | Path) -> "LOFAnomalyModel":
        """Load a previously saved checkpoint and return a fitted model."""
        checkpoint_path = Path(path)
        if not checkpoint_path.exists():
            raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")

        with checkpoint_path.open("rb") as f:
            checkpoint = pickle.load(f)

        instance = cls(
            n_neighbors=checkpoint["n_neighbors"],
            contamination=checkpoint["contamination"],
            feature_columns=checkpoint["feature_columns"],
            metric=checkpoint.get("metric", METRIC),
        )
        instance._lof = checkpoint["fitted_model"]
        if not getattr(instance._lof, "novelty", False):
            raise ValueError(
                "This checkpoint was trained with LocalOutlierFactor(novelty=False), "
                "so it cannot safely be used for production inference. Regenerate it by "
                "running notebooks/m2_train.ipynb or python src/models/m2.py ... --save."
            )
        instance.scaler = checkpoint["scaler"]
        instance._fitted = True

        metadata = checkpoint.get("metadata")
        if metadata:
            instance.metadata_ = ModelMetadata(**metadata)
            LOGGER.info(
                "Loaded checkpoint %s trained on %s samples with %.2f%% anomaly rate.",
                checkpoint_path,
                f"{instance.metadata_.n_samples_trained:,}",
                instance.metadata_.anomaly_rate * 100,
            )
        else:
            LOGGER.info("Loaded checkpoint %s", checkpoint_path)

        return instance

    def _require_fitted(self) -> None:
        if not self._fitted or self._lof is None:
            raise RuntimeError("Call train() or load_checkpoint() before using this method.")


def load_data(dataset_path: str | Path, features_path: Optional[str | Path] = None) -> pd.DataFrame:
    """Load Role A data and optionally merge Role B engineered features."""
    path = Path(dataset_path)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    LOGGER.info("Loading dataset: %s", path)
    df = pd.read_csv(path, low_memory=False)

    if "time_window" in df.columns:
        df["time_window"] = pd.to_datetime(df["time_window"], errors="coerce")
    if {"region_id", "time_window"}.issubset(df.columns):
        df = df.sort_values(["region_id", "time_window"]).reset_index(drop=True)

    LOGGER.info("Loaded %s rows and %s columns", f"{len(df):,}", df.shape[1])

    if features_path is not None:
        fp = Path(features_path)
        if fp.exists():
            LOGGER.info("Merging Role B features: %s", fp)
            df_b = pd.read_csv(fp, low_memory=False)
            if len(df_b) != len(df):
                raise ValueError(
                    "Role B features file has a different number of rows from the base dataset: "
                    f"features={len(df_b)}, dataset={len(df)}. Refusing positional concat."
                )
            new_cols = [c for c in df_b.columns if c not in df.columns]
            df = pd.concat([df.reset_index(drop=True), df_b[new_cols].reset_index(drop=True)], axis=1)
            LOGGER.info("After feature merge: %s columns", df.shape[1])
        else:
            LOGGER.warning("Role B features file not found: %s. Falling back to computed features.", fp)

    return compute_engineered_features_if_missing(df)


def compute_engineered_features_if_missing(df: pd.DataFrame) -> pd.DataFrame:
    """Compute engineered fallback features when Role B columns are unavailable."""
    required_raw = ["urlhaus_event_count", "firms_avg_frp"]
    missing_raw = [c for c in required_raw if c not in df.columns]
    if "cyber_intensity" in df.columns:
        return df
    if missing_raw:
        raise ValueError(
            "Cannot compute engineered fallback features because raw columns are missing: "
            f"{missing_raw}"
        )

    LOGGER.info("Computing engineered fallback features from raw columns.")
    df = df.copy()

    for col in ["urlhaus_event_count", "firms_avg_frp"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").replace([np.inf, -np.inf], np.nan).fillna(0.0)

    df["cyber_intensity"] = df["urlhaus_event_count"] / (df["urlhaus_event_count"].max() + EPSILON)
    df["hazard_severity"] = df["firms_avg_frp"] / (df["firms_avg_frp"].max() + EPSILON)

    if "region_id" in df.columns:
        df["rolling_cyber_mean"] = df.groupby("region_id")["urlhaus_event_count"].transform(
            lambda x: x.rolling(3, min_periods=1).mean()
        )
    else:
        df["rolling_cyber_mean"] = df["urlhaus_event_count"].rolling(3, min_periods=1).mean()

    df["cyber_zscore"] = (df["urlhaus_event_count"] - df["urlhaus_event_count"].mean()) / (
        df["urlhaus_event_count"].std(ddof=0) + EPSILON
    )
    df["hazard_zscore"] = (df["firms_avg_frp"] - df["firms_avg_frp"].mean()) / (
        df["firms_avg_frp"].std(ddof=0) + EPSILON
    )
    df["combined_risk_index"] = 0.5 * df["cyber_intensity"] + 0.5 * df["hazard_severity"]
    df["temporal_spike"] = df["urlhaus_event_count"] - df["rolling_cyber_mean"]

    return df


def build_output(df: pd.DataFrame, lof_flags: np.ndarray, lof_scores: np.ndarray) -> pd.DataFrame:
    """Build the standard M2 prediction output DataFrame."""
    if len(df) != len(lof_flags) or len(df) != len(lof_scores):
        raise ValueError("Input DataFrame, flags, and scores must have the same length.")

    def severity(score_value: float) -> str:
        if score_value < 1.5:
            return "normal"
        if score_value < 2.0:
            return "low"
        if score_value < 3.0:
            return "medium"
        if score_value < 5.0:
            return "high"
        return "critical"

    output = pd.DataFrame(index=df.index)
    output["time_window"] = df["time_window"].values if "time_window" in df.columns else pd.NaT
    output["region_id"] = df["region_id"].values if "region_id" in df.columns else pd.NA
    output["lof_flag"] = lof_flags.astype(int)
    output["lof_score"] = np.round(lof_scores.astype(float), 4)
    output["lof_severity"] = [severity(float(s)) for s in lof_scores]
    return output.reset_index(drop=True)


def save_outputs(predictions: pd.DataFrame, output_path: str | Path) -> None:
    """Save LOF predictions to CSV."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    predictions.to_csv(out, index=False)
    LOGGER.info("Predictions saved to %s", out)


def run(
    dataset_path: str | Path,
    features_path: Optional[str | Path] = None,
    checkpoint_path: str | Path = "checkpoints/m2.pkl",
    output_path: str | Path = "data/processed/lof_predictions.csv",
    n_neighbors: int = N_NEIGHBORS,
    contamination: float = CONTAMINATION,
    save: bool = False,
) -> pd.DataFrame:
    """Full M2 pipeline: load data, train model, build predictions, optionally save."""
    df = load_data(dataset_path, features_path)
    model = LOFAnomalyModel(n_neighbors=n_neighbors, contamination=contamination)
    flags, scores = model.train(df)
    predictions = build_output(df, flags, scores)

    if save:
        model.save_checkpoint(checkpoint_path)
        save_outputs(predictions, output_path)

    return predictions


def configure_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="[%(levelname)s] %(message)s")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train and run the AI012 M2 LOF anomaly detector.")
    parser.add_argument("dataset_path", help="Path to anomaly_detection_hourly_2020_2024.csv")
    parser.add_argument("--features-path", default=None, help="Optional path to Role B engineered features CSV")
    parser.add_argument("--checkpoint-path", default="checkpoints/m2.pkl", help="Path for saved model checkpoint")
    parser.add_argument("--output-path", default="data/processed/lof_predictions.csv", help="Path for predictions CSV")
    parser.add_argument("--n-neighbors", type=int, default=N_NEIGHBORS, help="LOF n_neighbors parameter")
    parser.add_argument("--contamination", type=float, default=CONTAMINATION, help="Expected anomaly rate")
    parser.add_argument("--save", action="store_true", help="Save checkpoint and predictions")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    configure_logging(args.verbose)

    preds = run(
        dataset_path=args.dataset_path,
        features_path=args.features_path,
        checkpoint_path=args.checkpoint_path,
        output_path=args.output_path,
        n_neighbors=args.n_neighbors,
        contamination=args.contamination,
        save=args.save,
    )

    anomalies = preds[preds["lof_flag"] == 1].head(8)
    LOGGER.info("Sample anomalous rows:\n%s", anomalies.to_string(index=False))
