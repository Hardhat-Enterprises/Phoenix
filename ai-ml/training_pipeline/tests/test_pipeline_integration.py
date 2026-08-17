from __future__ import annotations

import json
from pathlib import Path
import sys

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.main import run_training_pipeline


def test_pipeline_runs_end_to_end(tmp_path: Path) -> None:
    dataset_path = tmp_path / "dataset.csv"
    config_path = tmp_path / "config.json"
    log_dir = tmp_path / "logs"
    checkpoint_dir = tmp_path / "checkpoints"

    df = pd.DataFrame(
        {
            "temperature": [20, 22, 24, 26, 28, 30, 32, 34, 36, 38] * 2,
            "humidity": [70, 68, 66, 64, 62, 60, 58, 56, 54, 52] * 2,
            "label": [0, 0, 0, 0, 0, 1, 1, 1, 1, 1] * 2,
        }
    )
    df.to_csv(dataset_path, index=False)

    config = {
        "dataset": {
            "path": str(dataset_path),
            "abnormal_path": "",
            "target_column": "label",
            "train_split": 0.6,
            "val_split": 0.2,
            "test_split": 0.2,
            "random_seed": 42,
            "stratify": True,
        },
        "preprocessing": {
            "missing_value_strategy": "mean",
            "normalization": "standard",
            "encoding": "none",
            "feature_selection": True,
        },
        "model": {
            "type": "random_forest",
            "hyperparameters": {"n_estimators": 10, "max_depth": 3},
        },
        "training": {
            "batch_size": 8,
            "epochs": 2,
            "learning_rate": 0.001,
        },
        "output": {
            "path": str(checkpoint_dir),
            "log_path": str(log_dir),
            "save_best_only": True,
            "checkpoint_prefix": "smoke",
        },
    }
    config_path.write_text(json.dumps(config), encoding="utf-8")

    result = run_training_pipeline(
        config_path=config_path,
        preprocessing_config_path=None,
        run_id="test_run",
        save_checkpoint=False,
    )

    assert result["run_id"] == "test_run"
    assert result["rows"]["input"] == 20
    assert result["rows"]["processed"] == 20
    assert result["rows"]["train"] > 0
    assert result["rows"]["val"] > 0
    assert result["rows"]["test"] > 0
    assert "validation" in result["metrics"]
    assert "test" in result["metrics"]
