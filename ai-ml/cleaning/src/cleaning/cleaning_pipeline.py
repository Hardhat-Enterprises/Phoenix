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


# ADDED: validates cross-column temperature logic.
# This fixes cases where max_temperature is lower than min_temperature.
def validate_temperature_logic(df, config, events):
    min_col = config.get("min_column", "min_temperature")
    max_col = config.get("max_column", "max_temperature")

    if not {min_col, max_col}.issubset(df.columns):
        _log(events, "temperature_logic_validation", "skipped=missing_required_columns")
        return df

    try:
        invalid_mask = df[max_col] < df[min_col]
    except TypeError:
        _log(events, "temperature_logic_validation", "skipped=non_numeric_columns")
        return df

    invalid_count = int(invalid_mask.sum())

    if invalid_count > 0:
        df.loc[invalid_mask, [min_col, max_col]] = df.loc[
            invalid_mask, [max_col, min_col]
        ].to_numpy()

    _log(
        events,
        "temperature_logic_validation",
        f"invalid_temperature_rows_fixed={invalid_count}",
    )

    return df


# ADDED: validates timestamp ordering.
# This fixes cases where event_end_time happens before event_start_time.
def validate_timestamp_sequence(df, config, events):
    start_col = config.get("start_column", "event_start_time")
    end_col = config.get("end_column", "event_end_time")

    if not {start_col, end_col}.issubset(df.columns):
        _log(events, "timestamp_sequence_validation", "skipped=missing_required_columns")
        return df

    invalid_mask = df[end_col] < df[start_col]
    invalid_count = int(invalid_mask.sum())

    if invalid_count > 0:
        df.loc[invalid_mask, end_col] = df.loc[invalid_mask, start_col]

    _log(
        events,
        "timestamp_sequence_validation",
        f"invalid_timestamp_sequences_fixed={invalid_count}",
    )

    return df


# ADDED: validates region/subregion consistency.
# This fixes cases where a subregion does not belong to the selected region.
def validate_region_subregion(df, config, events):
    region_col = config.get("region_column", "region")
    subregion_col = config.get("subregion_column", "subregion")
    fallback_value = config.get("fallback_value", "Unknown")

    valid_region_map = config.get(
        "valid_map",
        {
            "Victoria": ["Melbourne", "Geelong", "Ballarat"],
            "New South Wales": ["Sydney", "Newcastle", "Wollongong"],
            "Queensland": ["Brisbane", "Gold Coast", "Cairns"],
        },
    )

    if not {region_col, subregion_col}.issubset(df.columns):
        _log(events, "region_subregion_validation", "skipped=missing_required_columns")
        return df

    normalised_valid_map = {
        str(region).strip().lower(): [
            str(subregion).strip().lower() for subregion in subregions
        ]
        for region, subregions in valid_region_map.items()
    }

    invalid_indices = []

    for index, row in df.iterrows():
        region = row[region_col]
        subregion = row[subregion_col]

        if pd.isna(region) or pd.isna(subregion):
            continue

        region_key = str(region).strip().lower()
        subregion_value = str(subregion).strip().lower()

        valid_subregions = normalised_valid_map.get(region_key, [])

        if subregion_value not in valid_subregions:
            invalid_indices.append(index)

    if invalid_indices:
        df.loc[invalid_indices, subregion_col] = fallback_value

    _log(
        events,
        "region_subregion_validation",
        f"invalid_region_subregion_rows_fixed={len(invalid_indices)}",
    )

    return df


# ADDED: validates dependency columns.
# This fixes partial null groups such as latitude existing without longitude.
def validate_partial_null_dependencies(df, config, events):
    dependency_groups = config.get(
        "groups",
        [
            ["latitude", "longitude"],
            ["event_start_time", "event_end_time"],
        ],
    )

    total_fixed_rows = 0

    for group in dependency_groups:
        existing_cols = [col for col in group if col in df.columns]

        if len(existing_cols) < 2:
            continue

        partial_null_mask = (
            df[existing_cols].isna().any(axis=1)
            & ~df[existing_cols].isna().all(axis=1)
        )

        fixed_count = int(partial_null_mask.sum())

        if fixed_count > 0:
            df.loc[partial_null_mask, existing_cols] = np.nan
            total_fixed_rows += fixed_count

    _log(
        events,
        "partial_null_dependency_validation",
        f"partial_null_dependency_rows_fixed={total_fixed_rows}",
    )

    return df


# ADDED: validates numeric fields that should not be negative.
# This fixes impossible negative values such as negative rainfall or incident counts.
def validate_non_negative_values(df, config, events):
    columns = config.get(
        "columns",
        [
            "rainfall",
            "severity",
            "cyber_incidents",
            "risk_score",
        ],
    )

    fixed_count = 0

    for col in columns:
        if col in df.columns:
            try:
                negative_mask = df[col] < 0
            except TypeError:
                _log(
                    events,
                    "non_negative_validation",
                    f"skipped_non_numeric_column={col}",
                )
                continue

            count = int(negative_mask.sum())

            if count > 0:
                df.loc[negative_mask, col] = 0
                fixed_count += count

    _log(
        events,
        "non_negative_validation",
        f"negative_values_fixed={fixed_count}",
    )

    return df


# ADDED: groups the new advanced validation rules together.
def handle_advanced_validation(df, config, events):
    df = validate_temperature_logic(
        df,
        config.get("temperature_logic", {}),
        events,
    )

    df = validate_timestamp_sequence(
        df,
        config.get("timestamp_sequence", {}),
        events,
    )

    df = validate_region_subregion(
        df,
        config.get("region_subregion", {}),
        events,
    )

    df = validate_partial_null_dependencies(
        df,
        config.get("partial_null_dependencies", {}),
        events,
    )

    df = validate_non_negative_values(
        df,
        config.get("non_negative_values", {}),
        events,
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

    # ADDED: run advanced logical validation after existing cleaning steps.
    cleaned = handle_advanced_validation(
        cleaned,
        config.get("advanced_validation", {}),
        events,
    )

    return cleaned, events