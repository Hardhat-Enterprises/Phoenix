# PHOENIX AI/ML

## Overview

The `ai-ml/` folder contains the AI and machine learning workstream for **Project PHOENIX**.

This section of the repository handles:

- data cleaning
- feature engineering
- synthetic data generation
- reusable model training
- baseline and core model development
- anomaly detection
- time-series forecasting
- inference logic
- backend-ready sample payloads
- experiment tracking
- model reports and evaluation artefacts

The AI/ML stream supports PHOENIX by converting hazard, cyber, social, regional, and time-based signals into machine-learning-ready features, trained models, anomaly outputs, risk scores, and integration-ready JSON structures.

---

## AI/ML Folder Structure

```text
ai-ml/
│
├── README.md
│
├── cleaning/
│   ├── config/
│   ├── data/
│   │   ├── input/
│   │   ├── output/
│   │   └── reports/
│   ├── docs/
│   ├── logging/
│   └── src/
│
├── features/
│   ├── Docs/
│   ├── ai-ml/
│   ├── config.yaml
│   ├── data_cleaning_pipeline.py
│   ├── datasets.py
│   ├── feature_engineer.py
│   ├── feature_mapping.json
│   ├── requirements.txt
│   └── run_pipeline.py
│
├── synthetic/
│   ├── data/
│   ├── docs/
│   └── generators/
│
├── training_pipeline/
│   ├── configs/
│   ├── data/
│   ├── handoff/
│   ├── logs/
│   ├── reports/
│   ├── checkpoints/
│   ├── src/
│   ├── tests/
│   ├── pipeline.ipynb
│   ├── README.md
│   └── run_pipeline.bat
│
├── models/
│   ├── anomaly-model/
│   ├── core-model/
│   └── time-series/
│
├── ai013/
│   └── src/
│
├── Sample Records/
│   ├── hazard_event_samples.json
│   └── risk_assessment_integration.json
│
└── utils/
    ├── experiment_tracker.py
    └── refinement.py
```

---

# Main Folder Breakdown

## `cleaning/`

The `cleaning/` folder contains the AI003 data cleaning pipeline.

It is responsible for converting raw or messy datasets into cleaned, validated, and logged outputs.

```text
cleaning/
├── config/
├── data/
│   ├── input/
│   ├── output/
│   └── reports/
├── docs/
├── logging/
└── src/
```

### Important Files

| File / Folder | Purpose |
|---|---|
| `cleaning/src/main.py` | CLI entry point for running the unified cleaning pipeline. |
| `cleaning/src/pipeline.py` | Main orchestration script. Loads config, reads CSV, selects cleaning rules, validates output, writes reports. |
| `cleaning/src/cleaning/cleaning_pipeline.py` | Core cleaning logic. Handles missing values, duplicates, transformations, and normalisation. |
| `cleaning/docs/usage.md` | Explains how to run the AI003 demo pipeline. |
| `cleaning/docs/architecture.md` | Explains the cleaning → validation → logging architecture. |
| `cleaning/docs/proof-pack.md` | Evidence/documentation pack for the cleaning task. |
| `cleaning/data/output/cleaned_data.csv` | Example cleaned output dataset. |
| `cleaning/data/reports/comparison_report.json` | Before/after dataset quality comparison report. |

### Cleaning Pipeline Flow

```text
Raw CSV
  ↓
Load Config
  ↓
Select Dataset Rules
  ↓
Run Cleaning Pipeline
  ↓
Compare Before vs After
  ↓
Validate Cleaned Dataset
  ↓
Save Cleaned CSV
  ↓
Write JSON Reports
  ↓
Write Pipeline Log
```

### How to Run

From repository root:

```bash
cd ai-ml/cleaning
python src/main.py
```

Or with a custom config:

```bash
python src/main.py --config config/pipeline_config.json
```

Expected outputs:

```text
cleaning/data/output/
cleaning/data/reports/
cleaning/logging/
```

