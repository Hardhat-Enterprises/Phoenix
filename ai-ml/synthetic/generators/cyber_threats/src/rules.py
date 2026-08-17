import random


def get_threat_probabilities(disaster_type: str, severity: str) -> dict:
    """
    Returns weighted probabilities for threat types based on disaster type and severity.
    """
    base = {
        "Phishing": 0.22,
        "Fraud": 0.18,
        "Ransomware": 0.10,
        "Data Breach": 0.12,
        "Misinformation": 0.14,
        "DDoS": 0.10,
        "API Abuse": 0.08,
        "Emergency Alert Compromise": 0.06,
    }

    # Disaster-specific adjustments
    if disaster_type == "bushfire":
        base["Phishing"] += 0.08
        base["Fraud"] += 0.05
        base["Misinformation"] += 0.05

    elif disaster_type == "flood":
        base["Fraud"] += 0.08
        base["Phishing"] += 0.05
        base["Data Breach"] += 0.05

    elif disaster_type == "cyclone":
        base["Emergency Alert Compromise"] += 0.07
        base["DDoS"] += 0.05
        base["Phishing"] += 0.04

    elif disaster_type == "heatwave":
        base["Misinformation"] += 0.07
        base["Phishing"] += 0.05
        base["Fraud"] += 0.03

    elif disaster_type == "storm":
        base["DDoS"] += 0.06
        base["Data Breach"] += 0.04
        base["Phishing"] += 0.04

    elif disaster_type == "earthquake":
        base["Emergency Alert Compromise"] += 0.06
        base["Misinformation"] += 0.05
        base["Fraud"] += 0.04

    # Severity-specific adjustments
    if severity == "moderate":
        base["Phishing"] += 0.03
        base["Fraud"] += 0.03

    elif severity == "severe":
        base["Phishing"] += 0.05
        base["Fraud"] += 0.05
        base["Data Breach"] += 0.03

    elif severity == "extreme":
        base["Ransomware"] += 0.08
        base["Data Breach"] += 0.08
        base["DDoS"] += 0.05
        base["Emergency Alert Compromise"] += 0.05

    total = sum(base.values())
    return {key: value / total for key, value in base.items()}


def get_event_volume(severity: str) -> int:
    """
    Returns the number of events to generate based on severity.
    """
    if severity == "moderate":
        return random.randint(15, 30)
    if severity == "severe":
        return random.randint(35, 60)
    return random.randint(65, 100)


def choose_impersonation(threat_type: str, disaster_type: str) -> str:
    """
    Returns a realistic impersonation type for a threat.
    """
    options = {
        "Phishing": [
            "Government Relief Agency",
            "Emergency Services",
            "Charity Organisation",
            "Insurance Provider",
        ],
        "Fraud": [
            "Fake Charity",
            "Repair Contractor",
            "Relief Support Officer",
        ],
        "Misinformation": [
            "Unofficial News Page",
            "Fake Government Account",
            "Anonymous Social Media Account",
        ],
        "Emergency Alert Compromise": [
            "Emergency Alert System",
            "Official Warning Service",
        ],
    }

    if threat_type in options:
        return random.choice(options[threat_type])

    return "N/A"


def choose_outcome(threat_type: str) -> str:
    """
    Returns a realistic outcome for a threat type.
    """
    outcomes = {
        "Phishing": ["Credential Theft", "Financial Loss", "Malware Download"],
        "Fraud": ["Fake Payment", "False Claim Submission", "Identity Theft"],
        "Ransomware": ["System Encryption", "Service Disruption", "Data Exposure"],
        "Data Breach": ["Personal Data Leak", "Sensitive Record Exposure"],
        "Misinformation": ["Public Confusion", "False Evacuation", "Trust Erosion"],
        "DDoS": ["Service Unavailable", "Delayed Response"],
        "API Abuse": ["Unauthorised Data Access", "Record Manipulation"],
        "Emergency Alert Compromise": ["False Warning Sent", "Mass Panic Triggered"],
    }
    return random.choice(outcomes[threat_type])