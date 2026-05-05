import { Request, Response } from "express";
import { userGrpcClient } from "../grpc/user.grpc";
import { HttpStatusCode, logger } from "@phoenix/common";

// ─── Existing ─────────────────────────────────────────────

export const getHealth = (req: Request, res: Response) => {
  userGrpcClient.GetUserHealth({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUserHealth: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching user health" });
    }

    return res
      .status(response.status || HttpStatusCode.HTTP_STATUS_OK)
      .json({ message: response?.message });
  });
};

export const getUser = (req: Request, res: Response) => {
  userGrpcClient.GetUsers({}, (error, response) => {
    if (error) {
      logger.error(`Error calling GetUsers: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching users" });
    }

    logger.info(`GetUsers response from gRPC: ${JSON.stringify(response)}`);

    return res.status(response.status || HttpStatusCode.HTTP_STATUS_OK).json({
      status: response?.status,
      message: response?.message,
      user: response?.users,
    });
  });
};

// ─── AUTH CONTROLLERS (NEW) ───────────────────────────────

// Register
export const register = (req: Request, res: Response) => {
  userGrpcClient.RegisterUser(req.body, (error, response) => {
    if (error) {
      logger.error(`Register error: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Register failed" });
    }

    return res.status(response.status).json(response);
  });
};

// Login
export const login = (req: Request, res: Response) => {
  userGrpcClient.LoginUser(req.body, (error, response) => {
    if (error) {
      logger.error(`Login error: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Login failed" });
    }

    // Store refresh token in cookie
    res.cookie("refresh_token", response.refresh_token, {
      httpOnly: true,
      secure: false, // change to true in production
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(response.status).json({
      message: response.message,
      access_token: response.access_token,
    });
  });
};

// Refresh Token
export const refresh = (req: Request, res: Response) => {
  const refresh_token = req.cookies.refresh_token;

  if (!refresh_token) {
    return res.status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED).json({
      message: "No refresh token provided",
    });
  }

  userGrpcClient.RefreshToken({ refresh_token }, (error, response) => {
    if (error) {
      logger.error(`Refresh error: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_UNAUTHORIZED)
        .json({ message: "Invalid token" });
    }

    return res.status(response.status).json({
      access_token: response.access_token,
    });
  });
};

// Logout
export const logout = (req: Request, res: Response) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(HttpStatusCode.HTTP_STATUS_BAD_REQUEST).json({
      message: "User ID required",
    });
  }

  userGrpcClient.LogoutUser({ user_id }, (error, response) => {
    if (error) {
      logger.error(`Logout error: ${error}`);
      return res
        .status(HttpStatusCode.HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: "Logout failed" });
    }

    // Clear cookie
    res.clearCookie("refresh_token");

    return res.status(response.status).json({
      message: response.message,
    });
  });
};