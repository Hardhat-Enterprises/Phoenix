# PHOENIX XGBoost Core Model

This folder contains the sklearn-compatible XGBoost integration for the PHOENIX training pipeline.

## Structure

- `configs/xgboost_config.yaml`: pipeline config for `trey_xgb_core_v1`
- `notebooks/train_xgb.ipynb`: trains through `TrainingPipeline`
- `notebooks/test_xgb.ipynb`: loads the generated checkpoint and runs inference
- `checkpoints/`: generated model checkpoint and metadata
- `logs/`: latest pipeline log
- `reports/`: final experiment summary
- `tests/`: XGBoost-specific smoke checks

## Preprocessing Note

TF-IDF is disabled by default for this model. The current shared preprocessing path runs before the dataset split, so fitting TF-IDF there would leak validation/test vocabulary into training. Until the pipeline supports split-aware text transformers, this config relies on the existing one-hot preprocessing path and does not enable `text_vectorization`.
