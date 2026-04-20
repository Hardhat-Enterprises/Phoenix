"""Checkpointing placeholder for W6-T7."""

from pathlib import Path
from typing import Any


class CheckpointManager:
    """Handles save and load operations for model checkpoints."""

    def __init__(self, checkpoint_dir: str | Path = "checkpoints") -> None:
        self.checkpoint_dir = Path(checkpoint_dir)

    def save(self, model: Any, filename: str) -> Path:
        """Save a model checkpoint."""
        raise NotImplementedError("W6-T7 will implement checkpoint saving here.")

    def load(self, filename: str) -> Any:
        """Load a model checkpoint."""
        raise NotImplementedError("W6-T7 will implement checkpoint loading here.")
