from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

if __package__ and __package__.startswith("src."):
    from ..data.dataset_loader import DatasetLoader
    from ..data.splitter import DatasetSplitter
    from ..evaluation.validator import validate_predictions
    from ..preprocessing.preprocess import preprocess_features
    from ..utils.config_loader import load_config
    from ..utils.paths import ensure_runtime_dirs
    from ..utils.seeds import set_seed
    from .checkpoint_manager import CheckpointManager
    from .logger import get_logger, log_config_snapshot, log_metric, log_run_event
    from .trainer import GenericTrainingEngine, TrainingConfig
else:
    from core.checkpoint_manager import CheckpointManager
    from core.logger import get_logger, log_config_snapshot, log_metric, log_run_event
    from core.trainer import GenericTrainingEngine, TrainingConfig
    from data.dataset_loader import DatasetLoader
    from data.splitter import DatasetSplitter
    from evaluation.validator import validate_predictions
    from preprocessing.preprocess import preprocess_features
    from utils.config_loader import load_config
    from utils.paths import ensure_runtime_dirs
    from utils.seeds import set_seed


PIPELINE_ROOT = Path(__file__).resolve().parents[2]


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
    runtime_path = (
        _resolve_path(base_dir, str(preprocessing_config_path))
        if preprocessing_config_path
        else None
    )
    merged_config: dict[str, Any] = {}
    if runtime_path is not None:
        if not runtime_path.exists():
            raise FileNotFoundError(
                f"Preprocessing config file not found: {runtime_path}"
            )
        merged_config = _load_json(runtime_path)

    cleaning_config = dict(merged_config.get("cleaning", {}))
    preprocessing_config = dict(merged_config.get("preprocessing", {}))

    if preprocessing_config:
        return cleaning_config, preprocessing_config

    default_prep = config.get("preprocessing", {})
    encoding_method = str(default_prep.get("encoding", "onehot")).lower()
    normalization_method = str(default_prep.get("normalization", "standard")).lower()

    encoding_enabled = encoding_method != "none"
    normalization_enabled = normalization_method != "none"

    return (
        cleaning_config,
        {
            "selected_features": list(default_prep.get("selected_features", [])),
            "encoding": {
                "enabled": encoding_enabled,
                "method": "one_hot",
            },
            "normalization": {
                "enabled": normalization_enabled,
                "method": (
                    normalization_method
                    if normalization_method in {"standard", "minmax"}
                    else "standard"
                ),
            },
        },
    )


def _normalize_selected_features(value: Any) -> list[str] | None:
    if value is None:
        return None
    if not isinstance(value, list):
        return None
    normalized = [str(item) for item in value if str(item).strip()]
    return normalized or None


def _combine_datasets(main_df: pd.DataFrame, abnormal_df: pd.DataFrame | None) -> pd.DataFrame:
    if abnormal_df is None:
        return main_df
    return pd.concat([main_df, abnormal_df], ignore_index=True)


def _infer_task_type(config: dict[str, Any], training_config: TrainingConfig) -> str:
    model_cfg = config.get("model", {})
    explicit_task = str(model_cfg.get("task_type", "")).strip().lower()
    if explicit_task in {"classification", "anomaly"}:
        return explicit_task

    model_name = training_config.model_name.lower()
    if "isolation" in model_name or "anomaly" in model_name:
        return "anomaly"
    return "classification"


def _safe_predict_scores(engine: GenericTrainingEngine, features: pd.DataFrame) -> Any | None:
    try:
        return engine.predict_proba(features)
    except (AttributeError, NotImplementedError, ValueError):
        return None


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
        selected_features=_normalize_selected_features(
            preprocessing_config.get("selected_features")
        ),
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

    training_verbose = bool(config.get("training", {}).get("verbose", False))
    training_config = TrainingConfig.from_pipeline_config(
        config=config,
        verbose=training_verbose,
    )
    if training_config.tensorboard_enabled:
        configured_tb_path = training_config.tensorboard_log_dir or "logs/tensorboard"
        resolved_tb_path = _resolve_path(PIPELINE_ROOT, configured_tb_path)
        training_config.tensorboard_log_dir = str(resolved_tb_path)
    training_config.run_id = active_run_id
    task_type = _infer_task_type(config, training_config)
    engine = GenericTrainingEngine(training_config)
    log_run_event(
        logger,
        "Training started",
        model_name=training_config.model_name,
        model_type=training_config.model_type,
        epochs=training_config.epochs,
        batch_size=training_config.batch_size,
        train_rows=len(split_data.x_train),
    )
    training_summary = engine.fit(
        split_data.x_train,
        split_data.y_train,
        split_data.x_val,
        split_data.y_val,
    )
    log_run_event(
        logger,
        "Training complete",
        model_name=training_config.model_name,
        model_type=training_config.model_type,
        task_type=task_type,
    )

    val_predictions = engine.predict(split_data.x_val)
    test_predictions = engine.predict(split_data.x_test)

    if split_data.y_val is not None and split_data.y_test is not None:
        val_scores = (
            _safe_predict_scores(engine, split_data.x_val)
            if task_type == "classification"
            else None
        )
        test_scores = (
            _safe_predict_scores(engine, split_data.x_test)
            if task_type == "classification"
            else None
        )
        val_metrics = validate_predictions(
            split_data.y_val,
            val_predictions,
            y_prob=val_scores,
            task_type=task_type,
        )
        test_metrics = validate_predictions(
            split_data.y_test,
            test_predictions,
            y_prob=test_scores,
            task_type=task_type,
        )
    else:
        val_metrics = {}
        test_metrics = {}
        log_run_event(
            logger,
            "Evaluation skipped",
            reason="target_column_not_provided",
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
        "model": {
            "model_type": training_config.model_type,
            "model_name": training_config.model_name,
            "task_type": task_type,
        },
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
        "events": {
            "preprocessing": preprocessing_events,
        },
        "training": training_summary,
    }
    return result
