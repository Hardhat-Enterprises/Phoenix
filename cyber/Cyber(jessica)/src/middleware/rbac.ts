import { sendSecurityNotification } from "../notifications/notificationService";
import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types/roles";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {

  sendSecurityNotification(
    "UNAUTHORIZED_ACCESS",
    "HIGH",
    "User attempted to access a protected resource without authentication.",
    req.originalUrl,
    req.method,
    req.ip
  );

  res.status(401).json({
    status: 401,
    message: "Unauthorized",
    data: [],
  });

  return;
}

    if (!allowedRoles.includes(req.user.role)) {

  sendSecurityNotification(
    "FORBIDDEN_ACCESS",
    "HIGH",
    `User with role '${req.user.role}' attempted to access a restricted resource.`,
    req.originalUrl,
    req.method,
    req.ip,
    req.user.id
  );

  res.status(403).json({
    status: 403,
    message: "Forbidden",
    data: [],
  });

  return;
}

    next();
  };
}