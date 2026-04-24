# AI009 Training Pipeline Handoff

## Purpose

This package describes how to run, customize, resume, and inspect the general PHOENIX training pipeline.

## Run From CLI

From `ai-ml/training_pipeline`:

```powershell
run_pipeline.bat
```

The runner prompts for:

- config path
- optional resume checkpoint
- optional epoch override
- TensorBoard port

Default config:

```text
configs/socialmedia_disaster_pytorch_tensorboard.json
```

## Python API

```python
from src import TrainingPipeline

pipeline = TrainingPipeline(config_path="configs/socialmedia_disaster_pytorch_tensorboard.json")
pipeline.set_training(epochs=25, batch_size=64)
pipeline.enable_tensorboard(True)

result = pipeline.run(run_id="handoff_demo")
print(result["reports"])
```

## Code-Based Customization

Use getters and setters when AI009/AI010 need to configure training from code instead of editing a config file.

```python
pipeline = TrainingPipeline(config_path="configs/default_config.yaml")
pipeline.set_dataset(path="data/raw/example.csv", target_column="label")
pipeline.set_model(
    model_type="random_forest",
    hyperparameters={"n_estimators": 50, "max_depth": 6},
)
pipeline.set_training(epochs=5, batch_size=16, learning_rate=0.001)
pipeline.set_output(
    path="checkpoints",
    log_path="logs",
    reports_path="reports",
    checkpoint_prefix="custom_run",
    previous_checkpoints_to_keep=2,
)

print(pipeline.get_value("training", "epochs"))
result = pipeline.run(run_id="custom_run")
```

## TrainingPipeline Methods

Constructor:

- `TrainingPipeline(config_path=None, config=None, root_dir=PIPELINE_ROOT)`
  Load from a config path or an in-memory config dict.

Config load/replace:

- `load_config(config_path, validate=True)`
  Load YAML/JSON config into the pipeline instance.
- `set_config(config, validate=True)`
  Replace the active in-memory config with a dict.

Config reads:

- `get_config()`
  Return a full copy of the active config.
- `get_section(section)`
  Return one config section such as `dataset` or `training`.
- `get_value(section, key, default=None)`
  Return a single config value.

Generic config writes:

- `set_section(section, values, validate=True)`
  Replace an entire config section.
- `update_section(section, values, validate=True)`
  Merge values into an existing config section.
- `set_value(section, key, value, validate=True)`
  Set one config value.

Section-specific setters:

- `set_dataset(path=None, target_column=None, abnormal_path=None, train_split=None, val_split=None, test_split=None, random_seed=None, stratify=None)`
- `set_dataset_frame(dataframe, target_column=None, dataset_name="in_memory_dataset")`
- `clear_dataset_frame()`
- `set_model(model_type=None, name=None, task_type=None, hyperparameters=None)`
- `set_model_instance(model, model_name=None, task_type=None)`
- `clear_model_instance()`
- `set_training(batch_size=None, epochs=None, learning_rate=None, verbose=None)`
- `set_preprocessing(missing_value_strategy=None, normalization=None, encoding=None, feature_selection=None, selected_features=None)`
- `set_output(path=None, log_path=None, reports_path=None, checkpoint_prefix=None, save_best_only=None, organize_checkpoints_by_run=None, previous_checkpoints_to_keep=None)`
- `enable_tensorboard(enabled=True, log_dir="logs/tensorboard")`

Persistence and execution:

- `save_config(output_path)`
  Save the current in-memory config to disk.
- `run(config_path=None, preprocessing_config_path=None, run_id=None, save_checkpoint=True, resume_from=None, rollback_best=False, model=None, model_name=None, task_type=None)`
  Execute a training run using the current config or a supplied config path.

Custom and ensemble models:

```python
from sklearn.ensemble import VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from src import TrainingPipeline

ensemble = VotingClassifier(
    estimators=[
        ("lr", LogisticRegression(max_iter=100)),
        ("dt", DecisionTreeClassifier(max_depth=3, random_state=42)),
    ],
    voting="soft",
)

pipeline = TrainingPipeline(config_path="configs/default_config.yaml")
pipeline.set_model_instance(
    ensemble,
    model_name="voting_classifier",
    task_type="classification",
)
result = pipeline.run(run_id="ensemble_run")
```

One-off direct model override:

```python
result = pipeline.run(
    run_id="one_off_model",
    model=ensemble,
    model_name="voting_classifier",
    task_type="classification",
)
```

In-memory dataset example:

```python
from sklearn.datasets import load_breast_cancer
from src import TrainingPipeline

dataset = load_breast_cancer(as_frame=True)
demo_df = dataset.frame.copy()
demo_df["target"] = dataset.target

pipeline = TrainingPipeline(config_path="configs/default_config.yaml")
pipeline.set_dataset_frame(
    demo_df,
    target_column="target",
    dataset_name="breast_cancer_demo",
)
pipeline.set_model(
    model_type="pytorch_mlp",
    hyperparameters={"input_dim": demo_df.shape[1] - 1, "hidden_dim": 32, "output_dim": 2},
)
pipeline.set_training(epochs=2, batch_size=32, verbose=True)
result = pipeline.run(run_id="breast_cancer_demo_run")
```

Example using the generic API:

```python
pipeline = TrainingPipeline(config_path="configs/default_config.yaml")
pipeline.update_section("training", {"epochs": 10, "batch_size": 32})
pipeline.set_value("output", "checkpoint_prefix", "integration_run")

print(pipeline.get_section("training"))
result = pipeline.run(run_id="integration_run")
```

## Outputs

- Logs: `logs/`
- TensorBoard events: `logs/tensorboard/`
- Checkpoints: `checkpoints/`
- Experiment summaries: `reports/`

Each run writes:

- `<run_id>_experiment_summary.json`
- `<run_id>_experiment_summary.md`
- model checkpoint under `checkpoints/<run_id>/`
- checkpoint metadata beside the checkpoint file
- PyTorch `best` and `last` recovery checkpoints under the same run folder

## TensorBoard

The batch runner starts TensorBoard in a separate terminal before training starts.

Manual command:

```powershell
conda run -n phoenix tensorboard --logdir logs/tensorboard --port 6006
```

Open:

```text
http://localhost:6006
```

Logged metrics:

- `train/loss`
- `train/learning_rate`
- PyTorch per-epoch validation scalars: `validation/accuracy`, `validation/precision`, `validation/recall`, `validation/f1`, `validation/auc`
- final run scalars: `validation_final/*` and `test_final/*`

## Resume Training

Use the `last` checkpoint for interrupted runs:

```powershell
conda run -n phoenix python -m src.main --config configs/socialmedia_disaster_pytorch_tensorboard.json --run-id resumed_run --resume-from checkpoints/socialmedia_pytorch_tb_previous_last.pt
```

Use the `best` checkpoint to continue from the best validation F1:

```powershell
conda run -n phoenix python -m src.main --config configs/socialmedia_disaster_pytorch_tensorboard.json --run-id best_continue --resume-from checkpoints/socialmedia_pytorch_tb_previous_best.pt
```

## Ownership Notes

AI009 and AI010 can use the same pipeline entrypoints. New datasets should be integrated by adding a config file under `configs/` and keeping paths relative to `ai-ml/training_pipeline`.