---

## `features/`

The `features/` folder contains the AI004 feature engineering pipeline.

It combines multiple domain datasets and transforms them into model-ready features for downstream modelling, anomaly detection, forecasting, and risk scoring.

```text
features/
├── Docs/
├── ai-ml/
├── config.yaml
├── data_cleaning_pipeline.py
├── datasets.py
├── feature_engineer.py
├── feature_mapping.json
├── requirements.txt
└── run_pipeline.py
```

### Important Files

| File | Purpose |
|---|---|
| `features/run_pipeline.py` | Main runner for feature engineering. Loads datasets, merges them, runs cleaning, engineers features, and writes outputs. |
| `features/datasets.py` | Demo dataset loaders for disaster, cyber, weather, geo, infrastructure, and social datasets. |
| `features/data_cleaning_pipeline.py` | Cleaning support used before feature generation. |
| `features/feature_engineer.py` | Main feature generation logic. |
| `features/config.yaml` | Feature engineering configuration. |
| `features/feature_mapping.json` | Maps generated feature names to their meaning/source. |
| `features/Docs/feature_list.md` | Documentation of generated feature groups. |
| `features/requirements.txt` | Feature pipeline dependencies. |

### Feature Groups

The current feature pipeline covers:

| Feature Group | Examples |
|---|---|
| Hazard features | `disaster_severity_score`, `event_intensity_index`, `hazard_normalized`, `severity_change_rate` |
| Cyber features | `cyber_incident_count`, `cyber_intensity_score`, `scam_spike_rate`, `cyber_attack_frequency` |
| Temporal features | `rolling_cyber_mean`, `time_since_last_event`, `ema`, `lag_1`, `lag_2` |
| Geo features | `geo_risk_zone_score`, `location_encoded`, `regional_event_count` |
| Risk features | `combined_risk_index`, `adaptive_risk_index` |
| Anomaly features | `z_score`, `outlier_flag` |

### Feature Pipeline Flow

```text
Load Disaster Dataset
Load Cyber Dataset
Load Weather Dataset
Load Geo Dataset
Load Infrastructure Dataset
Load Social Dataset
  ↓
Merge on timestamp/location
  ↓
Run AI003 cleaning step
  ↓
Run FeatureEngineer
  ↓
Save feature CSV
  ↓
Save feature mapping JSON
```

### How to Run

From repository root:

```bash
cd ai-ml/features
python run_pipeline.py
```

Expected outputs:

```text
features/ai004_features_output.csv
features/feature_mapping.json
```

---

## `synthetic/`

The `synthetic/` folder contains the AI005 synthetic data generation work.

It creates synthetic cyber, hazard, misinformation, and linked hazard-cyber records for testing models when real labelled data is limited.

```text
synthetic/
├── data/
├── docs/
└── generators/
```

### Important Files / Folders

| File / Folder | Purpose |
|---|---|
| `synthetic/data/` | Generated synthetic datasets. |
| `synthetic/data/cyber_network_threat_dataset.csv` | Synthetic cyber/network threat dataset. |
| `synthetic/docs/validation_report.md` | Validation summary for generated synthetic records. |
| `synthetic/generators/` | Generator logic for synthetic threat and scenario creation. |
| `synthetic/generators/cyber_threats/src/rules.py` | Rule logic for cyber threat generation. |

### Current Synthetic Dataset Summary

The validation report shows:

- master row count: `100`
- master columns: `76`
- unique hazard event IDs: `100`
- threat streams:
  - `cyber`: `50`
  - `misinformation`: `50`
- missing `hazard_event_id`: `0`
- missing `threat_stream`: `0`
- duplicate rows: `0`

### Main Use

Synthetic data is useful for:

- testing model training before full real-world data exists
- simulating hazard-cyber correlations
- validating integration fields
- testing anomaly and risk scoring outputs
- producing controlled scenarios for evaluation

