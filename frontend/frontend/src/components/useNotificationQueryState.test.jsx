import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useNotificationQueryState, {
  DEFAULT_LIMIT,
} from "./useNotificationQueryState";

const setUrl = (search) =>
  window.history.replaceState({}, "", `/notifications${search}`);

const currentParams = () =>
  Object.fromEntries(new URLSearchParams(window.location.search));

beforeEach(() => {
  setUrl("");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("reading the URL", () => {
  it("starts from the defaults when the URL carries nothing", () => {
    const { result } = renderHook(() => useNotificationQueryState());

    expect(result.current).toMatchObject({
      search: "",
      read: null,
      page: 1,
      limit: DEFAULT_LIMIT,
    });
  });

  it("restores a linked view", () => {
    setUrl("?search=ransomware&read=false&page=3&limit=50");

    const { result } = renderHook(() => useNotificationQueryState());

    expect(result.current).toMatchObject({
      search: "ransomware",
      searchInput: "ransomware",
      read: false,
      page: 3,
      limit: 50,
    });
  });

  it.each([
    ["?page=0", "page", 1],
    ["?page=-4", "page", 1],
    ["?page=abc", "page", 1],
    ["?limit=7", "limit", DEFAULT_LIMIT],
    ["?limit=nonsense", "limit", DEFAULT_LIMIT],
  ])("clamps a hand-edited %s", (search, field, expected) => {
    setUrl(search);

    const { result } = renderHook(() => useNotificationQueryState());

    expect(result.current[field]).toBe(expected);
  });

  it("treats anything but true or false as no read filter", () => {
    setUrl("?read=maybe");

    expect(renderHook(() => useNotificationQueryState()).result.current.read).toBeNull();
  });
});

describe("writing the URL", () => {
  it("records a filter without adding a history entry", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useNotificationQueryState());

    act(() => result.current.changeRead(true));

    expect(currentParams()).toEqual({ read: "true" });
    expect(pushState).not.toHaveBeenCalled();
  });

  it("leaves default values out of the URL", () => {
    setUrl("?read=true&page=4&limit=50");
    const { result } = renderHook(() => useNotificationQueryState());

    act(() => result.current.changeRead(null));
    act(() => result.current.changeLimit(DEFAULT_LIMIT));

    // read cleared, limit back to default, and page reset by the change.
    expect(currentParams()).toEqual({});
  });

  it("keeps unrelated query parameters", () => {
    setUrl("?tab=alerts");
    const { result } = renderHook(() => useNotificationQueryState());

    act(() => result.current.changeRead(false));

    expect(currentParams()).toEqual({ tab: "alerts", read: "false" });
  });
});

describe("search", () => {
  it("waits for typing to settle before filtering", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNotificationQueryState());

    act(() => result.current.changeSearch("ran"));

    // The box updates at once; the filter does not.
    expect(result.current.searchInput).toBe("ran");
    expect(result.current.search).toBe("");

    act(() => vi.advanceTimersByTime(300));

    expect(result.current.search).toBe("ran");
    expect(currentParams()).toEqual({ search: "ran" });
  });

  it("only applies the last thing typed", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNotificationQueryState());

    act(() => result.current.changeSearch("r"));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current.changeSearch("ran"));
    act(() => vi.advanceTimersByTime(300));

    expect(result.current.search).toBe("ran");
  });
});

describe("page resets", () => {
  it.each([
    ["a new search", (result) => result.changeSearch("x"), true],
    ["a read filter", (result) => result.changeRead(true), false],
    ["a new page size", (result) => result.changeLimit(50), false],
  ])("returns to the first page on %s", (_label, change, needsTimers) => {
    if (needsTimers) vi.useFakeTimers();
    setUrl("?page=5");
    const { result } = renderHook(() => useNotificationQueryState());

    expect(result.current.page).toBe(5);

    act(() => change(result.current));
    if (needsTimers) act(() => vi.advanceTimersByTime(300));

    expect(result.current.page).toBe(1);
  });

  it("changes page without touching the other filters", () => {
    setUrl("?read=false&limit=20");
    const { result } = renderHook(() => useNotificationQueryState());

    act(() => result.current.changePage(3));

    expect(result.current).toMatchObject({ page: 3, read: false, limit: 20 });
  });

  it("refuses a page below the first", () => {
    const { result } = renderHook(() => useNotificationQueryState());

    act(() => result.current.changePage(0));

    expect(result.current.page).toBe(1);
  });
});

describe("browser navigation", () => {
  it("follows the URL when the reader goes back", () => {
    const { result } = renderHook(() => useNotificationQueryState());

    act(() => {
      setUrl("?search=flood&read=true&page=2");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(result.current).toMatchObject({
      search: "flood",
      searchInput: "flood",
      read: true,
      page: 2,
    });
  });
});
