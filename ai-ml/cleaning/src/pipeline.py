import json
from pathlib import Path

import pandas as pd

from .cleaning import run_cleaning_pipeline
from .logging import compare_before_after, write_log_file
from .validation import run_validation_df


def _resolve_paths(base_dir, paths_config):
    resolved = {}
    for key, value in paths_config.items():
        resolved[key] = str((base_dir / value).resolve())
    return resolved


def _write_json(path, data):
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _dataset_rules_match_columns(validation_config, columns):
    required = set(validation_config.get("required_columns", []))
    return required.issubset(set(columns))


def _select_rules(config, raw_columns):
    datasets = config.get("datasets", {})
    dataset_type = config.get("dataset_type", "generic")

    if dataset_type in datasets:
        selected = datasets[dataset_type]
        cleaning_config = selected["cleaning"]
        validation_config = selected["validation"]
        if _dataset_rules_match_columns(validation_config, raw_columns):
            return cleaning_config, validation_config, dataset_type

    for name, dataset_config in datasets.items():
        validation_config = dataset_config.get("validation", {})
        if _dataset_rules_match_columns(validation_config, raw_columns):
            return dataset_config["cleaning"], validation_config, name

    return config["cleaning"], config["validation"], "generic"


def run_pipeline(config_path):
    config_file = Path(config_path).resolve()
    with config_file.open("r", encoding="utf-8") as file:
        config = json.load(file)

    base_dir = config_file.parent.parent
    paths = _resolve_paths(base_dir, config["paths"])

    raw_df = pd.read_csv(paths["input_csv"])
    cleaning_config, validation_config, effective_dataset_type = _select_rules(
        config, raw_df.columns
    )
    cleaned_df, cleaning_events = run_cleaning_pipeline(raw_df, cleaning_config)
    comparison_report = compare_before_after(raw_df, cleaned_df)
    validation_report = run_validation_df(
        cleaned_df,
        validation_config,
        dataset_name=Path(paths["input_csv"]).name,
    )

    Path(paths["cleaned_csv"]).parent.mkdir(parents=True, exist_ok=True)
    cleaned_df.to_csv(paths["cleaned_csv"], index=False)
    _write_json(paths["comparison_report"], comparison_report)
    _write_json(paths["validation_report"], validation_report)
    write_log_file(cleaning_events, paths["pipeline_log"])

    return {
        "input_rows": int(raw_df.shape[0]),
        "output_rows": int(cleaned_df.shape[0]),
        "issues_found": validation_report["total_issues"],
        "status": validation_report["status"],
        "dataset_type": effective_dataset_type,
        "outputs": paths,
    }
