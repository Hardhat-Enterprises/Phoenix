from src.generator import generate_cyber_events


def test_generate_cyber_events():
    records = generate_cyber_events(total_events=50, days=7)

    assert isinstance(records, list)
    assert len(records) == 50

    required_keys = {
        "hazard_event_id",
        "timestamp",
        "disaster_type",
        "severity",
        "threat_type",
        "attack_vector",
        "impersonation",
        "target",
        "outcome",
        "success",
        "confidence_score",
    }

    allowed_disasters = {
        "flood",
        "bushfire",
        "cyclone",
        "heatwave",
        "storm",
        "earthquake",
    }

    allowed_severity = {"moderate", "severe", "extreme"}

    for record in records:
        assert required_keys.issubset(record.keys())
        assert record["disaster_type"] in allowed_disasters
        assert record["severity"] in allowed_severity
        assert record["hazard_event_id"].startswith("HAZ-")