from __future__ import annotations

import argparse
import json
from pathlib import Path

if __package__ is None or __package__ == "":
    import sys

    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from core.logger import get_logger, log_error
    from core.pipeline import PIPELINE_ROOT, run_training_pipeline
else:
    from .core.logger import get_logger, log_error
    from .core.pipeline import PIPELINE_ROOT, run_training_pipeline


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
