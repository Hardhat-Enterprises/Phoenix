from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

if __package__ is None or __package__ == "":
    import sys

    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from core.checkpoint_manager import CheckpointManager
    from core.logger import (
        get_logger,
        log_config_snapshot,
        log_error,
        log_metric,
        log_run_event,
    )
    from core.trainer import GenericTrainingEngine, TrainingConfig
    from data.dataset_loader import DatasetLoader
    from data.splitter import DatasetSplitter
    from evaluation.validator import validate_predictions
    from preprocessing.preprocess import preprocess_features
    from utils.config_loader import load_config
    from utils.paths import ensure_runtime_dirs
    from utils.seeds import set_seed
else:
    from .core.checkpoint_manager import CheckpointManager
    from .core.logger import (
        get_logger,
        log_config_snapshot,
        log_error,
        log_metric,
        log_run_event,
    )
    from .core.trainer import GenericTrainingEngine, TrainingConfig
    from .data.dataset_loader import DatasetLoader
    from .data.splitter import DatasetSplitter
    from .evaluation.validator import validate_predictions
    from .preprocessing.preprocess import preprocess_features
    from .utils.config_loader import load_config
    from .utils.paths import ensure_runtime_dirs
    from .utils.seeds import set_seed


PIPELINE_ROOT = Path(__file__).resolve().parent.parent


def _resolve_path(base_dir: Path, raw_path: str | None) -> Path | None:
    if not raw_path:
        return None
    path = Path(raw_path)
    if not path.is_absolute():
        path = base_dir / path
    return path


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file_obj:
        return json.load(file_obj)


