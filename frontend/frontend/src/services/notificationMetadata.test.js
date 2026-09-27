import { describe, expect, it } from "vitest";
import {
  METADATA_STATUS,
  labelFromKey,
  parseNotificationMetadata,
  readNotificationMetadata,
} from "./notificationMetadata";

describe("parseNotificationMetadata", () => {
  it("parses metadata supplied as a JSON string", () => {
    const parsed = parseNotificationMetadata(
      '{"source_ip":"10.0.0.41","confidence":0.94}',
    );

    expect(parsed.status).toBe(METADATA_STATUS.OBJECT);
    expect(parsed.malformed).toBe(false);
    expect(parsed.entries).toEqual([
      { key: "source_ip", label: "Source IP", value: "10.0.0.41" },
      { key: "confidence", label: "Confidence", value: "0.94" },
    ]);
  });

  it("accepts metadata already supplied as an object", () => {
    const parsed = parseNotificationMetadata({ host: "db-1", riskScore: 72 });

    expect(parsed.status).toBe(METADATA_STATUS.OBJECT);
    expect(parsed.entries.map((entry) => entry.label)).toEqual([
      "Host",
      "Risk Score",
    ]);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
    ["whitespace", "   "],
    ["an empty object", {}],
    ["an empty array", []],
    ["a function", () => {}],
  ])("reports %s as empty", (_label, value) => {
    const parsed = parseNotificationMetadata(value);

    expect(parsed.status).toBe(METADATA_STATUS.EMPTY);
    expect(parsed.entries).toEqual([]);
    expect(parsed.isEmpty).toBe(true);
  });

  it("flags a truncated JSON string as malformed and keeps the raw text", () => {
    const parsed = parseNotificationMetadata('{"queue":"ingest-core","depth":');

    expect(parsed.status).toBe(METADATA_STATUS.MALFORMED);
    expect(parsed.malformed).toBe(true);
    expect(parsed.entries).toEqual([]);
    expect(parsed.raw).toBe('{"queue":"ingest-core","depth":');
  });

  it("treats a string that was never JSON as plain text rather than an error", () => {
    const parsed = parseNotificationMetadata("host db-1 is unreachable");

    expect(parsed.status).toBe(METADATA_STATUS.TEXT);
    expect(parsed.malformed).toBe(false);
    expect(parsed.entries[0].value).toBe("host db-1 is unreachable");
  });

  it("survives a circular object", () => {
    const circular = { host: "db-1" };
    circular.self = circular;

    const parsed = parseNotificationMetadata(circular);

    expect(parsed.status).toBe(METADATA_STATUS.OBJECT);
    expect(parsed.entries[0]).toEqual({
      key: "host",
      label: "Host",
      value: "db-1",
    });
    expect(parsed.entries[1].value).toContain("[circular]");
  });

  it("survives a property whose getter throws", () => {
    const hostile = Object.defineProperty({ host: "db-1" }, "boom", {
      enumerable: true,
      get() {
        throw new Error("nope");
      },
    });

    expect(() => parseNotificationMetadata(hostile)).not.toThrow();
    expect(parseNotificationMetadata(hostile).entries).toHaveLength(1);
  });

  it("skips null and empty values inside otherwise usable metadata", () => {
    const parsed = parseNotificationMetadata({
      host: "db-1",
      cleared: null,
      note: "   ",
      nested: {},
    });

    expect(parsed.entries.map((entry) => entry.key)).toEqual(["host"]);
  });

  it("caps a hostile number of keys and reports what it held back", () => {
    const wide = {};

    for (let index = 0; index < 30; index += 1) {
      wide[`key${index}`] = `value ${index}`;
    }

    const parsed = parseNotificationMetadata(wide);

    expect(parsed.entries).toHaveLength(20);
    expect(parsed.hiddenCount).toBe(10);
  });

  it("reads a JSON list", () => {
    const parsed = parseNotificationMetadata("[\"alpha\",\"beta\"]");

    expect(parsed.status).toBe(METADATA_STATUS.LIST);
    expect(parsed.entries).toEqual([
      { key: "0", label: "Item 1", value: "alpha" },
      { key: "1", label: "Item 2", value: "beta" },
    ]);
  });
});

describe("labelFromKey", () => {
  it.each([
    ["source_ip", "Source IP"],
    ["sourceIp", "Source IP"],
    ["source-ip", "Source IP"],
    ["cve", "CVE"],
    ["riskScore", "Risk Score"],
  ])("turns %s into %s", (key, expected) => {
    expect(labelFromKey(key)).toBe(expected);
  });
});

describe("readNotificationMetadata", () => {
  it("finds metadata under any of the accepted aliases", () => {
    expect(readNotificationMetadata({ meta: { host: "db-1" } }).entries).toHaveLength(1);
    expect(readNotificationMetadata({ context: '{"a":1}' }).entries).toHaveLength(1);
  });

  it("does not claim the message body as metadata", () => {
    expect(readNotificationMetadata({ details: "a long message" }).isEmpty).toBe(true);
  });

  it("returns empty metadata for a non-record", () => {
    expect(readNotificationMetadata(null).isEmpty).toBe(true);
    expect(readNotificationMetadata("nope").isEmpty).toBe(true);
  });
});
