import {
  HttpStatusCode,
  UserAccount,
  fromRequest,
  logRbacDenied,
  logTokenInvalid,
  logAccessRestricted,
  type TokenInvalidReason,
} from "@phoenix/common";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendSecurityNotification } from "../notifications/notificationService";

const JWT_SECRET = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT secret is not defined");
}

/**
 * CY017: translate a `jsonwebtoken` verification error into the module's
 * `token_invalid` reason vocabulary. Severity is assigned by reason -- an
 * expired token is routine (low), a bad signature is a forgery attempt (high).
 */
const toTokenInvalidReason = (error: unknown): TokenInvalidReason => {
  if (error instanceof jwt.TokenExpiredError) return "expired";

  if (error instanceof jwt.JsonWebTokenError) {
    return error.message === "invalid signature" ? "bad_signature" : "malformed";
  }

  return "malformed";
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  // No Authorization header, or not a Bearer token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logAccessRestricted({
      ...fromRequest(req),
      reason: "authentication_failure",
      details: {
        cause: authHeader
          ? "non_bearer_authorization_scheme"
          : "missing_authorization_header",
      },
    });

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
    const decoded: any = jwt.verify(token, JWT_SECRET);

    const user = await UserAccount.findByPk(decoded.user_id);

    // Token is no longer valid / user has logged out
    if (!user || user.access_token !== token) {
        logAccessRestricted({
        ...fromRequest(req),
        user_id: decoded.user_id?.toString(),
        role: decoded.role,
        reason: "authentication_failure",
        severity: user ? "high" : undefined,
        details: {
          cause: user ? "token_no_longer_matches_account" : "user_not_found",
        },
      });

      sendSecurityNotification(
        "INVALID_JWT",
        "HIGH",
        "Authenticated token is invalid or has been revoked.",
        req.originalUrl,
        req.method,
        req.ip,
        decoded.user_id,
      );

      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Logged out",
      });
    }

    // Attach authenticated user
    (req as any).user = decoded;

    next();
  } catch (error) {
    // CY017: JWT verification failed. The reason drives the severity.
    logTokenInvalid({
      ...fromRequest(req),
      reason: toTokenInvalidReason(error),
    });

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
      // Record the RBAC decision. The 403 response below is unchanged --
      // logging observes the decision, it does not make it.
      logRbacDenied({
        ...fromRequest(req),
        details: {
          required_roles: roles,
          actual_role: user?.role ?? null,
          check: "roles",
        },
      });

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

export const authorizeSelfOrRoles = (
  roles: string[],
  paramName = "userId",
) => {
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