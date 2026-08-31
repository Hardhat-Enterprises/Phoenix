"""Core pipeline modules."""

from pathlib import Path
from typing import Any

from .checkpoint_manager import CheckpointManager
from .config_manager import ConfigValidationError, load_config, load_config_from_dict
from .logger import get_logger, log_config_snapshot, log_error, log_metric, log_run_event
from .trainer import GenericTrainingEngine, TrainingConfig

PIPELINE_ROOT = Path(__file__).resolve().parents[2]


def run_training_pipeline(*args: Any, **kwargs: Any):
    from .pipeline import run_training_pipeline as _run_training_pipeline

    return _run_training_pipeline(*args, **kwargs)


__all__ = [
    "PIPELINE_ROOT",
    "CheckpointManager",
    "ConfigValidationError",
    "GenericTrainingEngine",
    "TrainingConfig",
    "get_logger",
    "load_config",
    "load_config_from_dict",
    "log_config_snapshot",
    "log_error",
    "log_metric",
    "log_run_event",
    "run_training_pipeline",
]
