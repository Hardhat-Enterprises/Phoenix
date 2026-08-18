import {
  HttpStatusCode,
  UserAccount,
  fromRequest,
  logRbacDenied,
} from "@phoenix/common";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT secret is not defined");
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
      status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await UserAccount.findByPk(decoded.user_id);
    if (!user || user.access_token !== token) {
      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Logged out",
      });
    }
    (req as any).user = decoded;

    next();
  } catch (error) {
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
      // CY017: record the RBAC decision. The 403 response below is unchanged --
      // logging observes the decision, it does not make it.
      logRbacDenied({
        ...fromRequest(req),
        details: { required_roles: roles, actual_role: user?.role ?? null },
      });

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
      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Unauthorized",
      });
    }

    if (roles.includes(user.role) || user.user_id === requestedUserId) {
      return next();
    }

    // CY017: neither the role check nor the self-access check passed, so this
    // is the same class of event as a plain RBAC denial.
    logRbacDenied({
      ...fromRequest(req),
      details: {
        required_roles: roles,
        actual_role: user.role ?? null,
        check: "self_or_roles",
        requested_user_id: requestedUserId,
      },
    });

    return res.status(HttpStatusCode.HTTP_STATUS_FORBIDDEN).json({
      status: HttpStatusCode.HTTP_STATUS_FORBIDDEN,
      message: "You are not authorized to access this user account",
    });
  };
};
