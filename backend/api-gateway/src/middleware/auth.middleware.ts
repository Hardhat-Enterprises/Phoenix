import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT secret is not defined");
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    (req as any).user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

export const authorize = (roles: string[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const user = (req as any).user;

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({
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
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const user = (req as any).user;

    const requestedUserId = req.params[paramName];

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (
      roles.includes(user.role) ||
      user.user_id === requestedUserId
    ) {
      return next();
    }

    return res.status(403).json({
      message:
        "You are not authorized to access this user account",
    });
  };
};