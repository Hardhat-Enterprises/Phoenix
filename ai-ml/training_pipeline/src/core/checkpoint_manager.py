"""Checkpoint manager for sklearn and PyTorch models."""

from __future__ import annotations

import pickle
import re
import shutil
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

    def _resolve_target_dir(self, subdir: str | Path | None = None) -> Path:
        target_dir = self.checkpoint_dir / subdir if subdir else self.checkpoint_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        return target_dir

    def _remove_empty_parent_dirs(self, start_dir: Path) -> None:
        current = start_dir
        while current != self.checkpoint_dir and current.exists():
            try:
                current.rmdir()
            except OSError:
                break
            current = current.parent

    def save(self, model: Any, filename: str, subdir: str | Path | None = None) -> Path:
        """Save a model checkpoint and return the checkpoint path."""
        path = self._resolve_target_dir(subdir) / filename

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

    def prune_previous_checkpoints(
        self,
        stem_prefix: str,
        keep: int,
        exclude: set[str] | None = None,
        exclude_groups: set[str] | None = None,
    ) -> list[Path]:
        """Keep only the newest matching checkpoint run groups for a prefix."""
        if keep < 0:
            return []

        excluded_names = exclude or set()
        excluded_groups = exclude_groups or set()
        grouped: dict[str, list[Path]] = {}
        for path in self.checkpoint_dir.rglob("*"):
            if not path.is_file() or path.name in excluded_names:
                continue
            if path.name.endswith(".metadata.json"):
                continue
            if not path.stem.startswith(stem_prefix):
                continue

            if path.parent != self.checkpoint_dir:
                run_group = path.parent.relative_to(self.checkpoint_dir).as_posix()
            else:
                run_group = re.sub(r"_(final|best|last)$", "", path.stem)
            if run_group in excluded_groups:
                continue
            grouped.setdefault(run_group, []).append(path)

        ordered_groups = sorted(
            grouped.items(),
            key=lambda item: max(member.stat().st_mtime for member in item[1]),
            reverse=True,
        )
        removed: list[Path] = []
        for _, members in ordered_groups[keep:]:
            for path in members:
                metadata_path = path.with_suffix(path.suffix + ".metadata.json")
                try:
                    path.unlink()
                    removed.append(path)
                except FileNotFoundError:
                    continue
                if metadata_path.exists():
                    metadata_path.unlink()
                self._remove_empty_parent_dirs(path.parent)
        return removed

    def load(self, filename: str) -> Any:
        """Load a model checkpoint by filename."""
        path = Path(filename)
        if not path.is_absolute():
            path = self.checkpoint_dir / path
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

    def save_training_state(
        self,
        state: dict[str, Any],
        filename: str,
        subdir: str | Path | None = None,
    ) -> Path:
        """Save a resumable PyTorch training state."""
        if torch is None:
            raise ImportError("PyTorch is required to save training state checkpoints.")

        path = self._resolve_target_dir(subdir) / filename
        if path.suffix == "":
            path = path.with_suffix(".pt")
        torch.save(state, path)
        return path

    def save_metadata(self, metadata: dict[str, Any], checkpoint_path: str | Path) -> Path:
        """Write JSON-compatible metadata beside a checkpoint."""
        import json

        path = Path(checkpoint_path)
        metadata_path = path.with_suffix(path.suffix + ".metadata.json")
        metadata_path.write_text(json.dumps(metadata, indent=2, default=str), encoding="utf-8")
        return metadata_path

    def rollback_best(
        self,
        best_checkpoint_path: str | Path,
        rollback_name: str,
        subdir: str | Path | None = None,
    ) -> Path:
        """Copy the best checkpoint to a rollback checkpoint path."""
        source = Path(best_checkpoint_path)
        if not source.is_absolute():
            source = self.checkpoint_dir / source
        if not source.exists():
            raise FileNotFoundError(f"Best checkpoint not found: {source}")

        target = self._resolve_target_dir(subdir) / rollback_name
        if target.suffix == "":
            target = target.with_suffix(source.suffix)
        shutil.copy2(source, target)
        return target
