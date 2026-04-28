"""
AI011 – Risk Refinement Module
--------------------------------
This module refines baseline risk scores by addressing:
- Hazard-only overestimation
- Hazard-cyber correlation
- Confidence adjustment
- Score stability

Author: Your Name
"""

# -------------------------------
# Severity Mapping
# -------------------------------
def map_severity(score: float) -> str:
    """
    Convert numerical score into severity label.
    """
    if score <= 24:
        return "low"
    elif score <= 49:
        return "medium"
    elif score <= 74:
        return "high"
    else:
        return "critical"


# -------------------------------
# Issue Detection (Analysis Layer)
# -------------------------------
def detect_issues(record: dict) -> list:
    """
    Identify weak or unstable scoring cases based on raw score review.
    """
    issues = []

    # Hazard-only overestimation
    if record.get("cyber") is None and record["score"] > 70:
        issues.append("Hazard-only overestimation")

    # Combined event underestimation
    if record.get("cyber") is not None and record["score"] < 40:
        issues.append("Combined event underestimation")

    # Confidence ignored
    if record["confidence"] < 0.5 and record["score"] > 60:
        issues.append("Confidence not affecting score")

    return issues


# -------------------------------
# Score Refinement Logic
# -------------------------------
def refine_score(record: dict) -> float:
    """
    Apply refinement logic to baseline score.
    """
    score = record["score"]
    confidence = record["confidence"]

    # Step 1: Confidence adjustment
    score = score * (0.5 + 0.5 * confidence)

    # Step 2: Boost combined hazard + cyber events
    if record.get("hazard") and record.get("cyber"):
        score += 10

    # Step 3: Penalize hazard-only events
    if record.get("cyber") is None:
        score -= 10

    # Step 4: Clamp score within range
    score = max(0, min(score, 100))

    return round(score, 2)


# -------------------------------
# Full Refinement Pipeline
# -------------------------------
def refine_risk(record: dict) -> dict:
    """
    Full refinement process:
    Input -> Detect issues -> Refine score -> Map severity
    """
    refined_score = refine_score(record)

    return {
        "event": record.get("event"),
        "baseline_score": record["score"],
        "confidence": record["confidence"],
        "refined_score": refined_score,
        "original_severity": map_severity(record["score"]),
        "refined_severity": map_severity(refined_score),
        "issues_detected": detect_issues(record),
    }


# -------------------------------
# Example Run (for testing)
# -------------------------------
if __name__ == "__main__":
    sample_data = [
        {"event": "Flood", "hazard": "flood", "cyber": None, "score": 80, "confidence": 0.8},
        {"event": "Bushfire+Phishing", "hazard": "bushfire", "cyber": "phishing", "score": 25, "confidence": 0.9},
        {"event": "Bushfire+Phishing", "hazard": "bushfire", "cyber": "phishing", "score": 85, "confidence": 0.85},
        {"event": "Bushfire+Phishing", "hazard": "bushfire", "cyber": "phishing", "score": 42, "confidence": 0.6},
        {"event": "Moderate Storm", "hazard": "storm", "cyber": None, "score": 49, "confidence": 0.7},
        {"event": "Moderate Storm", "hazard": "storm", "cyber": None, "score": 51, "confidence": 0.7},
    ]

    for record in sample_data:
        result = refine_risk(record)
        print(result)