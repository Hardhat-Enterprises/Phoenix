import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReportsPage from "../ReportsPage";
import {
  getIngestionHealth,
  getIntegrations,
  postIngestionCore,
} from "../services/phoenixApi";
import { downloadReportPdf } from "../utils/downloadReportPdf";

// Local mocks only: no live backend and no other team member's branch.
vi.mock("../services/phoenixApi", () => ({
  getIngestionHealth: vi.fn(),
  getIntegrations: vi.fn(),
  postIngestionCore: vi.fn(),
}));
vi.mock("../utils/downloadReportPdf", () => ({ downloadReportPdf: vi.fn() }));
vi.mock("../components/EvidenceEntry", () => ({ default: () => null }));
vi.mock("../PreferencesContext", () => ({
  usePreferences: () => ({ preferences: { dateFormat: "DD/MM/YYYY" } }),
}));

const coreRecord = (overrides = {}) => ({
  integration_event_id: "evt-1",
  integration_type: "core",
  status: "completed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  input: {
    url: "https://example.com/donate-now",
    text: "Urgent flood relief donation needed.",
    hazard_type: "flood",
  },
  output: {
    risk_level: "High",
    risk_score: 0.8731,
    confidence_score: 0.9124,
    predicted_class: "phishing",
    processed_at: new Date().toISOString(),
  },
  ...overrides,
});

// A record that matches whatever the page just posted, like the real backend.
const recordForPosted = () => {
  const payload = postIngestionCore.mock.calls.at(-1)?.[0];
  return payload ? [coreRecord({ integration_event_id: "evt-new", input: payload })] : [];
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>,
  );

const advance = async (ms = 0) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const clickCheckRisk = () =>
  fireEvent.click(screen.getByRole("button", { name: "Check Risk" }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  getIngestionHealth.mockResolvedValue({ status: 200 });
  getIntegrations.mockResolvedValue({ items: [] });
  postIngestionCore.mockResolvedValue({ status: 200 });
  downloadReportPdf.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Reports page: loading and data handling", () => {
  it("shows the first load as busy", async () => {
    getIntegrations.mockReturnValue(new Promise(() => {}));
    renderPage();
    await advance();

    const refresh = screen.getByRole("button", { name: "Refreshing..." });
    expect(refresh.disabled).toBe(true);
  });

  it("shows a real zero as 0.0000, never as unavailable", async () => {
    getIntegrations.mockResolvedValue({
      items: [
        coreRecord({
          output: {
            risk_level: "Low",
            risk_score: 0,
            confidence_score: 0,
            predicted_class: "benign",
            processed_at: new Date().toISOString(),
          },
        }),
      ],
    });
    renderPage();
    await advance();

    expect(screen.getAllByText("0.0000").length).toBeGreaterThan(0);
    expect(screen.queryByText("Unavailable")).toBeNull();
  });

  it("shows a missing score as Unavailable and an empty string as (empty)", async () => {
    getIntegrations.mockResolvedValue({
      items: [
        coreRecord({
          output: { risk_level: "Medium", risk_score: null, predicted_class: "" },
        }),
      ],
    });
    renderPage();
    await advance();

    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("(empty)").length).toBeGreaterThan(0);
    expect(screen.queryByText("0.0000")).toBeNull();
  });

  it("renders a record with no input, output or id without crashing", async () => {
    getIntegrations.mockResolvedValue({
      items: [
        {
          integration_type: "core",
          integration_event_id: undefined,
          status: undefined,
        },
      ],
    });
    renderPage();
    await advance();

    expect(screen.getByText("Text only")).toBeTruthy();
    expect(screen.getByText(/no integration record ID/i)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/undefined|null|NaN/);
  });
});

describe("Reports page: validation", () => {
  it("blocks an empty Hazard Location, keeps the typed values and focuses the field", async () => {
    renderPage();
    await advance();

    const location = screen.getByLabelText(/Hazard Location/);
    fireEvent.change(location, { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "my_source" } });
    clickCheckRisk();
    await advance();

    expect(postIngestionCore).not.toHaveBeenCalled();
    expect(screen.getByText("Hazard location is required.")).toBeTruthy();
    expect(document.activeElement).toBe(location);
    expect(screen.getByLabelText("Source").value).toBe("my_source");
    expect(screen.getByLabelText("URL").value).toBe("https://example.com/donate-now");
  });

  it("accepts a severity of 0 and rejects a blank or out-of-range severity", async () => {
    renderPage();
    await advance();

    const severity = screen.getByLabelText("Hazard Severity");

    fireEvent.change(severity, { target: { value: "" } });
    clickCheckRisk();
    await advance();
    expect(screen.getByText("Enter a severity between 0 and 1.")).toBeTruthy();
    expect(postIngestionCore).not.toHaveBeenCalled();

    fireEvent.change(severity, { target: { value: "5" } });
    clickCheckRisk();
    await advance();
    expect(screen.getByText("Severity must be a number between 0 and 1.")).toBeTruthy();

    fireEvent.change(severity, { target: { value: "0" } });
    clickCheckRisk();
    await advance();
    expect(postIngestionCore).toHaveBeenCalledTimes(1);
    expect(postIngestionCore.mock.calls[0][0].hazard_severity).toBe(0);
  });
});

