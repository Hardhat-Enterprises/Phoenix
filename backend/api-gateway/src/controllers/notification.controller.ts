import { Request, Response } from "express";
import {
  Notification,
  HttpStatusCode,
  logger,
} from "@phoenix/common";

/**
 * Get all notifications for the authenticated user
 * Supports pagination and filtering by read status
 */
export const getNotifications = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.user_id;
    if (!userId) {
      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Unauthorized",
      });
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
    const offset = (page - 1) * limit;

    // Filtering
    const isReadFilter = req.query.read;
    let where: any = { user_id: userId };
    if (isReadFilter !== undefined && isReadFilter !== "") {
      where.is_read = isReadFilter === "true";
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Notifications retrieved successfully",
      data: {
        notifications: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    logger.error(`Error fetching notifications: ${error}`);
    return res
      .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
      .json({
        status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        message: "Error fetching notifications",
      });
  }
};

/**
 * Get unread notification count for the authenticated user
 */
export const getUnreadCount = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.user_id;
    if (!userId) {
      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Unauthorized",
      });
    }

    const unreadCount = await Notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Unread notification count retrieved",
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    logger.error(`Error fetching unread count: ${error}`);
    return res
      .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
      .json({
        status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        message: "Error fetching unread count",
      });
  }
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.user_id;
    const { notificationId } = req.params;

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

    const notification = await Notification.findOne({
      where: {
        notification_id: notificationId,
        user_id: userId,
      },
    });

    if (!notification) {
      return res.status(HttpStatusCode.HTTP_STATUS_NOT_FOUND).json({
        status: HttpStatusCode.HTTP_STATUS_NOT_FOUND,
        message: "Notification not found",
      });
    }

    notification.is_read = true;
    await notification.save();

    return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Notification marked as read",
      data: {
        notification,
      },
    });
  } catch (error) {
    logger.error(`Error marking notification as read: ${error}`);
    return res
      .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
      .json({
        status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        message: "Error marking notification as read",
      });
  }
};

/**
 * Mark all notifications as read for the authenticated user
 */
export const markAllAsRead = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.user_id;
    if (!userId) {
      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Unauthorized",
      });
    }

    const [updatedCount] = await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: userId,
          is_read: false,
        },
      }
    );

    return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "All notifications marked as read",
      data: {
        updatedCount,
      },
    });
  } catch (error) {
    logger.error(`Error marking all notifications as read: ${error}`);
    return res
      .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
      .json({
        status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        message: "Error marking all notifications as read",
      });
  }
};

/**
 * Delete or archive a single notification
 */
export const deleteNotification = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = (req as any).user?.user_id;
    const { notificationId } = req.params;

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

    const notification = await Notification.findOne({
      where: {
        notification_id: notificationId,
        user_id: userId,
      },
    });

    if (!notification) {
      return res.status(HttpStatusCode.HTTP_STATUS_NOT_FOUND).json({
        status: HttpStatusCode.HTTP_STATUS_NOT_FOUND,
        message: "Notification not found",
      });
    }

    await notification.destroy();

    return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
      status: HttpStatusCode.HTTP_STATUS_OK,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting notification: ${error}`);
    return res
      .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
      .json({
        status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        message: "Error deleting notification",
      });
  }
};

/**
 * Create a new notification (admin/system use)
 */
export const createNotification = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { user_id, title, message, type, data } = req.body;

    if (!user_id || !title || !message) {
      return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
        status: HttpStatusCode.HTTP_STATUS_BAD_REQUEST,
        message: "Missing required fields: user_id, title, message",
      });
    }

    const notification = await Notification.create({
      user_id,
      title,
      message,
      type: type || "info",
      data: data || {},
    });

    return res.status(HttpStatusCode.HTTP_STATUS_CREATED).json({
      status: HttpStatusCode.HTTP_STATUS_CREATED,
      message: "Notification created successfully",
      data: {
        notification,
      },
    });
  } catch (error) {
    logger.error(`Error creating notification: ${error}`);
    return res
      .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
      .json({
        status: HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR,
        message: "Error creating notification",
      });
  }
};

/**
 * Get notification health (system endpoint)
 */
export const getHealth = (req: Request, res: Response) => {
  return res.status(HttpStatusCode.HTTP_STATUS_OK).json({
    status: HttpStatusCode.HTTP_STATUS_OK,
    message: "Notification service is healthy",
  });
};

