from __future__ import annotations

import json
import copy
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

try:
    from torch.utils.tensorboard import SummaryWriter
except Exception:
    SummaryWriter = None

if __package__ and __package__.startswith("src."):
    from ..data.dataset_loader import DatasetLoader
    from ..data.splitter import DatasetSplitter
    from ..evaluation.validator import validate_predictions
    from ..preprocessing.preprocess import preprocess_features
    from ..reporting.experiment_summary import relative_to_root, write_experiment_summary
    from ..utils.config_loader import load_config, load_config_from_dict
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
    from reporting.experiment_summary import relative_to_root, write_experiment_summary
    from utils.config_loader import load_config, load_config_from_dict
    from utils.paths import ensure_runtime_dirs
    from utils.seeds import set_seed


PIPELINE_ROOT = Path(__file__).resolve().parents[2]


def _drop_none(values: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in values.items() if value is not None}


class TrainingPipeline:
    """Reusable class wrapper for running PHOENIX training jobs."""

    def __init__(
        self,
        config_path: str | Path | None = None,
        config: dict[str, Any] | None = None,
        root_dir: str | Path = PIPELINE_ROOT,
    ) -> None:
        self.root_dir = Path(root_dir).resolve()
        self._config: dict[str, Any] | None = None
        self._config_path: Path | None = None
        self._model_instance: Any | None = None
        self._model_instance_name: str | None = None
        self._model_instance_task_type: str | None = None
        self._dataset_frame: pd.DataFrame | None = None
        self._dataset_frame_name: str | None = None
        self._dataset_frame_target_column: str | None = None

        if config_path is not None and config is not None:
            raise ValueError("Use either config_path or config, not both.")
        if config_path is not None:
            self.load_config(config_path)
        elif config is not None:
            self.set_config(config)

    def load_config(self, config_path: str | Path, validate: bool = True) -> "TrainingPipeline":
        """Load a YAML/JSON config into the pipeline for code-based modification."""
        resolved_path = _resolve_path(self.root_dir, str(config_path)) or Path(config_path)
        self._config = load_config(resolved_path, validate=validate)
        self._config_path = resolved_path
        return self

    def set_config(self, config: dict[str, Any], validate: bool = True) -> "TrainingPipeline":
        """Replace the in-memory config."""
        self._config = load_config_from_dict(config, validate=validate)
        self._config_path = None
        return self

    def get_config(self) -> dict[str, Any]:
        """Return a copy of the active in-memory config."""
        self._require_config()
        return copy.deepcopy(self._config)

    def get_section(self, section: str) -> dict[str, Any]:
        """Return one config section."""
        self._require_config()
        return copy.deepcopy(self._config.get(section, {}))

    def set_section(
        self,
        section: str,
        values: dict[str, Any],
        validate: bool = True,
    ) -> "TrainingPipeline":
        """Replace one config section."""
        self._require_config()
        updated = self.get_config()
        updated[section] = copy.deepcopy(values)
        return self.set_config(updated, validate=validate)

    def update_section(
        self,
        section: str,
        values: dict[str, Any],
        validate: bool = True,
    ) -> "TrainingPipeline":
        """Merge values into one config section."""
        self._require_config()
        updated = self.get_config()
        section_cfg = dict(updated.get(section, {}))
        section_cfg.update(copy.deepcopy(values))
        updated[section] = section_cfg
        return self.set_config(updated, validate=validate)

    def get_value(self, section: str, key: str, default: Any = None) -> Any:
        """Return a single config value."""
        self._require_config()
        return copy.deepcopy(self._config.get(section, {}).get(key, default))

    def set_value(
        self,
        section: str,
        key: str,
        value: Any,
        validate: bool = True,
    ) -> "TrainingPipeline":
        """Set a single config value."""
        return self.update_section(section, {key: value}, validate=validate)

    def set_dataset(
        self,
        path: str | Path | None = None,
        target_column: str | None = None,
        abnormal_path: str | Path | None = None,
        train_split: float | None = None,
        val_split: float | None = None,
        test_split: float | None = None,
        random_seed: int | None = None,
        stratify: bool | None = None,
    ) -> "TrainingPipeline":
        """Update dataset settings."""
        updates = _drop_none(
            {
                "path": str(path) if path is not None else None,
                "target_column": target_column,
                "abnormal_path": str(abnormal_path) if abnormal_path is not None else None,
                "train_split": train_split,
                "val_split": val_split,
                "test_split": test_split,
                "random_seed": random_seed,
                "stratify": stratify,
            }
        )
        return self.update_section("dataset", updates)

    def set_dataset_frame(
        self,
        dataframe: pd.DataFrame,
        target_column: str | None = None,
        dataset_name: str = "in_memory_dataset",
    ) -> "TrainingPipeline":
        """Use an in-memory dataframe instead of loading a dataset file from disk."""
        if dataframe.empty:
            raise ValueError("In-memory dataset cannot be empty.")
        self._dataset_frame = dataframe.copy()
        self._dataset_frame_name = dataset_name
        self._dataset_frame_target_column = target_column
        if target_column is not None:
            self.set_value("dataset", "target_column", target_column)
        return self

    def clear_dataset_frame(self) -> "TrainingPipeline":
        """Return to config-driven dataset loading from disk."""
        self._dataset_frame = None
        self._dataset_frame_name = None
        self._dataset_frame_target_column = None
        return self

    def set_model(
        self,
        model_type: str | None = None,
        name: str | None = None,
        task_type: str | None = None,
        hyperparameters: dict[str, Any] | None = None,
    ) -> "TrainingPipeline":
        """Update model settings."""
        updates = _drop_none(
            {
                "type": model_type,
                "name": name,
                "task_type": task_type,
                "hyperparameters": hyperparameters,
            }
        )
        return self.update_section("model", updates)

    def set_model_instance(
        self,
        model: Any,
        model_name: str | None = None,
        task_type: str | None = None,
    ) -> "TrainingPipeline":
        """Use a caller-supplied sklearn estimator, ensemble, or torch module."""
        self._model_instance = model
        self._model_instance_name = model_name
        self._model_instance_task_type = task_type
        return self

    def clear_model_instance(self) -> "TrainingPipeline":
        """Return to config-driven model loading."""
        self._model_instance = None
        self._model_instance_name = None
        self._model_instance_task_type = None
        return self

    def set_training(
        self,
        batch_size: int | None = None,
        epochs: int | None = None,
        learning_rate: float | None = None,
        verbose: bool | None = None,
    ) -> "TrainingPipeline":
        """Update training settings."""
        updates = _drop_none(
            {
                "batch_size": batch_size,
                "epochs": epochs,
                "learning_rate": learning_rate,
                "verbose": verbose,
            }
        )
        return self.update_section("training", updates)

    def set_preprocessing(
        self,
        missing_value_strategy: str | None = None,
        normalization: str | None = None,
        encoding: str | None = None,
        feature_selection: bool | None = None,
        selected_features: list[str] | None = None,
    ) -> "TrainingPipeline":
        """Update preprocessing settings."""
        updates = _drop_none(
            {
                "missing_value_strategy": missing_value_strategy,
                "normalization": normalization,
                "encoding": encoding,
                "feature_selection": feature_selection,
                "selected_features": selected_features,
            }
        )
        return self.update_section("preprocessing", updates)

    def set_output(
        self,
        path: str | Path | None = None,
        log_path: str | Path | None = None,
        reports_path: str | Path | None = None,
        checkpoint_prefix: str | None = None,
        save_best_only: bool | None = None,
        organize_checkpoints_by_run: bool | None = None,
        previous_checkpoints_to_keep: int | None = None,
    ) -> "TrainingPipeline":
        """Update output settings."""
        updates = _drop_none(
            {
                "path": str(path) if path is not None else None,
                "log_path": str(log_path) if log_path is not None else None,
                "reports_path": str(reports_path) if reports_path is not None else None,
                "checkpoint_prefix": checkpoint_prefix,
                "save_best_only": save_best_only,
                "organize_checkpoints_by_run": organize_checkpoints_by_run,
                "previous_checkpoints_to_keep": previous_checkpoints_to_keep,
            }
        )
        return self.update_section("output", updates)

    def enable_tensorboard(
        self,
        enabled: bool = True,
        log_dir: str | Path = "logs/tensorboard",
    ) -> "TrainingPipeline":
        """Enable or disable TensorBoard logging."""
        return self.update_section(
            "training",
            {
                "tensorboard_enabled": enabled,
                "tensorboard_log_dir": str(log_dir),
            },
        )

    def save_config(self, output_path: str | Path) -> Path:
        """Write the active config to JSON for reproducible runs."""
        self._require_config()
        path = _resolve_path(self.root_dir, str(output_path)) or Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self._config, indent=2), encoding="utf-8")
        return path

    def run(
        self,
        config_path: str | Path | None = None,
        preprocessing_config_path: str | Path | None = None,
        run_id: str | None = None,
        save_checkpoint: bool = True,
        resume_from: str | Path | None = None,
        rollback_best: bool = False,
        model: Any | None = None,
        model_name: str | None = None,
        task_type: str | None = None,
        dataset_frame: pd.DataFrame | None = None,
        dataset_name: str | None = None,
        dataset_target_column: str | None = None,
    ) -> dict[str, Any]:
        """Run a complete training job from config through reports/checkpoints."""
        if config_path is not None:
            self.load_config(config_path)
        self._require_config()
        active_model = model if model is not None else self._model_instance
        active_model_name = model_name if model_name is not None else self._model_instance_name
        active_task_type = task_type if task_type is not None else self._model_instance_task_type
        active_dataset_frame = (
            dataset_frame.copy() if dataset_frame is not None
            else (self._dataset_frame.copy() if self._dataset_frame is not None else None)
        )
        active_dataset_name = dataset_name if dataset_name is not None else self._dataset_frame_name
        active_dataset_target_column = (
            dataset_target_column
            if dataset_target_column is not None
            else self._dataset_frame_target_column
        )
        return _run_training_pipeline_impl(
            config=copy.deepcopy(self._config),
            root_dir=self.root_dir,
            preprocessing_config_path=preprocessing_config_path,
            run_id=run_id,
            save_checkpoint=save_checkpoint,
            resume_from=resume_from,
            rollback_best=rollback_best,
            model_instance=active_model,
            model_instance_name=active_model_name,
            model_instance_task_type=active_task_type,
            dataset_frame=active_dataset_frame,
            dataset_name=active_dataset_name,
            dataset_target_column=active_dataset_target_column,
        )

    def _require_config(self) -> None:
        if self._config is None:
            raise ValueError(
                "No config loaded. Use TrainingPipeline(config_path=...), "
                "load_config(...), or set_config(...)."
            )


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


