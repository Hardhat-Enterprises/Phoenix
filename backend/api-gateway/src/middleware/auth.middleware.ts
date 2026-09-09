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

  // Access restricted: no Authorization header was provided.
  if (!authHeader) {
    logAccessRestricted({
      ...fromRequest(req),
      reason: "authentication_failure",
      details: {
        cause: "missing_authorization_header",
      },
    });

    return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
      status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await UserAccount.findByPk(decoded.user_id);

    // User does not exist.
    if (!user) {
      logAccessRestricted({
        ...fromRequest(req),
        user_id: decoded.user_id?.toString(),
        role: decoded.role,
        reason: "authentication_failure",
        details: {
          cause: "user_not_found",
        },
      });

      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Logged out",
      });
    }

    // The JWT itself has already been verified, but it is no longer the
    // token stored on the account.
    if (user.access_token !== token) {
      logAccessRestricted({
        ...fromRequest(req),
        user_id: decoded.user_id?.toString(),
        role: decoded.role,
        reason: "authentication_failure",
        severity: "high",
        details: {
          cause: "token_no_longer_matches_account",
        },
      });

      return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
        status: HttpStatusCode.HTTP_STATUS_UNAUTHORIZED,
        message: "Logged out",
      });
    }

    (req as any).user = decoded;

    next();
  } catch (error) {
    // CY017: JWT verification failed. The reason drives the severity.
    logTokenInvalid({
      ...fromRequest(req),
      reason: toTokenInvalidReason(error),
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