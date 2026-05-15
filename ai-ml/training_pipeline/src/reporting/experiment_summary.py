"""Experiment summary report generation for training runs."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any


def relative_to_root(path: str | Path | None, root_dir: Path) -> str | None:
    """Return a stable path relative to the training pipeline root when possible."""
    if path is None:
        return None
    resolved = Path(path)
    try:
        resolved = resolved.resolve()
    except OSError:
        pass
    try:
        return resolved.relative_to(root_dir.resolve()).as_posix()
    except ValueError:
        return resolved.as_posix()


def extract_best_f1(result: dict[str, Any]) -> float | None:
    """Extract the best available F1 score from training or validation metrics."""
    training = result.get("training", {})
    if training.get("best_f1") is not None:
        return float(training["best_f1"])

    validation = result.get("metrics", {}).get("validation", {})
    if validation.get("f1") is not None:
        return float(validation["f1"])

    test = result.get("metrics", {}).get("test", {})
    if test.get("f1") is not None:
        return float(test["f1"])
    return None


def extract_best_epoch(result: dict[str, Any]) -> int | None:
    """Extract the best epoch from training metadata."""
    training = result.get("training", {})
    if training.get("best_epoch") is not None:
        return int(training["best_epoch"])
    if result.get("model", {}).get("model_type") == "sklearn":
        return 1
    return None


def build_experiment_summary(
    result: dict[str, Any],
    config: dict[str, Any],
    root_dir: Path,
) -> dict[str, Any]:
    """Build the leadership-facing experiment summary payload."""
    dataset_path = result.get("dataset_used") or config.get("dataset", {}).get("path")
    checkpoint_path = result.get("best_checkpoint_path") or result.get("checkpoint_path")

    return {
        "generated_at_utc": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "run_id": result.get("run_id"),
        "model": result.get("model", {}),
        "best_f1": extract_best_f1(result),
        "best_epoch": extract_best_epoch(result),
        "checkpoint_path": relative_to_root(checkpoint_path, root_dir),
        "dataset_used": dataset_path,
        "metrics": result.get("metrics", {}),
        "rows": result.get("rows", {}),
        "tensorboard": result.get("tensorboard", {}),
    }


def write_experiment_summary(
    result: dict[str, Any],
    config: dict[str, Any],
    root_dir: Path,
    reports_dir: str | Path,
) -> dict[str, str]:
    """Write JSON and Markdown experiment summaries and return their paths."""
    output_dir = Path(reports_dir)
    if not output_dir.is_absolute():
        output_dir = root_dir / output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    summary = build_experiment_summary(result=result, config=config, root_dir=root_dir)
    run_id = str(result.get("run_id") or "run")
    json_path = output_dir / f"{run_id}_experiment_summary.json"
    md_path = output_dir / f"{run_id}_experiment_summary.md"

    json_path.write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")

    model = summary["model"]
    markdown = "\n".join(
        [
            f"# Experiment Summary: {run_id}",
            "",
            f"- Model: {model.get('model_name')} ({model.get('model_type')})",
            f"- Best F1: {summary.get('best_f1')}",
            f"- Best epoch: {summary.get('best_epoch')}",
            f"- Checkpoint path: {summary.get('checkpoint_path')}",
            f"- Dataset used: {summary.get('dataset_used')}",
            f"- TensorBoard log dir: {summary.get('tensorboard', {}).get('log_dir')}",
            "",
            "## Validation Metrics",
            "",
            "```json",
            json.dumps(summary.get("metrics", {}).get("validation", {}), indent=2),
            "```",
            "",
            "## Test Metrics",
            "",
            "```json",
            json.dumps(summary.get("metrics", {}).get("test", {}), indent=2),
            "```",
            "",
        ]
    )
    md_path.write_text(markdown, encoding="utf-8")

    return {
        "experiment_summary_json": relative_to_root(json_path, root_dir) or str(json_path),
        "experiment_summary_md": relative_to_root(md_path, root_dir) or str(md_path),
    }
