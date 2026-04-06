from __future__ import annotations

import random

def choose_alert_level(severity_level: str, rng: random.Random) -> str:
    if severity_level == "critical":
        return rng.choices(["warning", "emergency_warning"], weights=[0.25, 0.75], k=1)[0]
    if severity_level == "high":
        return rng.choices(["advice", "warning", "emergency_warning"], weights=[0.15, 0.60, 0.25], k=1)[0]
    return rng.choices(["advice", "warning"], weights=[0.65, 0.35], k=1)[0]


def choose_threat_type(hazard_type: str, severity_level: str, alert_level: str, rng: random.Random) -> str:
    weights = {
        "misinformation": 0.34,
        "fake_alert_phishing": 0.24,
        "false_notice": 0.18,
        "social_media_spike": 0.24,
    }
    if hazard_type == "flood":
        weights["misinformation"] += 0.12
        weights["social_media_spike"] += 0.08
    elif hazard_type == "storm":
        weights["false_notice"] += 0.08
    elif hazard_type == "bushfire":
        weights["fake_alert_phishing"] += 0.08
    elif hazard_type == "cyclone":
        weights["fake_alert_phishing"] += 0.06
        weights["false_notice"] += 0.04
    elif hazard_type == "heatwave":
        weights["misinformation"] += 0.05
    if severity_level == "high":
        weights["misinformation"] += 0.05
        weights["social_media_spike"] += 0.04
    elif severity_level == "critical":
        weights["misinformation"] += 0.10
        weights["fake_alert_phishing"] += 0.06
        weights["false_notice"] += 0.05
        weights["social_media_spike"] += 0.08
    if alert_level == "warning":
        weights["fake_alert_phishing"] += 0.06
        weights["false_notice"] += 0.03
    elif alert_level == "emergency_warning":
        weights["fake_alert_phishing"] += 0.12
        weights["false_notice"] += 0.06
        weights["social_media_spike"] += 0.04
    labels = list(weights.keys())
    vals = [weights[k] for k in labels]
    return rng.choices(labels, weights=vals, k=1)[0]


def misinformation_level(severity_level: str, threat_type: str, rng: random.Random) -> int:
    base = {
        "moderate": 2,
        "high": 3,
        "critical": 4,
    }[severity_level]
    modifier = {
        "misinformation": 1,
        "fake_alert_phishing": 0,
        "false_notice": 0,
        "social_media_spike": 1,
    }[threat_type]
    jitter = rng.choice([0, 0, 1, -1])
    return max(1, min(5, base + modifier + jitter))


def social_media_spike_flag(severity_level: str, threat_type: str, alert_level: str, rng: random.Random) -> str:
    yes_prob = 0.25
    if severity_level == "high":
        yes_prob += 0.20
    elif severity_level == "critical":
        yes_prob += 0.35
    if alert_level == "warning":
        yes_prob += 0.10
    elif alert_level == "emergency_warning":
        yes_prob += 0.20
    if threat_type == "social_media_spike":
        yes_prob += 0.25
    elif threat_type == "misinformation":
        yes_prob += 0.08
    return "yes" if rng.random() < min(0.95, yes_prob) else "no"


def cyber_frequency_level(severity_level: str, alert_level: str, spike_flag: str, rng: random.Random) -> int:
    value = 1
    value += {"moderate": 1, "high": 2, "critical": 3}[severity_level]
    value += {"advice": 0, "warning": 1, "emergency_warning": 2}[alert_level]
    if spike_flag == "yes":
        value += 1
    value += rng.choice([0, 0, 1, -1])
    return max(1, min(5, value))


def risk_score(severity_level: str, alert_level: str, threat_type: str, spike_flag: str, rng: random.Random) -> float:
    score = 0.38
    score += {"moderate": 0.08, "high": 0.18, "critical": 0.28}[severity_level]
    score += {"advice": 0.02, "warning": 0.07, "emergency_warning": 0.12}[alert_level]
    score += {
        "misinformation": 0.06,
        "fake_alert_phishing": 0.10,
        "false_notice": 0.07,
        "social_media_spike": 0.05,
    }[threat_type]
    if spike_flag == "yes":
        score += 0.04
    score += rng.uniform(-0.06, 0.06)
    return round(max(0.40, min(0.97, score)), 2)


def risk_level_label(score: float) -> str:
    if score >= 0.85:
        return "critical"
    if score >= 0.70:
        return "high"
    return "medium"


def title_for_threat(hazard_type: str, threat_type: str) -> str:
    titles = {
        "misinformation": f"Misleading {hazard_type} update circulating online",
        "fake_alert_phishing": f"Fake {hazard_type} warning message targeting residents",
        "false_notice": f"Unofficial public notice shared during {hazard_type} event",
        "social_media_spike": f"High-volume social posting linked to {hazard_type} event",
    }
    return titles[threat_type]


def description_for_threat(hazard_type: str, threat_type: str, location_text: str) -> str:
    descriptions = {
        "misinformation": f"Social media posts are spreading misleading {hazard_type} information affecting {location_text}.",
        "fake_alert_phishing": f"Fraudulent alert-style messages are impersonating authorities during {hazard_type} activity in {location_text}.",
        "false_notice": f"Copied or fake public notices are circulating online during the {hazard_type} event in {location_text}.",
        "social_media_spike": f"Public attention and uncertainty are increasing message volume and rumor spread during the {hazard_type} event in {location_text}.",
    }
    return descriptions[threat_type]


def integration_reason(hazard_type: str, threat_type: str) -> str:
    reasons = {
        "misinformation": f"False or misleading posts were amplified during active {hazard_type} conditions.",
        "fake_alert_phishing": f"Fake warning messages circulated during {hazard_type} alerts and targeted affected communities.",
        "false_notice": f"Copied or unofficial public notices spread during the {hazard_type} event window.",
        "social_media_spike": f"Online discussion volume rose sharply during the {hazard_type} event and increased rumor exposure.",
    }
    return reasons[threat_type]
