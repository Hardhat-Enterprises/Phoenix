import { useState } from "react";
import "../index.css";
import "./design.css";
import "./ComponentShowcase.css";
import { LoadingState, EmptyState, ErrorState } from "./States";

export default function ComponentShowcase() {
  const [loading, setLoading] = useState(false);

  return (
    <main className="content-max showcase-root">
      <header className="page-heading">Component Showcase</header>

      <section className="showcase-grid">
        <div className="card showcase-panel">
          <h3>Buttons</h3>
          <div className="showcase-row">
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-secondary">Secondary</button>
            <button className="btn" disabled>
              Disabled
            </button>
          </div>
        </div>

        <div className="card showcase-panel">
          <h3>Form Pattern</h3>
          <label className="label-required">Name</label>
          <input aria-required="true" placeholder="User full name" />

          <label>Email</label>
          <input placeholder="you@example.com" />
        </div>

        <div className="card showcase-panel">
          <h3>Shared States</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <LoadingState message="Loading example data..." />
            <EmptyState
              heading="No results"
              message="This is the empty state."
            />
            <ErrorState
              type="error"
              heading="Fetch failed"
              message="An error occurred."
            />
          </div>
        </div>

        <div className="card showcase-panel">
          <h3>Focus & Keyboard</h3>
          <p className="muted">
            Use Tab to move focus — focus ring is token-driven.
          </p>
          <div className="showcase-row">
            <a href="#" className="btn btn-secondary">
              Link-Button
            </a>
            <button
              className="btn btn-primary"
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 900);
              }}
            >
              {loading ? "Working..." : "Trigger"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
