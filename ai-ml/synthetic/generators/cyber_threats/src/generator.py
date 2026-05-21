import random
from datetime import datetime

from src.config import ATTACK_VECTORS, TARGETS, DISASTER_TYPES, SEVERITY_LEVELS
from src.rules import (
    get_threat_probabilities,
    get_event_volume,
    choose_impersonation,
    choose_outcome,
)
from src.utils import random_timestamp


def weighted_choice(probabilities: dict) -> str:
    """
    Select one threat type using weighted probabilities.
    """
    threats = list(probabilities.keys())
    weights = list(probabilities.values())
    return random.choices(threats, weights=weights, k=1)[0]


def generate_hazard_event_id(disaster_type: str, severity: str, index: int) -> str:
    """
    Create hazard event IDs that can link cyber rows to disaster master data
    and misinformation data.
    """
    disaster_code = disaster_type[:3].upper()
    severity_code = severity[:3].upper()
    return f"HAZ-{disaster_code}-{severity_code}-{index:04d}"


def generate_cyber_events(total_events: int = 120, days: int = 7) -> list:
    """
    Generate synthetic cyber threat events across multiple disaster types
    and severity levels.
    """
    start_date = datetime.now()
    records = []

    for index in range(1, total_events + 1):
        disaster_type = random.choice(DISASTER_TYPES)
        severity = random.choice(SEVERITY_LEVELS)
        hazard_event_id = generate_hazard_event_id(disaster_type, severity, index)

        probabilities = get_threat_probabilities(disaster_type, severity)
        threat_type = weighted_choice(probabilities)
        attack_vector = random.choice(ATTACK_VECTORS[threat_type])
        target = random.choice(TARGETS)
        impersonation = choose_impersonation(threat_type, disaster_type)
        outcome = choose_outcome(threat_type)

        record = {
            "hazard_event_id": hazard_event_id,
            "timestamp": random_timestamp(start_date, days).strftime("%Y-%m-%d %H:%M:%S"),
            "disaster_type": disaster_type,
            "severity": severity,
            "threat_type": threat_type,
            "attack_vector": attack_vector,
            "impersonation": impersonation,
            "target": target,
            "outcome": outcome,
            "success": random.choice([True, False]),
            "confidence_score": round(random.uniform(0.70, 0.99), 2),
        }

        records.append(record)

    return records