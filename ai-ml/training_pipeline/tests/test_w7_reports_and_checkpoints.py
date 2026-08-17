from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.core.pipeline import TrainingPipeline


def _write_config(tmp_path: Path) -> Path:
    dataset_path = tmp_path / "dataset.csv"
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
            "tensorboard_enabled": False,
        },
        "output": {
            "path": str(tmp_path / "checkpoints"),
            "log_path": str(tmp_path / "logs"),
            "reports_path": str(tmp_path / "reports"),
            "save_best_only": True,
            "organize_checkpoints_by_run": True,
            "checkpoint_prefix": "w7",
        },
    }
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config), encoding="utf-8")
    return config_path


def test_w7_experiment_summary_and_checkpoint_metadata(tmp_path: Path) -> None:
    config_path = _write_config(tmp_path)

    result = TrainingPipeline().run(
        config_path=config_path,
        run_id="w7_test",
        save_checkpoint=True,
    )

    report_path = tmp_path / "reports" / "w7_test_experiment_summary.json"
    assert report_path.exists()

    summary = json.loads(report_path.read_text(encoding="utf-8"))
    assert summary["model"]["model_name"] == "random_forest"
    assert summary["best_f1"] is not None
    assert summary["best_epoch"] == 1
    assert summary["checkpoint_path"]
    assert summary["dataset_used"] == str(tmp_path / "dataset.csv")

    checkpoint_path = tmp_path / Path(result["checkpoint_path"])
    assert checkpoint_path.exists()
    assert checkpoint_path.with_suffix(checkpoint_path.suffix + ".metadata.json").exists()
    assert checkpoint_path.parent.name == "w7_test"


def test_checkpoint_names_and_retention_policy(tmp_path: Path) -> None:
    config_path = _write_config(tmp_path)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["output"]["previous_checkpoints_to_keep"] = 2
    config_path.write_text(json.dumps(config), encoding="utf-8")

    pipeline = TrainingPipeline()
    first = pipeline.run(config_path=config_path, run_id="retain_a", save_checkpoint=True)
    second = pipeline.run(config_path=config_path, run_id="retain_b", save_checkpoint=True)
    third = pipeline.run(config_path=config_path, run_id="retain_c", save_checkpoint=True)

    assert first["checkpoint_path"].endswith("_final.joblib")
    assert second["checkpoint_path"].endswith("_final.joblib")
    assert third["checkpoint_path"].endswith("_final.joblib")

    checkpoint_paths = sorted((tmp_path / "checkpoints").glob("*/*.joblib"))
    checkpoint_names = sorted(path.name for path in checkpoint_paths)
    checkpoint_run_dirs = sorted(path.parent.name for path in checkpoint_paths)
    assert len(checkpoint_names) == 3
    assert checkpoint_run_dirs == ["retain_a", "retain_b", "retain_c"]
    assert any("retain_a_final.joblib" in name for name in checkpoint_names)
    assert any("retain_b_final.joblib" in name for name in checkpoint_names)
    assert any("retain_c_final.joblib" in name for name in checkpoint_names)

    fourth = pipeline.run(config_path=config_path, run_id="retain_d", save_checkpoint=True)
    assert fourth["checkpoint_path"].endswith("_final.joblib")

    checkpoint_paths = sorted((tmp_path / "checkpoints").glob("*/*.joblib"))
    checkpoint_names = sorted(path.name for path in checkpoint_paths)
    checkpoint_run_dirs = sorted(path.parent.name for path in checkpoint_paths)
    assert len(checkpoint_names) == 3
    assert checkpoint_run_dirs == ["retain_b", "retain_c", "retain_d"]
    assert not (tmp_path / "checkpoints" / "retain_a").exists()
    assert not any("retain_a_final.joblib" in name for name in checkpoint_names)
    assert any("retain_b_final.joblib" in name for name in checkpoint_names)
    assert any("retain_c_final.joblib" in name for name in checkpoint_names)
    assert any("retain_d_final.joblib" in name for name in checkpoint_names)
