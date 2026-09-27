import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AboutUs from "../AboutUs";

const renderPage = () =>
  render(
    <MemoryRouter>
      <AboutUs />
    </MemoryRouter>,
  );

const headingText = (h) =>
  h.textContent.replace(/(Available now|In progress)$/, "").trim();

afterEach(cleanup);

describe("About Us page", () => {
  it("has exactly one main heading", () => {
    renderPage();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe("About PHOENIX");
  });

  it("presents its sections in the intended reading order", () => {
    renderPage();
    const order = screen
      .getAllByRole("heading", { level: 2 })
      .map(headingText);

    expect(order).toEqual([
      "What PHOENIX is",
      "What PHOENIX does",
      "How PHOENIX works",
      "Who it is for",
      "What you can do today",
      "Still in development",
      "About this project",
      "Support & Contact",
    ]);
  });

  it("answers what it is, the problem, who it is for and what it gives", () => {
    renderPage();
    for (const label of ["What it is", "The problem", "Who it is for", "What it gives them"]) {
      expect(screen.getByText(label, { selector: "dt" })).toBeTruthy();
    }
  });

  it("gives the meaningful image alternative text and marks the decorative one as decorative", () => {
    const { container } = renderPage();
    const meaningful = screen.getAllByRole("img");
    expect(meaningful).toHaveLength(1);
    expect(meaningful[0].getAttribute("alt")?.trim().length).toBeGreaterThan(20);
    expect(container.querySelector(".purpose-icon").getAttribute("alt")).toBe("");
  });

  it("names every section with its heading", () => {
    const { container } = renderPage();
    const sections = container.querySelectorAll("section");
    expect(sections.length).toBe(8);
    for (const section of sections) {
      const id = section.getAttribute("aria-labelledby");
      expect(id).toBeTruthy();
      expect(container.querySelector(`#${id}`)).toBeTruthy();
    }
  });

  it("links to real pages instead of relying on a setPage prop", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Open the dashboard" }).getAttribute("href")).toBe("/dashboard");
    expect(screen.getByRole("link", { name: "View reports" }).getAttribute("href")).toBe("/reports");
    expect(screen.getByRole("link", { name: "Open Help and Support" }).getAttribute("href")).toBe("/help");
    expect(screen.getByRole("link", { name: "support@phoenixdashboard.com" }).getAttribute("href")).toBe(
      "mailto:support@phoenixdashboard.com",
    );
  });

  it("uses no inline styles", () => {
    const { container } = renderPage();
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("does not claim the regional anomaly panel is always available", () => {
    renderPage();
    const available = screen.getByRole("heading", { name: /What you can do today/ }).closest("section");
    expect(available.textContent).not.toMatch(/anomaly/i);
    expect(screen.getByText(/Regional anomaly detection: the panel is built/)).toBeTruthy();
  });

  it("no longer says the Help Center is missing", () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/Help Center/i);
  });
});
