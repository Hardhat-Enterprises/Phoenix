"""
AI021 / AI019 Role 3
Deployment & Validation Tests
"""

import json

from deployment_monitoring import (
    DeploymentMonitoringValidator
)


def get_demo_event():

    return {
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


def test_model_loading():

    validator = DeploymentMonitoringValidator()

    result = validator.validate_model_loading()

    assert "status" in result

    print("\nModel loading validation passed")
    print(json.dumps(result, indent=2))


def test_latency_benchmark():

    validator = DeploymentMonitoringValidator()

    result = validator.benchmark_inference_latency(
        get_demo_event(),
        runs=10,
    )

    assert "average_latency_ms" in result

    print("\nLatency benchmark passed")
    print(json.dumps(result, indent=2))


def test_production_workflow():

    validator = DeploymentMonitoringValidator()

    result = validator.validate_production_workflow(
        get_demo_event()
    )

    assert "workflow_status" in result

    print("\nProduction workflow validation passed")
    print(json.dumps(result, indent=2))


def test_failure_cases():

    validator = DeploymentMonitoringValidator()

    results = validator.test_failure_cases()

    assert isinstance(results, list)

    print("\nFailure-case testing passed")
    print(json.dumps(results, indent=2))


def test_alert_validation():

    validator = DeploymentMonitoringValidator()

    result = validator.validate_alert_trigger(
        get_demo_event()
    )

    assert "alert_triggered" in result

    print("\nAlert validation passed")
    print(json.dumps(result, indent=2))


def test_monitoring_metrics():

    validator = DeploymentMonitoringValidator()

    validator.validate_production_workflow(
        get_demo_event()
    )

    metrics = validator.get_monitoring_metrics()

    assert "success_rate_percent" in metrics

    print("\nMonitoring metrics validation passed")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":

    test_model_loading()
    test_latency_benchmark()
    test_production_workflow()
    test_failure_cases()
    test_alert_validation()
    test_monitoring_metrics()

    print(
        "\nAll AI021 deployment "
        "and monitoring tests completed."
    )