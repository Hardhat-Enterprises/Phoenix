import json
import os
import pandas as pd

from validators import (
    check_required_columns,
    check_missing_values,
    check_uniqueness,
    check_allowed_values,
    check_range,
    check_date_format,
    check_data_types
)
from report_generator import generate_report


def load_rules(rules_path):
    with open(rules_path, "r", encoding="utf-8") as file:
        return json.load(file)


def run_validation(data_path, rules_path):
    df = pd.read_csv(data_path)
    rules = load_rules(rules_path)

    issues = []

    issues.extend(check_required_columns(df, rules))
    issues.extend(check_missing_values(df, rules))
    issues.extend(check_uniqueness(df, rules))
    issues.extend(check_allowed_values(df, rules))
    issues.extend(check_range(df, rules))
    issues.extend(check_date_format(df, rules))
    issues.extend(check_data_types(df, rules))

    report = generate_report(df, issues, os.path.basename(data_path))
    return report