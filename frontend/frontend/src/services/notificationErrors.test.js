import { describe, expect, it } from "vitest";
import {
  classifyNotificationError,
  describeMutationFailure,
  NOTIFICATION_ERROR_CATEGORIES,
  NOTIFICATION_ERROR_KINDS,
  NOTIFICATION_RECOVERY,
} from "./notificationErrors";

const apiError = (status, message = "Request failed", data) =>
  Object.assign(new Error(message), { status, data });

const codedError = (code, message = "Notification failure") =>
  Object.assign(new Error(message), { code });

describe("classifyNotificationError", () => {
  it("normalises missing login as authentication requiring sign in", () => {
    const result = classifyNotificationError(
      codedError("MISSING_LOGIN", "Please sign in"),
    );

    expect(result.kind).toBe(NOTIFICATION_ERROR_KINDS.MISSING_LOGIN);
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.AUTHENTICATION,
    );
    expect(result.requiresSignIn).toBe(true);
    expect(result.retryable).toBe(false);
    expect(result.recovery).toBe(NOTIFICATION_RECOVERY.SIGN_IN);
  });

  it("normalises an expired REST session without exposing the token", () => {
    const secret = "eyJhbGciOiJIUzI1NiJ9.secret-token";
    const result = classifyNotificationError(
      apiError(401, `Invalid token ${secret}`),
    );

    expect(result.kind).toBe(NOTIFICATION_ERROR_KINDS.UNAUTHORISED);
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.AUTHENTICATION,
    );
    expect(result.message).toBe(
      "Your session has expired. Sign in again.",
    );
    expect(result.message).not.toContain(secret);
    expect(result.requiresSignIn).toBe(true);
    expect(result.retryable).toBe(false);
  });

  it("normalises forbidden access as permanent and non-retryable", () => {
    const result = classifyNotificationError(apiError(403));

    expect(result.kind).toBe(NOTIFICATION_ERROR_KINDS.FORBIDDEN);
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.AUTHORISATION,
    );
    expect(result.requiresSignIn).toBe(false);
    expect(result.retryable).toBe(false);
    expect(result.recovery).toBe(NOTIFICATION_RECOVERY.NONE);
  });

  it("normalises an unavailable notification endpoint as retryable", () => {
    const result = classifyNotificationError(
      codedError("NOTIFICATION_ENDPOINT_UNAVAILABLE"),
    );

    expect(result.kind).toBe(
      NOTIFICATION_ERROR_KINDS.ENDPOINT_UNAVAILABLE,
    );
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.CONNECTION,
    );
    expect(result.retryable).toBe(true);
    expect(result.requiresSignIn).toBe(false);
  });

  it("distinguishes notification not found from endpoint unavailable", () => {
    const result = classifyNotificationError(
      apiError(404, "Notification not found"),
    );

    expect(result.kind).toBe(NOTIFICATION_ERROR_KINDS.NOT_FOUND);
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.NOT_FOUND,
    );
    expect(result.retryable).toBe(false);
    expect(result.requiresSignIn).toBe(false);
  });

  it("normalises rate limiting as retryable", () => {
    const result = classifyNotificationError(
      apiError(429, "Too many requests"),
    );

    expect(result.kind).toBe(
      NOTIFICATION_ERROR_KINDS.RATE_LIMITED,
    );
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.RATE_LIMIT,
    );
    expect(result.retryable).toBe(true);
    expect(result.requiresSignIn).toBe(false);
  });

  it("normalises network failure as temporary and retryable", () => {
    const result = classifyNotificationError(
      new Error("Failed to fetch notification data"),
    );

    expect(result.kind).toBe(NOTIFICATION_ERROR_KINDS.NETWORK);
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.CONNECTION,
    );
    expect(result.retryable).toBe(true);
    expect(result.requiresSignIn).toBe(false);
  });

  it("recognises the existing malformed REST notification response", () => {
    const result = classifyNotificationError(
      new Error("Notification list response is malformed."),
    );

    expect(result.kind).toBe(
      NOTIFICATION_ERROR_KINDS.MALFORMED_REST_RESPONSE,
    );
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.RESPONSE,
    );
    expect(result.retryable).toBe(true);
  });

  it("normalises malformed WebSocket messages", () => {
    const result = classifyNotificationError(
      codedError("WS_MALFORMED_MESSAGE"),
    );

    expect(result.kind).toBe(
      NOTIFICATION_ERROR_KINDS.MALFORMED_WEBSOCKET_MESSAGE,
    );
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.RESPONSE,
    );
    expect(result.retryable).toBe(true);
  });

  it("normalises WebSocket authentication rejection", () => {
    const result = classifyNotificationError(
      codedError("WS_AUTH_REJECTED"),
    );

    expect(result.kind).toBe(
      NOTIFICATION_ERROR_KINDS.WEBSOCKET_AUTH_REJECTED,
    );
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.AUTHENTICATION,
    );
    expect(result.requiresSignIn).toBe(true);
    expect(result.retryable).toBe(false);
    expect(result.recovery).toBe(NOTIFICATION_RECOVERY.SIGN_IN);
  });

  it("normalises WebSocket authentication timeout as retryable connection loss", () => {
    const result = classifyNotificationError(
      codedError("WS_AUTH_TIMEOUT"),
    );

    expect(result.kind).toBe(
      NOTIFICATION_ERROR_KINDS.WEBSOCKET_AUTH_TIMEOUT,
    );
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.CONNECTION,
    );
    expect(result.requiresSignIn).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.recovery).toBe(NOTIFICATION_RECOVERY.RETRY);
    expect(result.message).toBe(
      "The notification connection could not verify your session in time. You can retry the connection.",
    );
  });

  it("normalises unexpected WebSocket closure as retryable", () => {
    const result = classifyNotificationError(
      codedError("WS_UNEXPECTED_CLOSE"),
    );

    expect(result.kind).toBe(
      NOTIFICATION_ERROR_KINDS.WEBSOCKET_CLOSED,
    );
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.CONNECTION,
    );
    expect(result.retryable).toBe(true);
    expect(result.requiresSignIn).toBe(false);
  });

  it("normalises unsupported WebSocket messages without retrying", () => {
    const result = classifyNotificationError(
      codedError("WS_UNSUPPORTED_MESSAGE"),
    );

    expect(result.kind).toBe(
      NOTIFICATION_ERROR_KINDS.UNSUPPORTED_WEBSOCKET_MESSAGE,
    );
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.RESPONSE,
    );
    expect(result.retryable).toBe(false);
    expect(result.recovery).toBe(NOTIFICATION_RECOVERY.NONE);
  });

  it("keeps validation failures safe and retryable", () => {
    const result = classifyNotificationError(
      apiError(422, "Bearer secret-access-token", {
        errors: ["internal validation stack"],
      }),
    );

    expect(result.kind).toBe(
      NOTIFICATION_ERROR_KINDS.VALIDATION,
    );
    expect(result.retryable).toBe(true);
    expect(result.message).not.toContain("secret-access-token");
    expect(result.message).not.toContain("internal validation stack");
  });

  it("normalises server failures as retryable", () => {
    const result = classifyNotificationError(
      apiError(503, "Database connection stack trace"),
    );

    expect(result.kind).toBe(NOTIFICATION_ERROR_KINDS.SERVER);
    expect(result.category).toBe(
      NOTIFICATION_ERROR_CATEGORIES.SERVER,
    );
    expect(result.retryable).toBe(true);
    expect(result.requiresSignIn).toBe(false);
    expect(result.message).not.toContain("Database");
    expect(result.message).not.toContain("stack trace");
  });

  it("does not expose raw unknown errors, stack traces, or access tokens", () => {
    const secret = "ACCESS_TOKEN_DO_NOT_DISPLAY";
    const error = new Error(
      `Unexpected failure ${secret}\n at notificationSocket.js:99`,
    );

    error.stack =
      `Error: Unexpected failure ${secret}\n` +
      "at notificationSocket.js:99:1";

    const result = classifyNotificationError(error);

    expect(result.kind).toBe(NOTIFICATION_ERROR_KINDS.UNKNOWN);
    expect(result.message).toBe(
      "An unexpected notification error occurred. Try again.",
    );
    expect(result.message).not.toContain(secret);
    expect(result.message).not.toContain("notificationSocket.js");
    expect(result.message).not.toContain("at ");
  });

  it("never throws when no Error object is supplied", () => {
    expect(() => classifyNotificationError(null)).not.toThrow();

    const result = classifyNotificationError(null);

    expect(result.kind).toBe(NOTIFICATION_ERROR_KINDS.UNKNOWN);
    expect(result.retryable).toBe(true);
    expect(result.requiresSignIn).toBe(false);
  });

  it("keeps backwards-compatible recovery fields for NotificationList", () => {
    const authentication = classifyNotificationError(apiError(401));
    const network = classifyNotificationError(
      new Error("Network failure"),
    );

    expect(authentication.needsSignIn).toBe(
      authentication.requiresSignIn,
    );
    expect(authentication.canRetry).toBe(
      authentication.retryable,
    );

    expect(network.needsSignIn).toBe(network.requiresSignIn);
    expect(network.canRetry).toBe(network.retryable);
  });
});

