import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { UserRole } from "../types/roles.ts";

interface TokenPayload extends JwtPayload {
  userId?: string;
  user_id?: string;
  role: UserRole;
}

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

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  // Check Authorization header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      status: 401,
      message: "Unauthorized",
      data: [],
    });
    return;
  }

  // Extract token
  const token = authHeader.split(" ")[1];

  // Get JWT secret
  const secret = process.env.AUTH_JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      data: [],
    });
    return;
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, secret) as TokenPayload;

    // Handle different backend payload naming
    const userId = decoded.userId || decoded.user_id;

    // Validate token payload
    if (!userId || !decoded.role) {
      res.status(401).json({
        status: 401,
        message: "Invalid token payload",
        data: [],
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: userId,
      role: decoded.role,
    };

    next();
  } catch (_error) {
    res.status(401).json({
      status: 401,
      message: "Invalid or expired token",
      data: [],
    });
  }
}