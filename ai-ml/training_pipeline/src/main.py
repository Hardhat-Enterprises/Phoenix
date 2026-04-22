def run_training_pipeline(config):
    print("\n🚀 Pipeline running successfully!")
    print("Config:", config)
import argparse
from __future__ import annotations

import argparse
import json
from pathlib import Path


try:
    from src.utils.config_loader import load_config
    from src.utils.paths import ensure_runtime_dirs
    from src.utils.seeds import set_seed
except ModuleNotFoundError:
    from utils.config_loader import load_config
    from utils.paths import ensure_runtime_dirs
    from utils.seeds import set_seed


def _build_arg_parser():
    parser = argparse.ArgumentParser(description="AI008 Training Pipeline")

    parser.add_argument("--config", type=str, required=True)

    # W7-T3 CLI additions
    parser.add_argument("--output_dir", type=str, help="Override output directory")
    parser.add_argument("--batch_size", type=int, help="Override batch size")
    parser.add_argument("--epochs", type=int, help="Override epochs")

    return parser
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

def main():
    args = _build_arg_parser().parse_args()

    config = load_config(args.config)

    
    if args.output_dir:
        config["output"]["path"] = args.output_dir

    if args.batch_size:
        config["training"]["batch_size"] = args.batch_size

    if args.epochs:
        config["training"]["epochs"] = args.epochs

    ensure_runtime_dirs()

    set_seed(config["dataset"]["random_seed"])
    
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