---

## `training_pipeline/`

The `training_pipeline/` folder contains the reusable AI008 model training framework.

It supports configuration-driven training for sklearn and PyTorch models.

```text
training_pipeline/
├── configs/
├── data/
├── handoff/
├── logs/
├── reports/
├── checkpoints/
├── src/
├── tests/
├── pipeline.ipynb
├── README.md
└── run_pipeline.bat
```

### What It Does

The training pipeline can:

- load CSV datasets
- load optional abnormal/anomaly datasets
- apply configurable preprocessing
- split data into train/validation/test sets
- train sklearn models
- train PyTorch models
- support classification and anomaly detection tasks
- save checkpoints
- resume PyTorch training from checkpoints
- write logs
- write experiment reports
- support TensorBoard
- run from CLI, notebook, or Python API

### Important Files

| File / Folder | Purpose |
|---|---|
| `training_pipeline/README.md` | Main usage guide for the training pipeline. |
| `training_pipeline/run_pipeline.bat` | Windows runner that launches TensorBoard and runs the training pipeline. |
| `training_pipeline/pipeline.ipynb` | Notebook guide showing CLI usage, in-memory datasets, config setters, resume/recovery, and TensorBoard. |
| `training_pipeline/configs/` | JSON/YAML config files for model training. |
| `training_pipeline/handoff/config_reference.md` | Explains required config sections and programmatic config usage. |
| `training_pipeline/handoff/AI009_USAGE_GUIDE.md` | Usage guide for baseline model handoff. |
| `training_pipeline/handoff/checkpoint_recovery.md` | Notes for checkpoint recovery and resume logic. |
| `training_pipeline/src/core/pipeline.py` | Main reusable `TrainingPipeline` class logic. |
| `training_pipeline/src/core/config_manager.py` | Config management logic. |
| `training_pipeline/src/core/logger.py` | Logging utilities. |
| `training_pipeline/src/models/model_registry.py` | Registry for supported sklearn and PyTorch models. |
| `training_pipeline/src/evaluation/metrics.py` | Classification and anomaly metric calculation. |
| `training_pipeline/src/reporting/experiment_summary.py` | Generates experiment summaries. |
| `training_pipeline/src/utils/config_loader.py` | Loads config files. |
| `training_pipeline/src/utils/config_schema.py` | Config validation/schema logic. |
| `training_pipeline/src/utils/paths.py` | Path helpers. |
| `training_pipeline/src/utils/seeds.py` | Reproducibility/random seed helpers. |
| `training_pipeline/tests/` | Tests for reusable models, config behaviour, reports, and checkpoints. |

### Supported Model Types

The model registry currently supports:

#### Sklearn Models

- `random_forest`
- `isolation_forest`
- `mlp`
- `logistic_regression`
- `decision_tree`
- `gradient_boosting`
- `extra_trees`
- `xgboost`

Aliases include:

- `rf` → `random_forest`
- `isoforest` → `isolation_forest`
- `iforest` → `isolation_forest`
- `logreg` → `logistic_regression`
- `xgb` → `xgboost`

#### PyTorch Models

- `simple_mlp`
- `pytorch_mlp`
- `lstm_forecaster`
- `lstm`

The LSTM forecaster is available when the forecasting model import is available.

### Supported Evaluation

Classification metrics:

- accuracy
- precision
- recall
- F1-score
- confusion matrix
- ROC-AUC where probability scores are available

Anomaly detection metrics:

- accuracy
- precision
- recall
- F1-score
- confusion matrix

### Required Config Sections

Config files should include:

