import { useState } from "react";
import { Link } from "react-router-dom";
import "../index.css";
import "./design.css";
import "./ComponentShowcase.css";
import { LoadingState, EmptyState, ErrorState } from "./States";

export default function ComponentShowcase() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="content-max showcase-root">
      <header className="page-heading">
        <h1>Component Showcase</h1>
        <p>Reusable Phoenix interface patterns and interaction states.</p>
      </header>

      <section className="showcase-grid">
        <div className="card showcase-panel">
          <h2>Buttons</h2>
          <div className="showcase-row">
            <button type="button" className="btn btn-primary">
              Primary
            </button>
            <button type="button" className="btn btn-secondary">
              Secondary
            </button>
            <button type="button" className="btn" disabled>
              Disabled
            </button>
          </div>
        </div>

        <div className="card showcase-panel">
          <h2>Form Pattern</h2>
          <div className="showcase-form">
            <label className="showcase-field">
              <span className="label-required">Name</span>
              <input aria-required="true" placeholder="User full name" />
            </label>
            <label className="showcase-field">
              <span>Email</span>
              <input type="email" placeholder="you@example.com" />
            </label>
          </div>
        </div>

        <div className="card showcase-panel">
          <h2>Focus &amp; Keyboard</h2>
          <p className="muted">
            Use Tab to move focus — focus rings use shared design tokens.
          </p>
          <div className="showcase-row">
            <Link to="/dashboard" className="btn btn-secondary">
              Dashboard link
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                window.setTimeout(() => setLoading(false), 900);
              }}
            >
              {loading ? "Working..." : "Trigger"}
            </button>
          </div>
        </div>

        <div className="card showcase-panel showcase-panel--states">
          <h2>Shared States</h2>
          <div className="showcase-states-grid">
            <LoadingState
              title="Loading data"
              description="Loading example data..."
            />
            <EmptyState
              title="No results"
              description="This is the empty state."
            />
            <ErrorState
              title="Fetch failed"
              description="An error occurred while loading data."
            />
          </div>
        </div>
      </section>
    </div>
  );
}