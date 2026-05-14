import { Router } from "express";

import {
  getHealth,
  getUser,
  getUserDashboard,
  getUserDashboardCharts,
  getUserDashboardActivity,
} from "../controllers/user.controller";

import { getThreats, getThreat } from "../controllers/threat.controller";
import { getHazards, getHazard } from "../controllers/hazard.controller";

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
router.get("/user", getUser);

/**
 * @swagger
 * /api/users/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get("/dashboard/overview", getUserDashboard);

/**
 * @swagger
 * /api/users/dashboard/charts:
 *   get:
 *     summary: Get dashboard chart data
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Dashboard chart data retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get("/dashboard/charts", getUserDashboardCharts);

/**
 * @swagger
 * /api/users/dashboard/activity:
 *   get:
 *     summary: Get dashboard activity feed
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Dashboard activity retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get("/dashboard/activity", getUserDashboardActivity);

/**
 * Threat Routes
 */
router.get("/threats", getThreats);
router.get("/threats/:threatId", getThreat);

/**
 * Hazard Routes
 */
router.get("/hazards", getHazards);
router.get("/hazards/:hazardId", getHazard);

export default router;