```yaml
dataset:
  path: data/raw/example.csv
  target_column: label
  train_split: 0.7
  val_split: 0.15
  test_split: 0.15
  random_seed: 42
  stratify: true

preprocessing:
  missing_value_strategy: mean
  normalization: standard
  encoding: onehot
  feature_selection: false
  selected_features: []

model:
  type: sklearn
  name: random_forest
  task_type: classification
  hyperparameters:
    n_estimators: 100

training:
  epochs: 10
  batch_size: 32
  learning_rate: 0.001
  tensorboard_enabled: true
  tensorboard_log_dir: logs/tensorboard

output:
  path: checkpoints
  log_path: logs
  reports_path: reports
  save_best_only: true
  organize_checkpoints_by_run: true
  previous_checkpoints_to_keep: 3
  checkpoint_prefix: phoenix_model
```

### How to Run: CLI

From repository root:

```bash
cd ai-ml/training_pipeline
conda run -n phoenix python -m src.main --config configs/default_config.yaml --run-id demo_run
```

Disable checkpoint saving:

```bash
conda run -n phoenix python -m src.main --config configs/default_config.yaml --run-id demo_run --no-checkpoint
```

Run with preprocessing config:

```bash
conda run -n phoenix python -m src.main --config configs/default_config.yaml --preprocessing-config configs/preprocessing_config.json
```

### How to Run: Windows Runner

From:

```text
ai-ml/training_pipeline/
```

Run:

```bat
run_pipeline.bat
```

The runner prompts for:

- config path
- resume checkpoint path
- epoch override
- TensorBoard port

Default config used by the runner:

```text
configs\socialmedia_disaster_pytorch_tensorboard.json
```

Default TensorBoard port:

```text
6006
```

### How to Use: Python API

```python
from src import TrainingPipeline

pipeline = TrainingPipeline(config_path="configs/default_config.yaml")

pipeline.set_dataset(
    path="data/raw/example.csv",
    target_column="label"
)

pipeline.set_model(
    model_type="random_forest",
    hyperparameters={
        "n_estimators": 100,
        "max_depth": 6
    }
)

pipeline.set_training(
    epochs=10,
    batch_size=32,
    learning_rate=0.001
)

pipeline.set_output(
    path="checkpoints",
    log_path="logs",
    reports_path="reports",
    checkpoint_prefix="custom_run"
)

result = pipeline.run(run_id="custom_run")
print(result)
```

### How to Use: In-Memory Dataset

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
    dataset_name="breast_cancer_demo"
)

pipeline.set_model(
    model_type="pytorch_mlp",
    hyperparameters={
        "input_dim": demo_df.shape[1] - 1,
        "hidden_dim": 32,
        "output_dim": 2
    }
)

pipeline.set_training(
    epochs=2,
    batch_size=32,
    verbose=True
)

