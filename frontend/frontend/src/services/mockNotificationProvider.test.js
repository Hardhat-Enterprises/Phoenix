import { describe, expect, it } from "vitest";
import {
  createMockNotificationProvider,
  createMockNotifications,
} from "./mockNotificationProvider";
import { adaptNotifications } from "./notificationAdapter";

describe("createMockNotificationProvider", () => {
  it("never claims to persist", () => {
    const provider = createMockNotificationProvider();

    expect(provider.persists).toBe(false);
    expect(provider.isMock).toBe(true);
  });

  it("serves records that exercise every metadata shape", async () => {
    const { items } = await createMockNotificationProvider().list();
    const adapted = adaptNotifications(items);

    const statuses = adapted.map((item) => item.metadata.status);

    expect(statuses).toContain("object");
    expect(statuses).toContain("malformed");
    expect(statuses).toContain("empty");
  });

  it("includes a record whose timestamp cannot be parsed", async () => {
    const { items } = await createMockNotificationProvider().list();

    expect(
      adaptNotifications(items).some((item) => item.createdAtRaw !== ""),
    ).toBe(true);
  });

  it("marks one record read in its own memory", async () => {
    const provider = createMockNotificationProvider();

    await provider.markRead("mock-1");
    const { items } = await provider.list();

    expect(items.find((item) => item.id === "mock-1").read).toBe(true);
    expect(items.find((item) => item.id === "mock-2").read).toBe(false);
  });

  it("marks every record read", async () => {
    const provider = createMockNotificationProvider();

    const result = await provider.markAllRead();
    const { items } = await provider.list();

    expect(result.updated).toBe(items.length);
    expect(items.every((item) => item.read)).toBe(true);
  });

  it("removes only the named record", async () => {
    const provider = createMockNotificationProvider();
    const before = (await provider.list()).items.length;

    await provider.remove("mock-2");
    const { items } = await provider.list();

    expect(items).toHaveLength(before - 1);
    expect(items.some((item) => item.id === "mock-2")).toBe(false);
  });

  it("rejects for a record it does not hold", async () => {
    await expect(
      createMockNotificationProvider().remove("nope"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("can be told to fail an operation, which is how the error states are demonstrated", async () => {
    const provider = createMockNotificationProvider({
      failOn: { markRead: { status: 401, message: "Invalid token" } },
    });

    await expect(provider.markRead("mock-1")).rejects.toMatchObject({
      status: 401,
    });
    // The failed operation changed nothing.
    expect((await provider.list()).items[0].read).toBe(false);
  });

  it("accepts an injected seed", async () => {
    const provider = createMockNotificationProvider({
      seed: [{ id: "only", title: "Only one" }],
    });

    expect((await provider.list()).items).toHaveLength(1);
  });

  it("seeds timestamps relative to the supplied clock", () => {
    const now = Date.parse("2026-09-14T12:00:00.000Z");
    const [newest] = createMockNotifications(now);

    expect(newest.created_at).toBeLessThan(now);
    expect(newest.created_at).toBeGreaterThan(now - 60 * 60 * 1000);
  });
});
