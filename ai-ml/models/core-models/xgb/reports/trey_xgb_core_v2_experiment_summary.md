# Experiment Summary: trey_xgb_core_v2

- Model: xgboost (sklearn)
- Best F1: 0.7237184466019418
- Best epoch: 58
- Checkpoint path: ai-ml/models/core-models/xgb/checkpoints/trey_xgb_core_v2/core_xgb_xgboost_trey_xgb_core_v2_best.joblib
- Dataset used: ai-ml/datasets/phoenix_combined_dataset_large.csv
- TensorBoard log dir: ai-ml/models/core-models/xgb/logs/tensorboard/trey_xgb_core_v2

## Validation Metrics

```json
{
  "accuracy": 0.73,
  "precision": 0.7249205184641722,
  "recall": 0.73,
  "f1": 0.717340895522388,
  "confusion_matrix": [
    [
      91,
      0,
      0,
      0
    ],
    [
      0,
      60,
      0,
      25
    ],
    [
      0,
      0,
      46,
      0
    ],
    [
      0,
      56,
      0,
      22
    ]
  ],
  "auc": 0.903438962218032
}
```

## Test Metrics

```json
{
  "accuracy": 0.7333333333333333,
  "precision": 0.73130641068079,
  "recall": 0.7333333333333333,
  "f1": 0.7272033023735811,
  "confusion_matrix": [
    [
      90,
      0,
      0,
      0
    ],
    [
      0,
      55,
      0,
      29
    ],
    [
      0,
      0,
      47,
      0
    ],
    [
      0,
      51,
      0,
      28
    ]
  ],
  "auc": 0.8972714164013184
}
```