result = pipeline.run(run_id="breast_cancer_demo_run")
```

### Expected Outputs

```text
training_pipeline/checkpoints/
training_pipeline/logs/
training_pipeline/reports/
training_pipeline/logs/tensorboard/
```

---

## `models/`

The `models/` folder contains model-specific work.

```text
models/
├── anomaly-model/
├── core-model/
└── time-series/
```

---

# `models/anomaly-model/`

The `anomaly-model/` folder contains anomaly detection work, including autoencoder models, comparison experiments, other classical anomaly models, frontend inference, and real-time inference logic.

```text
models/anomaly-model/
├── autoencoder/
├── notebooks/
├── other_models/
└── src/
```

### Important Files / Folders

| File / Folder | Purpose |
|---|---|
| `models/anomaly-model/src/realtime_inference.py` | Real-time anomaly inference pipeline. Handles live JSON validation, preprocessing, regional/hourly aggregation, sliding windows, and prediction. |
| `models/anomaly-model/src/frontend_inference.py` | Inference logic intended for frontend-facing output. |
| `models/anomaly-model/notebooks/label_builder_demo.ipynb` | Notebook for label-building / demo logic. |
| `models/anomaly-model/autoencoder/notebooks/autoencoder_optimization.ipynb` | Autoencoder anomaly optimisation notebook. |
| `models/anomaly-model/other_models/isolation_forest/` | Isolation Forest model experiments, configs, reports, and notebooks. |
| `models/anomaly-model/other_models/lof/` | Local Outlier Factor model experiments and configs. |
| `models/anomaly-model/other_models/one_class_svm/` | One-Class SVM experiments and reports. |
| `models/anomaly-model/other_models/comparison/reports/final_recommendation.md` | Final comparison recommendation across anomaly models. |

### Real-Time Inference Features

The real-time anomaly inference pipeline supports:

- live JSON input validation
- missing value filling
- feature engineering before inference
- single prediction
- batch prediction
- hourly regional aggregation
- sliding-window processing
- stream-ready anomaly workflow

Main class:

```python
RealTimeAnomalyInferencePipeline
```

Main methods:

```python
validate_live_input()
preprocess_live_input()
predict_live()
predict_batch_realtime()
aggregate_hourly_region()
update_sliding_window()
predict_sliding_window()
```

### Aggregation Fields

Required fields:

```text
time_window
region_id
```

Supported numeric aggregation fields include:

```text
firms_event_count
firms_avg_brightness
fire_confidence_high_count
urlhaus_event_count
malicious_url_count
phishing_tag_count
threat_spike_ratio
hour_of_day
day_of_week
```

### Model Recommendation

Current comparison report recommends:

| Category | Recommended Candidate |
|---|---|
| Unsupervised anomaly model | `one_class_svm` |
| Supervised-threshold anomaly model | `autoencoder` |

---

# `models/core-model/`

The `core-model/` folder contains the main PHOENIX risk/correlation model experiments.

```text
models/core-model/
├── features/
├── gb/
└── xgb/
```

### Important Files / Folders

| File / Folder | Purpose |
|---|---|
| `models/core-model/features/phoenix_feature_extraction.ipynb` | Notebook for extracting PHOENIX model features. |
| `models/core-model/gb/notebooks/gb_train.ipynb` | Gradient Boosting training notebook. |
| `models/core-model/xgb/notebooks/train_xgb.ipynb` | XGBoost training notebook. |
| `models/core-model/xgb/configs/optimised_xgboost_config.yaml` | Optimised XGBoost config. |
| `models/core-model/xgb/reports/trey_xgb_core_v2_experiment_summary.json` | XGBoost experiment summary report. |

### XGBoost Core Model

The optimised XGBoost config uses:

```yaml
model:
  type: sklearn
  name: xgboost
  task_type: classification
```

Target column:

```yaml
target_column: hazard_severity
```

Dataset path:

```yaml
../../../../datasets/phoenix_combined_dataset_large.csv
```

Train/validation/test split:

```yaml
train_split: 0.7
val_split: 0.15
test_split: 0.15
```

Main hyperparameters:

```yaml
n_estimators: 120
learning_rate: 0.1
max_depth: 3
random_state: 42
eval_metric: mlogloss
tree_method: hist
```

### Core Model Feature Groups

The XGBoost config defines:

#### Text Features

```text
text
url
```

#### Context Features

```text
timestamp
hazard_type
hazard_timestamp
hazard_location
hazard_status
alert_level
source
```

#### Categorical Columns

```text
hazard_type
hazard_location
hazard_status
alert_level
source
```

#### Datetime Columns

```text
timestamp
hazard_timestamp
```

---

# `models/time-series/`

The `time-series/` folder contains AI013 forecasting work.

It focuses on wildfire/fire-related time-series forecasting.

```text
models/time-series/
├── notebooks/
├── predictions/
├── src/
└── sequence_generator.py
```

### Important Files

| File | Purpose |
|---|---|
| `models/time-series/notebooks/forecasting_train.ipynb` | Main forecasting training notebook. |
| `models/time-series/src/dataset_builder.py` | Loads wildfire dataset, filters to Australia, aggregates daily, fills missing values, and prepares modelling data. |
| `models/time-series/src/models/model.py` | Forecasting model definition. |
| `models/time-series/src/evaluation/evaluate.py` | Evaluation logic for forecasting results. |
| `models/time-series/sequence_generator.py` | Sequence generation helper. |
| `models/time-series/predictions/predictor.py` | Prediction logic for forecasting outputs. |

### Dataset Builder

The time-series dataset builder:

- loads wildfire CSV data
- filters by region, defaulting to `Australia`
- parses date fields
- sorts records by acquisition date
- aggregates satellite fire detections to daily level
- fills missing numeric values using medians

### Forecasting Feature Columns

```text
temp_max_c
wind_max_kmh
precip_mm
humidity_pct
brightness_k
event_count
```

Target column:

```text
frp_mw
```

Date column:

```text
acq_date
```

### How to Run Dataset Builder

From repository root:

```bash
cd ai-ml/models/time-series
python src/dataset_builder.py
```

Expected dataset path:

```text
ai-ml/models/time-series/data/wildfire_multi_region_dataset.csv
```

---

## `ai013/`

The `ai013/` folder appears to contain another version of forecasting model work, likely connected to AI013 time-series forecasting.

```text
ai013/
└── src/
    └── model/
        └── forecasting/
