from __future__ import annotations

from pathlib import Path
import sys

import pandas as pd
from sklearn.datasets import load_breast_cancer

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src import TrainingPipeline


def test_pipeline_can_be_configured_from_code(tmp_path: Path) -> None:
    dataset_path = tmp_path / "dataset.csv"
    pd.DataFrame(
        {
            "temperature": [20, 22, 24, 26, 28, 30, 32, 34, 36, 38] * 2,
            "humidity": [70, 68, 66, 64, 62, 60, 58, 56, 54, 52] * 2,
            "label": [0, 0, 0, 0, 0, 1, 1, 1, 1, 1] * 2,
        }
    ).to_csv(dataset_path, index=False)

    pipeline = TrainingPipeline(config_path="configs/default_config.yaml")
    pipeline.set_dataset(
        path=dataset_path,
        target_column="label",
        abnormal_path="",
        train_split=0.6,
        val_split=0.2,
        test_split=0.2,
    )
    pipeline.set_model(
        model_type="random_forest",
        hyperparameters={"n_estimators": 5, "max_depth": 2},
    )
    pipeline.set_training(batch_size=4, epochs=1, learning_rate=0.001, verbose=False)
    pipeline.set_output(
        path=tmp_path / "checkpoints",
        log_path=tmp_path / "logs",
        reports_path=tmp_path / "reports",
        checkpoint_prefix="code_config",
    )

    assert pipeline.get_value("training", "epochs") == 1
    assert pipeline.get_section("dataset")["target_column"] == "label"

    result = pipeline.run(run_id="code_config_test", save_checkpoint=False)

    assert result["run_id"] == "code_config_test"
    assert result["rows"]["input"] == 20
    assert result["model"]["model_name"] == "random_forest"
    assert (tmp_path / "reports" / "code_config_test_experiment_summary.json").exists()


def test_pipeline_can_run_from_in_memory_dataframe(tmp_path: Path) -> None:
    dataset = load_breast_cancer(as_frame=True)
    dataframe = dataset.frame.copy()
    dataframe["target"] = dataset.target

    pipeline = TrainingPipeline(config_path="configs/default_config.yaml")
    pipeline.set_dataset_frame(
        dataframe=dataframe,
        target_column="target",
        dataset_name="breast_cancer_demo",
    )
    pipeline.set_model(
        model_type="pytorch_mlp",
        hyperparameters={
            "input_dim": len(dataframe.columns) - 1,
            "hidden_dim": 32,
            "output_dim": 2,
        },
    )
    pipeline.set_training(batch_size=32, epochs=2, learning_rate=0.001, verbose=False)
    pipeline.set_output(
        path=tmp_path / "checkpoints",
        log_path=tmp_path / "logs",
        reports_path=tmp_path / "reports",
        checkpoint_prefix="in_memory_demo",
    )

    result = pipeline.run(run_id="in_memory_demo", save_checkpoint=False)

    assert result["run_id"] == "in_memory_demo"
    assert result["dataset_used"] == "in_memory:breast_cancer_demo"
    assert result["rows"]["input"] == len(dataframe)
    assert (tmp_path / "reports" / "in_memory_demo_experiment_summary.json").exists()
