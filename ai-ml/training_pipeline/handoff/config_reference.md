# Config Reference

Config files live in `configs/` and should use paths relative to `ai-ml/training_pipeline`.

The same values can also be changed from code through `TrainingPipeline` setters. Config files remain the source of reproducible defaults; setters are for experiment-time overrides.

Required sections:

- `dataset`: CSV paths, target column, split ratios, seed
- `preprocessing`: normalization, encoding, selected features
- `model`: model type/name and hyperparameters
- `training`: batch size, epochs, learning rate, TensorBoard settings
- `output`: logs, checkpoints, reports, checkpoint prefix
  Includes `organize_checkpoints_by_run` for storing each run under its own folder and `previous_checkpoints_to_keep` for keeping the current run set plus a fixed number of older checkpoint run sets.

Common code equivalents:

```python
from src import TrainingPipeline

pipeline = TrainingPipeline(config_path="configs/default_config.yaml")
pipeline.set_dataset(path="data/raw/example.csv", target_column="label")
pipeline.set_preprocessing(normalization="standard", encoding="none")
pipeline.set_model(model_type="random_forest", hyperparameters={"n_estimators": 100})
pipeline.set_training(epochs=10, batch_size=32, learning_rate=0.001)
pipeline.set_output(
    path="checkpoints",
    log_path="logs",
    reports_path="reports",
    organize_checkpoints_by_run=True,
)
pipeline.enable_tensorboard(True, log_dir="logs/tensorboard")
```

Example:

```json
{
  "dataset": {
    "path": "../datasets/socialmedia_disaster_numeric_binary.csv",
    "target_column": "label",
    "train_split": 0.7,
    "val_split": 0.15,
    "test_split": 0.15,
    "random_seed": 42,
    "stratify": true
  },
  "model": {
    "type": "pytorch_mlp",
    "task_type": "classification",
    "hyperparameters": {
      "input_dim": 4,
      "hidden_dim": 64,
      "output_dim": 2
    }
  },
  "training": {
    "epochs": 200,
    "tensorboard_enabled": true,
    "tensorboard_log_dir": "logs/tensorboard"
  },
  "output": {
    "path": "checkpoints",
    "log_path": "logs",
    "reports_path": "reports",
    "save_best_only": true,
    "organize_checkpoints_by_run": true,
    "previous_checkpoints_to_keep": 3,
    "checkpoint_prefix": "socialmedia_pytorch_tb"
  }
}
```

Save a code-modified config for reproducibility:

```python
pipeline.save_config("configs/custom_experiment.json")
```
