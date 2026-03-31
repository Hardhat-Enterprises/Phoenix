import pandas as pd


def make_issue(row, column, rule, value, message):
    return {
        "row": int(row) if row is not None else None,
        "column": column,
        "rule": rule,
        "value": None if pd.isna(value) else str(value),
        "message": message,
    }


def check_required_columns(df, rules):
    issues = []
    required_columns = rules.get("required_columns", [])
    for column in required_columns:
        if column not in df.columns:
            issues.append(
                make_issue(
                    row=None,
                    column=column,
                    rule="required_column",
                    value=None,
                    message=f"Missing required column: {column}",
                )
            )
    return issues


def check_missing_values(df, rules):
    issues = []
    column_rules = rules.get("column_rules", {})
    for column, rule in column_rules.items():
        if column not in df.columns or not rule.get("required", False):
            continue
        for row in df[df[column].isna()].index:
            issues.append(
                make_issue(
                    row=row,
                    column=column,
                    rule="required_value",
                    value=None,
                    message=f"Missing required value in column '{column}'",
                )
            )
    return issues


def check_uniqueness(df, rules):
    issues = []
    column_rules = rules.get("column_rules", {})
    for column, rule in column_rules.items():
        if column not in df.columns or not rule.get("unique", False):
            continue
        duplicate_rows = df[df[column].duplicated(keep=False) & df[column].notna()].index
        for row in duplicate_rows:
            issues.append(
                make_issue(
                    row=row,
                    column=column,
                    rule="unique",
                    value=df.loc[row, column],
                    message=f"Duplicate value found in unique column '{column}'",
                )
            )
    return issues


def check_allowed_values(df, rules):
    issues = []
    column_rules = rules.get("column_rules", {})
    for column, rule in column_rules.items():
        if column not in df.columns:
            continue
        allowed_values = rule.get("allowed_values")
        if not allowed_values:
            continue
        invalid_rows = df[df[column].notna() & ~df[column].isin(allowed_values)].index
        for row in invalid_rows:
            issues.append(
                make_issue(
                    row=row,
                    column=column,
                    rule="allowed_values",
                    value=df.loc[row, column],
                    message=f"Invalid value. Allowed values: {allowed_values}",
                )
            )
    return issues


def check_range(df, rules):
    issues = []
    column_rules = rules.get("column_rules", {})
    for column, rule in column_rules.items():
        if column not in df.columns:
            continue
        min_value = rule.get("min")
        max_value = rule.get("max")
        if min_value is None and max_value is None:
            continue
        numeric_series = pd.to_numeric(df[column], errors="coerce")
        for row, value in numeric_series.items():
            if pd.isna(value):
                continue
            if min_value is not None and value < min_value:
                issues.append(
                    make_issue(
                        row=row,
                        column=column,
                        rule="min",
                        value=df.loc[row, column],
                        message=f"Value below minimum allowed ({min_value})",
                    )
                )
            if max_value is not None and value > max_value:
                issues.append(
                    make_issue(
                        row=row,
                        column=column,
                        rule="max",
                        value=df.loc[row, column],
                        message=f"Value above maximum allowed ({max_value})",
                    )
                )
    return issues


def check_date_format(df, rules):
    issues = []
    column_rules = rules.get("column_rules", {})
    for column, rule in column_rules.items():
        if column not in df.columns or rule.get("type") != "date":
            continue
        date_format = rule.get("format", "%Y-%m-%d")
        for row, value in df[column].items():
            if pd.isna(value):
                continue
            try:
                pd.to_datetime(value, format=date_format)
            except (ValueError, TypeError):
                issues.append(
                    make_issue(
                        row=row,
                        column=column,
                        rule="date_format",
                        value=value,
                        message=f"Invalid date format. Expected format: {date_format}",
                    )
                )
    return issues


def check_data_types(df, rules):
    issues = []
    column_rules = rules.get("column_rules", {})
    for column, rule in column_rules.items():
        if column not in df.columns:
            continue
        expected_type = rule.get("type")
        if expected_type == "int":
            converted = pd.to_numeric(df[column], errors="coerce")
            invalid_rows = df[df[column].notna() & converted.isna()].index
            for row in invalid_rows:
                issues.append(
                    make_issue(
                        row=row,
                        column=column,
                        rule="type",
                        value=df.loc[row, column],
                        message="Expected integer type",
                    )
                )
        elif expected_type == "str":
            for row, value in df[column].items():
                if pd.isna(value):
                    continue
                if not isinstance(value, str):
                    issues.append(
                        make_issue(
                            row=row,
                            column=column,
                            rule="type",
                            value=value,
                            message="Expected string type",
                        )
                    )
    return issues
