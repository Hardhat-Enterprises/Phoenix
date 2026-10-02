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
    const user = await getAuthenticatedUserFromToken(token);

    if (!user) {
      // CY017: the shared helper returns undefined both when the account no
      // longer exists and when the token has been superseded (logout or a
      // newer login). The helper has already verified signature and expiry,
      // so the claims are decoded here only to record which case it was.
      const claims = jwt.decode(token) as { user_id?: string; role?: string } | null;
      const account = claims?.user_id
        ? await UserAccount.findByPk(claims.user_id)
        : null;

      logAccessRestricted({
        ...fromRequest(req),
        user_id: claims?.user_id?.toString(),
        role: claims?.role,
        reason: "authentication_failure",
        severity: account ? "high" : undefined,
        details: {
          cause: account ? "token_no_longer_matches_account" : "user_not_found",
        },
      });

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
