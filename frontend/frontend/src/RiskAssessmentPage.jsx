import RiskAssessmentInterface from "./components/RiskAssessmentInterface";
import CorrelationResult from "./components/CorrelationResult";
import { CORRELATION_FIXTURES } from "./services/correlationResultFixtures";
import { CORRELATION_LIVE_ENABLED } from "./config/environment";
import "./RiskAssessmentPage.css";

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

      <div className="risk-assessment-card">
        <section aria-labelledby="correlation-demo-heading">
          <h2 id="correlation-demo-heading">
            Hazard Correlation Result
          </h2>

          <p>
            This section demonstrates the standalone correlation-result
            presentation using a frozen fixture. It does not call a live
            correlation endpoint.
          </p>

          {!CORRELATION_LIVE_ENABLED && (
            <p role="status">
              Live correlation integration is currently disabled.
              Demonstration data is shown below.
            </p>
          )}

          <CorrelationResult
            result={CORRELATION_FIXTURES.related}
            source="demonstration"
          />
        </section>
      </div>
    </div>
  );
}

export default RiskAssessmentPage;