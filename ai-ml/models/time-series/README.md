# AI013 — Time Series Forecasting

**Phoenix Project | AI-ML Team**

LSTM-based forecasting model for predicting fire radiative power (severity proxy) from Australian wildfire data.

---

## Setup

1. Place `wildfire_multi_region_dataset.csv` in the `data/` folder
2. Install dependencies:
   ```bash
   pip install pandas numpy scikit-learn torch matplotlib seaborn pyyaml
   ```

## Run

**Train:**
Open `notebooks/forecasting_train.ipynb` and run all cells.

**Evaluate / Test:**
Open `notebooks/forecasting_test.ipynb` and run all cells (requires trained checkpoint).

---

## Folder Structure

```
ai013-forecasting/
├── configs/
│   └── forecasting.yaml       # all hyperparameters and paths
├── checkpoints/
│   └── forecasting.pkl        # saved model weights (generated after training)
├── data/
│   └── wildfire_multi_region_dataset.csv   ← place dataset here
├── notebooks/
│   ├── forecasting_train.ipynb
│   └── forecasting_test.ipynb
├── outputs/
│   ├── test_predictions.csv   (generated after test run)
│   └── metrics_report.csv     (generated after test run)
└── src/
    ├── dataset_builder.py         loads + aggregates wildfire CSV
    ├── sequence_generator.py      sliding window sequence creation
    ├── models/
    │   └── model.py               LSTMForecaster class + training loop
    ├── features/
    │   └── feature_selector.py    correlation-based feature selection
    ├── validation/
    │   └── validation_label_builder.py   severity label classification
    ├── evaluation/
    │   └── evaluate.py            metrics, plots, reproducibility (Tarun Kumar Atla)
    ├── scoring/
    │   └── forecasting_scoring.py  scoring wrapper + checkpoint save/load
    └── predictions/
        └── predictor.py            load model + test + future forecast
```

## Dataset

- **Source:** `wildfire_multi_region_dataset.csv` — satellite fire detection data
- **Region:** Australia only (filtered from multi-region)
- **Target:** `frp_mw` (Fire Radiative Power in megawatts) — continuous severity measure
- **Features:** temperature, wind speed, precipitation, humidity, brightness, event count

## Model

- Single-layer LSTM, hidden size 64
- Input: 10-day sliding window
- Trained with Adam + ReduceLROnPlateau scheduler + gradient clipping
- Evaluated against rolling mean baseline
