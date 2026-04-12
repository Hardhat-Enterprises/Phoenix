<<<<<<< HEAD
import argparse
=======
>>>>>>> ec7427de4acf0511212cc4a33805349566fc7b1f
from pathlib import Path

if __package__ is None or __package__ == "":
    import sys

    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

<<<<<<< HEAD
    from core.config_manager import load_config
    from utils.paths import ensure_runtime_dirs
else:
    from .core.config_manager import load_config
=======
    from utils.config_loader import load_config
    from utils.paths import ensure_runtime_dirs
else:
    from .utils.config_loader import load_config
>>>>>>> ec7427de4acf0511212cc4a33805349566fc7b1f
    from .utils.paths import ensure_runtime_dirs


def main():
    """Initialize runtime folders for the scaffold."""
<<<<<<< HEAD
    parser = argparse.ArgumentParser(description="Run the AI008 training pipeline scaffold")
    parser.add_argument(
        "--config",
        default=str(Path(__file__).resolve().parent.parent / "configs" / "default_config.yaml"),
        help="Path to the training pipeline config file.",
    )
    args = parser.parse_args()

    ensure_runtime_dirs()
    print("AI008 training pipeline scaffold is ready.")

    config_path = Path(args.config).resolve()
    config = load_config(config_path)

    print("Config:", config_path)
=======
    ensure_runtime_dirs()
    print("AI008 training pipeline scaffold is ready.")

    config_path = Path(__file__).resolve().parent.parent / "configs" / "default_config.yaml"
    config = load_config(config_path)

>>>>>>> ec7427de4acf0511212cc4a33805349566fc7b1f
    print("Model:", config["model"]["type"])
    print("Epochs:", config["training"]["epochs"])

if __name__ == "__main__":
    main()
