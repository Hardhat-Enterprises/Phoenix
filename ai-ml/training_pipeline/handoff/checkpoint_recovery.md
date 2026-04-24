# Checkpoint Recovery

The pipeline supports three checkpoint types.

## Final Model

Saved at the end of a run:

```text
checkpoints/<prefix>_<model_name>_<run_id>_final.joblib
checkpoints/<prefix>_<model_name>_<run_id>_final.pt
```

## Last PyTorch State

Saved every epoch:

```text
checkpoints/<prefix>_<model_name>_<run_id>_last.pt
```

Use this for interrupted runs.

## Best PyTorch State

Saved when validation F1 improves:

```text
checkpoints/<prefix>_<model_name>_<run_id>_best.pt
```

Use this to roll back to the best validation model or continue training from the strongest epoch.

Retention:

Set `output.previous_checkpoints_to_keep` to control how many older run sets are retained for the same checkpoint prefix and model name in addition to the current run. A run set includes its `final`, `best`, `last`, and metadata files.

## Resume Command

```powershell
conda run -n phoenix python -m src.main --config configs/socialmedia_disaster_pytorch_tensorboard.json --run-id resumed_run --resume-from checkpoints/<checkpoint>.pt
```

Code equivalent:

```python
from src import TrainingPipeline

pipeline = TrainingPipeline(config_path="configs/socialmedia_disaster_pytorch_tensorboard.json")
result = pipeline.run(
    run_id="resumed_run",
    resume_from="checkpoints/<checkpoint>.pt",
)
```

## Rollback Copy

```powershell
conda run -n phoenix python -m src.main --config configs/socialmedia_disaster_pytorch_tensorboard.json --run-id rollback_run --resume-from checkpoints/<checkpoint>.pt --rollback-best
```

Code equivalent:

```python
result = pipeline.run(
    run_id="rollback_run",
    resume_from="checkpoints/<checkpoint>.pt",
    rollback_best=True,
)
```