describe("describeMutationFailure", () => {
  it("states that a failed mutation did not succeed", () => {
    const failure = describeMutationFailure(
      "markRead",
      apiError(503),
    );

    expect(failure.message).toContain(
      "Could not mark that notification as read",
    );
    expect(failure.message).toContain("Nothing was changed.");
    expect(failure.retryable).toBe(true);
  });

  it("directs an expired session to sign in without exposing raw details", () => {
    const secret = "private-token";

    const failure = describeMutationFailure(
      "delete",
      apiError(401, `Invalid token ${secret}`),
    );

    expect(failure.requiresSignIn).toBe(true);
    expect(failure.retryable).toBe(false);
    expect(failure.message).toContain(
      "your session has expired",
    );
    expect(failure.message).toContain(
      "Sign in again",
    );
    expect(failure.message).toContain(
      "Nothing was changed",
    );
    expect(failure.message).not.toContain(secret);
  });

  it("does not offer automatic retry for permanent failures", () => {
    const forbidden = describeMutationFailure(
      "delete",
      apiError(403),
    );

    const missing = describeMutationFailure(
      "delete",
      apiError(404),
    );

    expect(forbidden.retryable).toBe(false);
    expect(missing.retryable).toBe(false);
  });

  it("still produces safe wording for an unknown mutation action", () => {
    const failure = describeMutationFailure(
      "unknown-action",
      apiError(503),
    );

    expect(failure.message).toContain("complete that change");
    expect(failure.message).toContain("Nothing was changed.");
  });
});