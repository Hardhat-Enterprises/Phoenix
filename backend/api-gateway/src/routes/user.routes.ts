import { Router } from "express";

import {
  getHealth,
  getUser,
  register,
  login,
  refresh,
  logout,
  getUserDashboard,
  getUserDashboardCharts,
  getUserDashboardActivity,
} from "../controllers/user.controller";

import { getThreats, getThreat } from "../controllers/threat.controller";
import { getHazards, getHazard } from "../controllers/hazard.controller";

import {
  authenticate,
  authorize,
  authorizeSelfOrRoles,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/users/health:
 *   get:
 *     summary: Check User Service health
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: API service is running
 */
router.get("/health", getHealth);

/**
 * Authentication Routes
 */
router.post(
  "/auth/register",
  authenticate,
  authorize(["admin"]),
  register,
);

router.post("/auth/login", login);

router.post("/auth/refresh", refresh);

router.post(
  "/auth/logout/:userId",
  authenticate,
  authorizeSelfOrRoles(["admin"]),
  logout,
);

/**
 * @swagger
 * /api/users/user:
 *   get:
 *     summary: Get users information
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: User retrieved successfully
 */
router.get(
  "/user",
  authenticate,
  authorize(["admin"]),
  getUser,
);

/**
 * Dashboard Routes
 */
router.get(
  "/dashboard/overview",
  authenticate,
  getUserDashboard,
);

router.get(
  "/dashboard/charts",
  authenticate,
  getUserDashboardCharts,
);

router.get(
  "/dashboard/activity",
  authenticate,
  getUserDashboardActivity,
);

/**
 * Threat Routes
 */
router.get(
  "/threats",
  authenticate,
  getThreats,
);

router.get(
  "/threats/:threatId",
  authenticate,
  getThreat,
);

/**
 * Hazard Routes
 */
router.get(
  "/hazards",
  authenticate,
  getHazards,
);

router.get(
  "/hazards/:hazardId",
  authenticate,
  getHazard,
);

export default router;