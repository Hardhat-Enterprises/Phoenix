from utils.config_loader import load_config

def main():
    
     """Initialize runtime folders for the scaffold."""
    ensure_runtime_dirs()
    print("AI008 training pipeline scaffold is ready.")

    config = load_config("configs/default_config.yaml")

    print("Model:", config["model"]["type"])
    print("Epochs:", config["training"]["epochs"])


try:
    from src.utils.paths import ensure_runtime_dirs
except ModuleNotFoundError:
    # Support direct script execution: `python src/main.py`
    from utils.paths import ensure_runtime_dirs

if __name__ == "__main__":
    main()
