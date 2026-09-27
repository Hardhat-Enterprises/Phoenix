import CorrelationResult from "./components/CorrelationResult";
import { CORRELATION_FIXTURES } from "./services/correlationResultFixtures";
import "./RiskAssessmentPage.css";

function RiskAssessmentPage() {
  return (
    <div className="risk-assessment-page">
      <div className="risk-assessment-title-section">
        <h1>Hazard Correlation Result</h1>
        <p>
          Review the hazard relationship returned by the backend correlation
          service.
        </p>
      </div>

      <div className="risk-assessment-card">
        <CorrelationResult
          result={CORRELATION_FIXTURES.related}
          showSource={false}
        />
      </div>
    </div>
  );
}

export default RiskAssessmentPage;
