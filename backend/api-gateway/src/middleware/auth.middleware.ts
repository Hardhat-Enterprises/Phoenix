import { HttpStatusCode, UserAccount } from "@phoenix/common";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendSecurityNotification } from "../notifications/notificationService";

const JWT_SECRET = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT secret is not defined");
}

export interface AuthenticatedUser {
  user_id: string;
  role?: string;
}

export const getAuthenticatedUserFromToken = async (
  token: string,
): Promise<AuthenticatedUser | undefined> => {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded === "string" || typeof decoded.user_id !== "string") {
    throw new Error("Invalid token payload");
  }

  const user = await UserAccount.findByPk(decoded.user_id);
  if (!user || user.access_token !== token) return undefined;

  return decoded as AuthenticatedUser;
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  // No Authorization header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendSecurityNotification(
      "UNAUTHORIZED_ACCESS",
      "HIGH",
      "Authentication token was not provided.",
      req.originalUrl,
      req.method,
      req.ip,
    );

    return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
      status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const user = await getAuthenticatedUserFromToken(token);

    if (!user) {
      sendSecurityNotification(
        "INVALID_JWT",
        "HIGH",
        "Authenticated token is invalid or has been revoked.",
        req.originalUrl,
        req.method,
        req.ip,
      );

      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Logged out",
      });
    }

    (req as any).user = user;

    next();
  } catch (_error) {
    sendSecurityNotification(
      "INVALID_JWT",
      "HIGH",
      "Invalid or expired JWT detected.",
      req.originalUrl,
      req.method,
      req.ip,
    );

    return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
      status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
      message: "Invalid token",
    });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !roles.includes(user.role)) {
      sendSecurityNotification(
        "FORBIDDEN_ACCESS",
        "HIGH",
        `User with role '${user?.role ?? "unknown"}' attempted to access a restricted resource.`,
        req.originalUrl,
        req.method,
        req.ip,
        user?.user_id,
      );

      return res.status(HttpStatusCode.HTTP_STATUS_FORBIDDEN).json({
        status: HttpStatusCode.HTTP_STATUS_FORBIDDEN,
        message: "Access denied",
      });
    }

    next();
  };
};

export const authorizeSelfOrRoles = (roles: string[], paramName = "userId") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    const requestedUserId = req.params[paramName];

    if (!user) {
      sendSecurityNotification(
        "UNAUTHORIZED_ACCESS",
        "HIGH",
        "Unauthenticated request attempted to access a protected user resource.",
        req.originalUrl,
        req.method,
        req.ip,
      );

      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Unauthorized",
      });
    }

    if (roles.includes(user.role) || user.user_id === requestedUserId) {
      return next();
    }

    sendSecurityNotification(
      "FORBIDDEN_ACCESS",
      "HIGH",
      "User attempted to access another user's protected resource.",
      req.originalUrl,
      req.method,
      req.ip,
      user.user_id,
    );

    return res.status(HttpStatusCode.HTTP_STATUS_FORBIDDEN).json({
      status: HttpStatusCode.HTTP_STATUS_FORBIDDEN,
      message: "You are not authorized to access this user account",
    });
  };
};
