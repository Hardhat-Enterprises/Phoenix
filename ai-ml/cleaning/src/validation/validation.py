import json
import os

import pandas as pd

from .report_generator import generate_report
from .validators import (
    check_allowed_values,
    check_data_types,
    check_date_format,
    check_missing_values,
    check_range,
    check_required_columns,
    check_uniqueness,
)


def load_rules(rules_path):
    with open(rules_path, "r", encoding="utf-8") as file:
        data = json.load(file)
    # Supports both legacy rules-only JSON and unified pipeline config JSON.
    if "validation" in data and "column_rules" not in data:
        return data["validation"]
    return data


def run_validation_df(df, rules, dataset_name="dataset.csv"):
    issues = []
    issues.extend(check_required_columns(df, rules))
    issues.extend(check_missing_values(df, rules))
    issues.extend(check_uniqueness(df, rules))
    issues.extend(check_allowed_values(df, rules))
    issues.extend(check_range(df, rules))
    issues.extend(check_date_format(df, rules))
    issues.extend(check_data_types(df, rules))
    return generate_report(df, issues, dataset_name)


def run_validation(data_path, rules_path):
    df = pd.read_csv(data_path)
    rules = load_rules(rules_path)
    return run_validation_df(df, rules, dataset_name=os.path.basename(data_path))
