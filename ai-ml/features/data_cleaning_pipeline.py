import numpy as np
import pandas as pd


def _log(events, step, details):
    events.append({"step": step, "details": details})


def handle_type_conversion(df, config, events):
    initial_nulls = int(df.isna().sum().sum())
    int_columns = config.get("int", [])
    float_columns = config.get("float", [])
    datetime_columns = config.get("datetime", [])

    for col in int_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    for col in float_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    for col in datetime_columns:
        if col in df.columns:
            try:
                df[col] = pd.to_datetime(
                    df[col], format="mixed", errors="coerce", utc=True
                )
            except (TypeError, ValueError):
                df[col] = pd.to_datetime(df[col], errors="coerce", utc=True)

    new_nulls = int(df.isna().sum().sum()) - initial_nulls
    if new_nulls > 0:
        _log(events, "type_conversion", f"coerced_invalid_to_null={new_nulls}")
    return df


def handle_missing_values(df, config, events):
    initial_rows = len(df)
    columns_to_drop = config.get("drop", [])
    fill_values = config.get("fill", {})
    null_count_before = int(df.isna().sum().sum())
    _log(events, "missing_values", f"null_values_found={null_count_before}")

    df = df.replace(r"^\s*$", np.nan, regex=True)
    drop_subset = [col for col in columns_to_drop if col in df.columns]
    if drop_subset:
        df = df.dropna(subset=drop_subset)
    if fill_values:
        df = df.fillna(value=fill_values)

    dropped = initial_rows - len(df)
    _log(events, "missing_values", f"rows_dropped={dropped}")
    return df


def handle_duplicates(df, config, events):
    initial_rows = len(df)
    subset = [col for col in config.get("subset", []) if col in df.columns]
    if subset:
        df = df.drop_duplicates(subset=subset, keep="first")
    else:
        df = df.drop_duplicates(keep="first")

    removed = initial_rows - len(df)
    _log(events, "remove_duplicates", f"rows_removed={removed}")
    return df


def handle_string_standardisation(df, columns, events):
    case_mode = "capitalize"
    if isinstance(columns, dict):
        case_mode = columns.get("case", "capitalize")
        columns = columns.get("columns", [])

    transformed = []
    for col in columns:
        if col in df.columns:
            series = df[col].astype("string").str.strip()
            if case_mode == "lower":
                series = series.str.lower()
            elif case_mode == "upper":
                series = series.str.upper()
            elif case_mode == "title":
                series = series.str.title()
            elif case_mode == "capitalize":
                series = series.str.capitalize()
            df[col] = series
            transformed.append(col)
    _log(
        events,
        "transformation",
        f"standardised_columns={transformed}; case={case_mode}",
    )
    return df


def run_cleaning_pipeline(df, config):
    cleaned = df.copy()
    events = []

    cleaned = handle_type_conversion(cleaned, config.get("type_conversion", {}), events)
    cleaned = handle_missing_values(cleaned, config.get("missing_values", {}), events)
    cleaned = handle_duplicates(cleaned, config.get("duplicates", {}), events)
    cleaned = handle_string_standardisation(
        cleaned, config.get("string_standardisation", []), events
    )

    return cleaned, events