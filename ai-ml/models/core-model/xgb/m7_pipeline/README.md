# M7 Week 2 - Repaired Training and Inference Pipeline

This package completes the M7 Week 2 engineering deliverable: a clean run can
train, save, reload and reproduce a prediction while keeping preprocessing and
labels inside one versioned package.

## What was repaired

- The raw data is split before any fitted preprocessing.
- Duplicate text groups cannot cross train, validation and test partitions.
- An explicit feature allow-list blocks `alert_level`, the target and known
  answer-derived proxy features.
- The text vectoriser, categorical encoding and XGBoost are saved together
  in one sklearn pipeline.
- URL vectorisation remains supported by the reusable code, but URL is disabled
  in this legacy package because the inherited dataset cannot provide
  URL-disjoint holdout partitions.
- Labels, thresholds, model version, target and limitations are saved in the
  same joblib bundle.
- The acceptance run reloads the bundle and verifies an identical prediction.

## Important scope statement

The inherited dataset has no approved `is_phishing` label. The package therefore
uses `hazard_severity` only to prove the repaired pipeline and packaging path.
It is deliberately marked `production_eligible: false` and must not be described
as the final PHOENIX phishing model.

## Run the M7 acceptance check

From `ai-ml/models/core-model/xgb` using the project virtual environment:

```text
python -m m7_pipeline.run_week2 --repo-root C:\path\to\Phoenix
```

## Run automated tests

```text
python -m unittest discover -s m7_pipeline/tests -v
```

The JSON verification report records split integrity, metrics, package contents,
checksum and the before-save/after-reload prediction comparison.
