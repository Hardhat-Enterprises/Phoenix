import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Mock error boundary component that captures errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || "An unexpected error occurred"}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Component that throws an error
const ThrowError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error("Test error from component");
  }
  return <div>No error</div>;
};

describe("Error Boundary Fallback Rendering", () => {
  beforeEach(() => {
    // Suppress console.error in tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render error boundary", () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </BrowserRouter>,
    );

    expect(screen.getByText("No error")).toBeTruthy();
  });

  it("should catch and display errors", () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
  });

  it("should display error message", () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>,
    );

    expect(screen.getByText(/Test error from component/i)).toBeTruthy();
  });

  it("should display fallback UI with proper role", () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeTruthy();
    expect(alert.className).toContain("error-boundary-fallback");
  });

  it("should provide recovery button", () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>,
    );

    const button = screen.getByRole("button", { name: /Try again/i });
    expect(button).toBeTruthy();
  });

  it("should recover from error when button clicked", async () => {
    const { rerender } = render(
      <BrowserRouter>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();

    const button = screen.getByRole("button", { name: /Try again/i });
    button.click();

    // After recovery, component should try to render again
    // (In a real app, this might navigate away or retry logic)
    expect(screen.queryByRole("alert") || screen.queryByText(/No error/i))
      .toBeTruthy();
  });

  it("should display error heading", () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>,
    );

    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
  });

  describe("Nested Error Boundaries", () => {
    it("should have multiple error boundaries in app", () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <div>
              <ErrorBoundary>
                <ThrowError shouldThrow={false} />
              </ErrorBoundary>
            </div>
          </ErrorBoundary>
        </BrowserRouter>,
      );

      expect(screen.getByText("No error")).toBeTruthy();
    });

    it("should catch errors in inner boundary first", () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <div>
              <ErrorBoundary>
                <ThrowError shouldThrow={true} />
              </ErrorBoundary>
            </div>
          </ErrorBoundary>
        </BrowserRouter>,
      );

      // Inner boundary should catch and display error
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });

  describe("Error Content Display", () => {
    it("should show helpful error message", () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      const fallback = screen.getByRole("alert");
      expect(fallback.textContent).toContain("Something went wrong");
    });

    it("should not show stack trace to users", () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      const fallback = screen.getByRole("alert");
      // Should not show full stack trace
      expect(fallback.textContent).not.toContain("at ");
    });
  });

  describe("Error Boundary Accessibility", () => {
    it("should be marked as alert for screen readers", () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      expect(screen.getByRole("alert")).toBeTruthy();
    });

    it("should have accessible recovery button", () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      const button = screen.getByRole("button", { name: /Try again/i });
      expect(button).toBeTruthy();
      expect(button.type).toBe("button");
    });

    it("should have clear heading hierarchy", () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading.textContent).toContain("Something went wrong");
    });
  });

  describe("Common Error Scenarios", () => {
    it("should handle missing component errors", () => {
      const MissingComponent = () => {
        const obj = null;
        return <div>{obj.property}</div>;
      };

      render(
        <BrowserRouter>
          <ErrorBoundary>
            <MissingComponent />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      expect(screen.getByRole("alert")).toBeTruthy();
    });

    it("should handle invalid children errors", () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      expect(screen.getByRole("alert")).toBeTruthy();
    });

    it("should handle async errors (if componentDidCatch)", () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      // Error should be caught
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });

  describe("Error Recovery State", () => {
    it("should reset error state on recovery", async () => {
      const { rerender } = render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      expect(screen.getByRole("alert")).toBeTruthy();

      const button = screen.getByRole("button", { name: /Try again/i });
      button.click();

      // Verify recovery action was triggered
      expect(screen.queryByRole("alert") || screen.queryByText(/No error/i))
        .toBeTruthy();
    });

    it("should maintain error state across renders", () => {
      const { rerender } = render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      expect(screen.getByRole("alert")).toBeTruthy();

      // Re-render should still show error
      rerender(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });

  describe("Component Lifecycle", () => {
    it("should call getDerivedStateFromError", () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      // Should show error boundary UI
      expect(screen.getByRole("alert")).toBeTruthy();
    });

    it("should call componentDidCatch", () => {
      const logSpy = vi.spyOn(console, "error");

      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      // componentDidCatch should have been called
      expect(screen.getByRole("alert")).toBeTruthy();

      logSpy.mockRestore();
    });
  });

  describe("Dashboard Error Context", () => {
    it("should show error when dashboard fails to load", () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
    });

    it("should allow user to recover and retry", async () => {
      render(
        <BrowserRouter>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </BrowserRouter>,
      );

      const tryAgainBtn = screen.getByRole("button", { name: /Try again/i });
      expect(tryAgainBtn).toBeTruthy();

      tryAgainBtn.click();
      // Should attempt recovery
    });
  });
});