def _resolve_tensorboard_run_dir(
    pipeline_root: Path,
    config: dict[str, Any],
    run_id: str,
    training_summary: dict[str, Any],
) -> Path | None:
    existing_dir = training_summary.get("tensorboard_log_dir")
    if existing_dir:
        return Path(str(existing_dir))

    training_cfg = config.get("training", {})
    base_dir = _resolve_path(
        pipeline_root,
        str(training_cfg.get("tensorboard_log_dir", "logs/tensorboard")),
    )
    if base_dir is None:
        return None
    return base_dir / run_id


def _log_scalar_metrics_to_tensorboard(
    writer: Any,
    namespace: str,
    metrics: dict[str, Any],
) -> None:
    for metric_name, metric_value in metrics.items():
        if isinstance(metric_value, (int, float)) and metric_value is not None:
            writer.add_scalar(f"{namespace}/{metric_name}", float(metric_value))


def _run_training_pipeline_impl(
    config_path: str | Path | None = None,
    config: dict[str, Any] | None = None,
    root_dir: str | Path = PIPELINE_ROOT,
    preprocessing_config_path: str | Path | None = None,
    run_id: str | None = None,
    save_checkpoint: bool = True,
    resume_from: str | Path | None = None,
    rollback_best: bool = False,
    model_instance: Any | None = None,
    model_instance_name: str | None = None,
    model_instance_task_type: str | None = None,
    dataset_frame: pd.DataFrame | None = None,
    dataset_name: str | None = None,
    dataset_target_column: str | None = None,
) -> dict[str, Any]:
    ensure_runtime_dirs()
    pipeline_root = Path(root_dir).resolve()
    if config is None:
        if config_path is None:
            raise ValueError("Either config_path or config is required.")
        resolved_config_path = _resolve_path(pipeline_root, str(config_path)) or Path(config_path)
        config = load_config(resolved_config_path)
    else:
        config = load_config_from_dict(config)

    seed = int(config.get("dataset", {}).get("random_seed", 42))
    set_seed(seed)

    output_cfg = config.get("output", {})
    log_dir = _resolve_path(pipeline_root, output_cfg.get("log_path", "logs")) or (
        pipeline_root / "logs"
    )
    checkpoint_dir = _resolve_path(pipeline_root, output_cfg.get("path", "checkpoints")) or (
        pipeline_root / "checkpoints"
    )
    reports_dir = _resolve_path(pipeline_root, output_cfg.get("reports_path", "reports")) or (
        pipeline_root / "reports"
    )
    checkpoint_prefix = str(output_cfg.get("checkpoint_prefix", "model")).strip() or "model"
    save_best_only = bool(output_cfg.get("save_best_only", True))
    organize_checkpoints_by_run = bool(output_cfg.get("organize_checkpoints_by_run", True))
    previous_checkpoints_to_keep = int(output_cfg.get("previous_checkpoints_to_keep", 3))

    active_run_id = run_id or datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    logger = get_logger(
        name="training_pipeline",
        run_id=active_run_id,
        log_dir=log_dir,
    )
    log_config_snapshot(logger, config)

    dataset_cfg = config.get("dataset", {})
    dataset_path = _resolve_path(pipeline_root, dataset_cfg.get("path"))
    abnormal_raw = dataset_cfg.get("abnormal_path")
    target_raw = dataset_cfg.get("target_column")
    abnormal_path = _resolve_path(pipeline_root, abnormal_raw) if abnormal_raw else None
    target_column = dataset_target_column or (target_raw if target_raw else None)

    if dataset_frame is not None:
        main_dataset = DatasetLoader.from_dataframe(
            dataset_frame,
            name=dataset_name or "in_memory_dataset",
        )
        abnormal_dataset = None
    else:
        if dataset_path is None:
            raise ValueError("dataset.path is required in config when no in-memory dataset is supplied.")

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
        pipeline_root,
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
    if model_instance is None:
        training_config = TrainingConfig.from_pipeline_config(
            config=config,
            verbose=training_verbose,
        )
    else:
        training_config = TrainingConfig.from_custom_model(
            model=model_instance,
            config=config,
            model_name=model_instance_name,
            task_type=model_instance_task_type,
            verbose=training_verbose,
        )
    if training_config.tensorboard_enabled:
        configured_tb_path = training_config.tensorboard_log_dir or "logs/tensorboard"
        resolved_tb_path = _resolve_path(pipeline_root, configured_tb_path)
        training_config.tensorboard_log_dir = str(resolved_tb_path)
    training_config.run_id = active_run_id
    task_type = _infer_task_type(config, training_config)
    run_checkpoint_stem = (
        f"{checkpoint_prefix}_{training_config.model_name}_{active_run_id}".replace(" ", "_")
    )
    engine = GenericTrainingEngine(training_config)
    checkpoint_manager = CheckpointManager(checkpoint_dir=checkpoint_dir)
    resume_state = None
    if resume_from:
        resume_path = _resolve_path(pipeline_root, str(resume_from)) or Path(resume_from)
        resume_state = checkpoint_manager.load(str(resume_path))
        log_run_event(
            logger,
            "Checkpoint loaded for resume",
            checkpoint_path=relative_to_root(resume_path, pipeline_root),
        )

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
        checkpoint_manager=checkpoint_manager if save_checkpoint else None,
        checkpoint_prefix=run_checkpoint_stem,
        checkpoint_subdir=active_run_id if organize_checkpoints_by_run else None,
        resume_state=resume_state,
        save_best_only=save_best_only,
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

    if training_config.tensorboard_enabled and SummaryWriter is not None:
        tensorboard_run_dir = _resolve_tensorboard_run_dir(
            pipeline_root=pipeline_root,
            config=config,
            run_id=active_run_id,
            training_summary=training_summary,
        )
        if tensorboard_run_dir is not None:
            tensorboard_run_dir.mkdir(parents=True, exist_ok=True)
            writer = SummaryWriter(log_dir=str(tensorboard_run_dir))
            _log_scalar_metrics_to_tensorboard(writer, "validation_final", val_metrics)
            _log_scalar_metrics_to_tensorboard(writer, "test_final", test_metrics)
            writer.flush()
            writer.close()

    if training_verbose:
        def _format_metric_line(name: str, metrics: dict[str, Any]) -> str:
            ordered = []
            for metric_name in ("accuracy", "precision", "recall", "f1", "auc"):
                metric_value = metrics.get(metric_name)
                if isinstance(metric_value, (int, float)) and metric_value is not None:
                    ordered.append(f"{metric_name}={float(metric_value):.4f}")
            return f"[eval] {name}: " + (" | ".join(ordered) if ordered else "no scalar metrics")

        print(_format_metric_line("validation", val_metrics))
        print(_format_metric_line("test", test_metrics))

    checkpoint_path: Path | None = None
    if save_checkpoint:
        checkpoint_path = checkpoint_manager.save(
            engine.model,
            f"{run_checkpoint_stem}_final",
            subdir=active_run_id if organize_checkpoints_by_run else None,
        )
        checkpoint_manager.save_metadata(
            {
                "run_id": active_run_id,
                "model": {
                    "model_type": training_config.model_type,
                    "model_name": training_config.model_name,
                    "task_type": task_type,
                },
                "best_f1": training_summary.get("best_f1") or val_metrics.get("f1"),
                "best_epoch": training_summary.get("best_epoch")
                or (1 if training_config.model_type == "sklearn" else None),
                "dataset_used": (
                    dataset_cfg.get("path")
                    if dataset_frame is None
                    else f"in_memory:{main_dataset.name}"
                ),
            },
            checkpoint_path,
        )
        log_run_event(
            logger,
            "Checkpoint saved",
            checkpoint_path=relative_to_root(checkpoint_path, pipeline_root),
        )
        removed_paths = checkpoint_manager.prune_previous_checkpoints(
            stem_prefix=f"{checkpoint_prefix}_{training_config.model_name}_",
            keep=previous_checkpoints_to_keep,
            exclude_groups={active_run_id} if organize_checkpoints_by_run else None,
        )
        if removed_paths:
            log_run_event(
                logger,
                "Previous checkpoints pruned",
                removed=len(removed_paths),
                keep=previous_checkpoints_to_keep,
            )

    normalized_training_summary = dict(training_summary)
    for path_key in ("best_checkpoint_path", "last_checkpoint_path", "tensorboard_log_dir"):
        normalized_training_summary[path_key] = relative_to_root(
            normalized_training_summary.get(path_key),
            pipeline_root,
        )

    result = {
        "run_id": active_run_id,
        "dataset_used": (
            dataset_cfg.get("path")
            if dataset_frame is None
            else f"in_memory:{main_dataset.name}"
        ),
        "model": {
            "model_type": training_config.model_type,
            "model_name": training_config.model_name,
            "task_type": task_type,
        },
        "metrics": {
            "validation": val_metrics,
            "test": test_metrics,
        },
        "checkpoint_path": relative_to_root(checkpoint_path, pipeline_root),
        "best_checkpoint_path": normalized_training_summary.get("best_checkpoint_path"),
        "last_checkpoint_path": normalized_training_summary.get("last_checkpoint_path"),
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
        "training": normalized_training_summary,
        "tensorboard": {
            "enabled": training_config.tensorboard_enabled,
            "log_dir": normalized_training_summary.get("tensorboard_log_dir"),
            "status": normalized_training_summary.get("tensorboard_status", "disabled"),
        },
    }
    if rollback_best and result.get("best_checkpoint_path"):
        best_for_rollback = _resolve_path(
            pipeline_root,
            str(result["best_checkpoint_path"]),
        )
        rollback_path = checkpoint_manager.rollback_best(
            best_for_rollback or result["best_checkpoint_path"],
            f"{checkpoint_prefix}_{active_run_id}_rollback",
            subdir=active_run_id if organize_checkpoints_by_run else None,
        )
        result["rollback_checkpoint_path"] = relative_to_root(rollback_path, pipeline_root)

    report_paths = write_experiment_summary(
        result=result,
        config=config,
        root_dir=pipeline_root,
        reports_dir=reports_dir,
    )
    result["reports"] = report_paths
    return result


def run_training_pipeline(
    config_path: str | Path,
    preprocessing_config_path: str | Path | None = None,
    run_id: str | None = None,
    save_checkpoint: bool = True,
    resume_from: str | Path | None = None,
    rollback_best: bool = False,
    model: Any | None = None,
    model_name: str | None = None,
    task_type: str | None = None,
    dataset_frame: pd.DataFrame | None = None,
    dataset_name: str | None = None,
    dataset_target_column: str | None = None,
) -> dict[str, Any]:
    """Compatibility function for callers that do not need the class API."""
    pipeline = TrainingPipeline()
    return pipeline.run(
        config_path=config_path,
        preprocessing_config_path=preprocessing_config_path,
        run_id=run_id,
        save_checkpoint=save_checkpoint,
        resume_from=resume_from,
        rollback_best=rollback_best,
        model=model,
        model_name=model_name,
        task_type=task_type,
        dataset_frame=dataset_frame,
        dataset_name=dataset_name,
        dataset_target_column=dataset_target_column,
    )
