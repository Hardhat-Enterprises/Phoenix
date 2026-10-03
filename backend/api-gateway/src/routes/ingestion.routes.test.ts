import { AddressInfo } from "net";
import { Server } from "http";
import express from "express";
import jwt from "jsonwebtoken";

// Security regression tests for the RBAC checks on the ingestion routes.
// Finding SVC-03 in cyber/threat-analysis-integration/sprint-2/Implementation_Validation_Report_Vipul.md:
// the routes checked for the role "ingestion service" (with a space), but the only role
// a user can be registered with is UserRole.INGESTION_SERVICE = "ingestion_service".

const TEST_SECRET = "test-only-jwt-secret";
process.env.AUTH_JWT_SECRET = TEST_SECRET;

const mockFindByPk = jest.fn();

jest.mock("@phoenix/common", () => ({
  HttpStatusCode: jest.requireActual("@phoenix/common/constant/HttpStatusCode").HttpStatusCode,
  UserRole: jest.requireActual("@phoenix/common/constant/user-role").UserRole,
  UserAccount: { findByPk: (...args: unknown[]) => mockFindByPk(...args) },
}));

// Silence the console-based security event logger during tests.
jest.mock("../notifications/notificationService", () => ({
  sendSecurityNotification: jest.fn(),
}));

// The controllers publish to RabbitMQ; replace them with stubs so the tests
// only exercise the authentication and authorisation middleware.
jest.mock("../controllers/ingestion.controller", () => {
  const accepted = (_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) =>
    res.status(202).json({ message: "accepted" });
  return {
    getHealth: accepted,
    ingestHazardData: accepted,
    ingestCyberData: accepted,
    coreModelIntegration: accepted,
  };
});

// eslint-disable-next-line import/first
import ingestionRoutes from "./ingestion.routes";

let server: Server;
let baseUrl: string;

const tokenFor = (userId: string, role: string) => {
  const token = jwt.sign({ user_id: userId, role }, TEST_SECRET, { expiresIn: "5m" });
  // authenticate() checks that the token is the one currently stored for the user.
  mockFindByPk.mockImplementation(async (id: string) =>
    id === userId ? { user_id: userId, access_token: token } : null,
  );
  return token;
};

const post = (path: string, token?: string) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ event_id: "EVT-001" }),
  });

beforeAll((done) => {
  const app = express();
  app.use(express.json());
  app.use("/api/ingestion", ingestionRoutes);
  server = app.listen(0, () => {
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

describe.each(["/api/ingestion/hazard", "/api/ingestion/cyber"])("POST %s", (path) => {
  it("returns 401 when no token is sent", async () => {
    const res = await post(path);
    expect(res.status).toBe(401);
  });

  it("returns 403 for an end_user token", async () => {
    const res = await post(path, tokenFor("user-1", "end_user"));
    expect(res.status).toBe(403);
  });

  it("returns 403 for an analyst token", async () => {
    const res = await post(path, tokenFor("user-2", "analyst"));
    expect(res.status).toBe(403);
  });

  it("accepts a token for the registered ingestion_service role", async () => {
    const res = await post(path, tokenFor("svc-1", "ingestion_service"));
    expect(res.status).toBe(202);
  });

  it("rejects the old role string 'ingestion service', which no user can be registered with", async () => {
    const res = await post(path, tokenFor("svc-2", "ingestion service"));
    expect(res.status).toBe(403);
  });
});
