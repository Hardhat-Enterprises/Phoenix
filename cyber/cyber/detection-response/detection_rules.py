from typing import Optional, Dict, Any


def detect_login_attack(
    failed_login_attempts: int,
    is_unknown_location: bool,
    is_unknown_device: bool
) -> Dict[str, Any]:
    if failed_login_attempts > 10:
        return {
            "threat": "Login Attack",
            "severity": "Critical",
            "action": "lock_account"
        }
    if failed_login_attempts > 5 or is_unknown_location or is_unknown_device:
        return {
            "threat": "Login Attack",
            "severity": "High",
            "action": "trigger_alert"
        }
    return {
        "threat": "Login Attack",
        "severity": "Normal",
        "action": None
    }


def detect_api_abuse(
    request_count: int,
    unauthorized_access: bool,
    threshold: int = 100
) -> Dict[str, Any]:
    if unauthorized_access:
        return {
            "threat": "API Abuse",
            "severity": "Critical",
            "action": "revoke_api_key"
        }
    if request_count > threshold:
        return {
            "threat": "API Abuse",
            "severity": "High",
            "action": "rate_limit"
        }
    return {
        "threat": "API Abuse",
        "severity": "Normal",
        "action": None
    }


def detect_data_breach(
    records_accessed: int,
    is_sensitive_data: bool,
    unusual_access: bool,
    threshold: int = 500
) -> Dict[str, Any]:
    if is_sensitive_data and unusual_access:
        return {
            "threat": "Data Breach",
            "severity": "Critical",
            "action": "restrict_access"
        }
    if records_accessed > threshold:
        return {
            "threat": "Data Breach",
            "severity": "High",
            "action": "trigger_alert"
        }
    return {
        "threat": "Data Breach",
        "severity": "Normal",
        "action": None
    }


def detect_phishing_scam(
    has_suspicious_link: bool,
    has_urgent_language: bool,
    untrusted_sender: bool,
    reported_by_users: int = 0
) -> Dict[str, Any]:
    if (has_suspicious_link and has_urgent_language) or reported_by_users >= 3:
        return {
            "threat": "Phishing/Scam",
            "severity": "High",
            "action": "quarantine_message"
        }
    if untrusted_sender:
        return {
            "threat": "Phishing/Scam",
            "severity": "Medium",
            "action": "flag_sender"
        }
    return {
        "threat": "Phishing/Scam",
        "severity": "Normal",
        "action": None
    }


def detect_malware_ransomware(
    file_encryption_events: int,
    suspicious_process: bool,
    unusual_outbound_traffic: bool,
    threshold: int = 10
) -> Dict[str, Any]:
    if file_encryption_events > threshold:
        return {
            "threat": "Ransomware",
            "severity": "Critical",
            "action": "isolate_system"
        }
    if suspicious_process and unusual_outbound_traffic:
        return {
            "threat": "Malware",
            "severity": "High",
            "action": "stop_process"
        }
    return {
        "threat": "Malware/Ransomware",
        "severity": "Normal",
        "action": None
    }


def detect_ddos(
    request_rate: int,
    response_time_ms: int,
    rate_threshold: int = 1000,
    response_threshold: int = 3000
) -> Dict[str, Any]:
    if request_rate > rate_threshold and response_time_ms > response_threshold:
        return {
            "threat": "DDoS",
            "severity": "Critical",
            "action": "block_ips_and_rate_limit"
        }
    if request_rate > rate_threshold:
        return {
            "threat": "DDoS",
            "severity": "High",
            "action": "rate_limit"
        }
    return {
        "threat": "DDoS",
        "severity": "Normal",
        "action": None
    }


def detect_iot_attack(
    sensor_value: float,
    min_expected: float,
    max_expected: float,
    inconsistent_with_peers: bool
) -> Dict[str, Any]:
    if inconsistent_with_peers:
        return {
            "threat": "IoT Attack",
            "severity": "High",
            "action": "isolate_device"
        }
    if sensor_value < min_expected or sensor_value > max_expected:
        return {
            "threat": "IoT Attack",
            "severity": "Medium",
            "action": "flag_sensor"
        }
    return {
        "threat": "IoT Attack",
        "severity": "Normal",
        "action": None
    }


def detect_misinformation_deepfake(
    unverified_source: bool,
    conflicts_with_official_info: bool,
    rapid_spread: bool,
    deepfake_indicator: bool
) -> Dict[str, Any]:
    if deepfake_indicator:
        return {
            "threat": "Deepfake/Misinformation",
            "severity": "High",
            "action": "restrict_content"
        }
    if unverified_source and conflicts_with_official_info and rapid_spread:
        return {
            "threat": "Misinformation",
            "severity": "High",
            "action": "flag_for_review"
        }
    if unverified_source:
        return {
            "threat": "Misinformation",
            "severity": "Medium",
            "action": "flag_content"
        }
    return {
        "threat": "Misinformation",
        "severity": "Normal",
        "action": None
    }


def detect_alert_system_compromise(
    authorized_sender: bool,
    approval_status: bool,
    authentication_status: bool
) -> Dict[str, Any]:
    if not authorized_sender or not approval_status or not authentication_status:
        return {
            "threat": "Alert System Compromise",
            "severity": "Critical",
            "action": "disable_alert_dispatch"
        }
    return {
        "threat": "Alert System Compromise",
        "severity": "Normal",
        "action": None
    }


def detect_fraudulent_claim(
    duplicate_submission: bool,
    fake_document_detected: bool,
    identity_mismatch: bool
) -> Dict[str, Any]:
    if identity_mismatch:
        return {
            "threat": "Fraudulent Claim",
            "severity": "High",
            "action": "reject_submission"
        }
    if duplicate_submission or fake_document_detected:
        return {
            "threat": "Fraudulent Claim",
            "severity": "Medium",
            "action": "send_for_manual_review"
        }
    return {
        "threat": "Fraudulent Claim",
        "severity": "Normal",
        "action": None
    }


if __name__ == "__main__":
    print(detect_login_attack(12, False, False))
    print(detect_api_abuse(120, False))
    print(detect_iot_attack(98.0, 10.0, 60.0, False))
    print(detect_alert_system_compromise(False, True, True))
