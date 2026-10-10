"""
PHOENIX Risk Assessment API Response Schema - Prototype Logic

This file converts the PHOENIX risk assessment response schema into
a simple Python prototype. It demonstrates how AI model output can be
used to calculate likelihood, impact, final risk score, risk percentage,
risk level, legitimacy, matched threats, and recommended controls.

Author: Abdul the Great
Project: PHOENIX
"""


from typing import Dict, Any, List


def validate_model_scores(model_risk_score: float, confidence_score: float) -> None:
    """
    Validates that the AI model scores are between 0 and 1.
    """

    if not 0 <= model_risk_score <= 1:
        raise ValueError("model_risk_score must be between 0 and 1")

    if not 0 <= confidence_score <= 1:
        raise ValueError("confidence_score must be between 0 and 1")


def validate_impact(impact: int) -> None:
    """
    Validates that impact is between 1 and 5.
    """

    if not 1 <= impact <= 5:
        raise ValueError("impact must be between 1 and 5")


def calculate_likelihood(model_risk_score: float) -> int:
    """
    Converts the AI model risk_score into a likelihood value from 1 to 5.

    0.00 - 0.20 = 1
    0.21 - 0.40 = 2
    0.41 - 0.60 = 3
    0.61 - 0.80 = 4
    0.81 - 1.00 = 5
    """

    if model_risk_score <= 0.20:
        return 1
    elif model_risk_score <= 0.40:
        return 2
    elif model_risk_score <= 0.60:
        return 3
    elif model_risk_score <= 0.80:
        return 4
    else:
        return 5


def classify_legitimacy(model_risk_score: float) -> str:
    """
    Classifies the submitted input as legitimate, suspicious, or malicious.
    """

    if model_risk_score <= 0.30:
        return "legitimate"
    elif model_risk_score <= 0.70:
        return "suspicious"
    else:
        return "malicious"


def classify_risk_level(final_risk_score: int) -> str:
    """
    Converts the final risk score into a clear risk level.

    1 - 5   = Low
    6 - 10  = Medium
    11 - 17 = High
    18 - 25 = Critical
    """

    if final_risk_score <= 5:
        return "Low"
    elif final_risk_score <= 10:
        return "Medium"
    elif final_risk_score <= 17:
        return "High"
    else:
        return "Critical"


