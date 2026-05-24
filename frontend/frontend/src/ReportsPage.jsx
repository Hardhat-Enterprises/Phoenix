import { useEffect, useMemo, useState } from "react";
import "./ReportsPage.css";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReportPDF from "./components/ReportPDF";
import {
  getIngestionHealth,
  getIntegrations,
  postIngestionCore,
} from "./services/phoenixApi";

const defaultForm = {
  url: "https://example.com/donate-now",
  text: "Urgent flood relief donation needed.",
  timestamp: "2026-05-02T20:30",
  hazardType: "flood",
  hazardSeverity: "0.8",
  hazardTimestamp: "2026-05-02T18:00",
  hazardLocation: "VIC",
  hazardStatus: "active",
  alertLevel: "emergency",
  source: "cyber_extraction",
};

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const pause = (delayMs) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatScore = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(4) : "-";
};

const getProcessedTime = (integration) =>
  integration?.output?.processed_at ||
  integration?.updated_at ||
  integration?.created_at;

const getEvidenceTitle = (input = {}) => {
  if (input.url) {
    return input.url;
  }

  if (input.text) {
    return input.text.length > 70 ? `${input.text.slice(0, 70)}...` : input.text;
  }

  return "Core model output";
};

const getEvidenceType = (input = {}) => {
  if (input.url && input.text) {
    return "URL + Text";
  }

  if (input.url) {
    return "URL";
  }

  if (input.text) {
    return "Text";
  }

  return "-";
};

const sanitizeFileName = (value) => {
  const cleaned = String(value || "core_model_report")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return cleaned || "core_model_report";
};

const buildIntegrationReport = (integration) => {
  const input = integration.input || {};
  const output = integration.output || {};
  const status = integration.status || "-";
  const risk =
    output.risk_level || (status === "error" ? "Error" : "Pending");
  const title = getEvidenceTitle(input);

  return {
    id: integration.integration_event_id || title,
    title,
    description: input.text || input.url || "No evidence text returned.",
    evidenceType: getEvidenceType(input),
    risk,
    riskClass: getRiskClass(output.risk_level, status),
    status,
    date: formatDateTime(getProcessedTime(integration)),
    fileName: `${sanitizeFileName(title)}_verification_report.pdf`,
    input,
    output,
  };
};

