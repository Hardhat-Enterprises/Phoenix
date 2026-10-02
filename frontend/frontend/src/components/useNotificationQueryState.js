import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// The notification panel's search, read filter, page and page size, kept in the
// URL so a view can be linked to and survives a reload or a back button.
//
// The parameter names and validation rules are the ones the panel already used:
// ?search=, ?read=true|false, ?page=, ?limit= with a fixed set of page sizes.
// ---------------------------------------------------------------------------

export const VALID_LIMITS = [10, 20, 50, 100];
export const DEFAULT_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 300;

// read is tri-state in the URL too: absent means every notification.
const parseRead = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const parseQueryString = (search = window.location.search) => {
  const params = new URLSearchParams(search);
  const page = Number.parseInt(params.get("page") || "1", 10);
  const limit = Number.parseInt(params.get("limit") || String(DEFAULT_LIMIT), 10);

  return {
    search: params.get("search") || "",
    read: parseRead(params.get("read")),
    // A hand-edited URL is not trusted: both numbers are clamped to something
    // the panel can actually render.
    page: Number.isFinite(page) ? Math.max(1, page) : 1,
    limit: VALID_LIMITS.includes(limit) ? limit : DEFAULT_LIMIT,
  };
};

const writeQueryString = (state) => {
  const params = new URLSearchParams(window.location.search);

  if (state.search) {
    params.set("search", state.search);
  } else {
    params.delete("search");
  }

  if (state.read === true || state.read === false) {
    params.set("read", String(state.read));
  } else {
    params.delete("read");
  }

  if (state.page > 1) {
    params.set("page", String(state.page));
  } else {
    params.delete("page");
  }

  if (state.limit !== DEFAULT_LIMIT) {
    params.set("limit", String(state.limit));
  } else {
    params.delete("limit");
  }

  const queryString = params.toString();
  const nextUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  // replaceState, not pushState: changing a filter should not add a history
  // entry the reader has to press Back through.
  window.history.replaceState({}, "", nextUrl);
};

export const useNotificationQueryState = () => {
  // Read once, lazily, from the URL. Reading it in an effect instead would
  // render the default state first and then immediately replace it.
  const [state, setState] = useState(() => parseQueryString());
  // What is in the search box right now, before the debounce lets it through.
  const [searchInput, setSearchInput] = useState(state.search);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handlePopState = () => {
      const next = parseQueryString();
      setState(next);
      setSearchInput(next.search);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync the URL to the state. The history API is the external system here,
  // which is what an effect is for.
  useEffect(() => {
    writeQueryString(state);
  }, [state]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const changeSearch = useCallback((value) => {
    setSearchInput(value);

    // Typing should not re-filter on every keystroke.
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // A new search starts at the first page, or the reader lands on a page
      // that the narrower list no longer has.
      setState((current) => ({ ...current, search: value, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const changeRead = useCallback((read) => {
    setState((current) => ({ ...current, read, page: 1 }));
  }, []);

  const changeLimit = useCallback((limit) => {
    const safeLimit = VALID_LIMITS.includes(Number(limit))
      ? Number(limit)
      : DEFAULT_LIMIT;

    setState((current) => ({ ...current, limit: safeLimit, page: 1 }));
  }, []);

  const changePage = useCallback((page) => {
    setState((current) => ({ ...current, page: Math.max(1, Number(page) || 1) }));
  }, []);

  return {
    ...state,
    searchInput,
    changeSearch,
    changeRead,
    changeLimit,
    changePage,
  };
};

export default useNotificationQueryState;
