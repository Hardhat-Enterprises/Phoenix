"""Leakage-safe M7 Week 2 training, packaging and inference workflow.

The inherited PHOENIX XGBoost model predicts ``hazard_severity``.  That is not
the final Sprint 2 phishing target, so this module labels the resulting package
as a legacy baseline.  Its purpose is to prove the repaired engineering path:

1. split duplicate groups before fitting preprocessing;
2. prohibit target/proxy features;
3. fit preprocessing on training data only;
4. package preprocessing, model, labels, thresholds and version together; and
5. reload the package and reproduce a prediction.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from typing import Any, Mapping

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from xgboost import XGBClassifier


DEFAULT_CONFIG_PATH = Path(__file__).with_name("config.json")


class ConfigurationError(ValueError):
    """Raised when the M7 configuration could permit leakage or drift."""


@dataclass(frozen=True)
class DataSplits:
    train: pd.DataFrame
    validation: pd.DataFrame
    test: pd.DataFrame


def load_config(path: str | Path = DEFAULT_CONFIG_PATH) -> dict[str, Any]:
    """Load and validate an M7 JSON configuration."""
    config_path = Path(path)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    validate_config(config)
    return config


def validate_config(config: Mapping[str, Any]) -> None:
    """Fail closed if target/proxy fields or invalid split values are present."""
    required = {
        "model_version",
        "dataset_path",
        "target_column",
        "group_column",
        "feature_columns",
        "prohibited_features",
        "split",
        "preprocessing",
        "model",
        "decision_thresholds",
        "outputs",
    }
    missing = sorted(required - set(config))
    if missing:
        raise ConfigurationError(f"Missing configuration fields: {missing}")

    features = [str(value) for value in config["feature_columns"]]
    if not features:
        raise ConfigurationError("feature_columns must be an explicit non-empty allow-list")
    if len(features) != len(set(features)):
        raise ConfigurationError("feature_columns contains duplicate values")

    prohibited = {str(value) for value in config["prohibited_features"]}
    target = str(config["target_column"])
    prohibited.add(target)
    leaked = sorted(set(features) & prohibited)
    if leaked:
        raise ConfigurationError(f"Target/proxy features are prohibited: {leaked}")

    if "text" not in features and "url" not in features:
        raise ConfigurationError("At least one content feature (text or url) is required")

    split = config["split"]
    fractions = [float(split[name]) for name in ("train", "validation", "test")]
    if any(value <= 0.0 or value >= 1.0 for value in fractions):
        raise ConfigurationError("All split fractions must be between 0 and 1")
    if not np.isclose(sum(fractions), 1.0):
        raise ConfigurationError("train, validation and test fractions must sum to 1.0")

    thresholds = config["decision_thresholds"]
    required_thresholds = ("low", "medium", "high", "critical")
    if any(name not in thresholds for name in required_thresholds):
        raise ConfigurationError("decision_thresholds must define low/medium/high/critical")
    ordered = [float(thresholds[name]) for name in required_thresholds]
    if ordered != sorted(ordered) or ordered[0] < 0.0 or ordered[-1] > 1.0:
        raise ConfigurationError("decision thresholds must be ordered within 0.0-1.0")


def _resolve_repo_path(repo_root: Path, value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else repo_root / path


def load_dataset(path: str | Path, config: Mapping[str, Any]) -> pd.DataFrame:
    """Load only the approved columns plus target/group fields."""
    dataset_path = Path(path)
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")
    frame = pd.read_csv(dataset_path)

    required_columns = set(config["feature_columns"]) | {
        str(config["target_column"]),
        str(config["group_column"]),
    }
    missing = sorted(required_columns - set(frame.columns))
    if missing:
        raise ConfigurationError(f"Dataset is missing required columns: {missing}")

    selected = frame[list(dict.fromkeys([*config["feature_columns"], config["target_column"], config["group_column"]]))].copy()
    if selected.empty:
        raise ConfigurationError("Dataset is empty")
    if selected[config["target_column"]].isna().any():
        raise ConfigurationError("Target column contains missing values")
    if selected[config["group_column"]].isna().any():
        raise ConfigurationError("Group column contains missing values")
    return selected


def _group_set(frame: pd.DataFrame, group_column: str) -> set[str]:
    return set(frame[group_column].astype(str))


def split_before_preprocessing(frame: pd.DataFrame, config: Mapping[str, Any]) -> DataSplits:
    """Create deterministic group-disjoint train/validation/test partitions."""
    split = config["split"]
    seed = int(split["random_seed"])
    group_column = str(config["group_column"])

    first = GroupShuffleSplit(
        n_splits=1,
        train_size=float(split["train"]),
        random_state=seed,
    )
    train_idx, remainder_idx = next(first.split(frame, groups=frame[group_column]))
    train = frame.iloc[train_idx].reset_index(drop=True)
    remainder = frame.iloc[remainder_idx].reset_index(drop=True)

    validation_share = float(split["validation"]) / (
        float(split["validation"]) + float(split["test"])
    )
    second = GroupShuffleSplit(
        n_splits=1,
        train_size=validation_share,
        random_state=seed + 1,
    )
    val_idx, test_idx = next(second.split(remainder, groups=remainder[group_column]))
    validation = remainder.iloc[val_idx].reset_index(drop=True)
    test = remainder.iloc[test_idx].reset_index(drop=True)

    train_groups = _group_set(train, group_column)
    val_groups = _group_set(validation, group_column)
    test_groups = _group_set(test, group_column)
    if train_groups & val_groups or train_groups & test_groups or val_groups & test_groups:
        raise RuntimeError("Group leakage detected across train/validation/test splits")

    return DataSplits(train=train, validation=validation, test=test)


def build_pipeline(config: Mapping[str, Any], number_of_classes: int) -> Pipeline:
    """Build one serialisable sklearn pipeline containing preprocessing + XGBoost."""
    features = list(config["feature_columns"])
    prep = config["preprocessing"]
    transformers: list[tuple[str, Any, Any]] = []

    if "text" in features:
        transformers.append(
            (
                "text_tfidf",
                TfidfVectorizer(
                    max_features=int(prep["text_max_features"]),
                    ngram_range=tuple(int(value) for value in prep["text_ngram_range"]),
                    lowercase=True,
                    dtype=np.float32,
                ),
                "text",
            )
        )
    if "url" in features:
        transformers.append(
            (
                "url_tfidf",
                TfidfVectorizer(
                    analyzer="char_wb",
                    max_features=int(prep["url_max_features"]),
                    ngram_range=tuple(int(value) for value in prep["url_ngram_range"]),
                    lowercase=True,
                    dtype=np.float32,
                ),
                "url",
            )
        )

    categorical = [name for name in features if name not in {"text", "url"}]
    if categorical:
        transformers.append(
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore", dtype=np.float32),
                categorical,
            )
        )

    preprocessor = ColumnTransformer(transformers=transformers, remainder="drop")
    model_params = dict(config["model"])
    if number_of_classes > 2:
        model_params.setdefault("objective", "multi:softprob")
        model_params.setdefault("num_class", number_of_classes)
    model = XGBClassifier(**model_params)
    return Pipeline([("preprocessor", preprocessor), ("model", model)])


def _prepare_features(frame: pd.DataFrame, feature_columns: list[str]) -> pd.DataFrame:
    features = frame[feature_columns].copy()
    for column in feature_columns:
        features[column] = features[column].fillna("").astype(str)
    return features


def _metrics(y_true: np.ndarray, y_pred: np.ndarray, encoder: LabelEncoder) -> dict[str, Any]:
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 6),
        "per_class": classification_report(
            y_true,
            y_pred,
            labels=np.arange(len(encoder.classes_)),
            target_names=[str(value) for value in encoder.classes_],
            output_dict=True,
            zero_division=0,
        ),
    }


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_bundle(path: str | Path) -> dict[str, Any]:
    """Load a package and verify its minimum schema."""
    bundle = joblib.load(Path(path))
    required = {"schema_version", "model_version", "pipeline", "label_classes", "feature_columns", "decision_thresholds", "metadata"}
    if not isinstance(bundle, dict) or not required.issubset(bundle):
        raise ValueError("Invalid M7 model package")
    return bundle


def predict_one(bundle_or_path: Mapping[str, Any] | str | Path, record: Mapping[str, Any]) -> dict[str, Any]:
    """Run the single public prediction function required by M7."""
    bundle = load_bundle(bundle_or_path) if isinstance(bundle_or_path, (str, Path)) else dict(bundle_or_path)
    features = list(bundle["feature_columns"])
    missing = sorted(name for name in features if name not in record)
    if missing:
        raise ValueError(f"Prediction input is missing required fields: {missing}")

    row = pd.DataFrame([{name: "" if record[name] is None else str(record[name]) for name in features}])
    encoded = int(bundle["pipeline"].predict(row)[0])
    probabilities = np.asarray(bundle["pipeline"].predict_proba(row)[0], dtype=float)
    classes = [str(value) for value in bundle["label_classes"]]
    return {
        "predicted_label": classes[encoded],
        "confidence_score": round(float(probabilities.max()), 6),
        "class_probabilities": {
            label: round(float(probability), 6)
            for label, probability in zip(classes, probabilities)
        },
        "model_version": str(bundle["model_version"]),
        "package_schema_version": str(bundle["schema_version"]),
        "target": str(bundle["metadata"]["target_column"]),
        "production_eligible": bool(bundle["metadata"]["production_eligible"]),
    }


def run_training_and_verification(
    repo_root: str | Path,
    config_path: str | Path = DEFAULT_CONFIG_PATH,
    bundle_path: str | Path | None = None,
    report_path: str | Path | None = None,
) -> dict[str, Any]:
    """Train, package, reload and verify one deterministic prediction."""
    root = Path(repo_root).resolve()
    config = load_config(config_path)
    dataset_path = _resolve_repo_path(root, config["dataset_path"])
    destination = Path(bundle_path) if bundle_path else _resolve_repo_path(root, config["outputs"]["bundle_path"])
    report_destination = Path(report_path) if report_path else _resolve_repo_path(root, config["outputs"]["report_path"])

    frame = load_dataset(dataset_path, config)
    splits = split_before_preprocessing(frame, config)
    target = str(config["target_column"])
    group_column = str(config["group_column"])
    features = list(config["feature_columns"])

    encoder = LabelEncoder()
    y_train = encoder.fit_transform(splits.train[target].astype(str))
    unknown_validation = sorted(set(splits.validation[target].astype(str)) - set(encoder.classes_))
    unknown_test = sorted(set(splits.test[target].astype(str)) - set(encoder.classes_))
    if unknown_validation or unknown_test:
        raise ConfigurationError(
            f"Holdout splits contain unseen labels: validation={unknown_validation}, test={unknown_test}"
        )
    y_validation = encoder.transform(splits.validation[target].astype(str))
    y_test = encoder.transform(splits.test[target].astype(str))

    x_train = _prepare_features(splits.train, features)
    x_validation = _prepare_features(splits.validation, features)
    x_test = _prepare_features(splits.test, features)
    pipeline = build_pipeline(config, len(encoder.classes_))
    pipeline.fit(x_train, y_train)

    validation_predictions = pipeline.predict(x_validation)
    test_predictions = pipeline.predict(x_test)
    created_at = datetime.now(timezone.utc).isoformat()
    bundle: dict[str, Any] = {
        "schema_version": "phoenix.m7.model-package.v1",
        "model_version": config["model_version"],
        "pipeline": pipeline,
        "label_classes": [str(value) for value in encoder.classes_],
        "feature_columns": features,
        "decision_thresholds": dict(config["decision_thresholds"]),
        "metadata": {
            "created_at": created_at,
            "purpose": config.get("purpose", ""),
            "target_column": target,
            "group_column": group_column,
            "preprocessing_fit_scope": "training_split_only",
            "split_before_preprocessing": True,
            "group_disjoint_split": True,
            "production_eligible": False,
            "production_blocker": "No approved is_phishing labels are available; this package predicts the inherited hazard_severity target only.",
        },
    }

    sample = x_test.iloc[0].to_dict()
    before = predict_one(bundle, sample)
    destination.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, destination)
    loaded = load_bundle(destination)
    after = predict_one(loaded, sample)
    reproduced = before == after
    if not reproduced:
        raise RuntimeError("Reloaded package did not reproduce the original prediction")

    train_groups = _group_set(splits.train, group_column)
    validation_groups = _group_set(splits.validation, group_column)
    test_groups = _group_set(splits.test, group_column)
    report = {
        "task": "M7 Week 2 - repaired training/inference pipeline and package",
        "status": "engineering_acceptance_passed",
        "model_version": config["model_version"],
        "purpose": config.get("purpose", ""),
        "dataset": {
            "path": dataset_path.resolve().relative_to(root).as_posix(),
            "rows": len(frame),
            "unique_groups": int(frame[group_column].astype(str).nunique()),
            "target": target,
        },
        "leakage_controls": {
            "explicit_feature_allowlist": features,
            "prohibited_features": list(config["prohibited_features"]),
            "split_before_preprocessing": True,
            "preprocessing_fit_scope": "training_split_only",
            "group_column": group_column,
            "group_overlap_counts": {
                "train_validation": len(train_groups & validation_groups),
                "train_test": len(train_groups & test_groups),
                "validation_test": len(validation_groups & test_groups),
            },
        },
        "split_rows": {
            "train": len(splits.train),
            "validation": len(splits.validation),
            "test": len(splits.test),
        },
        "split_unique_groups": {
            "train": len(train_groups),
            "validation": len(validation_groups),
            "test": len(test_groups),
        },
        "labels": [str(value) for value in encoder.classes_],
        "metrics": {
            "validation": _metrics(y_validation, validation_predictions, encoder),
            "test": _metrics(y_test, test_predictions, encoder),
        },
        "package": {
            "path": destination.resolve().relative_to(root).as_posix(),
            "sha256": _sha256(destination),
            "contains": ["preprocessing", "xgboost_model", "labels", "thresholds", "version", "metadata"],
        },
        "round_trip_verification": {
            "passed": reproduced,
            "sample_input": sample,
            "prediction_before_save": before,
            "prediction_after_reload": after,
        },
        "limitations": [
            "This is an engineering/package baseline for the inherited hazard_severity target, not the final phishing classifier.",
            "Model accuracy must not be used as evidence that PHOENIX phishing detection is complete.",
            "The final model must be retrained after approved is_phishing labels are obtained.",
            "URL was excluded from this legacy package because the inherited dataset could not provide URL-disjoint validation and test partitions.",
        ],
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    report_destination.parent.mkdir(parents=True, exist_ok=True)
    report_destination.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report
