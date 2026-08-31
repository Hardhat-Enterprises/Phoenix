import RiskAssessmentInterface from "./components/RiskAssessmentInterface";
import "./RiskAssessmentPage.css";

// RiskAssessmentPage.jsx
//
// Sprint 1 deliverable — Varun Reddy Maligireddy
// Standalone page for the Risk Assessment prototype, following the same
// page-level pattern as ReportsPage.jsx / ThreatDetails.jsx: a page wrapper
// with the site's standard title-section, with the actual list/detail logic
// living in components/RiskAssessmentInterface.jsx.

function RiskAssessmentPage() {
  return (
    <div className="risk-assessment-page">
      <div className="risk-assessment-title-section">
        <h1>Risk Assessments</h1>
        <p>
          Correlated hazard/threat linkage records for community liaison and
          analyst review.
        </p>
      </div>

      <div className="risk-assessment-card">
        <RiskAssessmentInterface />
      </div>
    </div>
  );
}

export default RiskAssessmentPage;
