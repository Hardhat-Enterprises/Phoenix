from __future__ import annotations

import random
from datetime import timedelta
from src.config import (
    DEFAULT_HAZARD_COUNT,
    DEFAULT_THREAT_COUNT,
    DEFAULT_INTEGRATION_COUNT,
    HAZARD_TYPES,
    SEVERITY_LEVELS,
    EVENT_STATUSES,
    SOURCE_IDS,
    LOCATIONS,
)
from src.rules import (
    choose_alert_level,
    choose_threat_type,
    misinformation_level,
    social_media_spike_flag,
    cyber_frequency_level,
    risk_score,
    risk_level_label,
    title_for_threat,
    description_for_threat,
    integration_reason,
)
from src.utils import random_time, iso_z


def _hazard_description(hazard_type: str, location: dict) -> str:
    descriptions = {
        "flood": f"River flooding caused by prolonged rainfall across low-lying areas near {location['suburb']}.",
        "storm": f"Severe storm conditions with heavy rain and strong wind affecting {location['local_government_area']}.",
        "bushfire": f"Bushfire activity threatening communities in and around {location['local_government_area']}.",
        "cyclone": f"Cyclone-related severe weather affecting communities near {location['suburb']}.",
        "heatwave": f"Extreme heat conditions affecting vulnerable communities in {location['local_government_area']}.",
    }
    return descriptions[hazard_type]


def generate_hazard_events(count: int = DEFAULT_HAZARD_COUNT, seed: int = 42) -> list[dict]:
    rng = random.Random(seed)
    records: list[dict] = []
    hazard_cycle = ["flood", "storm", "bushfire", "cyclone", "heatwave"]
    severity_weights = [0.30, 0.42, 0.28]
    status_weights = [0.25, 0.60, 0.15]
    for i in range(count):
        location = rng.choice(LOCATIONS)
        hazard_type = hazard_cycle[i % len(hazard_cycle)] if i < len(hazard_cycle) * 4 else rng.choice(HAZARD_TYPES)
        severity = rng.choices(SEVERITY_LEVELS, weights=severity_weights, k=1)[0]
        status = rng.choices(EVENT_STATUSES, weights=status_weights, k=1)[0]
        start_dt = random_time(rng)
        end_dt = None if status != "contained" else iso_z(start_dt + timedelta(hours=rng.randint(6, 48)))
        records.append({
            "hazard_event_id": f"HZ_{i+1:05d}",
            "hazard_type": hazard_type,
            "description": _hazard_description(hazard_type, location),
            "severity_level": severity,
            "event_status": status,
            "start_time": iso_z(start_dt),
            "end_time": end_dt,
            "source_id": rng.choice(SOURCE_IDS['hazard']),
            "source_ref_event": f"AUS-{hazard_type[:4].upper()}-{i+1:04d}",
            "geo_location_id": location['geo_location_id'],
            "country": location['country'],
            "state_region": location['state_region'],
            "local_government_area": location['local_government_area'],
            "suburb": location['suburb'],
            "latitude": location['latitude'],
            "longitude": location['longitude'],
            "geo_precision": location['geo_precision'],
            "created_at": iso_z(start_dt + timedelta(minutes=10)),
            "updated_at": iso_z(start_dt + timedelta(minutes=10)),
        })
    return records


