# PHOENIX Training Pipeline

Reusable training pipeline for PHOENIX datasets and multiple model types.

## What It Does

- Loads main + optional abnormal datasets
- Applies configurable cleaning/preprocessing
- Splits into train/validation/test
- Trains sklearn or PyTorch models
- Accepts caller-supplied sklearn estimators, ensemble models, or PyTorch modules directly from code
- Evaluates metrics for classification/anomaly tasks
- Writes logs and optional checkpoints
- Writes experiment summary reports with model, best F1, best epoch, checkpoint, and dataset
- Supports PyTorch resume/recovery from `best` and `last` checkpoints
- Writes cleaner training/evaluation progress lines to the console

## Quick Start

From repository root:

```powershell
cd ai-ml/training_pipeline
conda run -n phoenix python -m src.main --config configs/default_config.yaml --run-id demo_run
```

Class API from `ai-ml/training_pipeline`:

```python
from src import TrainingPipeline

pipeline = TrainingPipeline(config_path="configs/socialmedia_disaster_pytorch_tensorboard.json")
pipeline.set_training(epochs=25, batch_size=64)
pipeline.enable_tensorboard(True)

result = pipeline.run(
    run_id="demo_run",
)
print(result["reports"])
```

The class API can also modify config values entirely from code:

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

For notebook demos, you can bypass dataset files entirely and train from an in-memory dataframe:

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

Disable checkpoint save:

```powershell
conda run -n phoenix python -m src.main --config configs/default_config.yaml --run-id demo_run --no-checkpoint
```

## Notebook Usage

Use:

- `ai-ml/training_pipeline/pipeline.ipynb`

The notebook is a compact "How to use" guide showing:

1. CLI usage
2. In-memory demo dataset usage with `sklearn.datasets.load_breast_cancer()`
3. Getter/setter configuration
4. Future training customization
5. Resume/recovery
6. TensorBoard

## Config

## How to Run

### 1. Install dependencies

From `ai-ml/training_pipeline`:

```bash
pip install -r ..\requirements.txt
```

### 2. Run with the Windows runner (recommended)

From `ai-ml/training_pipeline`:

```bat
run_pipeline.bat
```

The runner will prompt for a config file path.
If you press Enter, it uses:

```text
configs\socialmedia_disaster_pytorch_tensorboard.json
```

The runner also starts TensorBoard in a separate CLI before training starts, so metrics update live while the model trains.

### 3. Run directly with Python

From `ai-ml/training_pipeline`:
Main config example:

- `ai-ml/training_pipeline/configs/default_config.yaml`

Important fields:

- `dataset.path`: main CSV path
- `dataset.abnormal_path`: optional CSV to append
- `dataset.target_column`: supervised label column
- `model.type`: model selection mode
- `model.name`: required when `model.type` is `sklearn` or `pytorch`
- `model.task_type`: optional (`classification` or `anomaly`)
- `output.path`: checkpoint directory
- `output.log_path`: logs directory
- `output.reports_path`: experiment summary report directory
- `output.organize_checkpoints_by_run`: store each run's checkpoints under `checkpoints/<run_id>/`
- `output.previous_checkpoints_to_keep`: number of older checkpoint run sets to keep in addition to the current run

### Model Selection Patterns

Pattern A (alias shortcut):

```yaml
model:
  type: random_forest
  hyperparameters:
    n_estimators: 100
```

Pattern B (explicit backend + model name):

```yaml
model:
  type: sklearn
  name: logistic_regression
  task_type: classification
  hyperparameters:
    max_iter: 200
```

## Preprocessing Config Behavior

Optional CLI arg:

- `--preprocessing-config <json_path>`

If provided, cleaning + preprocessing are loaded from that JSON file.
If not provided, cleaning is skipped and default preprocessing behavior is derived from main config (`encoding`/`normalization` settings).

## Python API

```python
from src import run_training_pipeline

result = run_training_pipeline(
    config_path="configs/default_config.yaml",
    preprocessing_config_path="configs/preprocessing_config.json",
    run_id="api_run",
    save_checkpoint=False,
)
print(result)
```

From the repository root:

```bash
cd ai-ml/training_pipeline
conda run -n phoenix python -m src.main --config configs/default_config.yaml
```

