import { Router } from "express";
import { getHealth, getUser } from "../controllers/user.controller";
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

router.get("/threats", getThreats);
router.get("/threats/:threatId", getThreat);

/**
 * @swagger
 * /api/users/hazards:
 *   get:
 *     summary: Get hazard list
 *     tags:
 *       - Hazards
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: hazard_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity_level
 *         schema:
 *           type: string
 *       - in: query
 *         name: event_status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hazards fetched successfully
 */
router.get("/hazards", getHazards);
/**
 * @swagger
 * /api/users/hazards/{hazardId}:
 *   get:
 *     summary: Get one hazard
 *     tags:
 *       - Hazards
 *     parameters:
 *       - in: path
 *         name: hazardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hazard fetched successfully
 *       404:
 *         description: Hazard not found
 */
router.get("/hazards/:hazardId", getHazard);

export default router;
