"""Checkpoint manager for sklearn and PyTorch models."""

from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any

try:
    import joblib
except Exception:
    joblib = None

try:
    import torch
except Exception:
    torch = None


class CheckpointManager:
    """Handles save and load operations for model checkpoints."""

    def __init__(self, checkpoint_dir: str | Path = "checkpoints") -> None:
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

    def save(self, model: Any, filename: str) -> Path:
        """Save a model checkpoint and return the checkpoint path."""
        path = self.checkpoint_dir / filename

        if torch is not None and hasattr(torch, "nn") and isinstance(model, torch.nn.Module):
            if path.suffix == "":
                path = path.with_suffix(".pt")
            torch.save(model.state_dict(), path)
            return path

        if path.suffix == "":
            path = path.with_suffix(".joblib")

        if joblib is not None:
            joblib.dump(model, path)
        else:
            with path.open("wb") as file_obj:
                pickle.dump(model, file_obj)
        return path

    def load(self, filename: str) -> Any:
        """Load a model checkpoint by filename."""
        path = self.checkpoint_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Checkpoint not found: {path}")

        if path.suffix == ".pt":
            if torch is None:
                raise ImportError("PyTorch is required to load .pt checkpoints.")
            return torch.load(path, map_location="cpu")

        if joblib is not None:
            return joblib.load(path)

        with path.open("rb") as file_obj:
            return pickle.load(file_obj)