## Programmatic Configuration

`TrainingPipeline` supports code-based configuration through getter/setter methods. This is useful when a notebook, experiment script, or integration service needs to adjust training without editing JSON/YAML files.

Common methods:

- `load_config(path)`
- `set_config(config_dict)`
- `get_config()`
- `get_section(section)`
- `set_section(section, values)`
- `update_section(section, values)`
- `get_value(section, key)`
- `set_value(section, key, value)`
- `set_dataset(...)`
- `set_dataset_frame(dataframe, target_column=None, dataset_name="in_memory_dataset")`
- `clear_dataset_frame()`
- `set_model(...)`
- `set_model_instance(model, model_name=None, task_type=None)`
- `clear_model_instance()`
- `set_training(...)`
- `set_preprocessing(...)`
- `set_output(...)`
- `enable_tensorboard(...)`
- `save_config(path)`

Direct model injection:

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

`run()` also accepts a one-off direct model override:

```python
result = pipeline.run(
    run_id="custom_model_run",
    model=ensemble,
    model_name="voting_classifier",
    task_type="classification",
)
```

## Outputs

- Logs: `ai-ml/training_pipeline/logs/*.log`
- Checkpoints: `ai-ml/training_pipeline/checkpoints/*`
- Experiment reports: `ai-ml/training_pipeline/reports/*_experiment_summary.*`
- Artifacts used by notebook demos: `ai-ml/training_pipeline/artifacts/*`

`run_training_pipeline` returns structured JSON-like output including:

- `run_id`
- `model` info
- `metrics` (validation/test)
- `rows` counts
- `events.preprocessing`
- `checkpoint_path` (if saved)
- `best_checkpoint_path` / `last_checkpoint_path` for PyTorch recovery
- `reports`

Checkpoint naming:

- final fitted model: `checkpoints/<run_id>/<prefix>_<model_name>_<run_id>_final.*`
- best PyTorch recovery state: `checkpoints/<run_id>/<prefix>_<model_name>_<run_id>_best.pt`
- last PyTorch recovery state: `checkpoints/<run_id>/<prefix>_<model_name>_<run_id>_last.pt`

When `output.previous_checkpoints_to_keep` is set, the pipeline keeps the current run set plus that many previous run sets for the same prefix/model and prunes older ones automatically.

## Resume and Recovery

Resume an interrupted PyTorch run from the last state:

```powershell
conda run -n phoenix python -m src.main --config configs/socialmedia_disaster_pytorch_tensorboard.json --run-id resumed_run --resume-from checkpoints\socialmedia_pytorch_tb_previous_last.pt
```

Continue from the best validation checkpoint:

```powershell
conda run -n phoenix python -m src.main --config configs/socialmedia_disaster_pytorch_tensorboard.json --run-id continue_best --resume-from checkpoints\socialmedia_pytorch_tb_previous_best.pt
```

TensorBoard:

```powershell
conda run -n phoenix tensorboard --logdir logs\tensorboard --port 6006
```

Open `http://localhost:6006`.

TensorBoard logs include:

- training loss and learning rate by epoch
- validation accuracy, precision, recall, F1, and AUC by epoch for PyTorch runs
- final validation and test scalar metrics for all TensorBoard-enabled runs

## Handoff Package

Leadership handoff files for AI009 and AI010 are in:

```text
handoff/
```

## Testing (phoenix env)

From `ai-ml/training_pipeline`:

```powershell
conda run -n phoenix python -m pytest tests/test_pipeline_integration.py tests/test_smoke.py tests/test_reusable_models.py tests/test_w7_reports_and_checkpoints.py tests/test_pipeline_code_configuration.py -q
```

If your machine has temp/OneDrive permission issues with pytest, set `--basetemp` to a writable local path.

## Structure

```text
training_pipeline/
|-- configs/
|-- data/
|-- artifacts/
|-- logs/
|-- checkpoints/
|-- handoff/
|-- src/
|   |-- main.py
|   |-- core/
|   |-- data/
|   |-- preprocessing/
|   |-- models/
|   |-- evaluation/
|   |-- reporting/
|   `-- utils/
`-- tests/
```
