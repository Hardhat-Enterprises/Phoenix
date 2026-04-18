import argparse
import os
from pathlib import Path

from src.utils.config_loader import load_config


def parse_args():
    parser = argparse.ArgumentParser(description="AI008 Training Pipeline")

    parser.add_argument(
        "--config",
        type=str,
        required=True,
        help="Path to config file"
    )

    parser.add_argument(
        "--output",
        type=str,
        default="outputs/",
        help="Output folder path"
    )

    return parser.parse_args()


def create_output_dir(path: str):
    Path(path).mkdir(parents=True, exist_ok=True)
    print(f"[INFO] Output directory ready: {path}")


def main():
    args = parse_args()

    # Load config
    config = load_config(args.config)

    # Create output folder
    create_output_dir(args.output)

    # Example usage
    print("[INFO] Config Loaded Successfully")
    print("Model:", config["model"]["type"])
    print("Epochs:", config["training"]["epochs"])


if __name__ == "__main__":
    main()