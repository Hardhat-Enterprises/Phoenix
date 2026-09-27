import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationControls from "./NotificationControls";

const renderControls = (props = {}) => {
  const handlers = {
    onSearchChange: vi.fn(),
    onReadChange: vi.fn(),
    onLimitChange: vi.fn(),
  };

  const utils = render(
    <NotificationControls limit={10} {...handlers} {...props} />,
  );

  return { ...utils, ...handlers, user: userEvent.setup() };
};

describe("search box", () => {
  it("stays hidden while search is not supported", () => {
    renderControls();

    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("appears, labelled, when search is enabled", async () => {
    const { user, onSearchChange } = renderControls({
      searchEnabled: true,
      searchValue: "",
    });

    const box = screen.getByRole("searchbox", { name: "Search" });
    await user.type(box, "ran");

    expect(onSearchChange).toHaveBeenCalledWith("r");
    expect(onSearchChange).toHaveBeenCalledTimes(3);
  });
});

describe("read filter", () => {
  it("offers all three states and marks the active one", () => {
    renderControls({ read: false });

    const group = screen.getByRole("group", { name: "Filter by read status" });
    const buttons = screen.getAllByRole("button");

    expect(group).toBeTruthy();
    expect(buttons.map((button) => button.textContent)).toEqual([
      "All",
      "Unread",
      "Read",
    ]);
    // aria-pressed carries the state, so it is not signalled by colour alone.
    expect(
      screen.getByRole("button", { name: "Unread" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it.each([
    ["All", null],
    ["Unread", false],
    ["Read", true],
  ])("reports %s as %j", async (label, expected) => {
    const { user, onReadChange } = renderControls({ read: "unset" });

    await user.click(screen.getByRole("button", { name: label }));

    expect(onReadChange).toHaveBeenCalledWith(expected);
  });
});

describe("page size", () => {
  it("offers the supported sizes and reports a number", async () => {
    const { user, onLimitChange } = renderControls({ limit: 10 });

    const select = screen.getByRole("combobox", { name: "Results per page:" });
    expect(
      [...select.options].map((option) => option.value),
    ).toEqual(["10", "20", "50", "100"]);

    await user.selectOptions(select, "50");

    expect(onLimitChange).toHaveBeenCalledWith(50);
  });
});

describe("without handlers", () => {
  it("renders and stays inert rather than throwing", async () => {
    const user = userEvent.setup();
    render(<NotificationControls limit={10} />);

    await user.click(screen.getByRole("button", { name: "Unread" }));

    expect(screen.getByRole("group", { name: "Filter by read status" })).toBeTruthy();
  });
});
