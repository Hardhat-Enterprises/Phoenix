"""Output formatting utilities for AI013 forecasting predictions."""

from __future__ import annotations

from typing import Any


def format_forecasting_output(
    prediction_score: float,
    forecast_values: list[float] | None = None,
) -> dict[str, Any]:
    """
    Format forecasting prediction outputs into a structured response.
    """

    if prediction_score >= 0.8:
        risk_level = "High"
    elif prediction_score >= 0.5:
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    output = {
        "model_type": "forecasting",
        "prediction_score": round(float(prediction_score), 4),
        "risk_level": risk_level,
    }

    if forecast_values is not None:
        output["forecast_values"] = forecast_values
        output["forecast_window"] = len(forecast_values)

    return output


if __name__ == "__main__":
    sample_prediction = 0.82
    sample_forecast = [12.5, 13.1, 14.0]

    formatted_output = format_forecasting_output(
        sample_prediction,
        sample_forecast,
    )

    print("AI013 Forecasting Output:")
    print(formatted_output)