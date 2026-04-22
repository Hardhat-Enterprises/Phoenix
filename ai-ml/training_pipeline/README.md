# PHOENIX Training Pipeline

Reusable training pipeline for PHOENIX datasets and multiple model types.

## What It Does

- Loads main + optional abnormal datasets
- Applies configurable cleaning/preprocessing
- Splits into train/validation/test
- Trains sklearn or PyTorch models
- Evaluates metrics for classification/anomaly tasks
- Writes logs and optional checkpoints

## Quick Start

From repository root:

```powershell
python.exe ai-ml/training_pipeline/src/main.py --config ai-ml/training_pipeline/configs/default_config.yaml --run-id demo_run
```

Disable checkpoint save:

```powershell
python.exe ai-ml/training_pipeline/src/main.py --config ai-ml/training_pipeline/configs/default_config.yaml --run-id demo_run --no-checkpoint
```

## Notebook Usage

Use:

- `ai-ml/training_pipeline/pipeline.ipynb`

The notebook is a step-by-step "How to use" guide with print statements showing each stage:

1. Setup/imports
2. Config loading
3. Supported models
4. Data + preprocessing
5. Split + train
6. Evaluation
7. Full pipeline API run
8. Multi-model runs on the same dataset

## Config

## How to Run

### 1. Install dependency

From `ai-ml/training_pipeline`:

```bash
pip install pyyaml
```

### 2. Run with the Windows runner (recommended)

From `ai-ml/training_pipeline`:

```bat
run_pipeline.bat
```

The runner will prompt for a config file path.
If you press Enter, it uses:

```text
configs\default_config.yaml
```

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
python ai-ml/training_pipeline/src/main.py --config ai-ml/training_pipeline/configs/default_config.yaml
```

## Design Rules
## Outputs

- Logs: `ai-ml/training_pipeline/logs/*.log`
- Checkpoints: `ai-ml/training_pipeline/checkpoints/*`
- Artifacts used by notebook demos: `ai-ml/training_pipeline/artifacts/*`

`run_training_pipeline` returns structured JSON-like output including:

- `run_id`
- `model` info
- `metrics` (validation/test)
- `rows` counts
- `events.preprocessing`
- `checkpoint_path` (if saved)

## Testing (phoenix env)

From `ai-ml/training_pipeline`:

```powershell
python.exe -m pytest tests/test_pipeline_integration.py tests/test_smoke.py tests/test_reusable_models.py -q
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
|-- src/
|   |-- main.py
|   |-- core/
|   |-- data/
|   |-- preprocessing/
|   |-- models/
|   |-- evaluation/
|   `-- utils/
`-- tests/
```
