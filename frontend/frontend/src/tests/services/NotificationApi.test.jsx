import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import {
  deleteNotification,
  getNotificationHealth,
  getNotifications,
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/phoenixApi.js";
import {
  API_GATEWAY_URL,
  AUTH_STORAGE_KEY,
} from "../../services/authApi.js";
import { mockAuthSession } from "../../mocks/data.js";
import { server } from "../../mocks/handler.js";

const notificationUrl = (path = "") =>
  `${API_GATEWAY_URL}/api/notifications${path}`;

const listResponse = ({ notifications = [], pagination } = {}) => ({
  data: {
    notifications,
    pagination: pagination || {
      total: notifications.length,
      page: 1,
      limit: 10,
      totalPages: notifications.length > 0 ? 1 : 0,
    },
  },
});

describe("notification API", () => {
  beforeEach(() => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));
  });

  describe("health", () => {
    const healthResponse = {
      status: 200,
      message: "Notification service is running",
    };

    it.each([
      ["signed in", false],
      ["signed out", true],
    ])("uses the public health path with no Authorization when %s", async (_label, signOut) => {
      let requestPath;
      let authorization;

      server.use(
        http.get(notificationUrl("/health"), ({ request }) => {
          requestPath = new URL(request.url).pathname;
          authorization = request.headers.get("Authorization");
          return HttpResponse.json(healthResponse);
        }),
      );

      if (signOut) {
        localStorage.clear();
      }

      await expect(getNotificationHealth()).resolves.toEqual(healthResponse);
      expect(requestPath).toBe("/api/notifications/health");
      expect(authorization).toBeNull();
    });
  });

  describe("list", () => {
    it("sends the JWT and normalizes notifications and pagination", async () => {
      const notifications = [{ id: "notification-1", title: "Critical event" }];
      const pagination = {
        total: 21,
        page: 2,
        limit: 20,
        totalPages: 2,
      };
      let authorization;
      let requestUrl;

      server.use(
        http.get(notificationUrl(), ({ request }) => {
          authorization = request.headers.get("Authorization");
          requestUrl = new URL(request.url);
          return HttpResponse.json(listResponse({ notifications, pagination }));
        }),
      );

      const result = await getNotifications({
        page: 2,
        limit: 20,
        read: false,
      });

      expect(authorization).toBe(`Bearer ${mockAuthSession.accessToken}`);
      expect(requestUrl.pathname).toBe("/api/notifications");
      expect(requestUrl.search).toBe("?page=2&limit=20&read=false");
      expect(result).toEqual({
        notifications,
        pagination,
        items: notifications,
        total: pagination.total,
        totalPages: pagination.totalPages,
      });
      expect(result).not.toHaveProperty("page");
      expect(result).not.toHaveProperty("limit");
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(20);
    });

    it("normalizes an empty list", async () => {
      server.use(
        http.get(notificationUrl(), () => HttpResponse.json(listResponse())),
      );

      await expect(getNotifications()).resolves.toEqual({
        notifications: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
        items: [],
        total: 0,
        totalPages: 0,
      });
    });

    it("omits All, empty, unsupported, and default-disabled search parameters", async () => {
      let requestUrl;

      server.use(
        http.get(notificationUrl(), ({ request }) => {
          requestUrl = new URL(request.url);
          return HttpResponse.json(listResponse());
        }),
      );

      await getNotifications({
        page: 1,
        limit: "",
        read: null,
        search: "critical",
        unsupported: "value",
      });

      expect(requestUrl.search).toBe("?page=1");
      expect(requestUrl.searchParams.has("read")).toBe(false);
      expect(requestUrl.searchParams.has("search")).toBe(false);
      expect(requestUrl.searchParams.has("unsupported")).toBe(false);
    });

    it("keeps search off when enabled without a confirmed parameter name", async () => {
      let requestUrl;

      server.use(
        http.get(notificationUrl(), ({ request }) => {
          requestUrl = new URL(request.url);
          return HttpResponse.json(listResponse());
        }),
      );

      await getNotifications(
        { search: "critical" },
        { search: { enabled: true, parameterName: null } },
      );

      expect(requestUrl.search).toBe("");
    });

    it.each([
      [
        "page",
        { page: 0 },
        "?page=0",
        "Query parameter 'page' must be a positive integer",
      ],
      [
        "limit",
        { limit: 101 },
        "?limit=101",
        "Query parameter 'limit' must be a positive integer between 1 and 100",
      ],
      [
        "read",
        { read: "all" },
        "?read=all",
        "Query parameter 'read' must be either 'true' or 'false'",
      ],
    ])(
      "preserves the exact 400 response for an invalid %s query",
      async (_field, params, query, message) => {
        const response = { message };

        server.use(
          http.get(notificationUrl(), () =>
            HttpResponse.json(response, { status: 400 }),
          ),
        );

        await expect(getNotifications(params)).rejects.toMatchObject({
          message,
          status: 400,
          data: response,
          path: `/api/notifications${query}`,
        });
      },
    );

    it("reports an unauthorised response through existing session recovery", async () => {
      const sessionWithoutRefresh = {
        ...mockAuthSession,
        refreshToken: undefined,
        refresh_token: undefined,
      };
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(sessionWithoutRefresh),
      );

      server.use(
        http.get(notificationUrl(), () =>
          HttpResponse.json({ message: "Invalid token" }, { status: 401 }),
        ),
      );

      await expect(getNotifications()).rejects.toMatchObject({
        status: 401,
        code: "AUTH_SESSION_EXPIRED",
      });
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });

    it("preserves server status and message", async () => {
      server.use(
        http.get(notificationUrl(), () =>
          HttpResponse.json(
            { message: "Notification service unavailable" },
            { status: 503 },
          ),
        ),
      );

      await expect(getNotifications()).rejects.toMatchObject({
        message: "Notification service unavailable",
        status: 503,
      });
    });

    it.each([
      {},
      { data: {} },
      { data: { notifications: {}, pagination: {} } },
      { data: { notifications: [], pagination: { total: 0 } } },
    ])("rejects a malformed successful list %#", async (response) => {
      server.use(
        http.get(notificationUrl(), () => HttpResponse.json(response)),
      );

      await expect(getNotifications()).rejects.toThrow(
        "Notification list response is malformed.",
      );
    });
  });

  describe("unread count and mutations", () => {
    it("gets the nested unread count with a JWT", async () => {
      let authorization;

      server.use(
        http.get(notificationUrl("/unread-count"), ({ request }) => {
          authorization = request.headers.get("Authorization");
          return HttpResponse.json({ data: { unreadCount: 4 } });
        }),
      );

      await expect(getNotificationUnreadCount()).resolves.toBe(4);
      expect(authorization).toBe(`Bearer ${mockAuthSession.accessToken}`);
    });

    it("PATCHes mark-one and returns its payload unchanged", async () => {
      const response = {
        status: 200,
        message: "Notification marked as read",
        data: { notification: { id: "notification /1", read: true } },
      };
      let authorization;
      let requestPath;

      server.use(
        http.patch(
          notificationUrl("/notification%20%2F1/read"),
          ({ request }) => {
            authorization = request.headers.get("Authorization");
            requestPath = new URL(request.url).pathname;
            return HttpResponse.json(response);
          },
        ),
      );

      await expect(markNotificationRead("notification /1")).resolves.toEqual(
        response,
      );
      expect(requestPath).toBe(
        "/api/notifications/notification%20%2F1/read",
      );
      expect(authorization).toBe(`Bearer ${mockAuthSession.accessToken}`);
    });

    it("PATCHes mark-all and returns its payload unchanged", async () => {
      const response = {
        status: 200,
        message: "All notifications marked as read",
        data: { updatedCount: 3 },
      };
      let authorization;

      server.use(
        http.patch(notificationUrl("/read-all"), ({ request }) => {
          authorization = request.headers.get("Authorization");
          return HttpResponse.json(response);
        }),
      );

      await expect(markAllNotificationsRead()).resolves.toEqual(response);
      expect(authorization).toBe(`Bearer ${mockAuthSession.accessToken}`);
    });

    it("DELETEs one notification and returns the message-only payload", async () => {
      const response = { message: "Notification deleted successfully" };
      let authorization;
      let requestMethod;
      let requestPath;

      server.use(
        http.delete(notificationUrl("/notification%20%2F1"), ({ request }) => {
          authorization = request.headers.get("Authorization");
          requestMethod = request.method;
          requestPath = new URL(request.url).pathname;
          return HttpResponse.json(response);
        }),
      );

      await expect(deleteNotification("notification /1")).resolves.toEqual(
        response,
      );
      expect(requestMethod).toBe("DELETE");
      expect(requestPath).toBe(
        "/api/notifications/notification%20%2F1",
      );
      expect(authorization).toBe(`Bearer ${mockAuthSession.accessToken}`);
    });

    it.each([
      ["list", () => getNotifications()],
      ["unread count", () => getNotificationUnreadCount()],
      ["mark one", () => markNotificationRead("notification-1")],
      ["mark all", () => markAllNotificationsRead()],
      ["delete", () => deleteNotification("notification-1")],
    ])("rejects %s before HTTP when no token exists", async (_name, request) => {
      localStorage.clear();
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      try {
        await expect(request()).rejects.toThrow(
          "Please sign in before loading backend data.",
        );
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });

  describe("signals and transport failures", () => {
    it.each([
      [
        "health",
        (signal) => getNotificationHealth({ signal }),
        { status: 200, message: "Notification service is running" },
      ],
      [
        "list",
        (signal) => getNotifications({}, { signal }),
        listResponse(),
      ],
      [
        "unread count",
        (signal) => getNotificationUnreadCount({ signal }),
        { data: { unreadCount: 4 } },
      ],
      [
        "mark one",
        (signal) => markNotificationRead("notification-1", { signal }),
        {
          status: 200,
          message: "Notification marked as read",
          data: { notification: { id: "notification-1", read: true } },
        },
      ],
      [
        "mark all",
        (signal) => markAllNotificationsRead({ signal }),
        {
          status: 200,
          message: "All notifications marked as read",
          data: { updatedCount: 1 },
        },
      ],
      [
        "delete",
        (signal) => deleteNotification("notification-1", { signal }),
        { message: "Notification deleted successfully" },
      ],
    ])("forwards the supplied signal for %s", async (_name, request, response) => {
      const controller = new AbortController();
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(response), { status: 200 }),
        );

      try {
        await request(controller.signal);
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ signal: controller.signal }),
        );
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it("preserves an identifiable cancellation", async () => {
      const controller = new AbortController();
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementationOnce(
          (_url, { signal }) =>
            new Promise((_resolve, reject) => {
              signal.addEventListener(
                "abort",
                () => reject(signal.reason),
                { once: true },
              );
            }),
        );

      try {
        const pending = getNotifications({}, { signal: controller.signal });
        controller.abort();

        await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it("keeps genuine network failures on the existing network-error path", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new TypeError("Synthetic network failure"));

      try {
        await expect(getNotifications()).rejects.toThrow(
          "Could not reach the PHOENIX API gateway",
        );
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });
});