def _load_preprocessing_runtime_config(
    base_dir: Path,
    config: dict[str, Any],
    preprocessing_config_path: str | Path | None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    runtime_path = _resolve_path(base_dir, str(preprocessing_config_path)) if preprocessing_config_path else None
    default_training_preprocessing = base_dir / "configs" / "preprocessing_config.json"
    default_cleaning_pipeline = base_dir.parent / "cleaning" / "config" / "pipeline_config.json"

    source_candidates: list[Path] = []
    if runtime_path is not None:
        source_candidates.append(runtime_path)
    source_candidates.extend([default_training_preprocessing, default_cleaning_pipeline])

    merged_config: dict[str, Any] = {}
    for source_path in source_candidates:
        if source_path.exists():
            source_data = _load_json(source_path)
            merged_config = {**merged_config, **source_data}

    cleaning_config = dict(merged_config.get("cleaning", {}))
    preprocessing_config = dict(merged_config.get("preprocessing", {}))

    if not cleaning_config:
        raise FileNotFoundError(
            "No cleaning configuration available. Provide --preprocessing-config or add "
            f"default config at '{default_training_preprocessing}' or '{default_cleaning_pipeline}'."
        )

    if preprocessing_config:
        return cleaning_config, preprocessing_config

    default_prep = config.get("preprocessing", {})
    encoding_method = str(default_prep.get("encoding", "onehot")).lower()
    normalization_method = str(default_prep.get("normalization", "standard")).lower()

    encoding_enabled = encoding_method != "none"
    normalization_enabled = normalization_method != "none"

    encoding_method = "one_hot" if encoding_method in {"onehot", "one_hot"} else "one_hot"
    normalization_method = (
        "standard" if normalization_method not in {"standard", "minmax"} else normalization_method
    )

    return (
        cleaning_config,
        {
            "encoding": {
                "enabled": encoding_enabled,
                "method": encoding_method,
            },
            "normalization": {
                "enabled": normalization_enabled,
                "method": normalization_method,
            },
        },
    )


def _combine_datasets(main_df: pd.DataFrame, abnormal_df: pd.DataFrame | None) -> pd.DataFrame:
    if abnormal_df is None:
        return main_df
    return pd.concat([main_df, abnormal_df], ignore_index=True)


def run_training_pipeline(
    config_path: str | Path,
    preprocessing_config_path: str | Path | None = None,
    run_id: str | None = None,
    save_checkpoint: bool = True,
) -> dict[str, Any]:
    ensure_runtime_dirs()
    config = load_config(config_path)

    seed = int(config.get("dataset", {}).get("random_seed", 42))
    set_seed(seed)

    output_cfg = config.get("output", {})
    log_dir = _resolve_path(PIPELINE_ROOT, output_cfg.get("log_path", "logs")) or (
        PIPELINE_ROOT / "logs"
    )
    checkpoint_dir = _resolve_path(PIPELINE_ROOT, output_cfg.get("path", "checkpoints")) or (
        PIPELINE_ROOT / "checkpoints"
    )
    checkpoint_prefix = str(output_cfg.get("checkpoint_prefix", "model")).strip() or "model"

    active_run_id = run_id or datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    logger = get_logger(
        name="training_pipeline",
        run_id=active_run_id,
        log_dir=log_dir,
    )
    log_config_snapshot(logger, config)

    dataset_cfg = config.get("dataset", {})
    dataset_path = _resolve_path(PIPELINE_ROOT, dataset_cfg.get("path"))
    abnormal_raw = dataset_cfg.get("abnormal_path")
    target_raw = dataset_cfg.get("target_column")
    abnormal_path = _resolve_path(PIPELINE_ROOT, abnormal_raw) if abnormal_raw else None
    target_column = target_raw if target_raw else None

    if dataset_path is None:
        raise ValueError("dataset.path is required in config.")

    main_dataset, abnormal_dataset = DatasetLoader.load_main_and_abnormal(
        main_path=dataset_path,
        abnormal_path=abnormal_path,
    )
    combined_df = _combine_datasets(
        main_dataset.data,
        abnormal_dataset.data if abnormal_dataset is not None else None,
    )
    log_run_event(
        logger,
        "Dataset loaded",
        main_rows=len(main_dataset.data),
        abnormal_rows=0 if abnormal_dataset is None else len(abnormal_dataset.data),
        combined_rows=len(combined_df),
    )

    cleaning_config, preprocessing_config = _load_preprocessing_runtime_config(
        PIPELINE_ROOT,
        config,
        preprocessing_config_path,
    )
    processed_df, preprocessing_events = preprocess_features(
        data=combined_df,
        cleaning_config=cleaning_config,
        preprocessing_config=preprocessing_config,
        target_column=target_column,
    )
    log_run_event(
        logger,
        "Preprocessing complete",
        processed_rows=len(processed_df),
        processed_columns=len(processed_df.columns),
        preprocessing_events=len(preprocessing_events),
    )

    x, y = DatasetLoader.separate_features_and_target(processed_df, target_column=target_column)
    split_data = DatasetSplitter.split(
        x=x,
        y=y,
        test_size=float(dataset_cfg.get("test_split", 0.2)),
        val_size=float(dataset_cfg.get("val_split", 0.2)),
        random_seed=seed,
        stratify=bool(dataset_cfg.get("stratify", True)),
    )

    training_config = TrainingConfig.from_pipeline_config(config=config, verbose=False)
    engine = GenericTrainingEngine(training_config)
    engine.fit(
        split_data.x_train,
        split_data.y_train,
        split_data.x_val,
        split_data.y_val,
    )
    log_run_event(logger, "Training complete", model_name=training_config.model_name)

    val_predictions = engine.predict(split_data.x_val)
    test_predictions = engine.predict(split_data.x_test)

    try:
        val_metrics = validate_predictions(split_data.y_val, val_predictions)
        test_metrics = validate_predictions(split_data.y_test, test_predictions)
    except NotImplementedError:
        val_metrics = {}
        test_metrics = {}
        log_run_event(
            logger,
            "Evaluation skipped",
            reason="validator_not_implemented",
        )

    for metric_name, metric_value in val_metrics.items():
        log_metric(logger, f"val_{metric_name}", metric_value)
    for metric_name, metric_value in test_metrics.items():
        log_metric(logger, f"test_{metric_name}", metric_value)

    checkpoint_path: Path | None = None
    if save_checkpoint:
        checkpoint_manager = CheckpointManager(checkpoint_dir=checkpoint_dir)
        checkpoint_path = checkpoint_manager.save(
            engine.model,
            f"{checkpoint_prefix}_{active_run_id}",
        )
        log_run_event(logger, "Checkpoint saved", checkpoint_path=str(checkpoint_path))

    result = {
        "run_id": active_run_id,
        "metrics": {
            "validation": val_metrics,
            "test": test_metrics,
        },
        "checkpoint_path": str(checkpoint_path) if checkpoint_path is not None else None,
        "rows": {
            "input": len(combined_df),
            "processed": len(processed_df),
            "train": len(split_data.x_train),
            "val": len(split_data.x_val),
            "test": len(split_data.x_test),
        },
    }
    return result


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run integrated PHOENIX training pipeline.")
    parser.add_argument(
        "--config",
        type=str,
        default=str(PIPELINE_ROOT / "configs" / "default_config.yaml"),
        help="Path to main YAML/JSON config file.",
    )
    parser.add_argument(
        "--preprocessing-config",
        type=str,
        default=None,
        help="Optional JSON config for cleaning/preprocessing.",
    )
    parser.add_argument(
        "--run-id",
        type=str,
        default=None,
        help="Optional run identifier for logs/checkpoints.",
    )
    parser.add_argument(
        "--no-checkpoint",
        action="store_true",
        help="Disable checkpoint saving.",
    )
    return parser


def main() -> None:
    args = _build_arg_parser().parse_args()
    try:
        result = run_training_pipeline(
            config_path=args.config,
            preprocessing_config_path=args.preprocessing_config,
            run_id=args.run_id,
            save_checkpoint=not args.no_checkpoint,
        )
        print(json.dumps(result, indent=2))
    except Exception as exc:
        fallback_logger = get_logger(
            name="training_pipeline_error",
            run_id=args.run_id,
            log_dir=PIPELINE_ROOT / "logs",
        )
        log_error(fallback_logger, "Pipeline execution failed", exc=exc)
        raise


if __name__ == "__main__":
    main()
