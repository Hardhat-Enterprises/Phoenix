import { HttpStatusCode, UserAccount } from "@phoenix/common";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const logging = (() => {
  try {
    return require("@phoenix/logging");
  } catch {
    return {
      fromRequest: (_req: Request) => ({
        requestId: _req.headers["x-request-id"] ?? null,
      }),
      logTokenInvalid: () => undefined,
      logRbacDenied: () => undefined,
    };
  }
})();

const { fromRequest, logTokenInvalid, logRbacDenied } = logging;

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
      logTokenInvalid({
        ...fromRequest(req),
        reason: "tampered_claims",
      });

      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Logged out",
      });
    }

    (req as any).user = decoded;

    next();
  } catch (error) {
    const reason =
      error instanceof jwt.TokenExpiredError
        ? "expired"
        : "malformed";

    logTokenInvalid({
      ...fromRequest(req),
      reason,
    });

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
      logRbacDenied({
        ...fromRequest(req),
      });

      return res.status(HttpStatusCode.HTTP_STATUS_FORBIDDEN).json({
        status: HttpStatusCode.HTTP_STATUS_FORBIDDEN,
        message: "Access denied",
      });
    }

    next();
  };
};

export const authorizeSelfOrRoles = (
  roles: string[],
  paramName = "userId",
) => {
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

    logRbacDenied({
      ...fromRequest(req),
    });

    return res.status(HttpStatusCode.HTTP_STATUS_FORBIDDEN).json({
      status: HttpStatusCode.HTTP_STATUS_FORBIDDEN,
      message: "You are not authorized to access this user account",
    });
  };
};