const toIsoTimestamp = (value) => {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const buildModelPayload = (form) => ({
  url: form.url.trim() || null,
  text: form.text.trim() || null,
  timestamp: toIsoTimestamp(form.timestamp),
  hazard_type: form.hazardType.trim(),
  hazard_severity: toNumber(form.hazardSeverity, 0.8),
  hazard_timestamp: toIsoTimestamp(form.hazardTimestamp),
  hazard_location: form.hazardLocation.trim(),
  hazard_status: form.hazardStatus.trim(),
  alert_level: form.alertLevel,
  source: form.source.trim(),
});

const hasModelOutput = (integration) =>
  integration?.output && Object.keys(integration.output).length > 0;

const getIntegrationTime = (integration) => {
  const rawTime =
    integration?.created_at ||
    integration?.updated_at ||
    integration?.output?.processed_at;
  const time = new Date(rawTime).getTime();
  return Number.isFinite(time) ? time : 0;
};

const sortNewestFirst = (items) =>
  [...items].sort(
    (first, second) => getIntegrationTime(second) - getIntegrationTime(first),
  );

const samePayload = (integration, payload) => {
  const input = integration.input || {};

  return (
    integration.integration_type === "core" &&
    input.url === payload.url &&
    input.text === payload.text &&
    input.timestamp === payload.timestamp &&
    input.hazard_type === payload.hazard_type &&
    String(input.hazard_severity) === String(payload.hazard_severity) &&
    input.hazard_timestamp === payload.hazard_timestamp &&
    input.hazard_location === payload.hazard_location &&
    input.hazard_status === payload.hazard_status &&
    input.alert_level === payload.alert_level &&
    input.source === payload.source
  );
};

const findIntegrationForPayload = (items, payload, submittedAt) => {
  const sortedItems = sortNewestFirst(items);
  const submittedTime = submittedAt ? submittedAt.getTime() - 5000 : 0;

  return (
    sortedItems.find(
      (integration) =>
        samePayload(integration, payload) &&
        getIntegrationTime(integration) >= submittedTime,
    ) || sortedItems.find((integration) => samePayload(integration, payload))
  );
};

const getInputSignature = (integration) => {
  const input = integration.input || {};

  return JSON.stringify({
    url: input.url || "",
    text: input.text || "",
    timestamp: input.timestamp || "",
    hazard_type: input.hazard_type || "",
    hazard_severity: input.hazard_severity ?? "",
    hazard_timestamp: input.hazard_timestamp || "",
    hazard_location: input.hazard_location || "",
    hazard_status: input.hazard_status || "",
    alert_level: input.alert_level || "",
    source: input.source || "",
  });
};

const latestCoreIntegration = (items) => {
  const seenInputs = new Set();

  return sortNewestFirst(items)
    .filter((integration) => integration.integration_type === "core")
    .filter((integration) => {
      const signature = getInputSignature(integration);

      if (seenInputs.has(signature)) {
        return false;
      }

      seenInputs.add(signature);
      return true;
    })
    .slice(0, 1);
};

const getRiskClass = (riskLevel, status) => {
  if (status === "error") {
    return "error";
  }

  return String(riskLevel || "pending")
    .toLowerCase()
    .replace(/\s+/g, "-");
};

function ReportsPage() {
  const [form, setForm] = useState(() => ({
    ...defaultForm,
    timestamp: getCurrentDateTimeLocal(),
  }));
  const [integrations, setIntegrations] = useState([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [isRunningModel, setIsRunningModel] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState("Checking");
  const [modelMessage, setModelMessage] = useState("");
  const [modelError, setModelError] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);

  const displayedIntegrations = useMemo(
    () => latestCoreIntegration(integrations),
    [integrations],
  );

  const generatedReports = useMemo(
    () => displayedIntegrations.map(buildIntegrationReport),
    [displayedIntegrations],
  );

  const latestResult = useMemo(
    () =>
      selectedResult ||
      integrations.find(
        (item) => item.integration_type === "core" && hasModelOutput(item),
      ) ||
      integrations.find((item) => item.integration_type === "core"),
    [integrations, selectedResult],
  );

  const loadIntegrations = async () => {
    setIsLoadingIntegrations(true);

    try {
      const response = await getIntegrations({ page: 1, limit: 25 });
      const items = sortNewestFirst(response.items || []);
      setIntegrations(items);
      return items;
    } catch {
      setIntegrations([]);
      return [];
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadInitialData = async () => {
      const [healthResult] = await Promise.allSettled([
        getIngestionHealth(),
        loadIntegrations(),
      ]);

      if (!isActive) {
        return;
      }

      setIngestionStatus(
        healthResult.status === "fulfilled" ? "Online" : "Unavailable",
      );
    };

    loadInitialData();

    return () => {
      isActive = false;
    };
  }, []);

  const updateField = (field) => (event) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: event.target.value,
    }));
  };

  const pollForResult = async (payload, submittedAt) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await pause(attempt === 0 ? 1000 : 1500);

      const items = await loadIntegrations();
      const match = findIntegrationForPayload(items, payload, submittedAt);

      if (match && (hasModelOutput(match) || match.status === "error")) {
        return match;
      }
    }

    const items = await loadIntegrations();
    return findIntegrationForPayload(items, payload, submittedAt) || null;
  };

  const handleRefreshResults = async () => {
    setSelectedResult(null);
    await loadIntegrations();
  };

  const handleRunModel = async (event) => {
    event.preventDefault();
    setModelError("");
    setModelMessage("");
    setSelectedResult(null);

    if (!form.url.trim() && !form.text.trim()) {
      setModelError("Enter a URL, text, or both before running the model.");
      return;
    }

    const payload = buildModelPayload(form);
    const submittedAt = new Date();
    setIsRunningModel(true);

    try {
      await postIngestionCore(payload);
      setModelMessage("Core model request submitted. Waiting for output...");

      const result = await pollForResult(payload, submittedAt);

      if (!result) {
        setModelMessage(
          "Core model request submitted. Refresh results if the output is still processing.",
        );
        return;
      }

      setSelectedResult(result);

      if (result.status === "error") {
        setModelError(result.note || "Core model returned an error.");
        setModelMessage("");
        return;
      }

      setModelMessage("Core model output received.");
    } catch (error) {
      setModelError(error.message);
    } finally {
      setIsRunningModel(false);
    }
  };

  const output = latestResult?.output || {};
  const riskLevel =
    output.risk_level || (latestResult?.status === "error" ? "Error" : "Pending");
  const riskClass = getRiskClass(output.risk_level, latestResult?.status);

  return (
    <main className="reports-content">
      <section className="url-ingestion-card">
        <div className="url-ingestion-header">
          <div>
            <h2>URL/Text Risk Check</h2>
            <p>Enter the evidence and run the backend core model.</p>
          </div>

          <span className={`ingestion-status ${ingestionStatus.toLowerCase()}`}>
            Ingestion {ingestionStatus}
          </span>
        </div>

        <form className="url-ingestion-form" onSubmit={handleRunModel}>
          <div className="url-form-grid">
            <div className="url-form-group wide">
              <label>URL</label>
              <input
                type="url"
                placeholder="https://example.com/donate-now"
                value={form.url}
                onChange={updateField("url")}
              />
            </div>

            <div className="url-form-group wide">
              <label>Text</label>
              <textarea
                placeholder="Urgent flood relief donation needed."
                value={form.text}
                onChange={updateField("text")}
                rows={4}
              />
            </div>

            <div className="url-form-group">
              <label>Timestamp</label>
              <input
                type="datetime-local"
                value={form.timestamp}
                onChange={updateField("timestamp")}
              />
            </div>

            <div className="url-form-group">
              <label>Source</label>
              <input
                type="text"
                value={form.source}
                onChange={updateField("source")}
              />
            </div>
          </div>

          <div className="hazard-context-panel">
            <div className="hazard-context-header">
              <h3>Required Backend Payload</h3>
              <span>Sent with URL/Text to the core model</span>
            </div>

            <div className="url-form-grid">
              <div className="url-form-group">
                <label>Hazard Type</label>
                <input
                  type="text"
                  value={form.hazardType}
                  onChange={updateField("hazardType")}
                />
              </div>

              <div className="url-form-group">
                <label>Hazard Severity</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={form.hazardSeverity}
                  onChange={updateField("hazardSeverity")}
                />
              </div>

              <div className="url-form-group">
                <label>Hazard Timestamp</label>
                <input
                  type="datetime-local"
                  value={form.hazardTimestamp}
                  onChange={updateField("hazardTimestamp")}
                />
              </div>

              <div className="url-form-group">
                <label>Hazard Location</label>
                <input
                  type="text"
                  value={form.hazardLocation}
                  onChange={updateField("hazardLocation")}
                />
              </div>

              <div className="url-form-group">
                <label>Hazard Status</label>
                <input
                  type="text"
                  value={form.hazardStatus}
                  onChange={updateField("hazardStatus")}
                />
              </div>

              <div className="url-form-group">
                <label>Alert Level</label>
                <select
                  value={form.alertLevel}
                  onChange={updateField("alertLevel")}
                >
                  <option value="watch">Watch</option>
                  <option value="warning">Warning</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>

          {modelError && <p className="ingestion-message error">{modelError}</p>}

          {modelMessage && (
            <p className="ingestion-message success">{modelMessage}</p>
          )}

          <div className="url-action-row">
            <button className="primary-btn" type="submit" disabled={isRunningModel}>
              {isRunningModel ? "Checking..." : "Check Risk"}
            </button>

            <button
              className="secondary-btn"
              type="button"
              disabled={isLoadingIntegrations || isRunningModel}
              onClick={handleRefreshResults}
            >
              {isLoadingIntegrations ? "Refreshing..." : "Refresh Results"}
            </button>
          </div>
        </form>
      </section>

      {latestResult && (
        <section className="model-output-card">
          <div className="generated-reports-header">
            <div>
              <h2>Model Output</h2>
              <p>{latestResult.input?.url || "Text-only evidence"}</p>
            </div>

            <span className={`risk-badge ${riskClass}`}>{riskLevel}</span>
          </div>

          <div className="score-grid">
            <div className="score-tile">
              <span>Risk Score</span>
              <strong>{formatScore(output.risk_score)}</strong>
            </div>

            <div className="score-tile">
              <span>Confidence</span>
              <strong>{formatScore(output.confidence_score)}</strong>
            </div>

            <div className="score-tile">
              <span>Predicted Class</span>
              <strong>{output.predicted_class ?? "-"}</strong>
            </div>

            <div className="score-tile">
              <span>Status</span>
              <strong>{latestResult.status || "-"}</strong>
            </div>
          </div>

          {latestResult.input?.text && (
            <p className="result-text">{latestResult.input.text}</p>
          )}

          {latestResult.note && (
            <p className="result-note">{latestResult.note}</p>
          )}
        </section>
      )}

      <section className="core-results-card">
        <div className="generated-reports-header">
          <div>
            <h2>Last Core Model Test</h2>
            <p>Newest backend core model integration record.</p>
          </div>
        </div>

        <div className="core-results-table">
          <div className="core-results-head">
            <span>Input</span>
            <span>Risk Level</span>
            <span>Risk Score</span>
            <span>Confidence</span>
            <span>Status</span>
            <span>Processed</span>
          </div>

          {displayedIntegrations.length > 0 ? (
            displayedIntegrations.map((integration) => (
              <div
                className="core-results-row"
                key={integration.integration_event_id}
              >
                <div className="core-input-cell">
                  <strong>{integration.input?.url || "Text only"}</strong>
                  <small>{integration.input?.text || "No text supplied"}</small>
                </div>
                <span
                  className={`risk-badge ${getRiskClass(
                    integration.output?.risk_level,
                    integration.status,
                  )}`}
                >
                  {integration.output?.risk_level ||
                    (integration.status === "error" ? "Error" : "Pending")}
                </span>
                <span>{formatScore(integration.output?.risk_score)}</span>
                <span>{formatScore(integration.output?.confidence_score)}</span>
                <span>{integration.status || "-"}</span>
                <span>{formatDateTime(integration.output?.processed_at)}</span>
              </div>
            ))
          ) : (
            <div className="core-results-empty">
              {isLoadingIntegrations
                ? "Loading core model results..."
                : "No core model test returned yet."}
            </div>
          )}
        </div>
      </section>

      <section className="generated-reports-card">
        <div className="generated-reports-header">
          <div>
            <h2>Generated Verification Reports</h2>
            <p>
              Downloadable report generated from the latest backend core model record.
            </p>
          </div>
        </div>

        <div className="reports-table">
          <div className="reports-table-head">
            <span>Evidence</span>
            <span>Input Type</span>
            <span>Risk Level</span>
            <span>Status</span>
            <span>Processed</span>
            <span>Action</span>
          </div>

          {generatedReports.length > 0 ? (
            generatedReports.map((report) => (
              <div className="reports-row" key={report.id}>
                <div className="report-title-cell">
                  <strong>{report.title}</strong>
                  <small>{report.description}</small>
                </div>

                <span>{report.evidenceType}</span>

                <span className={`risk-badge ${report.riskClass}`}>
                  {report.risk}
                </span>

                <span>{report.status}</span>
                <span>{report.date}</span>

                <PDFDownloadLink
                  document={<ReportPDF report={report} />}
                  fileName={report.fileName}
                  className="download-button"
                >
                  {({ loading }) => (loading ? "Generating PDF" : "Download")}
                </PDFDownloadLink>
              </div>
            ))
          ) : (
            <div className="reports-empty">
              {isLoadingIntegrations
                ? "Loading backend core model records..."
                : "No core model records returned yet."}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ReportsPage;
