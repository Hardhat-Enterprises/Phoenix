import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  HEALTH_POLL_INTERVAL_MS,
  INTEGRATION_SERVICES,
  checkAllIntegrationServices,
} from "../services/integrationHealthApi";
import "./IntegrationHealthPanel.css";

const FAILURE_LABELS = Object.freeze({
  authentication: "Authentication",
  timeout: "Timeout",
  backend: "Backend service",
  configuration: "Configuration",
  unreachable_gateway: "Unreachable gateway",
  unreachable_service: "Unreachable service",
});

const createInitialRows = () =>
  INTEGRATION_SERVICES.map((service) => ({
    id: service.id,
    name: service.name,
    status: "degraded",
    responseTimeMs: null,
    failureType: null,
    lastSuccessfulCheck: null,
    lastError: null,
    lastChecked: null,
  }));

const formatTimestamp = (value) => {
  if (!value) {
    return "Not yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString();
};

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
};

function IntegrationHealthPanel() {
  const [services, setServices] = useState(createInitialRows);
  const [isChecking, setIsChecking] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(
    () => document.visibilityState === "visible",
  );
  const [panelMessage, setPanelMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const activeRequestRef = useRef(null);
  const mountedRef = useRef(true);

  const refreshChecks = useCallback(async () => {
    activeRequestRef.current?.abort();

    const requestController = new AbortController();
    activeRequestRef.current = requestController;

    if (mountedRef.current) {
      setIsChecking(true);
      setPanelMessage("");
    }

    try {
      const results = await checkAllIntegrationServices({
        signal: requestController.signal,
      });

      if (!mountedRef.current || requestController.signal.aborted) {
        return;
      }

      setServices((previousServices) =>
        results.map((result) => {
          const previous = previousServices.find(
            (service) => service.id === result.id,
          );

          return {
            ...result,
            lastSuccessfulCheck:
              result.status === "available"
                ? result.lastChecked
                : previous?.lastSuccessfulCheck ?? null,
          };
        }),
      );
    } catch {
      if (
        !requestController.signal.aborted &&
        mountedRef.current
      ) {
        setPanelMessage(
          "The integration checks could not be completed. Please try again.",
        );
      }
    } finally {
      if (
        activeRequestRef.current === requestController &&
        mountedRef.current
      ) {
        setIsChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      activeRequestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, []);

  useEffect(() => {
    if (!isPageVisible) {
      activeRequestRef.current?.abort();
      return undefined;
    }

    refreshChecks();

    const pollingId = window.setInterval(
      refreshChecks,
      HEALTH_POLL_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(pollingId);
      activeRequestRef.current?.abort();
    };
  }, [isPageVisible, refreshChecks]);

  const handleCopyDiagnostics = async () => {
    const generatedAt = new Date().toISOString();

    const diagnosticText = [
      "PHOENIX Integration Health Diagnostics",
      `Generated: ${generatedAt}`,
      "",
      ...services.flatMap((service) => [
        `Service: ${service.name}`,
        `Status: ${service.status}`,
        `Response time: ${
          service.responseTimeMs === null
            ? "Not available"
            : `${service.responseTimeMs} ms`
        }`,
        `Failure type: ${
          FAILURE_LABELS[service.failureType] || "None"
        }`,
        `Last successful check: ${
          service.lastSuccessfulCheck || "Not yet"
        }`,
        `Last error: ${service.lastError || "None"}`,
        `Last checked: ${service.lastChecked || "Not yet"}`,
        "",
      ]),
    ].join("\n");

    try {
      await copyText(diagnosticText);
      setCopyMessage("Diagnostic information copied.");
    } catch {
      setCopyMessage("Could not copy diagnostic information.");
    }
  };

  const availableCount = services.filter(
    (service) => service.status === "available",
  ).length;

  const degradedCount = services.filter(
    (service) => service.status === "degraded",
  ).length;

  const unavailableCount = services.filter(
    (service) => service.status === "unavailable",
  ).length;

  return (
    <section
      className="integration-health"
      aria-labelledby="integration-health-heading"
    >
      <div className="integration-health__header">
        <div>
          <p className="integration-health__eyebrow">
            ADMIN DIAGNOSTICS
          </p>

          <h1 id="integration-health-heading">
            Integration Health
          </h1>

          <p className="integration-health__description">
            Check whether the backend services required by PHOENIX
            are responding correctly.
          </p>
        </div>

        <div className="integration-health__actions">
          <button
            type="button"
            className="integration-health__button"
            onClick={refreshChecks}
            disabled={isChecking}
          >
            {isChecking ? "Checking…" : "Refresh checks"}
          </button>

          <button
            type="button"
            className="integration-health__button integration-health__button--secondary"
            onClick={handleCopyDiagnostics}
          >
            Copy diagnostics
          </button>
        </div>
      </div>

      <div
        className="integration-health__polling"
        role="status"
        aria-live="polite"
      >
        {isPageVisible
          ? "Automatic checks are running every 30 seconds."
          : "Automatic checks are paused while this page is hidden."}
      </div>

      <div className="integration-health__summary">
        <div>
          <strong>{availableCount}</strong>
          <span>Available</span>
        </div>

        <div>
          <strong>{degradedCount}</strong>
          <span>Degraded</span>
        </div>

        <div>
          <strong>{unavailableCount}</strong>
          <span>Unavailable</span>
        </div>
      </div>

      {panelMessage && (
        <div className="integration-health__message" role="alert">
          {panelMessage}
        </div>
      )}

      {copyMessage && (
        <div
          className="integration-health__copy-message"
          role="status"
          aria-live="polite"
        >
          {copyMessage}
        </div>
      )}

      <div className="integration-health__table-wrapper">
        <table className="integration-health__table">
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Status</th>
              <th scope="col">Response time</th>
              <th scope="col">Failure type</th>
              <th scope="col">Last successful check</th>
              <th scope="col">Last error</th>
              <th scope="col">Last checked</th>
            </tr>
          </thead>

          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td>
                  <strong>{service.name}</strong>
                </td>

                <td>
                  <span
                    className={`integration-health__status integration-health__status--${service.status}`}
                  >
                    {service.status}
                  </span>
                </td>

                <td>
                  {service.responseTimeMs === null
                    ? "—"
                    : `${service.responseTimeMs} ms`}
                </td>

                <td>
                  {FAILURE_LABELS[service.failureType] || "—"}
                </td>

                <td>
                  {formatTimestamp(service.lastSuccessfulCheck)}
                </td>

                <td className="integration-health__error">
                  {service.lastError || "None"}
                </td>

                <td>{formatTimestamp(service.lastChecked)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="integration-health__privacy-note">
        Copied diagnostics contain service status information only.
        Authentication tokens, passwords, stack traces and configured
        service addresses are not included.
      </p>
    </section>
  );
}

export default IntegrationHealthPanel;