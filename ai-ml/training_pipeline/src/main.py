"""Main entry point for the AI008 training pipeline scaffold."""

try:
    from src.utils.paths import ensure_runtime_dirs
except ModuleNotFoundError:
    # Support direct script execution: `python src/main.py`
    from utils.paths import ensure_runtime_dirs


def main() -> None:
    """Initialize runtime folders for the scaffold."""
    ensure_runtime_dirs()
    print("AI008 training pipeline scaffold is ready.")


if __name__ == "__main__":
    main()
