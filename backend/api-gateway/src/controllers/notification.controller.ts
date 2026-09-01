import { Request, Response } from "express";
import { HttpStatusCode, logger } from "@phoenix/common";
import { notificationGrpcClient } from "../grpc/notification.grpc";

const getAuthenticatedUserId = (req: Request): string | undefined =>
  (req as any).user?.user_id;

const sendGrpcError = (res: Response, message: string, error: unknown): Response => {
  logger.error(`${message}: ${error}`);
  return res.status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
    status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
    message,
  });
};

/**
 * Get all notifications for the authenticated user
 * Supports pagination and filtering by read status
 */
export const getNotifications = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Unauthorized",
      });
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
    const isReadFilter = req.query.read;
    notificationGrpcClient.GetNotifications({
      user_id: userId,
      page,
      limit,
      has_is_read: isReadFilter !== undefined && isReadFilter !== "",
      is_read: isReadFilter === "true",
    }, (error, response) => {
      if (error) return sendGrpcError(res, "Error fetching notifications", error);
      return res.status(response.status).json({
        status: response.status,
        message: response.message,
        data: {
          notifications: response.notifications,
          pagination: {
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.total_pages,
          },
        },
      });
    });
  } catch (error) {
    return sendGrpcError(res, "Error fetching notifications", error);
  }
};

/**
 * Get unread notification count for the authenticated user
 */
export const getUnreadCount = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Unauthorized",
      });
    }

    notificationGrpcClient.GetUnreadNotificationCount({ user_id: userId }, (error, response) => {
      if (error) return sendGrpcError(res, "Error fetching unread count", error);
      return res.status(response.status).json({
        status: response.status,
        message: response.message,
        data: { unreadCount: response.unread_count },
      });
    });
  } catch (error) {
    return sendGrpcError(res, "Error fetching unread count", error);
  }
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const notificationId = Array.isArray(req.params.notificationId)
      ? req.params.notificationId[0]
      : req.params.notificationId;

    if (!userId) {
      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Unauthorized",
      });
    }

    if (!notificationId) {
      return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Notification ID is required",
      });
    }

    notificationGrpcClient.MarkNotificationAsRead({
      notification_id: notificationId,
      user_id: userId,
    }, (error, response) => {
      if (error) return sendGrpcError(res, "Error marking notification as read", error);
      return res.status(response.status).json({
        status: response.status,
        message: response.message,
        data: { notification: response.notification },
      });
    });
  } catch (error) {
    return sendGrpcError(res, "Error marking notification as read", error);
  }
};

/**
 * Mark all notifications as read for the authenticated user
 */
export const markAllAsRead = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Unauthorized",
      });
    }

    notificationGrpcClient.MarkAllNotificationsAsRead({ user_id: userId }, (error, response) => {
      if (error) return sendGrpcError(res, "Error marking all notifications as read", error);
      return res.status(response.status).json({
        status: response.status,
        message: response.message,
        data: { updatedCount: response.updated_count },
      });
    });
  } catch (error) {
    return sendGrpcError(res, "Error marking all notifications as read", error);
  }
};

/**
 * Delete or archive a single notification
 */
export const deleteNotification = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = getAuthenticatedUserId(req);
    const notificationId = Array.isArray(req.params.notificationId)
      ? req.params.notificationId[0]
      : req.params.notificationId;

    if (!userId) {
      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Unauthorized",
      });
    }

    if (!notificationId) {
      return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Notification ID is required",
      });
    }

    notificationGrpcClient.DeleteNotification({
      notification_id: notificationId,
      user_id: userId,
    }, (error, response) => {
      if (error) return sendGrpcError(res, "Error deleting notification", error);
      return res.status(response.status).json({
        status: response.status,
        message: response.message,
      });
    });
  } catch (error) {
    return sendGrpcError(res, "Error deleting notification", error);
  }
};

/**
 * Get notification health (system endpoint)
 */
export const getHealth = (req: Request, res: Response) => {
  notificationGrpcClient.GetNotificationHealth({}, (error, response) => {
    if (error) return sendGrpcError(res, "Error fetching notification health", error);
    return res.status(response.status).json({
      status: response.status,
      message: response.message,
    });
  });
};

