import json
from datetime import datetime, timezone

class RiskRefinementEngine:
    def __init__(self):
        self.thresholds = {
            "low": (0, 24),
            "medium": (25, 49),
            "high": (50, 74),
            "critical": (75, 100)
        }

    def apply_confidence_adjustment(self, raw_score: float, confidence: float) -> int:
        """Adjusts the raw risk score based on model confidence and normalizes to 0-100."""
        adjusted_score = raw_score * confidence
        return int(max(0, min(100, round(adjusted_score))))

    def determine_severity(self, risk_score: int) -> str:
        """Maps the normalized integer risk score to a predefined severity label."""
        for severity, (low_bound, high_bound) in self.thresholds.items():
            if low_bound <= risk_score <= high_bound:
                return severity
        return "low" # Fallback

    def get_recommended_action(self, severity: str) -> str:
        """Assigns standardized response directives based on severity."""
        actions = {
            "low": "monitor routine logs, standard vigilance",
            "medium": "verify official sources, elevate monitoring",
            "high": "issue targeted alerts, deploy mitigation protocols",
            "critical": "initiate critical incident response, immediate cross-agency escalation"
        }
        return actions.get(severity, "monitor")

    def refine_output(self, raw_data: dict) -> dict:
        """Processes raw model predictions into the final A1007 compliant JSON payload."""
        risk_score = self.apply_confidence_adjustment(
            raw_data.get('raw_score', 0), 
            raw_data.get('confidence', 0.0)
        )
        severity = self.determine_severity(risk_score)
        
        refined_payload = {
            "event_type": raw_data.get("event_type", "hazard_only"),
            "risk_score": risk_score,
            "severity": severity,
            "confidence": round(raw_data.get("confidence", 0.0), 2),
            "hazard_type": raw_data.get("hazard_type"),
            "cyber_threat": raw_data.get("cyber_threat"),
            "recommended_action": self.get_recommended_action(severity),
            "top_risk_factors": raw_data.get("top_risk_factors", [])[:3], # Max 3 elements
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "model_version": "v1.0-baseline"
        }
        return refined_payload

def run_consistency_tests():
    """Output consistency testing against A1007 Schema Constraints."""
    engine = RiskRefinementEngine()
    
    test_cases = [
        {
            "raw_score": 78, "confidence": 0.95, "event_type": "hazard_only",
            "hazard_type": "bushfire", "cyber_threat": None, 
            "top_risk_factors": ["rapid spread rate", "proximity to critical infrastructure"]
        },
        {
            "raw_score": 62, "confidence": 0.88, "event_type": "cyber_only",
            "hazard_type": None, "cyber_threat": "phishing",
            "top_risk_factors": ["domain spoofing detected", "high volume email burst"]
        }
    ]

    print("--- Output Consistency Test Results ---")
    for i, case in enumerate(test_cases):
        output = engine.refine_output(case)
        print(f"\nTest Scenario {i+1}: {case['event_type']}")
        print(json.dumps(output, indent=2))
        
    
        assert 0 <= output["risk_score"] <= 100, "Risk score out of bounds"
        assert output["severity"] in ["low", "medium", "high", "critical"], "Invalid severity label"
        assert 0.00 <= output["confidence"] <= 1.00, "Confidence out of bounds"
        assert len(output["top_risk_factors"]) <= 3, "Too many risk factors"
        print("Consistency Check: PASS")

if __name__ == "__main__":
    run_consistency_tests()