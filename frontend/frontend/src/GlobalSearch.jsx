import { useEffect, useMemo, useRef, useState } from "react";
import { searchIndex } from "./searchIndex";
import { searchEntries, groupEntries, splitForHighlight } from "./searchMatch";
import "./GlobalSearch.css";

function Highlighted({ text, query }) {
  const segments = splitForHighlight(text, query);

  return (
    <>
      {segments.map((segment, index) =>
        segment.matched ? (
          <mark key={index}>{segment.text}</mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}

export default function GlobalSearch({ goToPage, isAdmin = false }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef(null);
  const resultRefs = useRef([]);
  const containerRef = useRef(null);

  const matches = useMemo(
    () => searchEntries(searchIndex, query, isAdmin),
    [query, isAdmin]
  );

  const groups = useMemo(() => groupEntries(matches), [matches]);
  const flatMatches = matches;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    setIsOpen(query.trim().length > 0);
  }, [query]);

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      const target = event.target;
      const isTypingElsewhere =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (event.key === "/" && !isTypingElsewhere) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigateTo = (entry) => {
    goToPage(entry.page);
    setIsOpen(false);
    setQuery("");
    inputRef.current?.focus();

    if (entry.sectionId) {
      window.setTimeout(() => {
        document
          .getElementById(entry.sectionId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen || flatMatches.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((previous) =>
        Math.min(previous + 1, flatMatches.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((previous) => Math.max(previous - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const target = flatMatches[activeIndex];
      if (target) {
        navigateTo(target);
      }
    }
  };

  useEffect(() => {
    resultRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let flatCursor = -1;

  return (
    <div className="global-search" ref={containerRef}>
      <div className="global-search-input-wrap">
        <span className="global-search-icon" aria-hidden="true">🔍</span>

        <input
          ref={inputRef}
          type="text"
          className="global-search-input"
          placeholder="Search in site  (press /)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length > 0) setIsOpen(true);
          }}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="global-search-listbox"
          aria-activedescendant={
            isOpen && flatMatches[activeIndex]
              ? `search-result-${flatMatches[activeIndex].id}`
              : undefined
          }
          aria-autocomplete="list"
        />

        {query.length > 0 && (
          <button
            type="button"
            className="global-search-clear"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className="global-search-panel"
          id="global-search-listbox"
          role="listbox"
        >
          {flatMatches.length === 0 ? (
            <div className="global-search-empty">
              No results found for "{query}"
            </div>
          ) : (
            groups.map(({ group, items }) => (
              <div className="global-search-group" key={group}>
                <div className="global-search-group-label">{group}</div>

                {items.map((entry) => {
                  flatCursor += 1;
                  const isActive = flatCursor === activeIndex;
                  const currentIndex = flatCursor;

                  return (
                    <button
                      type="button"
                      key={entry.id}
                      id={`search-result-${entry.id}`}
                      role="option"
                      aria-selected={isActive}
                      ref={(el) => (resultRefs.current[currentIndex] = el)}
                      className={`global-search-result ${isActive ? "active" : ""}`}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      onClick={() => navigateTo(entry)}
                    >
                      <span className="global-search-result-title">
                        <Highlighted text={entry.title} query={query} />
                      </span>

                      <span className="global-search-result-type">
                        {entry.type === "action"
                          ? "Action"
                          : entry.type === "section"
                            ? "Section"
                            : "Page"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}

          <div className="global-search-footer">
            Site navigation only — does not search backend records.
          </div>
        </div>
      )}
    </div>
  );
}