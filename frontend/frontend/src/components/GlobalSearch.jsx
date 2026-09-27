import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchableRoutes } from "../config/routes";
import "./GlobalSearch.css";

// Extra terms that should match a page but are not in its label.
// Keyed by route key so routes.js stays the single source of truth
// for paths, labels and permissions.
const KEYWORDS = {
  dashboard: ["home", "overview", "summary", "threats", "anomaly"],
  alerts: ["notifications", "hazards", "priority", "warnings"],
  reports: ["evidence", "incident", "submit", "upload"],
  about: ["team", "project", "scope", "phoenix"],
  settings: ["preferences", "appearance", "theme", "accessibility"],
  threats: ["threat details", "severity", "risk"],
  riskAssessment: ["risk", "assessment", "scoring"],
  help: ["support", "faq", "guide", "troubleshooting", "contact"],
  login: ["sign in", "account"],
  forgotPassword: ["reset password", "recover", "forgot"],
  createUser: ["add user", "new account", "admin"],
  componentShowcase: ["design system", "tokens", "components", "admin"],
};

// Splits a label so the matched part can be wrapped for highlighting.
const splitOnMatch = (label, query) => {
  const index = label.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return [label, "", ""];
  return [
    label.slice(0, index),
    label.slice(index, index + query.length),
    label.slice(index + query.length),
  ];
};

function GlobalSearch({ isAdmin = false }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const listId = useId();

  // Only pages this user may reach. Admin-only routes are filtered out
  // for everyone else, so restricted pages never appear in results.
  const pages = useMemo(() => searchableRoutes({ isAdmin }), [isAdmin]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    return pages
      .filter((route) => {
        if (route.label.toLowerCase().includes(term)) return true;
        return (KEYWORDS[route.key] || []).some((word) =>
          word.toLowerCase().includes(term),
        );
      })
      .slice(0, 8);
  }, [pages, query]);

  // Keep the highlighted row valid as results change.
  const safeIndex = results.length
    ? Math.min(activeIndex, results.length - 1)
    : 0;

  // Close the panel on an outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // "/" focuses the search field from anywhere except a text input.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "/") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const goToResult = (route) => {
    if (!route) return;
    setOpen(false);
    setQuery("");
    navigate(route.path);
    // Return focus to the page rather than leaving it in the closed panel.
    document.getElementById("main-content")?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      goToResult(results[safeIndex]);
    }
  };

  const showPanel = open && query.trim() !== "";

  return (
    <div className="global-search" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        className="temp-search"
        placeholder="Search pages (press /)"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showPanel && results.length ? `${listId}-${safeIndex}` : undefined
        }
        aria-label="Search Phoenix pages"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {query && (
        <button
          type="button"
          className="global-search-clear"
          aria-label="Clear search"
          onClick={() => {
            setQuery("");
            setOpen(false);
            inputRef.current?.focus();
          }}
        >
          <span aria-hidden="true">{"\u2715"}</span>
        </button>
      )}

      {showPanel && (
        <div className="global-search-panel">
          <p className="global-search-note">
            Searches Phoenix pages, not stored records.
          </p>

          {results.length === 0 ? (
            <p className="global-search-empty" role="status">
              No pages match “{query}”.
            </p>
          ) : (
            <ul className="global-search-list" id={listId} role="listbox">
              {results.map((route, index) => {
                const [before, match, after] = splitOnMatch(route.label, query);
                return (
                  <li key={route.key} role="presentation">
                    <button
                      type="button"
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={index === safeIndex}
                      className={`global-search-item${
                        index === safeIndex ? " is-active" : ""
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => goToResult(route)}
                    >
                      <span className="global-search-label">
                        {before}
                        {match && <mark>{match}</mark>}
                        {after}
                      </span>
                      <span className="global-search-path">{route.path}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;