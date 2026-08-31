import numpy as np
import pandas as pd
from pathlib import Path
from model import ForecastingModel
from dataset_builder import build_dataset
from sequence_generator import create_sequences, train_test_split_sequences


def predict(model: ForecastingModel, X_test: np.ndarray) -> np.ndarray:
    """Run predictions on test sequences."""
    return model.forward(X_test)


def save_predictions(y_pred: np.ndarray, y_actual: np.ndarray,
                     output_path: str):
    """Save predicted vs actual to CSV aligned with project output structure."""
    df = pd.DataFrame({
        'actual_severity_score': y_actual,
        'predicted_severity_score': y_pred,
        'absolute_error': np.abs(y_pred - y_actual)
    })
    df.to_csv(output_path, index=False)
    print(f"Predictions saved to {output_path}")
    return df


def evaluate(y_pred: np.ndarray, y_actual: np.ndarray) -> dict:
    """Calculate evaluation metrics."""
    mae = float(np.mean(np.abs(y_pred - y_actual)))
    mse = float(np.mean((y_pred - y_actual) ** 2))
    rmse = float(np.sqrt(mse))
    return {'mae': mae, 'mse': mse, 'rmse': rmse}


if __name__ == "__main__":
    import json

    base = Path(__file__).resolve().parents[5]
    data_path = base / "cleaning" / "data" / "output" / "cleaned_data.csv"
    model_path = base / "models" / "ai013_forecasting" / "forecasting_model.npz"
    output_path = base / "cleaning" / "data" / "output" / "forecasting_predictions.csv"
    report_path = base / "reports" / "forecasting_comparison_report.json"

    # Load data and sequences
    df = build_dataset(str(data_path))
    X, y = create_sequences(df, sequence_length=5)
    _, X_test, _, y_test = train_test_split_sequences(X, y)

    # Load model and predict
    model = ForecastingModel(input_size=5, hidden_size=16)
    model.load(str(model_path))
    y_pred = predict(model, X_test)

    # Save predictions
    results_df = save_predictions(y_pred, y_test, str(output_path))

    # Save comparison report
    metrics = evaluate(y_pred, y_test)
    report = {
        'model': 'LSTM Forecasting Model',
        'task': 'AI013',
        'target': 'severity_score',
        'metrics': metrics,
        'sample_predictions': results_df.head(5).to_dict(orient='records')
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"Comparison report saved to {report_path}")
    print(f"Metrics: {metrics}")
