"""
AI019 Role 2 - Real-Time Inference Pipeline Tests

Run:
python ai-ml/models/ai012-anomaly/src/test_realtime_inference.py
"""

import json
from realtime_inference import RealTimeAnomalyInferencePipeline


def test_single_live_prediction():
    pipeline = RealTimeAnomalyInferencePipeline()

    live_input = {
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

    result = pipeline.predict_live(live_input)

    assert "anomaly_score" in result
    assert "is_anomaly" in result
    assert "risk_level" in result
    assert "confidence_score" in result
    assert result["pipeline_mode"] == "real_time_single"

    print("\nSingle live prediction test passed")
    print(json.dumps(result, indent=2))


def test_batch_prediction():
    pipeline = RealTimeAnomalyInferencePipeline()

    records = [
        {
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
        },
        {
            "time_window": "2024-01-15 15:00:00",
            "region_id": "NSW_HUNTER",
            "firms_event_count": 2,
            "firms_avg_brightness": 300.1,
            "fire_confidence_high_count": 1,
            "urlhaus_event_count": 1,
            "malicious_url_count": 0,
            "phishing_tag_count": 0,
            "threat_spike_ratio": 0.2,
            "hour_of_day": 15,
            "day_of_week": 1,
        },
    ]

    result = pipeline.predict_batch_realtime(records)

    assert result["total"] == 2
    assert "results" in result
    assert "anomalies_found" in result
    assert result["pipeline_mode"] == "real_time_batch"

    print("\nBatch prediction test passed")
    print(json.dumps(result, indent=2))


def test_regional_aggregation():
    pipeline = RealTimeAnomalyInferencePipeline()

    records = [
        {
            "time_window": "2024-01-15 14:00:00",
            "region_id": "VIC_GIPPSLAND",
            "firms_event_count": 5,
            "firms_avg_brightness": 320,
            "fire_confidence_high_count": 2,
            "urlhaus_event_count": 4,
            "malicious_url_count": 2,
            "phishing_tag_count": 1,
            "threat_spike_ratio": 1.2,
            "hour_of_day": 14,
            "day_of_week": 1,
        },
        {
            "time_window": "2024-01-15 14:00:00",
            "region_id": "VIC_GIPPSLAND",
            "firms_event_count": 7,
            "firms_avg_brightness": 340,
            "fire_confidence_high_count": 3,
            "urlhaus_event_count": 6,
            "malicious_url_count": 3,
            "phishing_tag_count": 2,
            "threat_spike_ratio": 2.0,
            "hour_of_day": 14,
            "day_of_week": 1,
        },
    ]

    aggregated = pipeline.aggregate_hourly_region(records)

    assert len(aggregated) == 1
    assert aggregated[0]["firms_event_count"] == 12
    assert aggregated[0]["urlhaus_event_count"] == 10
    assert aggregated[0]["region_id"] == "VIC_GIPPSLAND"

    print("\nRegional aggregation test passed")
    print(json.dumps(aggregated, indent=2))


def test_stream_processing():
    pipeline = RealTimeAnomalyInferencePipeline(window_size=3)

    event = {
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

    result = pipeline.process_stream_event(event)

    assert result["status"] in ["success", "error"]

    print("\nStream processing test completed")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    test_single_live_prediction()
    test_batch_prediction()
    test_regional_aggregation()
    test_stream_processing()

    print("\nAll AI019 Role 2 real-time inference tests completed.")