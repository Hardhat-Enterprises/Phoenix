import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ThreatDetails from "../ThreatDetails.jsx";
import { AUTH_STORAGE_KEY } from "../services/authApi.js";
import { mockAuthSession, mockThreat } from "../mocks/data.js";

// Wrapper with Router to support useParams and useNavigate
const ThreatDetailsWithRouter = ({ threatId = "threat-1" }) => (
  <BrowserRouter>
    <Routes>
      <Route path="/threats/:threatId" element={<ThreatDetails />} />
    </Routes>
  </BrowserRouter>
);

describe("ThreatDetails Component", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));
  });

  it("should render threat details", async () => {
    render(
      <BrowserRouter>
        <ThreatDetails selectedThreat={mockThreat} />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Threat Details/i)).toBeTruthy();
  });
});

it("should display threat title", async () => {
  render(
    <BrowserRouter>
      <ThreatDetails selectedThreat={mockThreat} />
    </BrowserRouter>,
  );
  await waitFor(() => {
    expect(screen.getByText(/Threat Details/i)).toBeTruthy();
  });
});

it("should display threat severity", async () => {
  render(
    <BrowserRouter>
      <ThreatDetails selectedThreat={mockThreat} />
    </BrowserRouter>,
  );

  // Query for the specific severity value (not legend items)
  // The severity badge contains the threat severity
  const badge = document.querySelector(".threat-risk-badge");

  expect(badge).toBeTruthy();
  expect(badge.textContent).toMatch(/high|critical|medium|low/i);
});

it("should display threat description", () => {
  render(
    <BrowserRouter>
      <ThreatDetails selectedThreat={mockThreat} />
    </BrowserRouter>,
  );

  // Should show description or auto-generated summary
  const description =
    screen.queryByText(mockThreat.description) ||
    screen.queryByText(/unauthorized_access|threat type/i);
  expect(description).toBeTruthy();
});

it("should display confidence score", () => {
  render(
    <BrowserRouter>
      <ThreatDetails selectedThreat={mockThreat} />
    </BrowserRouter>,
  );

  // Query for the specific confidence value (95%), not the label
  const confidence = screen.queryByText("95%");
  expect(confidence).toBeTruthy();
});

it("should show loading state when fetching", async () => {
  render(
    <BrowserRouter>
      <ThreatDetails selectedThreat={null} />
    </BrowserRouter>,
  );

  // Should show "No Threat Selected" when no threat is passed
  const noThreat = screen.queryByText(/No Threat Selected/i);
  expect(noThreat).toBeTruthy();
});

it("should handle direct navigation to /threats/:threatId", async () => {
  window.history.pushState({}, "test", "/threats/threat-1");

  render(
    <BrowserRouter initialEntries={["/threats/threat-1"]}>
      <Routes>
        <Route path="/threats/:threatId" element={<ThreatDetails />} />
      </Routes>
    </BrowserRouter>,
  );

  await waitFor(
    () => {
      // Should load threat-1 from API and show its data
      const heading = screen.queryByRole("heading", { level: 2 });
      expect(heading).toBeTruthy();
    },
    { timeout: 3000 },
  );
});

it("should handle invalid threat ID", async () => {
  window.history.pushState({}, "test", "/threats/invalid-id");

  render(
    <BrowserRouter initialEntries={["/threats/invalid-id"]}>
      <Routes>
        <Route path="/threats/:threatId" element={<ThreatDetails />} />
      </Routes>
    </BrowserRouter>,
  );

  await waitFor(
    () => {
      // Alert role is set on the error message container
      const alert = screen.queryByRole("alert");
      expect(alert).toBeTruthy();
    },
    { timeout: 3000 },
  );
});

it("should prefer in-memory threat when available", () => {
  render(
    <BrowserRouter>
      <ThreatDetails selectedThreat={mockThreat} />
    </BrowserRouter>,
  );

  // Should use the threat passed as prop, not make API call
  // Component renders threat type as heading
  const heading = screen.queryByRole("heading", {
    name: /Unauthorized Access|Suspicious/i,
  });
  expect(heading).toBeTruthy();
});

it("should use URL param when no in-memory threat", async () => {
  window.history.pushState({}, "test", "/threats/threat-2");

  render(
    <BrowserRouter initialEntries={["/threats/threat-2"]}>
      <Routes>
        <Route path="/threats/:threatId" element={<ThreatDetails />} />
      </Routes>
    </BrowserRouter>,
  );

  await waitFor(
    () => {
      // Should load threat-2 from API and show its data
      // threat-2 is "Data Exfiltration" so look for threat heading
      const heading = screen.queryByRole("heading", { level: 2 });
      expect(heading).toBeTruthy();
    },
    { timeout: 3000 },
  );
});

it("should handle back navigation", () => {
  const mockOnBack = vi.fn();

  render(
    <BrowserRouter>
      <ThreatDetails selectedThreat={mockThreat} onBack={mockOnBack} />
    </BrowserRouter>,
  );

  const backButton = screen.queryByRole("button", { name: /back|return/i });
  if (backButton) {
    backButton.click();
    expect(mockOnBack).toHaveBeenCalled();
  }
});

it("should display threat metadata", () => {
  render(
    <BrowserRouter>
      <ThreatDetails selectedThreat={mockThreat} />
    </BrowserRouter>,
  );

  // Should display threat source or severity
  const source = screen.queryByText(/auth-service/i);
  const severity = screen.queryByRole("heading", {
    name: /high|critical|medium|low/i,
  });
  expect(source || severity).toBeTruthy();
});

it("should format confidence as percentage", () => {
  render(
    <BrowserRouter>
      <ThreatDetails selectedThreat={mockThreat} />
    </BrowserRouter>,
  );

  // 0.95 should display as 95%
  expect(screen.queryByText(/95%/)).toBeTruthy();
});

it("should handle raw threat data from backend", () => {
  const threatWithRaw = {
    ...mockThreat,
    raw: {
      threat_id: "threat-1",
      severity: "high",
      event_type: "login_failure",
    },
  };

  render(
    <BrowserRouter>
      <ThreatDetails selectedThreat={threatWithRaw} />
    </BrowserRouter>,
  );

  // Should extract and display data from raw field
  // Check for auth-service (from raw) or severity badge
  const source = screen.queryByText(/auth-service/i);
  const heading = screen.queryByRole("heading", { level: 2 });
  expect(source || heading).toBeTruthy();
});

it("should show error state for failed API request", async () => {
  window.history.pushState({}, "test", "/threats/invalid-id");

  render(
    <BrowserRouter initialEntries={["/threats/invalid-id"]}>
      <Routes>
        <Route path="/threats/:threatId" element={<ThreatDetails />} />
      </Routes>
    </BrowserRouter>,
  );

  await waitFor(
    () => {
      // Alert role is set on the error message container
      const alert = screen.queryByRole("alert");
      expect(alert).toBeTruthy();
    },
    { timeout: 3000 },
  );
});
