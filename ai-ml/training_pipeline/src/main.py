import argparse
from pathlib import Path

if __package__ is None or __package__ == "":
    import sys

    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from utils.config_loader import load_config
    from utils.paths import ensure_runtime_dirs
else:
    from .utils.config_loader import load_config
    from .utils.paths import ensure_runtime_dirs


def main():
    """Initialize runtime folders for the scaffold."""
    ensure_runtime_dirs()
    print("AI008 training pipeline scaffold is ready.")

    config_path = Path(__file__).resolve().parent.parent / "configs" / "default_config.yaml"
    config = load_config(config_path)

    print("Model:", config["model"]["type"])
    print("Epochs:", config["training"]["epochs"])

if __name__ == "__main__":
    main()
