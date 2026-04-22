"""CLI entrypoint for the training pipeline."""

from __future__ import annotations

import argparse
import json
import os
from typing import Sequence

try:
    from src.core.logger import get_logger, log_error
    from src.core.pipeline import PIPELINE_ROOT, run_training_pipeline
except ModuleNotFoundError:
    from core.logger import get_logger, log_error
    from core.pipeline import PIPELINE_ROOT, run_training_pipeline


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the PHOENIX training pipeline."
    )
    parser.add_argument(
        "--config",
        type=str,
        default=str(PIPELINE_ROOT / "configs" / "default_config.yaml"),
        help="Path to the main YAML or JSON config file.",
    )
    parser.add_argument(
        "--preprocessing-config",
        dest="preprocessing_config",
        type=str,
        default=None,
        help="Optional JSON config for cleaning and preprocessing.",
    )
    parser.add_argument(
        "--run-id",
        type=str,
        default=None,
        help="Optional run identifier for logs and checkpoints.",
    )
    parser.add_argument(
        "--no-checkpoint",
        action="store_true",
        help="Disable checkpoint saving for this run.",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default=None,
        help="Override the output checkpoint directory.",
    )
    parser.add_argument(
        "--batch_size",
        type=int,
        default=None,
        help="Override the training batch size.",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=None,
        help="Override the training epochs.",
    )
    return parser


def _apply_cli_overrides(args: argparse.Namespace) -> None:
    overrides = {
        "PIPELINE_OUTPUT__PATH": args.output_dir,
        "PIPELINE_TRAINING__BATCH_SIZE": args.batch_size,
        "PIPELINE_TRAINING__EPOCHS": args.epochs,
    }
    for env_key, value in overrides.items():
        if value is not None:
            os.environ[env_key] = str(value)


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_arg_parser().parse_args(argv)
    _apply_cli_overrides(args)

    try:
        result = run_training_pipeline(
            config_path=args.config,
            preprocessing_config_path=args.preprocessing_config,
            run_id=args.run_id,
            save_checkpoint=not args.no_checkpoint,
        )
    except Exception as exc:
        fallback_logger = get_logger(
            name="training_pipeline_error",
            run_id=args.run_id,
            log_dir=PIPELINE_ROOT / "logs",
        )
        log_error(fallback_logger, "Pipeline execution failed", exc=exc)
        raise

    print(json.dumps(result, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
