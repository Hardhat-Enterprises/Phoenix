"""Training pipeline package exports."""

from typing import Any


def run_training_pipeline(*args: Any, **kwargs: Any):
    from .core.pipeline import run_training_pipeline as _run_training_pipeline

    return _run_training_pipeline(*args, **kwargs)


__all__ = ["run_training_pipeline"]
