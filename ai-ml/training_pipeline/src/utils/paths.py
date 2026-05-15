"""Path utilities for the training pipeline."""

from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIGS_DIR = ROOT_DIR / "configs"
LOGS_DIR = ROOT_DIR / "logs"
CHECKPOINTS_DIR = ROOT_DIR / "checkpoints"


def ensure_runtime_dirs() -> None:
    """Ensure required runtime directories exist."""
    for folder in (CONFIGS_DIR, LOGS_DIR, CHECKPOINTS_DIR):
        folder.mkdir(parents=True, exist_ok=True)
