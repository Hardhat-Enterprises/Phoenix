"""
AI019 - Role 2: Real-Time Inference Pipeline Engineer

This script builds on Role 1 backend integration work.
It supports:
- live JSON input validation
- feature preprocessing
- hourly and regional aggregation
- sliding-window processing
- batch anomaly prediction
- stream-ready anomaly workflow

Main functions:
- predict_live()
- predict_batch_realtime()
- process_stream_event()
- aggregate_hourly_region()
"""

from __future__ import annotations

import json
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

try:
    from anomaly_integration import (
        DEFAULT_AUTOENCODER_CHECKPOINT_PATH,
        validate_input,
        fill_missing,
        engineer_features,
        predict,
        predict_batch,
    )
except ImportError:
    from .anomaly_integration import (
        DEFAULT_AUTOENCODER_CHECKPOINT_PATH,
        validate_input,
        fill_missing,
        engineer_features,
        predict,
        predict_batch,
    )


DEFAULT_CHECKPOINT_PATH = DEFAULT_AUTOENCODER_CHECKPOINT_PATH


class RealTimeAnomalyInferencePipeline:
    """
    Real-time inference pipeline for AI019 anomaly detection.
    """

    def __init__(
        self,
        checkpoint_path: str = DEFAULT_CHECKPOINT_PATH,
        window_size: int = 24,
    ):
        self.checkpoint_path = checkpoint_path
        self.window_size = window_size
        self.region_windows: dict[str, deque] = defaultdict(
            lambda: deque(maxlen=self.window_size)
        )

    # ------------------------------------------------------------------
    # Input validation
    # ------------------------------------------------------------------
    def validate_live_input(self, input_data: dict) -> dict:
        """
        Validate live JSON input and return a structured validation result.
        """
        if not isinstance(input_data, dict):
            return {
                "valid": False,
                "errors": ["Input must be a JSON object / Python dictionary"],
            }

        errors = validate_input(input_data)

        return {
            "valid": len(errors) == 0,
            "errors": errors,
        }

    # ------------------------------------------------------------------
    # Preprocessing
    # ------------------------------------------------------------------
    def preprocess_live_input(self, input_data: dict) -> dict:
        """
        Fill missing fields and engineer features for live input.
        """
        validation = self.validate_live_input(input_data)

        if not validation["valid"]:
            raise ValueError(f"Invalid live input: {validation['errors']}")

        filled_data = fill_missing(input_data)
        engineered_features = engineer_features(filled_data)

        return {
            "raw_input": input_data,
            "filled_input": filled_data,
            "engineered_features": engineered_features,
        }

    # ------------------------------------------------------------------
    # Single real-time prediction
    # ------------------------------------------------------------------
    def predict_live(self, input_data: dict) -> dict:
        """
        Accept one live JSON input and return anomaly prediction.
        """
        self.preprocess_live_input(input_data)

        result = predict(
            input_data=input_data,
            checkpoint_path=self.checkpoint_path,
        )

        result["pipeline_mode"] = "real_time_single"
        result["processed_at"] = datetime.now(timezone.utc).isoformat()

        return result

    # ------------------------------------------------------------------
    # Batch prediction
    # ------------------------------------------------------------------
    def predict_batch_realtime(self, records: list[dict]) -> dict:
        """
        Accept multiple JSON records and return batch anomaly prediction.
        """
        if not isinstance(records, list):
            raise ValueError("Batch input must be a list of JSON records")

        clean_records = []
        rejected_records = []

        for idx, record in enumerate(records):
            validation = self.validate_live_input(record)

            if validation["valid"]:
                clean_records.append(record)
            else:
                rejected_records.append({
                    "index": idx,
                    "record": record,
                    "errors": validation["errors"],
                })

        prediction_result = predict_batch(
            clean_records,
            checkpoint_path=self.checkpoint_path,
        )

        prediction_result["pipeline_mode"] = "real_time_batch"
        prediction_result["rejected_records"] = rejected_records
        prediction_result["rejected_count"] = len(rejected_records)

        return prediction_result

    # ------------------------------------------------------------------
    # Regional hourly aggregation
    # ------------------------------------------------------------------
    def aggregate_hourly_region(self, records: list[dict]) -> list[dict]:
        """
        Aggregate records by time_window and region_id.

        This supports regional/hourly anomaly inference.
        """
        if not records:
            return []

        df = pd.DataFrame(records)

        required_cols = ["time_window", "region_id"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Missing required aggregation column: {col}")

        numeric_cols = [
            "firms_event_count",
            "firms_avg_brightness",
            "fire_confidence_high_count",
            "urlhaus_event_count",
            "malicious_url_count",
            "phishing_tag_count",
            "threat_spike_ratio",
            "hour_of_day",
            "day_of_week",
        ]

        for col in numeric_cols:
            if col not in df.columns:
                df[col] = 0.0

        df[numeric_cols] = df[numeric_cols].apply(
            pd.to_numeric,
            errors="coerce"
        ).fillna(0.0)

        aggregation_rules = {
            "firms_event_count": "sum",
            "firms_avg_brightness": "mean",
            "fire_confidence_high_count": "sum",
            "urlhaus_event_count": "sum",
            "malicious_url_count": "sum",
            "phishing_tag_count": "sum",
            "threat_spike_ratio": "max",
            "hour_of_day": "first",
            "day_of_week": "first",
        }

        grouped = (
            df.groupby(["time_window", "region_id"], as_index=False)
            .agg(aggregation_rules)
        )

        return grouped.to_dict(orient="records")

    # ------------------------------------------------------------------
    # Sliding-window processing
    # ------------------------------------------------------------------
    def update_sliding_window(self, input_data: dict) -> list[dict]:
        """
        Add live record into regional sliding window and return current window.
        """
        validation = self.validate_live_input(input_data)

        if not validation["valid"]:
            raise ValueError(f"Invalid stream input: {validation['errors']}")

        region_id = input_data["region_id"]
        self.region_windows[region_id].append(fill_missing(input_data))

        return list(self.region_windows[region_id])

    def predict_sliding_window(self, input_data: dict) -> dict:
        """
        Process one live event, update sliding window, aggregate region data,
        and generate prediction on the latest regional/hourly record.
        """
        current_window = self.update_sliding_window(input_data)

        aggregated_records = self.aggregate_hourly_region(current_window)

        if not aggregated_records:
            raise ValueError("No records available after aggregation")

        latest_record = aggregated_records[-1]

        result = self.predict_live(latest_record)

        result["pipeline_mode"] = "sliding_window"
        result["window_size"] = len(current_window)
        result["region_id"] = latest_record["region_id"]
        result["time_window"] = latest_record["time_window"]

        return result

    # ------------------------------------------------------------------
    # Stream-ready processing
    # ------------------------------------------------------------------
    def process_stream_event(self, event: dict) -> dict:
        """
        Stream-ready wrapper.

        This function can be connected later to Kafka, WebSocket,
        API Gateway, or backend queue systems.
        """
        try:
            prediction = self.predict_sliding_window(event)

            return {
                "status": "success",
                "result": prediction,
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }

        except Exception as exc:
            return {
                "status": "error",
                "error": str(exc),
                "input": event,
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }

    # ------------------------------------------------------------------
    # Load JSON file and batch predict
    # ------------------------------------------------------------------
    def predict_from_json_file(self, input_path: str, output_path: str | None = None) -> dict:
        """
        Load JSON records from file and run batch prediction.
        """
        path = Path(input_path)

        if not path.exists():
            raise FileNotFoundError(f"Input JSON file not found: {input_path}")

        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)

        if isinstance(data, dict):
            records = [data]
        elif isinstance(data, list):
            records = data
        else:
            raise ValueError("JSON file must contain either a dict or list of dicts")

        result = self.predict_batch_realtime(records)

        if output_path:
            with open(output_path, "w", encoding="utf-8") as file:
                json.dump(result, file, indent=2)

        return result