describe("Reports page: running the model", () => {
  it("never starts two requests, even if the form is submitted twice", async () => {
    postIngestionCore.mockReturnValue(new Promise(() => {}));
    renderPage();
    await advance();

    const form = screen.getByRole("button", { name: "Check Risk" }).closest("form");
    fireEvent.submit(form);
    fireEvent.submit(form);
    await advance();

    expect(postIngestionCore).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Checking..." }).disabled).toBe(true);
  });

  it("shows progress, then the result", async () => {
    getIntegrations.mockImplementation(async () => ({ items: recordForPosted() }));
    renderPage();
    await advance();

    clickCheckRisk();
    await advance();
    expect(screen.getByText(/Waiting for the model output/)).toBeTruthy();

    await advance(1000);
    expect(screen.getByText("Core model output received.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check Risk" }).disabled).toBe(false);
  });

  it("keeps the criteria when the request fails, and Retry reuses them", async () => {
    postIngestionCore
      .mockRejectedValueOnce(new Error("Core model service unavailable"))
      .mockResolvedValue({ status: 200 });
    getIntegrations.mockImplementation(async () => ({ items: recordForPosted() }));
    renderPage();
    await advance();

    fireEvent.change(screen.getByLabelText(/Hazard Location/), { target: { value: "NSW" } });
    clickCheckRisk();
    await advance();

    expect(screen.getByText("Core model service unavailable")).toBeTruthy();
    expect(screen.getByLabelText(/Hazard Location/).value).toBe("NSW");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await advance(1000);

    expect(postIngestionCore).toHaveBeenCalledTimes(2);
    expect(postIngestionCore.mock.calls[1][0]).toEqual(postIngestionCore.mock.calls[0][0]);
    expect(postIngestionCore.mock.calls[1][0].hazard_location).toBe("NSW");
    expect(screen.getByText("Core model output received.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("stops checking for output once the user leaves the page", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getIntegrations.mockResolvedValue({ items: [] });
    const { unmount } = renderPage();
    await advance();

    clickCheckRisk();
    await advance(1000);
    await advance(1500);
    const callsBeforeLeaving = getIntegrations.mock.calls.length;
    expect(callsBeforeLeaving).toBeGreaterThan(1);

    unmount();
    await advance(30000);

    expect(getIntegrations.mock.calls.length).toBe(callsBeforeLeaving);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("Reports page: PDF download", () => {
  const withOneReport = async () => {
    getIntegrations.mockResolvedValue({ items: [coreRecord()] });
    renderPage();
    await advance();
  };

  it("cannot start two PDF generations at once", async () => {
    downloadReportPdf.mockReturnValue(new Promise(() => {}));
    await withOneReport();

    const button = screen.getByRole("button", { name: "Download" });
    fireEvent.click(button);
    fireEvent.click(button);
    await advance();

    expect(downloadReportPdf).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Generating PDF" }).disabled).toBe(true);
  });

  it("shows an error with a Retry when generation fails, then recovers", async () => {
    downloadReportPdf
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(undefined);
    await withOneReport();

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await advance();

    expect(screen.getByText(/The PDF could not be generated/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download" }).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Retry download" }));
    await advance();

    expect(downloadReportPdf).toHaveBeenCalledTimes(2);
    expect(screen.getByText("PDF downloaded.")).toBeTruthy();
    expect(screen.queryByText(/The PDF could not be generated/)).toBeNull();
  });

  it("does not update the page if it is closed while a PDF is being built", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let finish;
    downloadReportPdf.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    getIntegrations.mockResolvedValue({ items: [coreRecord()] });
    const { unmount } = renderPage();
    await advance();

    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await advance();
    unmount();
    finish();
    await advance();

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