```

### Important Files

| File | Purpose |
|---|---|
| `ai013/src/model/forecasting/trainer.py` | Forecasting model training logic. |
| `ai013/src/model/forecasting/sequence_generator.py` | Sequence generation logic for forecasting. |
| `ai013/src/model/forecasting/testing_analysis_notebook.ipynb` | Testing and analysis notebook for forecasting. |

---

## `Sample Records/`

The `Sample Records/` folder contains example JSON records for integration and schema demonstration.

```text
Sample Records/
├── hazard_event_samples.json
└── risk_assessment_integration.json
```

### Important Files

| File | Purpose |
|---|---|
| `hazard_event_samples.json` | Sample hazard event records. |
| `risk_assessment_integration.json` | Sample linked hazard-cyber risk assessment integration records. |

### Example Integration Fields

The risk assessment sample includes fields such as:

```text
integration_event_id
related_hazard_event_id
related_threat_id
correlation_score
linkage_reason
integration_confidence
linked_event_type
event_status
event_time
detected_at
reported_at
created_at
updated_at
```

### Example Use

These files are useful for:

- backend integration testing
- API schema reference
- output structure demonstration
- documentation examples
- validating model-to-backend handoff fields

---

## `utils/`

The `utils/` folder contains shared helper scripts.

```text
utils/
├── experiment_tracker.py
└── refinement.py
```

### Important Files

| File | Purpose |
|---|---|
| `utils/experiment_tracker.py` | Helper logic for tracking experiments and model runs. |
| `utils/refinement.py` | Utility/refinement helper script. |

Use this folder for shared helper logic that does not belong to one specific model or task folder.

---

# How to Use the AI/ML Folder

## 1. Clone the Repository

```bash
git clone https://github.com/Hardhat-Enterprises/Phoenix.git
cd Phoenix
```

---

## 2. Switch to `dev`

```bash
git checkout dev
git pull origin dev
```

---

## 3. Move into the AI/ML Folder

```bash
cd ai-ml
```

---

## 4. Create / Activate Environment

If using Conda:

```bash
conda create -n phoenix python=3.10
conda activate phoenix
```

Install dependencies depending on which module you are using.

For feature engineering:

```bash
cd features
pip install -r requirements.txt
```

For the training pipeline:

```bash
cd ../training_pipeline
pip install -r ../requirements.txt
```

If a module has its own dependencies, install from that module’s instructions.

---

# Common Workflows

## Run AI003 Cleaning

```bash
cd ai-ml/cleaning
python src/main.py
```

With custom config:

```bash
python src/main.py --config config/pipeline_config.json
```

---

## Run AI004 Feature Engineering

```bash
cd ai-ml/features
python run_pipeline.py
```

Outputs:

```text
features/ai004_features_output.csv
features/feature_mapping.json
```

---

## Run AI008 Training Pipeline

```bash
cd ai-ml/training_pipeline
conda run -n phoenix python -m src.main --config configs/default_config.yaml --run-id demo_run
```

Or use the Windows runner:

```bat
run_pipeline.bat
```

---

## Run Training Pipeline with TensorBoard

```bash
cd ai-ml/training_pipeline
tensorboard --logdir logs/tensorboard --port 6006
```

Then open:

```text
http://localhost:6006
```

---

## Run Core XGBoost Model

Use the XGBoost notebook:

```text
ai-ml/models/core-model/xgb/notebooks/train_xgb.ipynb
```

Or use the config:

```text
ai-ml/models/core-model/xgb/configs/optimised_xgboost_config.yaml
```

---

## Run Anomaly Detection Experiments

Main folders:

```text
ai-ml/models/anomaly-model/autoencoder/
ai-ml/models/anomaly-model/other_models/isolation_forest/
ai-ml/models/anomaly-model/other_models/lof/
ai-ml/models/anomaly-model/other_models/one_class_svm/
```

Important notebooks:

```text
autoencoder/notebooks/autoencoder_optimization.ipynb
other_models/isolation_forest/notebooks/isolation_forest_train.ipynb
notebooks/label_builder_demo.ipynb
```

---

## Run Time-Series Forecasting

Main notebook:

```text
ai-ml/models/time-series/notebooks/forecasting_train.ipynb
```

Dataset builder:

```bash
cd ai-ml/models/time-series
python src/dataset_builder.py
```

Prediction script:

```text
ai-ml/models/time-series/predictions/predictor.py
```

---

# Output Locations

## Cleaning Outputs

```text
ai-ml/cleaning/data/output/
ai-ml/cleaning/data/reports/
ai-ml/cleaning/logging/
```

## Feature Outputs

```text
ai-ml/features/ai004_features_output.csv
ai-ml/features/feature_mapping.json
```

## Training Outputs

```text
ai-ml/training_pipeline/checkpoints/
ai-ml/training_pipeline/logs/
ai-ml/training_pipeline/reports/
```

## Model Outputs

```text
ai-ml/models/anomaly-model/
ai-ml/models/core-model/
ai-ml/models/time-series/
```

---

# AI Task Mapping

| Task | Folder / Files | Purpose |
|---|---|---|
| AI003 | `cleaning/` | Data cleaning, validation, logging, cleaned CSV output. |
| AI004 | `features/` | Feature engineering from hazard, cyber, weather, geo, infrastructure, and social data. |
| AI005 | `synthetic/` | Synthetic data generation and validation. |
| AI008 | `training_pipeline/` | Reusable training framework for sklearn and PyTorch models. |
| AI009 | `training_pipeline/handoff/AI009_USAGE_GUIDE.md` | Baseline model training and handoff usage. |
| AI012 | `models/anomaly-model/` | Anomaly detection models and comparison. |
| AI013 | `models/time-series/`, `ai013/` | Time-series forecasting work. |
| Core Model | `models/core-model/` | Main PHOENIX core risk/correlation model experiments. |
| Integration | `Sample Records/`, anomaly inference scripts | Backend-ready sample records and inference outputs. |

---

# Model Evaluation Standards

## Classification Models

Use:

- accuracy
- precision
- recall
- F1-score
- confusion matrix
- ROC-AUC where probability scores are available

## Anomaly Detection Models

Use:

- precision
- recall
- F1-score
- confusion matrix
- anomaly rate
- detection stability
- false positives
- false negatives
- PR-AUC / ROC-AUC where labelled data is available

## Forecasting Models

Use:

- MAE
- RMSE
- MAPE where useful
- visual forecast-vs-actual plots
- residual analysis
- time-window performance checks

---

# Git Workflow for AI/ML Team

The current AI/ML workflow uses:

```text
your branch → task branch → dev → main
```

## Branch Rules

| Branch | Use |
|---|---|
| `main` | Final stable version only. Do not work directly here. |
| `dev` | Integration branch. Do not work directly here. |
| `task branch` | Branch created for each AI/ML task. |
| `personal branch` | Individual working branch created from task branch. |

## Start from Your Assigned Task Branch

Example task branches:

```text
ai-ml/ai003-data-cleaning
ai-ml/ai004-feature-engineering
ai-ml/ai005-synthetic-data
```

Pull latest:

```bash
git fetch origin
git checkout <task-branch>
git pull origin <task-branch>
```

## Create Your Personal Branch

Format:

```text
ai-ml/<task-id>/<your-name>-<short-description>
```

Example:

```bash
git checkout -b ai-ml/ai005/john-scenario-logic
```

Other examples:

```text
ai-ml/ai003/sunain-cleaning-validation
ai-ml/ai004/danny-feature-mapping
ai-ml/ai012/sam-anomaly-thresholding
```

## Commit and Push

```bash
git add .
git commit -m "AI004: add feature mapping output"
git push -u origin <your-branch>
```

## Pull Request Rules

Open PR with:

```text
base: task branch
compare: your branch
```

Example:

```text
ai-ml/ai005/john-scenario-logic → ai-ml/ai005-synthetic-data
```

Task leads review and merge personal branches into task branches.

Once the task is complete, the task branch is merged into:

```text
dev
```

---

# File Naming Rules

Use clear, task-based names.

Good:

```text
cleaning_pipeline.py
feature_engineer.py
run_pipeline.py
train_xgb.ipynb
isolation_forest_train.ipynb
validation_report.md
experiment_summary.json
```

Avoid:

```text
final.py
final_final.py
test123.ipynb
copy_of_model.ipynb
newfile2.csv
```

---

# Documentation Rules

Each major task should include:

- task objective
- how to run
- input files
- output files
- model/config used
- metrics produced
- screenshots or graphs where relevant
- known limitations
- next steps

Recommended locations:

```text
ai-ml/<task-folder>/docs/
ai-ml/training_pipeline/handoff/
ai-ml/models/<model-folder>/reports/
```

---

# Team Members

**Count:** 13/17

- **Sunain Mushtaq (Team Lead)**  
  *13/04/2026*

- **Danny Zhao**  
  *14/04/2026*

- **BHARADWAJ**  
  *14/04/2026*

- **Faisal Ibrahim Syed**  
  *16/04/2026*

- **Aarnav Anoop**  
  *17/04/2026*

- **Preetham Chandu**  
  *18/04/2026*

- **Abin Baby**  
  *26/04/2026*

- **Sam Braley**  
  *28/04/2026*

- **Asad Ullah**  
  *29/04/2026*

- **Trey Martin**  
  *15/05/2026*

- **Tarun Kumar Atla**  
  *16/05/2026*

- **Sammed Bharat Vaigud**  
  *16/05/2026*

- **Thommaya Hewage Vishvani Gunapala**  
  *16/05/2026*

---

# Maintainer Notes

Keep the AI/ML folder structured around task ownership and reproducible outputs.

Main standards:

- put reusable logic in scripts, not only notebooks
- keep notebooks for experiments, demos, and analysis
- keep outputs inside the correct task/model folder
- keep reports beside the related model/task
- do not push unnecessary temporary files
- do not work directly on `dev` or `main`
- document how each task can be run
- keep configs reproducible
- keep model outputs backend-readable where possible

The current `ai-ml/` folder is split into practical workstreams rather than one single pipeline:

```text
cleaning          → AI003 data cleaning and validation
features          → AI004 feature engineering
synthetic         → AI005 synthetic dataset generation
training_pipeline → AI008 reusable model training
models            → anomaly, core, and forecasting models
Sample Records    → backend/integration JSON examples
utils             → shared helper logic
```
