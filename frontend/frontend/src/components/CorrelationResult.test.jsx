// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";

import CorrelationResult from "./CorrelationResult";
import { CORRELATION_FIXTURES } from "../services/correlationResultFixtures";

afterEach(() => {
  cleanup();
});

describe("CorrelationResult", () => {
  it("renders a related hazard result", () => {
    render(<CorrelationResult result={CORRELATION_FIXTURES.related} />);

    expect(
      screen.getByRole("heading", {
        name: /hazard relationship identified/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/bushfire/i)).toBeInTheDocument();
    expect(screen.getByText(/ballarat/i)).toBeInTheDocument();
  });

  it("renders an unrelated result without implying safety", () => {
    render(<CorrelationResult result={CORRELATION_FIXTURES.unrelated} />);

    expect(
      screen.getByRole("heading", {
        name: /no hazard relationship identified/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/does not mean the content is safe/i),
    ).toBeInTheDocument();
  });

  it("renders an inconclusive result", () => {
    render(
      <CorrelationResult result={CORRELATION_FIXTURES.inconclusive} />,
    );

    expect(
      screen.getByRole("heading", {
        name: /correlation result inconclusive/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders invalid input safely", () => {
    render(<CorrelationResult result={CORRELATION_FIXTURES.invalid} />);

    expect(
      screen.getByRole("heading", {
        name: /input needs correction/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/check that the submitted content/i),
    ).toBeInTheDocument();
  });

  it("renders the processing state", () => {
    render(
      <CorrelationResult result={CORRELATION_FIXTURES.processing} />,
    );

    expect(
      screen.getByRole("heading", {
        name: /correlation analysis in progress/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/result is still being prepared/i),
    ).toBeInTheDocument();
  });

  it("renders the unavailable state safely", () => {
    render(
      <CorrelationResult result={CORRELATION_FIXTURES.unavailable} />,
    );

    expect(
      screen.getByRole("heading", {
        name: /correlation result unavailable/i,
      }),
    ).toBeInTheDocument();
  });

  it("handles malformed correlation data without crashing", () => {
    render(
      <CorrelationResult result={CORRELATION_FIXTURES.malformed} />,
    );

    expect(
      screen.getByRole("heading", {
        name: /correlation result unavailable/i,
      }),
    ).toBeInTheDocument();
  });

  it("shows multiple hazard matches", () => {
    render(
      <CorrelationResult
        result={CORRELATION_FIXTURES.multipleMatches}
      />,
    );

    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/additional/i)).toBeInTheDocument();
  });
});