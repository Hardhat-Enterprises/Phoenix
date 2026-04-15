"""Preprocessing W6-T4."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.preprocessing import MinMaxScaler, StandardScaler


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


def apply_missing_value_handling(
    df: pd.DataFrame,
    config: dict[str, Any],
    events: list[dict[str, str]],
) -> pd.DataFrame:
    """Apply missing value handling."""
    if not config.get("enabled", True):
        _log(events, "missing_values", "skipped_disabled")
        return df

    df = df.copy()

    before_nulls = int(df.isna().sum().sum())

    fill_values = {
        key: value
        for key, value in config.get("fill_values", {}).items()
        if key in df.columns
    }
    if fill_values:
        df = df.fillna(fill_values)

    numeric_strategy = str(config.get("numeric_strategy", "median")).lower()
    numeric_columns = _get_numeric_columns(df)

    for col in numeric_columns:
        if df[col].isna().any():
            if numeric_strategy == "mean":
                df[col] = df[col].fillna(df[col].mean())
            else:
                df[col] = df[col].fillna(df[col].median())

    categorical_columns = _get_categorical_columns(df)
    for col in categorical_columns:
        if df[col].isna().any():
            mode = df[col].mode(dropna=True)
            if not mode.empty:
                df[col] = df[col].fillna(mode.iloc[0])

    after_nulls = int(df.isna().sum().sum())
    _log(
        events,
        "missing_values",
        f"before={before_nulls}; after={after_nulls}; handled={before_nulls - after_nulls}",
    )
    return df


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
        raise ValueError(f"Unsupported normalization method: {method}")

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
        raise ValueError(f"Unsupported encoding method: {method}")

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
    preprocessing_config: dict[str, Any] | None = None,
    selected_features: list[str] | None = None,
    target_column: str | None = None,
) -> tuple[pd.DataFrame, list[dict[str, str]]]:
    preprocessing_config = preprocessing_config or {}
    events: list[dict[str, str]] = []

    if isinstance(data, dict):
        df = data.get("data")
    elif isinstance(data, pd.DataFrame):
        df = data
    else:
        raise TypeError("data must be a pandas DataFrame or loader output dictionary")

    if not isinstance(df, pd.DataFrame):
        raise TypeError("Loaded data must contain a pandas DataFrame")

    processed = df.copy()
    _log(events, "start", f"input_shape={processed.shape}")

    processed = apply_missing_value_handling(
        processed,
        preprocessing_config.get("missing_values", {}),
        events,
    )

    processed = apply_encoding(
        processed,
        preprocessing_config.get("encoding", {}),
        events,
    )

    processed = apply_normalization(
        processed,
        preprocessing_config.get("normalization", {}),
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

def find_project_root(start: Path) -> Path:
    """Dynamically locate project root by finding 'ai-ml' folder."""
    for parent in [start, *start.parents]:
        if (parent / "ai-ml").exists():
            return parent
    raise FileNotFoundError("Could not locate project root (ai-ml folder not found)")


def run_pipeline() -> tuple[pd.DataFrame, list[dict[str, str]]]:
    """Simple local test runner."""
    from pathlib import Path

    from feature_loader import load_feature_set

    project_root = find_project_root(Path(__file__).resolve())
    feature_csv = project_root / "ai-ml" / "features" / "ai004_features_output.csv"

    loaded = load_feature_set(feature_csv)

    preprocessing_config = {
        "missing_values": {
            "enabled": True,
            "numeric_strategy": "median",
            "fill_values": {},
        },
        "encoding": {
            "enabled": True,
            "method": "one_hot",
            "exclude_columns": ["timestamp"],
            "drop_first": False,
        },
        "normalization": {
            "enabled": True,
            "method": "standard",
            "exclude_columns": [ 
                "location_encoded", # Encoded categorical column, no need to normalize
                "multi_event_overlap_flag", # Flags are binary, no need to normalize
                "incident_peak_flag", # Flags are binary, no need to normalize
                "outlier_flag", # Flags are binary, no need to normalize
                "z_score", # Already standardized (mean=0, std=1) in AI004
                "time_decay_factor", # Bounded/scaled
                "hazard_normalized", # Bounded/scaled
                "cyber_intensity_score", # Bounded/scaled
                "geo_risk_zone_score", # Ordinal mapping
                "cyber_attack_frequency", # Not continuous, scaling could distort
                "regional_event_count", # Not continuous, scaling could distort

            ],
        },
    }

    processed_df, events = preprocess_features(
        data=loaded,
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
