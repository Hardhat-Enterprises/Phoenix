"""Feature loading module for W6-T4."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd


def find_project_root(start: Path) -> Path:
    for parent in [start, *start.parents]:
        if (parent / "ai-ml").exists():
            return parent
    raise FileNotFoundError("Could not locate project root (ai-ml folder not found)")


def load_feature_set(
    source: str | Path,
    mapping_source: str | Path | None = None,
) -> dict[str, Any]:

    csv_path = Path(source).resolve()

    if not csv_path.exists():
        raise FileNotFoundError(f"Feature file not found: {csv_path}")

    if csv_path.suffix.lower() != ".csv":
        raise ValueError(f"Expected a CSV file, got: {csv_path.suffix}")

    df = pd.read_csv(csv_path)

    if mapping_source is not None:
        mapping_path = Path(mapping_source).resolve()
    else:
        mapping_path = csv_path.parent / "feature_mapping.json"

    mapping: dict[str, Any] = {}
    if mapping_path.exists():
        with open(mapping_path, "r", encoding="utf-8") as f:
            mapping = json.load(f)

    return {
        "data": df,
        "mapping": mapping,
        "source": str(csv_path),
        "mapping_source": str(mapping_path) if mapping_path.exists() else None,
    }

if __name__ == "__main__":
    project_root = find_project_root(Path(__file__).resolve())
    default_csv = project_root / "ai-ml" / "features" / "ai004_features_output.csv"

    loaded = load_feature_set(default_csv)
    print(f"Feature loader test passed. Shape: {loaded['data'].shape}")
