def run_training_pipeline(config):
    print("\n🚀 Pipeline running successfully!")
    print("Config:", config)
import argparse


from src.utils.config_loader import load_config

from src.utils.paths import ensure_runtime_dirs
from src.utils.seeds import set_seed


def _build_arg_parser():
    parser = argparse.ArgumentParser(description="AI008 Training Pipeline")

    parser.add_argument("--config", type=str, required=True)

    # W7-T3 CLI additions
    parser.add_argument("--output_dir", type=str, help="Override output directory")
    parser.add_argument("--batch_size", type=int, help="Override batch size")
    parser.add_argument("--epochs", type=int, help="Override epochs")

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

    run_training_pipeline(config)


if __name__ == "__main__":
    main()