def generate_cyber_threats(hazards: list[dict], count: int = DEFAULT_THREAT_COUNT, seed: int = 42) -> list[dict]:
    rng = random.Random(seed + 1)
    records: list[dict] = []
    for i in range(count):
        hazard = rng.choice(hazards)
        location_text = f"{hazard['suburb']}, {hazard['state_region']}"
        alert = choose_alert_level(hazard['severity_level'], rng)
        threat_type = choose_threat_type(hazard['hazard_type'], hazard['severity_level'], alert, rng)
        misinfo = misinformation_level(hazard['severity_level'], threat_type, rng)
        spike = social_media_spike_flag(hazard['severity_level'], threat_type, alert, rng)
        freq = cyber_frequency_level(hazard['severity_level'], alert, spike, rng)
        score = risk_score(hazard['severity_level'], alert, threat_type, spike, rng)
        detected_dt = random_time(rng)
        records.append({
            "threat_id": f"TH_{i+1:05d}",
            "hazard_event_id": hazard['hazard_event_id'],
            "threat_type": threat_type,
            "title": title_for_threat(hazard['hazard_type'], threat_type),
            "description": description_for_threat(hazard['hazard_type'], threat_type, location_text),
            "risk_level": risk_level_label(score),
            "status": rng.choices(["monitoring", "active"], weights=[0.35, 0.65], k=1)[0],
            "category": "cyber",
            "confidence_score": round(max(0.62, min(0.98, score + rng.uniform(-0.08, 0.08))), 2),
            "detected_at": iso_z(detected_dt),
            "source_id": rng.choice(SOURCE_IDS['threat']),
            "created_at": iso_z(detected_dt + timedelta(minutes=10)),
            "updated_at": iso_z(detected_dt + timedelta(minutes=10)),
            "hazard_type": hazard['hazard_type'],
            "country": hazard['country'],
            "state_region": hazard['state_region'],
            "local_government_area": hazard['local_government_area'],
            "suburb": hazard['suburb'],
            "latitude": hazard['latitude'],
            "longitude": hazard['longitude'],
            "geo_precision": hazard['geo_precision'],
            "alert_level": alert,
            "misinformation_level": misinfo,
            "social_media_spike": spike,
            "cyber_frequency_level": freq,
            "risk_score": score,
        })
    return records


def generate_integrations(hazards: list[dict], threats: list[dict], count: int = DEFAULT_INTEGRATION_COUNT, seed: int = 42) -> list[dict]:
    rng = random.Random(seed + 2)
    hazard_by_id = {h['hazard_event_id']: h for h in hazards}
    records: list[dict] = []
    for i in range(count):
        threat = threats[i % len(threats)]
        hazard = hazard_by_id[threat['hazard_event_id']]
        event_dt = random_time(rng)
        corr = round(max(0.52, min(0.98, threat['risk_score'] + rng.uniform(-0.05, 0.05))), 2)
        conf = round(max(0.60, min(0.98, threat['confidence_score'] + rng.uniform(-0.04, 0.04))), 2)
        status_code = {"active": 1, "monitoring": 2, "contained": 3}[hazard['event_status']]
        records.append({
            "integration_event_id": f"INT_{i+1:05d}",
            "related_hazard_event_id": hazard['hazard_event_id'],
            "related_threat_id": threat['threat_id'],
            "correlation_score": corr,
            "linkage_reason": integration_reason(hazard['hazard_type'], threat['threat_type']),
            "integration_confidence": conf,
            "linked_event_type": 3,
            "event_status": status_code,
            "event_time": iso_z(event_dt),
            "detected_at": iso_z(event_dt + timedelta(minutes=10)),
            "reported_at": iso_z(event_dt + timedelta(minutes=20)),
            "created_at": iso_z(event_dt + timedelta(minutes=25)),
            "updated_at": iso_z(event_dt + timedelta(minutes=25)),
        })
    return records


def build_sample_output(threats: list[dict], sample_count: int = 100) -> list[dict]:
    rows: list[dict] = []
    for row in threats[:sample_count]:
        rows.append({
            "hazard_event_id": row['hazard_event_id'],
            "threat_id": row['threat_id'],
            "hazard_type": row['hazard_type'],
            "threat_type": row['threat_type'],
            "state_region": row['state_region'],
            "suburb": row['suburb'],
            "alert_level": row['alert_level'],
            "misinformation_level": row['misinformation_level'],
            "social_media_spike": row['social_media_spike'],
            "cyber_frequency_level": row['cyber_frequency_level'],
            "risk_score": row['risk_score'],
        })
    return rows
