"""
AI021 / AI019 - Role 3
Deployment, Monitoring & Validation Engineer

Features:
- deployment validation
- inference latency benchmarking
- logging/debugging system
- anomaly alert validation
- failure-case testing
- production workflow validation
- deployment-ready packaging checks
- model loading reliability tests
- monitoring metrics

Works on top of:
realtime_inference.py
"""

from __future__ import annotations

import json
import logging
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from realtime_inference import RealTimeAnomalyInferencePipeline


# ----------------------------------------------------------------------
# Logging Configuration
# ----------------------------------------------------------------------

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

LOG_FILE = LOG_DIR / "anomaly_monitoring.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(),
    ],
)

logger = logging.getLogger("AI021_DEPLOYMENT")


# ----------------------------------------------------------------------
# Deployment Monitoring Class
# ----------------------------------------------------------------------

class DeploymentMonitoringValidator:
    """
    Deployment + monitoring + validation layer
    for anomaly detection production workflows.
    """

    def __init__(
        self,
        
        checkpoint_path: str = 
    "ai-ml/models/ai012-anomaly/checkpoints/isolation_forest.pkl"
    ):
        self.pipeline = RealTimeAnomalyInferencePipeline(
            checkpoint_path=checkpoint_path
        )

        self.monitoring_metrics = {
            "total_requests": 0,
            "successful_predictions": 0,
            "failed_predictions": 0,
            "anomalies_detected": 0,
            "average_latency_ms": 0.0,
            "max_latency_ms": 0.0,
            "min_latency_ms": None,
        }

        logger.info("DeploymentMonitoringValidator initialized")

    # ------------------------------------------------------------------
    # Model loading validation
    # ------------------------------------------------------------------
    def validate_model_loading(self) -> dict:
        """
        Ensure checkpoint exists and pipeline loads correctly.
        """

        try:
            checkpoint = Path(self.pipeline.checkpoint_path)

            if not checkpoint.exists():
                return {
                    "status": "failed",
                    "error": f"Checkpoint not found: {checkpoint}",
                }

            logger.info("Model checkpoint validated")

            return {
                "status": "success",
                "checkpoint": str(checkpoint),
                "validated_at": datetime.now(timezone.utc).isoformat(),
            }

        except Exception as exc:
            logger.exception("Model loading validation failed")

            return {
                "status": "failed",
                "error": str(exc),
            }

    # ------------------------------------------------------------------
    # Inference latency benchmark
    # ------------------------------------------------------------------
    def benchmark_inference_latency(
        self,
        sample_event: dict,
        runs: int = 50,
    ) -> dict:
        """
        Benchmark inference speed.
        """

        latencies = []

        logger.info(f"Running latency benchmark ({runs} runs)")

        for _ in range(runs):

            start_time = time.perf_counter()

            self.pipeline.predict_live(sample_event)

            end_time = time.perf_counter()

            latency_ms = (end_time - start_time) * 1000

            latencies.append(latency_ms)

        avg_latency = statistics.mean(latencies)
        max_latency = max(latencies)
        min_latency = min(latencies)

        self.monitoring_metrics["average_latency_ms"] = avg_latency
        self.monitoring_metrics["max_latency_ms"] = max_latency
        self.monitoring_metrics["min_latency_ms"] = min_latency

        logger.info(
            f"Latency benchmark completed | "
            f"avg={avg_latency:.2f}ms"
        )

        return {
            "runs": runs,
            "average_latency_ms": round(avg_latency, 2),
            "max_latency_ms": round(max_latency, 2),
            "min_latency_ms": round(min_latency, 2),
            "benchmark_completed_at": datetime.now(
                timezone.utc
            ).isoformat(),
        }

    # ------------------------------------------------------------------
    # Production workflow validation
    # ------------------------------------------------------------------
    def validate_production_workflow(
        self,
        event: dict,
    ) -> dict:
        """
        Full production inference validation workflow.
        """

        start_time = time.perf_counter()

        self.monitoring_metrics["total_requests"] += 1

        try:

            result = self.pipeline.process_stream_event(event)

            latency_ms = (time.perf_counter() - start_time) * 1000

            if result["status"] == "success":

                self.monitoring_metrics[
                    "successful_predictions"
                ] += 1

                prediction = result["result"]

                if prediction.get("is_anomaly"):
                    self.monitoring_metrics[
                        "anomalies_detected"
                    ] += 1

                logger.info(
                    f"Prediction success | "
                    f"latency={latency_ms:.2f}ms"
                )

                return {
                    "workflow_status": "success",
                    "latency_ms": round(latency_ms, 2),
                    "prediction_result": prediction,
                    "validated_at": datetime.now(
                        timezone.utc
                    ).isoformat(),
                }

            self.monitoring_metrics["failed_predictions"] += 1

            logger.error("Prediction returned error status")

            return {
                "workflow_status": "failed",
                "details": result,
            }

        except Exception as exc:

            self.monitoring_metrics["failed_predictions"] += 1

            logger.exception("Production workflow failed")

            return {
                "workflow_status": "exception",
                "error": str(exc),
            }

    # ------------------------------------------------------------------
    # Failure-case testing
    # ------------------------------------------------------------------
    def test_failure_cases(self) -> list[dict]:
        """
        Validate system robustness against invalid inputs.
        """

        logger.info("Running failure-case tests")

        invalid_cases = [
            None,
            [],
            {},
            {"region_id": "ONLY_REGION"},
            {"bad_field": 123},
            "invalid_string_input",
        ]

        results = []

        for idx, case in enumerate(invalid_cases):

            try:

                result = self.pipeline.process_stream_event(case)

                results.append({
                    "case_id": idx,
                    "input": str(case),
                    "result": result["status"],
                })

            except Exception as exc:

                results.append({
                    "case_id": idx,
                    "input": str(case),
                    "error": str(exc),
                })

        logger.info("Failure-case testing completed")

        return results

    # ------------------------------------------------------------------
    # Alert reliability validation
    # ------------------------------------------------------------------
    def validate_alert_trigger(
        self,
        event: dict,
    ) -> dict:
        """
        Validate anomaly alert generation reliability.
        """

        result = self.pipeline.predict_live(event)

        alert_triggered = result.get("is_anomaly", False)

        logger.info(
            f"Alert validation | triggered={alert_triggered}"
        )

        return {
            "alert_triggered": alert_triggered,
            "risk_level": result.get("risk_level"),
            "confidence_score": result.get(
                "confidence_score"
            ),
            "validated_at": datetime.now(
                timezone.utc
            ).isoformat(),
        }

    # ------------------------------------------------------------------
    # Monitoring metrics
    # ------------------------------------------------------------------
    def get_monitoring_metrics(self) -> dict:
        """
        Return operational monitoring metrics.
        """

        success_rate = 0.0

        if self.monitoring_metrics["total_requests"] > 0:

            success_rate = (
                self.monitoring_metrics[
                    "successful_predictions"
                ]
                / self.monitoring_metrics["total_requests"]
            ) * 100

        metrics = {
            **self.monitoring_metrics,
            "success_rate_percent": round(success_rate, 2),
            "generated_at": datetime.now(
                timezone.utc
            ).isoformat(),
        }

        logger.info("Monitoring metrics generated")

        return metrics

    # ------------------------------------------------------------------
    # Export deployment report
    # ------------------------------------------------------------------
    def export_validation_report(
        self,
        output_path: str = "deployment_validation_report.json",
    ) -> str:
        """
        Export deployment monitoring report.
        """

        report = {
            "deployment_metrics": self.get_monitoring_metrics(),
            "generated_at": datetime.now(
                timezone.utc
            ).isoformat(),
        }

        with open(output_path, "w", encoding="utf-8") as file:
            json.dump(report, file, indent=2)

        logger.info(f"Validation report exported: {output_path}")

        return output_path


# ----------------------------------------------------------------------
# Demo Test
# ----------------------------------------------------------------------

if __name__ == "__main__":

    sample_event = {
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

    validator = DeploymentMonitoringValidator()

    print("\n--- Model Validation ---")
    print(json.dumps(
        validator.validate_model_loading(),
        indent=2
    ))

    print("\n--- Latency Benchmark ---")
    print(json.dumps(
        validator.benchmark_inference_latency(
            sample_event,
            runs=20,
        ),
        indent=2
    ))

    print("\n--- Production Workflow ---")
    print(json.dumps(
        validator.validate_production_workflow(
            sample_event
        ),
        indent=2
    ))

    print("\n--- Failure Cases ---")
    print(json.dumps(
        validator.test_failure_cases(),
        indent=2
    ))

    print("\n--- Alert Validation ---")
    print(json.dumps(
        validator.validate_alert_trigger(
            sample_event
        ),
        indent=2
    ))

    print("\n--- Monitoring Metrics ---")
    print(json.dumps(
        validator.get_monitoring_metrics(),
        indent=2
    ))

    validator.export_validation_report()