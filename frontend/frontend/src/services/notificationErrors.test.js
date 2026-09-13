import { describe, expect, it } from "vitest";
import {
  classifyNotificationError,
  describeMutationFailure,
  NOTIFICATION_ERROR_KINDS,
  NOTIFICATION_RECOVERY,
} from "./notificationErrors";

const apiError = (status, message = "boom", data) =>
  Object.assign(new Error(message), { status, data });

describe("classifyNotificationError", () => {
  it("classifies a rejected request as validation and keeps the field detail", () => {
    const classified = classifyNotificationError(
      apiError(422, "Unprocessable", { errors: ["id must be an integer"] }),
    );

    expect(classified.kind).toBe(NOTIFICATION_ERROR_KINDS.VALIDATION);
    expect(classified.message).toBe("id must be an integer");
    expect(classified.canRetry).toBe(true);
  });

  it("classifies 401 as unauthorised with an authentication recovery", () => {
    const classified = classifyNotificationError(apiError(401, "Invalid token"));

    expect(classified.kind).toBe(NOTIFICATION_ERROR_KINDS.UNAUTHORISED);
    expect(classified.recovery).toBe(NOTIFICATION_RECOVERY.SIGN_IN);
    expect(classified.needsSignIn).toBe(true);
    expect(classified.recoveryLabel).toBe("Sign in again");
  });

  it("classifies 403 as forbidden, also recoverable by signing in", () => {
    expect(classifyNotificationError(apiError(403)).kind).toBe(
      NOTIFICATION_ERROR_KINDS.FORBIDDEN,
    );
    expect(classifyNotificationError(apiError(403)).needsSignIn).toBe(true);
  });

  it("classifies 5xx as a server error and says it is not the reader's fault", () => {
    const classified = classifyNotificationError(apiError(503));

    expect(classified.kind).toBe(NOTIFICATION_ERROR_KINDS.SERVER);
    expect(classified.message).toContain("not with your account");
    expect(classified.canRetry).toBe(true);
  });

  it("classifies a missing endpoint", () => {
    expect(classifyNotificationError(apiError(404)).kind).toBe(
      NOTIFICATION_ERROR_KINDS.NOT_FOUND,
    );
  });

  it("recognises an unreachable gateway without a status code", () => {
    expect(
      classifyNotificationError(
        new Error("Could not reach the PHOENIX API gateway."),
      ).kind,
    ).toBe(NOTIFICATION_ERROR_KINDS.NETWORK);
  });

  it("recognises a sign-in demand raised before the request was sent", () => {
    expect(
      classifyNotificationError(
        new Error("Please sign in before loading backend data."),
      ).needsSignIn,
    ).toBe(true);
  });

  it("falls back to the error's own message when nothing else is known", () => {
    const classified = classifyNotificationError(new Error("something odd"));

    expect(classified.kind).toBe(NOTIFICATION_ERROR_KINDS.UNKNOWN);
    expect(classified.message).toBe("something odd");
  });

  it("never throws on a non-error", () => {
    expect(() => classifyNotificationError(null)).not.toThrow();
    expect(classifyNotificationError(null).canRetry).toBe(true);
  });
});

describe("describeMutationFailure", () => {
  it("names the action and says nothing was changed", () => {
    const failure = describeMutationFailure("markRead", apiError(500));

    expect(failure.message).toContain("mark that notification as read");
    expect(failure.message).toContain("Nothing was changed.");
  });

  it("reports an expired session without burying it in server wording", () => {
    const failure = describeMutationFailure("delete", apiError(401));

    expect(failure.message).toBe(
      "Could not delete that notification: your session has expired. Nothing was changed.",
    );
    expect(failure.needsSignIn).toBe(true);
  });

  it("still produces a sentence for an unknown action", () => {
    expect(describeMutationFailure("wat", apiError(500)).message).toContain(
      "complete that change",
    );
  });
});
