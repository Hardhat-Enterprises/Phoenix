"""Logger W6-T8."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any


def find_project_root(start: Path) -> Path:
    for parent in [start, *start.parents]:
        if (parent / "ai-ml").exists():
            return parent
    raise FileNotFoundError("Could not locate project root (ai-ml folder not found)")


def _get_default_log_dir() -> Path:
    root = find_project_root(Path(__file__).resolve())
    return root / "ai-ml" / "training_pipeline" / "logs"


def _resolve_level(level: str | int) -> int:
    if isinstance(level, int):
        return level

    return getattr(logging, str(level).upper(), logging.INFO)


def get_logger(
    name: str,
    level: str | int = "INFO",
    log_dir: str | Path | None = None,
    run_id: str | None = None,
    enable_console: bool = True,
    enable_file: bool = True,
) -> logging.Logger:
    """Create and return a configured logger."""
    logger = logging.getLogger(name)
    resolved_level = _resolve_level(level)

    logger.setLevel(resolved_level)
    logger.propagate = False

    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

    if enable_console:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(resolved_level)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    if enable_file:
        log_path = Path(log_dir) if log_dir is not None else _get_default_log_dir()
        log_path.mkdir(parents=True, exist_ok=True)

        file_name = f"{run_id}.log" if run_id else f"{name}.log"
        file_handler = logging.FileHandler(log_path / file_name, encoding="utf-8")
        file_handler.setLevel(resolved_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


def log_run_event(logger: logging.Logger, message: str, **context: Any) -> None:
    if context:
        logger.info("%s | context=%s", message, json.dumps(context, default=str))
    else:
        logger.info(message)


def log_metric(
    logger: logging.Logger,
    metric_name: str,
    metric_value: Any,
    step: int | None = None,
    epoch: int | None = None,
    **extra: Any,
) -> None:
    payload = {
        "metric": metric_name,
        "value": metric_value,
        "step": step,
        "epoch": epoch,
        **extra,
    }
    logger.info("METRIC | %s", json.dumps(payload, default=str))


def log_config_snapshot(logger: logging.Logger, config: dict[str, Any]) -> None:
    """Log the configuration used for a run."""
    logger.info("CONFIG SNAPSHOT | %s", json.dumps(config, default=str))


def log_error(
    logger: logging.Logger,
    message: str,
    exc: Exception | None = None,
    **context: Any,
) -> None:
    if exc is not None:
        logger.exception(
            "%s | error=%s | context=%s",
            message,
            str(exc),
            json.dumps(context, default=str),
        )
    else:
        logger.error(
            "%s | context=%s",
            message,
            json.dumps(context, default=str),
        )
