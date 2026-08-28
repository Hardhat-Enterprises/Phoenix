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
      res.status(401).json({
        status: 401,
        message: "Unauthorized",
        data: [],
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
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