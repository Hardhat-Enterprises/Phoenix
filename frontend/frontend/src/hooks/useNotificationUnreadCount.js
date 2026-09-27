import { useCallback, useEffect, useRef, useState } from "react";
import { getNotificationUnreadCount } from "../services/phoenixApi";

const REFRESH_INTERVAL_MS = 30_000;

const normalizeUnreadCount = (response) => {
  if (typeof response === "number") {
    return Math.max(0, Math.floor(response));
  }

  const candidates = [
    response?.unreadCount,
    response?.unread_count,
    response?.data?.unreadCount,
    response?.data?.unread_count,
    response?.data?.data?.unreadCount,
    response?.data?.data?.unread_count,
    response?.count,
    response?.data?.count,
  ];

  const value = candidates.find(
    (candidate) =>
      candidate !== undefined &&
      candidate !== null &&
      candidate !== "",
  );

  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(0, Math.floor(number))
    : 0;
};

const getSafeErrorMessage = (error) =>
  error?.message || "Unable to load notification count.";

export default function useNotificationUnreadCount({
  enabled = false,
} = {}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestVersionRef = useRef(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled) {
      return 0;
    }

    const requestVersion = ++requestVersionRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getNotificationUnreadCount();
      const nextCount = normalizeUnreadCount(response);

      if (requestVersion !== requestVersionRef.current) {
        return nextCount;
      }

      setUnreadCount(nextCount);

      return nextCount;
    } catch (requestError) {
      if (requestVersion !== requestVersionRef.current) {
        return 0;
      }

      setError(getSafeErrorMessage(requestError));

      return 0;
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      requestVersionRef.current += 1;
      return undefined;
    }

    const handleNotificationsChanged = () => {
      void refreshUnreadCount();
    };

    void refreshUnreadCount();

    window.addEventListener(
      "phoenix:notifications-changed",
      handleNotificationsChanged,
    );

    const intervalId = window.setInterval(
      () => {
        void refreshUnreadCount();
      },
      REFRESH_INTERVAL_MS,
    );

    return () => {
      requestVersionRef.current += 1;

      window.removeEventListener(
        "phoenix:notifications-changed",
        handleNotificationsChanged,
      );

      window.clearInterval(intervalId);
    };
  }, [enabled, refreshUnreadCount]);

  return {
    unreadCount: enabled ? unreadCount : 0,
    isLoading: enabled ? isLoading : false,
    error: enabled ? error : null,
    refreshUnreadCount,
  };
}