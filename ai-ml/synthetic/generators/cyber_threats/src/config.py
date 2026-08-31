DISASTER_TYPES = [
    "flood",
    "bushfire",
    "cyclone",
    "heatwave",
    "storm",
    "earthquake",
]

SEVERITY_LEVELS = ["moderate", "severe", "extreme"]

THREAT_TYPES = [
    "Phishing",
    "Fraud",
    "Ransomware",
    "Data Breach",
    "Misinformation",
    "DDoS",
    "API Abuse",
    "Emergency Alert Compromise",
]

ATTACK_VECTORS = {
    "Phishing": ["Email", "SMS", "Fake Website"],
    "Fraud": ["Phone Call", "Social Media", "Fake Portal"],
    "Ransomware": ["Malicious Attachment", "Credential Theft"],
    "Data Breach": ["Unsecured API", "Stolen Credentials"],
    "Misinformation": ["Social Media Post", "Deepfake Video"],
    "DDoS": ["Botnet Traffic"],
    "API Abuse": ["Scripted Requests", "Token Misuse"],
    "Emergency Alert Compromise": ["Stolen Credentials", "System Exploit"],
}

TARGETS = [
    "Citizens",
    "Government Agency",
    "Emergency Services",
    "Healthcare Organisation",
    "Relief Organisation",
    "Critical Infrastructure",
]