"""Preprocessing W6-T4."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.preprocessing import MinMaxScaler, StandardScaler


def find_project_root(start: Path) -> Path:
    """Dynamically locate project root by finding the ai-ml folder."""
    for parent in [start, *start.parents]:
        if (parent / "ai-ml").exists():
            return parent
    raise FileNotFoundError("Could not locate project root (ai-ml folder not found)")


PROJECT_ROOT = find_project_root(Path(__file__).resolve())
CLEANING_SRC = PROJECT_ROOT / "ai-ml" / "cleaning" / "src"

if str(CLEANING_SRC) not in sys.path:
    sys.path.insert(0, str(CLEANING_SRC))

from cleaning.cleaning_pipeline import run_cleaning_pipeline


def _log(events: list[dict[str, str]], step: str, details: str) -> None:
    """Append an event to the preprocessing log."""
    events.append({"step": step, "details": details})


def _get_existing_columns(df: pd.DataFrame, columns: list[str] | None) -> list[str]:
    """Return only columns that exist in the dataframe."""
    if not columns:
        return []
    return [col for col in columns if col in df.columns]


def _get_numeric_columns(df: pd.DataFrame) -> list[str]:
    """Return numeric columns from the dataframe."""
    return df.select_dtypes(include="number").columns.tolist()


def _get_categorical_columns(df: pd.DataFrame) -> list[str]:
    """Return categorical/string columns from the dataframe."""
    return df.select_dtypes(include=["object", "string", "category"]).columns.tolist()


def load_preprocessing_config(config_path: Path) -> dict[str, Any]:
    """Load cleaning and preprocessing config from a JSON file."""
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def apply_normalization(
    df: pd.DataFrame,
    config: dict[str, Any],
    events: list[dict[str, str]],
) -> pd.DataFrame:
    """Apply numeric feature scaling."""
    if not config.get("enabled", True):
        _log(events, "normalization", "skipped_disabled")
        return df

    method = str(config.get("method", "standard")).lower()
    configured_columns = config.get("columns")
    exclude_columns = set(config.get("exclude_columns", []))

    if configured_columns:
        columns = _get_existing_columns(df, configured_columns)
    else:
        columns = _get_numeric_columns(df)

    columns = [col for col in columns if col not in exclude_columns]

    if not columns:
        _log(events, "normalization", "skipped_no_columns")
        return df

    df = df.copy()

    if method == "standard":
        scaler = StandardScaler()
    elif method == "minmax":
        scaler = MinMaxScaler()
    else:
        raise ValueError(
            f"Unsupported normalization method: {method}. Use 'standard' or 'minmax'."
        )

    df[columns] = scaler.fit_transform(df[columns])

    _log(events, "normalization", f"method={method}; columns={columns}")
    return df


def apply_encoding(
    df: pd.DataFrame,
    config: dict[str, Any],
    events: list[dict[str, str]],
) -> pd.DataFrame:
    """Encode remaining categorical columns."""
    if not config.get("enabled", True):
        _log(events, "encoding", "skipped_disabled")
        return df

    method = str(config.get("method", "one_hot")).lower()
    configured_columns = config.get("columns")
    exclude_columns = set(config.get("exclude_columns", []))

    if configured_columns:
        columns = _get_existing_columns(df, configured_columns)
    else:
        columns = _get_categorical_columns(df)

    columns = [col for col in columns if col not in exclude_columns]

    if not columns:
        _log(events, "encoding", "skipped_no_columns")
        return df

    df = df.copy()

    if method != "one_hot":
        raise ValueError(
            f"Unsupported encoding method: {method}. Only 'one_hot' is supported."
        )

    df = pd.get_dummies(
        df,
        columns=columns,
        drop_first=bool(config.get("drop_first", False)),
    )

    _log(events, "encoding", f"method=one_hot; columns={columns}")
    return df


def apply_feature_selection(
    df: pd.DataFrame,
    selected_features: list[str] | None,
    target_column: str | None,
    events: list[dict[str, str]],
) -> pd.DataFrame:
    """Keep selected features and optional target column."""
    if not selected_features:
        _log(events, "feature_selection", "skipped_no_selected_features")
        return df

    keep_columns = [col for col in selected_features if col in df.columns]

    if target_column and target_column in df.columns and target_column not in keep_columns:
        keep_columns.append(target_column)

    if not keep_columns:
        _log(events, "feature_selection", "skipped_no_matching_columns")
        return df

    df = df[keep_columns].copy()
    _log(events, "feature_selection", f"selected_columns={keep_columns}")
    return df


def preprocess_features(
    data: Any,
    cleaning_config: dict[str, Any] | None = None,
    preprocessing_config: dict[str, Any] | None = None,
    selected_features: list[str] | None = None,
    target_column: str | None = None,
) -> tuple[pd.DataFrame, list[dict[str, str]]]:
    """
    Apply cleaning pipeline first, then preprocessing steps.
    """
    cleaning_config = cleaning_config or {}
    preprocessing_config = preprocessing_config or {}

    if isinstance(data, dict):
        df = data.get("data")
    elif isinstance(data, pd.DataFrame):
        df = data
    else:
        raise TypeError("data must be a pandas DataFrame or loader output dictionary")

    if not isinstance(df, pd.DataFrame):
        raise TypeError("Loaded data must contain a pandas DataFrame")

    if cleaning_config:
        processed, events = run_cleaning_pipeline(df, cleaning_config)
        _log(events, "cleaning", "applied")
    else:
        processed = df.copy()
        events: list[dict[str, str]] = []
        _log(events, "cleaning", "skipped_no_config")

    _log(events, "start", f"post_cleaning_shape={processed.shape}")

    encoding_config = dict(preprocessing_config.get("encoding", {}))
    normalization_config = dict(preprocessing_config.get("normalization", {}))

    if target_column and target_column in processed.columns:
        encoding_exclude = set(encoding_config.get("exclude_columns", []))
        normalization_exclude = set(normalization_config.get("exclude_columns", []))
        encoding_exclude.add(target_column)
        normalization_exclude.add(target_column)
        encoding_config["exclude_columns"] = sorted(encoding_exclude)
        normalization_config["exclude_columns"] = sorted(normalization_exclude)
        _log(events, "target_protection", f"excluded_from_transform={target_column}")

    processed = apply_encoding(
        processed,
        encoding_config,
        events,
    )

    processed = apply_normalization(
        processed,
        normalization_config,
        events,
    )

    processed = apply_feature_selection(
        processed,
        selected_features,
        target_column,
        events,
    )

    _log(events, "end", f"output_shape={processed.shape}")
    return processed, events


def run_pipeline() -> tuple[pd.DataFrame, list[dict[str, str]]]:
    """Simple local test runner."""
    try:
        from .feature_loader import load_feature_set
    except ImportError:
        from feature_loader import load_feature_set

    feature_csv = PROJECT_ROOT / "ai-ml" / "features" / "ai004_features_output.csv"
    config_path = (
        PROJECT_ROOT
        / "ai-ml"
        / "training_pipeline"
        / "configs"
        / "preprocessing_config.json"
    )

    loaded = load_feature_set(feature_csv)
    config = load_preprocessing_config(config_path)

    cleaning_config = config.get("cleaning", {})
    preprocessing_config = config.get("preprocessing", {})

    processed_df, events = preprocess_features(
        data=loaded,
        cleaning_config=cleaning_config,
        preprocessing_config=preprocessing_config,
        selected_features=None,
        target_column=None,
    )

    print("\nProcessed Data")
    print(processed_df.head())

    print("\nEvents Log")
    print(pd.DataFrame(events))

    return processed_df, events


if __name__ == "__main__":
    run_pipeline()
