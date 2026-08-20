import { Router } from "express";
import { getThreats, getThreat } from "../controllers/threat.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/users/threats:
 *   get:
 *     summary: Get a list of cyber threats
 *     description: Retrieves a paginated list of cyber threats. Supports filtering by threat type, risk level, and status.
 *     tags:
 *       - Cyber Threats
 *     parameters:
 *       - in: query
 *         name: threat_type
 *         schema:
 *           type: string
 *         description: Filter by threat type (e.g. phishing, malware, ransomware)
 *         example: "phishing"
 *
 *       - in: query
 *         name: risk_level
 *         schema:
 *           type: string
 *           enum:
 *             - low
 *             - medium
 *             - high
 *             - critical
 *         description: Filter by risk level
 *         example: "high"
 *
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum:
 *             - active
 *             - resolved
 *             - investigating
 *         description: Filter by current threat status
 *         example: "active"
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of threats to return per page
 *         example: 10
 *
 *     responses:
 *       200:
 *         description: Successfully retrieved list of cyber threats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *
 *                 message:
 *                   type: string
 *                   example: "Threats retrieved successfully"
 *
 *                 threats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       threat_id:
 *                         type: string
 *                         format: uuid
 *                         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *
 *                       threat_type:
 *                         type: string
 *                         example: "phishing"
 *
 *                       title:
 *                         type: string
 *                         example: "Phishing campaign targeting disaster relief donors"
 *
 *                       description:
 *                         type: string
 *                         example: "A coordinated phishing campaign impersonating relief organisations detected during flood event."
 *
 *                       risk_level:
 *                         type: string
 *                         example: "high"
 *
 *                       status:
 *                         type: string
 *                         example: "active"
 *
 *                       category:
 *                         type: string
 *                         example: "social_engineering"
 *
 *                       confidence_score:
 *                         type: string
 *                         example: "0.92"
 *
 *                       detected_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-05-06T10:00:00.000Z"
 *
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-05-06T10:05:00.000Z"
 *
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-05-06T11:00:00.000Z"
 *
 *                 total:
 *                   type: integer
 *                   description: Total number of threats matching the filters
 *                   example: 42
 *
 *                 page:
 *                   type: integer
 *                   example: 1
 *
 *                 limit:
 *                   type: integer
 *                   example: 10
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error fetching threats"
 */
router.get("/", authenticate, getThreats);

/**
 * @swagger
 * /api/users/threats/{threatId}:
 *   get:
 *     summary: Get a single cyber threat by ID
 *     description: Retrieves the full details of a specific cyber threat using its unique identifier.
 *     tags:
 *       - Cyber Threats
 *     parameters:
 *       - in: path
 *         name: threatId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique ID of the cyber threat
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *
 *     responses:
 *       200:
 *         description: Successfully retrieved the cyber threat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *
 *                 message:
 *                   type: string
 *                   example: "Threat retrieved successfully"
 *
 *                 threat:
 *                   type: object
 *                   properties:
 *                     threat_id:
 *                       type: string
 *                       format: uuid
 *                       example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *
 *                     threat_type:
 *                       type: string
 *                       example: "phishing"
 *
 *                     title:
 *                       type: string
 *                       example: "Phishing campaign targeting disaster relief donors"
 *
 *                     description:
 *                       type: string
 *                       example: "A coordinated phishing campaign impersonating relief organisations detected during flood event."
 *
 *                     risk_level:
 *                       type: string
 *                       example: "high"
 *
 *                     status:
 *                       type: string
 *                       example: "active"
 *
 *                     category:
 *                       type: string
 *                       example: "social_engineering"
 *
 *                     confidence_score:
 *                       type: string
 *                       example: "0.92"
 *
 *                     detected_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-06T10:00:00.000Z"
 *
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-06T10:05:00.000Z"
 *
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-06T11:00:00.000Z"
 *
 *       404:
 *         description: Threat not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Threat not found"
 *
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error fetching threat"
 */
router.get("/:threatId", authenticate, getThreat);

export default router;