def detect_matched_threats(input_data: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Detects simple rule-based threat indicators from the submitted input.

    This is a prototype only. In the final PHOENIX system, this logic can be
    improved with AI model results, trusted source checks, domain reputation
    checks, and backend validation.
    """

    threats = []

    url = input_data.get("url", "").lower()
    text = input_data.get("text", "").lower()
    source = input_data.get("source", "").lower()
    alert_level = input_data.get("alert_level", "").lower()
    hazard_severity = input_data.get("hazard_severity", "").lower()

    if "http://" in url or "fake" in url or "verify" in url:
        threats.append({
            "threat_type": "Fake URL",
            "description": "The submitted URL appears suspicious, untrusted, or may be impersonating an official source.",
            "stride_category": "Spoofing"
        })

    if "click" in text or "verify your location" in text or "urgent" in text or "act now" in text:
        threats.append({
            "threat_type": "Phishing Message",
            "description": "The message uses urgent or suspicious wording that may pressure users into unsafe action.",
            "stride_category": "Spoofing"
        })

    if alert_level == "emergency" and source in ["unknown", "unverified", "third-party"]:
        threats.append({
            "threat_type": "Fake Disaster Alert",
            "description": "The message claims to be an emergency alert but comes from an unverified source.",
            "stride_category": "Tampering"
        })

    if source in ["unknown", "unverified", "third-party"]:
        threats.append({
            "threat_type": "Unverified Source",
            "description": "The information source is not trusted or verified.",
            "stride_category": "Spoofing"
        })

    if hazard_severity in ["high", "critical"] and source in ["unknown", "unverified"]:
        threats.append({
            "threat_type": "Disaster Misinformation Risk",
            "description": "High-severity disaster information from an unverified source may mislead the public.",
            "stride_category": "Tampering"
        })

    return threats


def recommend_controls(threats: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    Maps detected threats to recommended cybersecurity controls.
    """

    recommended_controls = []

    threat_types = [threat["threat_type"] for threat in threats]

    if "Fake URL" in threat_types:
        recommended_controls.extend([
            {
                "control": "URL Validation",
                "purpose": "Check whether the submitted URL uses a trusted structure and does not impersonate official sources."
            },
            {
                "control": "Domain Reputation Check",
                "purpose": "Check whether the domain has a suspicious or unsafe reputation."
            },
            {
                "control": "Source Verification",
                "purpose": "Confirm whether the submitted information comes from a trusted source."
            }
        ])

    if "Phishing Message" in threat_types:
        recommended_controls.extend([
            {
                "control": "Content Filtering",
                "purpose": "Detect phishing-style wording, suspicious instructions, and harmful message patterns."
            },
            {
                "control": "Input Validation",
                "purpose": "Validate message text, URLs, timestamps, hazard fields, and source values before processing."
            },
            {
                "control": "Audit Logging",
                "purpose": "Record suspicious submissions for monitoring, accountability, and investigation."
            }
        ])

    if "Fake Disaster Alert" in threat_types or "Disaster Misinformation Risk" in threat_types:
        recommended_controls.extend([
            {
                "control": "Digital Signature Verification",
                "purpose": "Verify that disaster alerts have not been forged, modified, or injected by an attacker."
            },
            {
                "control": "Source Verification",
                "purpose": "Check whether the alert came from an official or verified source."
            },
            {
                "control": "Audit Logging",
                "purpose": "Keep a record of disaster-related risk decisions for later review."
            }
        ])

    if "Unverified Source" in threat_types:
        recommended_controls.extend([
            {
                "control": "Source Verification",
                "purpose": "Confirm whether the source is official, verified, or trusted before using the information."
            },
            {
                "control": "RBAC",
                "purpose": "Restrict sensitive risk assessment actions based on user roles and permissions."
            }
        ])

    # Core API controls should always be recommended.
    recommended_controls.extend([
        {
            "control": "JWT Authentication",
            "purpose": "Ensure only authenticated users or trusted systems can access the risk assessment API."
        },
        {
            "control": "Rate Limiting",
            "purpose": "Prevent API abuse, spam requests, brute-force attempts, and denial-of-service activity."
        }
    ])

    # Remove duplicate controls while keeping the response clean.
    unique_controls = []
    seen_controls = set()

    for control in recommended_controls:
        control_name = control["control"]

        if control_name not in seen_controls:
            unique_controls.append(control)
            seen_controls.add(control_name)

    return unique_controls


def generate_explanation(
    legitimacy: str,
    likelihood: int,
    impact: int,
    final_risk_score: int,
    risk_level: str,
    matched_threats: List[Dict[str, str]]
) -> str:
    """
    Generates a short explanation for the final API response.
    """

    if matched_threats:
        threat_names = ", ".join(threat["threat_type"] for threat in matched_threats)
    else:
        threat_names = "no major threat indicators"

    return (
        f"The input was classified as {legitimacy}. "
        f"The likelihood value is {likelihood}, the impact value is {impact}, "
        f"and the final risk score is {final_risk_score}. "
        f"This results in a {risk_level} risk level. "
        f"The detected threat indicators include: {threat_names}."
    )


def generate_risk_assessment_response(
    input_data: Dict[str, Any],
    model_risk_score: float,
    confidence_score: float,
    impact: int
) -> Dict[str, Any]:
    """
    Generates the complete PHOENIX Risk Assessment API response.
    """

    validate_model_scores(model_risk_score, confidence_score)
    validate_impact(impact)

    likelihood = calculate_likelihood(model_risk_score)
    final_risk_score = likelihood * impact
    risk_percentage = round((final_risk_score / 25) * 100)

    legitimacy = classify_legitimacy(model_risk_score)
    risk_level = classify_risk_level(final_risk_score)
    matched_threats = detect_matched_threats(input_data)
    controls = recommend_controls(matched_threats)

    explanation = generate_explanation(
        legitimacy=legitimacy,
        likelihood=likelihood,
        impact=impact,
        final_risk_score=final_risk_score,
        risk_level=risk_level,
        matched_threats=matched_threats
    )

    return {
        "status": "success",
        "message": "Risk assessment completed successfully",
        "data": {
            "input_summary": input_data,
            "model_output": {
                "risk_score": model_risk_score,
                "confidence_score": confidence_score
            },
            "risk_assessment": {
                "legitimacy": legitimacy,
                "likelihood": likelihood,
                "impact": impact,
                "final_risk_score": final_risk_score,
                "risk_percentage": risk_percentage,
                "risk_level": risk_level
            },
            "threat_analysis": {
                "matched_threats": matched_threats
            },
            "recommended_controls": controls,
            "explanation": explanation
        }
    }


def generate_error_response(message: str, errors: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Generates a standard error response for invalid or missing input.
    """

    return {
        "status": "error",
        "message": message,
        "errors": errors
    }


# Example input for testing the prototype.
example_input = {
    "url": "http://fake-bom-alert.com",
    "text": "Emergency flood warning. Click this link now to verify your location.",
    "timestamp": "2026-05-16T10:30:00Z",
    "hazard_type": "flood",
    "hazard_severity": "high",
    "hazard_timestamp": "2026-05-16T10:00:00Z",
    "hazard_location": "Melbourne",
    "hazard_status": "active",
    "alert_level": "emergency",
    "source": "unknown"
}


if __name__ == "__main__":
    response = generate_risk_assessment_response(
        input_data=example_input,
        model_risk_score=0.88,
        confidence_score=0.91,
        impact=5
    )

    print(response)
