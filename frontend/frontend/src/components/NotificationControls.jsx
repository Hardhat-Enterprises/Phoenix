import { VALID_LIMITS } from "./useNotificationQueryState";

// ---------------------------------------------------------------------------
// Search, read filter and page size for the notification panel.
//
// Presentation only: it reads its values from props and reports changes back,
// so the panel's filter state has a single owner (useNotificationQueryState).
// ---------------------------------------------------------------------------

export default function NotificationControls({
  searchEnabled = false,
  searchValue = "",
  onSearchChange,
  read = null,
  onReadChange,
  limit,
  onLimitChange,
}) {
  const readOptions = [
    [null, "All"],
    [false, "Unread"],
    [true, "Read"],
  ];

  return (
    <div className="notif-controls">
      {searchEnabled && (
        <div className="notif-search-control">
          <label htmlFor="notif-search" className="notif-control-label">
            Search
          </label>
          <input
            id="notif-search"
            type="search"
            className="notif-search-input"
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Search notifications..."
          />
        </div>
      )}

      <div className="notif-filter-control">
        <span className="notif-control-label">Filter:</span>
        <div
          className="notif-filter-buttons"
          role="group"
          aria-label="Filter by read status"
        >
          {readOptions.map(([value, label]) => (
            <button
              key={label}
              type="button"
              className={`notif-filter-btn ${read === value ? "active" : ""}`}
              onClick={() => onReadChange?.(value)}
              aria-pressed={read === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="notif-limit-control">
        <label htmlFor="notif-limit" className="notif-control-label">
          Results per page:
        </label>
        <select
          id="notif-limit"
          className="notif-limit-select"
          value={limit}
          onChange={(event) => onLimitChange?.(Number(event.target.value))}
        >
          {VALID_LIMITS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
