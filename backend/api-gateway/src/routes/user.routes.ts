import { Router } from "express";
import {
  getHealth,
  getUser,
  getUserDashboard,
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
 * Dashboard Routes
 */
router.get("/dashboard/overview", getUserDashboard);

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
