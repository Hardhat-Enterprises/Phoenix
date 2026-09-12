import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";
import { getApiErrorState } from "../utils/apiErrorUtils.js";

test("shared detail API contracts", { concurrency: false }, async (t) => {
  const originalGlobals = new Map(
    ["fetch", "localStorage"].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  const storage = new Map();
  const threat = {
    threat_id: "11111111-1111-4111-8111-111111111111",
    details: { description: "Synthetic threat" },
  };
  const integration = {
    integration_event_id: "22222222-2222-4222-8222-222222222222",
    input: { text: "Synthetic input" },
    output: { risk_level: "low" },
  };
  const requests = [];
  let fetchResponse;
  const respondWith = (body, status = 200) => {
    fetchResponse = async () => new Response(JSON.stringify(body), { status });
  };

  t.beforeEach(() => {
    storage.clear();
    storage.set("phoenixAuth", JSON.stringify({ accessToken: "synthetic-test-token" }));
    requests.length = 0;
    fetchResponse = async () => { throw new Error("Unexpected fetch call"); };
  });

  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      writable: true,
      value: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: (key) => storage.delete(key),
      },
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: async (path, options) => {
        requests.push({ path, options });
        return fetchResponse(path, options);
      },
    });

    const { module: api } = await runnerImport(
      fileURLToPath(new URL("./phoenixApi.js", import.meta.url)),
      {
        root: fileURLToPath(new URL("../../", import.meta.url)),
        configFile: false,
        envDir: false,
        envPrefix: [],
        optimizeDeps: { noDiscovery: true, include: [] },
      },
    );

    await t.test("real detail methods load matching synthetic records", async () => {
      respondWith({ threat });
      const loadedThreat = await api.getThreatById(threat.threat_id);
      respondWith({ integration });
      const loadedIntegration = await api.getIntegrationById(integration.integration_event_id);

      assert.equal(loadedThreat.threat_id, threat.threat_id);
      assert.equal(loadedIntegration.integration_event_id, integration.integration_event_id);
      assert.deepEqual(loadedThreat, threat);
      assert.deepEqual(loadedIntegration, integration);
      assert.deepEqual(requests.map(({ path }) => path), [
        `/api/users/threats/${threat.threat_id}`,
        `/api/users/integration/${integration.integration_event_id}`,
      ]);
    });

    await t.test("getThreat remains the same callable as getThreatById", async () => {
      assert.equal(api.getThreat, api.getThreatById);
      respondWith({ threat });
      assert.deepEqual(await api.getThreat(threat.threat_id), threat);
    });

    const endpoints = [
      { name: "threat", method: api.getThreatById, path: "/api/users/threats", idKey: "threat_id", record: threat },
      { name: "integration", method: api.getIntegrationById, path: "/api/users/integration", idKey: "integration_event_id", record: integration },
    ];
    const errorBodies = [
      ["JSON", (status) => new Response(JSON.stringify({ message: "Synthetic failure" }), { status })],
      ["null", (status) => new Response("null", { status })],
      ["empty", (status) => new Response("", { status })],
      ["non-JSON", (status) => new Response("Synthetic upstream failure", { status })],
      ["unreadable", (status) => ({
        ok: false,
        status,
        statusText: "Synthetic failure",
        text: async () => { throw new Error("Synthetic body read failure"); },
      })],
    ];

    for (const { name, method, path, idKey, record } of endpoints) {
      const id = record[idKey];

      await t.test(`${name}: GET encodes the ID and forwards auth and signal`, async () => {
        const encodedId = "record /?#%";
        const expected = { ...record, [idKey]: encodedId };
        const controller = new AbortController();
        respondWith({ [name]: expected, message: "Synthetic success" });

        assert.deepEqual(await method(encodedId, { signal: controller.signal }), expected);
        assert.equal(requests.length, 1);
        assert.equal(requests[0].path, `${path}/record%20%2F%3F%23%25`);
        assert.equal(requests[0].options.method, "GET");
        assert.equal(requests[0].options.headers.Authorization, "Bearer synthetic-test-token");
        assert.equal(requests[0].options.credentials, "include");
        assert.equal(requests[0].options.signal, controller.signal);
        assert.equal(requests[0].options.body, undefined);
      });

      await t.test(`${name}: UUID identity matching ignores letter case`, async () => {
        const uuid = "abcdefab-abcd-4abc-8abc-abcdefabcdef";
        const expected = { ...record, [idKey]: uuid };
        respondWith({ [name]: expected });
        assert.deepEqual(await method(uuid.toUpperCase()), expected);
      });

      await t.test(`${name}: invalid request IDs fail before fetch`, async () => {
        for (const invalidId of [undefined, null, "", "  ", 42, {}, []]) {
          await assert.rejects(method(invalidId), { code: "INVALID_DETAIL_RESPONSE" });
        }
        assert.equal(requests.length, 0);
      });

      await t.test(`${name}: missing named records return no record`, async () => {
        for (const body of [null, {}, { [name]: null }, { data: { [name]: record } }]) {
          respondWith(body);
          assert.equal(await method(id), null);
        }
      });

      await t.test(`${name}: malformed records and missing or mismatched IDs are rejected`, async () => {
        for (const invalidRecord of [
          [], false, 42, "invalid", {},
          { ...record, [idKey]: null },
          { ...record, [idKey]: 42 },
          { ...record, [idKey]: "" },
          { ...record, [idKey]: "another-record" },
        ]) {
          respondWith({ [name]: invalidRecord });
          await assert.rejects(method(id), (error) => {
            assert.equal(error.code, "INVALID_DETAIL_RESPONSE");
            assert.equal(getApiErrorState(error), "empty");
            return true;
          });
        }
      });

      for (const status of [404, 500]) {
        for (const [bodyName, response] of errorBodies) {
          await t.test(`${name}: HTTP ${status} retains status with a ${bodyName} body`, async () => {
            fetchResponse = async () => response(status);
            await assert.rejects(method(id), (error) => {
              assert.equal(error.status, status);
              assert.equal(error.path, `${path}/${id}`);
              assert.equal(getApiErrorState(error), status === 404 ? "notfound" : "error");
              return true;
            });
          });
        }
      }

      await t.test(`${name}: error status inside an HTTP 200 body is preserved`, async () => {
        respondWith({ status: 404, message: "Synthetic missing record" });
        await assert.rejects(method(id), { status: 404, path: `${path}/${id}` });
      });

      await t.test(`${name}: missing authentication prevents fetch`, async () => {
        storage.clear();
        await assert.rejects(method(id), (error) => {
          assert.equal(error.message, "Please sign in before loading backend data.");
          assert.equal(getApiErrorState(error), "auth");
          return true;
        });
        assert.equal(requests.length, 0);
      });

      for (const message of ["Invalid token", "Logged out"]) {
        await t.test(`${name}: HTTP 401 '${message}' keeps existing session clearing`, async () => {
          respondWith({ message }, 401);
          await assert.rejects(method(id), (error) => {
            assert.equal(error.status, 401);
            assert.equal(getApiErrorState(error), "auth");
            return true;
          });
          assert.equal(storage.get("phoenixAuth"), undefined);
        });
      }

      await t.test(`${name}: HTTP 403 is forbidden and retains the session`, async () => {
        respondWith({ message: "Synthetic forbidden response" }, 403);
        await assert.rejects(method(id), (error) => {
          assert.equal(error.status, 403);
          assert.equal(getApiErrorState(error), "forbidden");
          return true;
        });
        assert.ok(storage.has("phoenixAuth"));
      });

      await t.test(`${name}: network failure becomes a retryable detail error`, async () => {
        fetchResponse = async () => { throw new TypeError("Synthetic network failure"); };
        await assert.rejects(method(id), (error) => {
          assert.match(error.message, /Could not reach the PHOENIX API gateway/);
          assert.equal(error.status, undefined);
          assert.equal(getApiErrorState(error), "error");
          return true;
        });
      });

      await t.test(`${name}: cancellation reaches fetch and keeps the current transport error`, async () => {
        const controller = new AbortController();
        fetchResponse = (_path, { signal }) => new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        });
        const pending = method(id, { signal: controller.signal });
        controller.abort();

        await assert.rejects(pending, /Could not reach the PHOENIX API gateway/);
        assert.equal(requests[0].options.signal, controller.signal);
        assert.equal(controller.signal.aborted, true);
      });

      await t.test(`${name}: a pre-aborted signal is forwarded unchanged`, async () => {
        const controller = new AbortController();
        controller.abort();
        fetchResponse = async (_path, { signal }) => { throw signal.reason; };
        await assert.rejects(method(id, { signal: controller.signal }), /Could not reach/);
        assert.equal(requests[0].options.signal, controller.signal);
      });

      await t.test(`${name}: cancellation while reading an error body preserves the abort`, async () => {
        const controller = new AbortController();
        fetchResponse = async () => ({
          ok: false,
          status: 404,
          text: async () => {
            controller.abort();
            throw controller.signal.reason;
          },
        });
        await assert.rejects(method(id, { signal: controller.signal }), (error) => {
          assert.equal(error, controller.signal.reason);
          assert.equal(controller.signal.aborted, true);
          return true;
        });
      });

      await t.test(`${name}: unreadable successful bodies remain failures`, async () => {
        const bodyError = new Error("Synthetic body read failure");
        fetchResponse = async () => ({
          ok: true,
          status: 200,
          text: async () => { throw bodyError; },
        });
        await assert.rejects(method(id), (error) => {
          assert.equal(error, bodyError);
          assert.equal(getApiErrorState(error), "error");
          return true;
        });
      });
    }

    await t.test("integration: JSON input and output normalize like the list API", async () => {
      respondWith({ integration: {
        ...integration,
        input: JSON.stringify(integration.input),
        output: JSON.stringify(integration.output),
      } });
      assert.deepEqual(await api.getIntegrationById(integration.integration_event_id), integration);
    });

    await t.test("integration: malformed JSON stays readable and JSON null stays null", async () => {
      const expected = { ...integration, input: "{invalid JSON", output: null };
      respondWith({ integration: { ...expected, output: "null" } });
      assert.deepEqual(await api.getIntegrationById(integration.integration_event_id), expected);
    });

    await t.test("unknown errors use the general detail error state", () => {
      assert.equal(getApiErrorState(new Error("Synthetic unexpected failure")), "error");
      assert.equal(getApiErrorState(null), "error");
    });
  } finally {
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete globalThis[name];
      }
    }
  }
});