# ----------------------------------------------------------------------
# Convenience functions for backend / testing
# ----------------------------------------------------------------------
def predict_live(
    input_data: dict,
    checkpoint_path: str = DEFAULT_CHECKPOINT_PATH,
) -> dict:
    pipeline = RealTimeAnomalyInferencePipeline(
        checkpoint_path=checkpoint_path
    )
    return pipeline.predict_live(input_data)


def predict_batch_realtime(
    records: list[dict],
    checkpoint_path: str = DEFAULT_CHECKPOINT_PATH,
) -> dict:
    pipeline = RealTimeAnomalyInferencePipeline(
        checkpoint_path=checkpoint_path
    )
    return pipeline.predict_batch_realtime(records)


def process_stream_event(
    event: dict,
    checkpoint_path: str = DEFAULT_CHECKPOINT_PATH,
) -> dict:
    pipeline = RealTimeAnomalyInferencePipeline(
        checkpoint_path=checkpoint_path
    )
    return pipeline.process_stream_event(event)


# ----------------------------------------------------------------------
# Demo test
# ----------------------------------------------------------------------
if __name__ == "__main__":
    demo_event = {
        "time_window": "2024-01-15 14:00:00",
        "region_id": "VIC_GIPPSLAND",
        "firms_event_count": 12,
        "firms_avg_brightness": 331.5,
        "fire_confidence_high_count": 5,
        "urlhaus_event_count": 18,
        "malicious_url_count": 9,
        "phishing_tag_count": 4,
        "threat_spike_ratio": 2.6,
        "hour_of_day": 14,
        "day_of_week": 1,
    }

    pipeline = RealTimeAnomalyInferencePipeline()

    print("\n--- Live Prediction ---")
    print(json.dumps(pipeline.predict_live(demo_event), indent=2))

    print("\n--- Stream Prediction ---")
    print(json.dumps(pipeline.process_stream_event(demo_event), indent=2))

    print("\n--- Batch Prediction ---")
    print(json.dumps(pipeline.predict_batch_realtime([demo_event, demo_event]), indent=2))
