import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getIntegrationById } from "./services/phoenixApi";
import { getApiErrorState } from "./utils/apiErrorUtils";
import { safeTrim } from "./utils/textUtils";
import { formatDisplayDate } from "./displayDate";
import { usePreferences } from "./PreferencesContext";
import { CORE_INTEGRATION_RESULTS_PATH } from "./config/routes";
import {
  AuthenticationState,
  EmptyState,
  ErrorState,
  LoadingState,
} from "./components/States";
import "./IntegrationDetails.css";
import "./components/design.css";

const formatPayload = (value) => {
  if (value === undefined || value === null) return "Not provided";
  if (typeof value === "string") return safeTrim(value) || "Not provided";
  return JSON.stringify(value, null, 2);
};

function IntegrationDetails() {
  const { integrationId } = useParams();
  const navigate = useNavigate();
  const { preferences } = usePreferences();
  const [requestState, setRequestState] = useState({
    integrationId: null,
    status: "loading",
    integration: null,
  });
  const [requestAttempt, setRequestAttempt] = useState(0);
  const routeRequest = requestState.integrationId === integrationId
    ? requestState
    : null;
  const status = routeRequest?.status || "loading";
  const integration = routeRequest?.integration;

  useEffect(() => {
    const controller = new AbortController();

    getIntegrationById(integrationId, { signal: controller.signal })
      .then((record) => {
        if (controller.signal.aborted) return;

        setRequestState({
          integrationId,
          status: record ? "ready" : "empty",
          integration: record,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        setRequestState({
          integrationId,
          status: getApiErrorState(error),
          integration: null,
        });
      });

    return () => controller.abort();
  }, [integrationId, requestAttempt]);

  const retryIntegration = () => {
    setRequestState({ integrationId, status: "loading", integration: null });
    setRequestAttempt((attempt) => attempt + 1);
  };

  const handleBack = () => {
    if (window.history.state?.idx > 0) return navigate(-1);
    return navigate(CORE_INTEGRATION_RESULTS_PATH);
  };

  const renderBody = () => {
    if (status === "loading") {
      return (
        <LoadingState
          title="Loading integration…"
          description="Fetching this integration record from the Phoenix API."
        />
      );
    }

    if (status === "auth") {
      return (
        <AuthenticationState
          title="Sign in required"
          description="Please sign in before loading integration details."
          onAction={() => navigate("/login")}
        />
      );
    }

    if (status === "notfound") {
      return (
        <EmptyState
          title="Integration not found"
          description="This integration may have been removed, or the link may be incorrect."
        />
      );
    }

    if (status === "empty") {
      return (
        <EmptyState
          title="Integration data unavailable"
          description="The Phoenix API did not return a usable matching integration record."
          actionLabel="Retry"
          onAction={retryIntegration}
        />
      );
    }

    if (status === "forbidden") {
      return (
        <ErrorState
          title="Access denied"
          description="Your account cannot access this integration."
        />
      );
    }

    if (status === "error") {
      return (
        <ErrorState
          title="Could not load this integration"
          description="Integration details could not be loaded. Please try again."
          onRetry={retryIntegration}
        />
      );
    }

    return (
      <>
        <dl className="integration-details-grid">
          <div>
            <dt>Record ID</dt>
            <dd>{integration.integration_event_id}</dd>
          </div>
          <div>
            <dt>Integration type</dt>
            <dd>{safeTrim(integration.integration_type) || "Not provided"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{safeTrim(integration.status) || "Not provided"}</dd>
          </div>
          {[["Created", integration.created_at], ["Updated", integration.updated_at]]
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{formatDisplayDate(safeTrim(value), preferences.dateFormat, {
                  fallback: "Not provided",
                  includeTime: true,
                })}</dd>
              </div>
            ))}
        </dl>
        <h2>Note</h2>
        <p>{safeTrim(integration.note) || "Not provided"}</p>
        <h2>Input</h2>
        <pre>{formatPayload(integration.input)}</pre>
        <h2>Output</h2>
        <pre>{formatPayload(integration.output)}</pre>
      </>
    );
  };

  return (
    <main className="integration-details-page">
      <section className="integration-details-card" aria-labelledby="integration-details-heading">
        <h1 id="integration-details-heading">Integration Details</h1>
        {renderBody()}
        <button type="button" className="btn btn-secondary" onClick={handleBack}>
          &larr; Back
        </button>
      </section>
    </main>
  );
}

export default IntegrationDetails;
