import { Router } from "express";
import { UserRole } from "@phoenix/common";
import {
  getHealth,
  getUser,
  getLocations,
  getEventStatuses,
  getLinkedEventTypes,
  getSeasons,
  getReferenceDays,
  getReferenceTimes,
  getOneTrainingModel,
  getTrainingModels,
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
  getIntegrations,
  getIntegration,
} from "../controllers/integration.controller";
import {
  getRiskAssessment,
  getRiskAssessments,
} from "../controllers/risk-assessment.controller";

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
 *     summary: Check user service health
 *     description: Returns the health status of the user service.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get("/health", getHealth);

/**
 * @swagger
 * /api/users/meta/locations:
 *   get:
 *     summary: Get locations
 *     description: Retrieves a list of available locations for the authenticated user.
 *     tags:
 *       - Metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Locations retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/meta/locations", authenticate, getLocations);

/**
 * @swagger
 * /api/users/meta/event-statuses:
 *   get:
 *     summary: Get event statuses
 *     description: Retrieves all available event statuses for the authenticated user.
 *     tags:
 *       - Metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Event statuses retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/meta/event-statuses", authenticate, getEventStatuses);

/**
 * @swagger
 * /api/users/meta/linked-event-types:
 *   get:
 *     summary: Get linked event types
 *     description: Retrieves all linked event types for the authenticated user.
 *     tags:
 *       - Metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Linked event types retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/meta/linked-event-types", authenticate, getLinkedEventTypes);

/**
 * @swagger
 * /api/users/meta/seasons:
 *   get:
 *     summary: Get seasons
 *     description: Retrieves all available seasons for the authenticated user.
 *     tags:
 *       - Metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seasons retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/meta/seasons", authenticate, getSeasons);

/**
 * @swagger
 * /api/users/meta/reference-days:
 *   get:
 *     summary: Get reference days
 *     description: Retrieves all available reference days for the authenticated user.
 *     tags:
 *       - Metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reference days retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/meta/reference-days", authenticate, getReferenceDays);

/**
 * @swagger
 * /api/users/meta/reference-times:
 *   get:
 *     summary: Get reference times
 *     description: Retrieves all available reference times for the authenticated user.
 *     tags:
 *       - Metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reference times retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/meta/reference-times", authenticate, getReferenceTimes);

/**
 * @swagger
 * /api/users/integration:
 *   get:
 *     summary: Get integrations
 *     description: Retrieves a list of integrations for the authenticated user.
 *     tags:
 *       - Integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integrations retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/integration",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ANALYST]),
  getIntegrations,
);

/**
 * @swagger
 * /api/users/integration/{integrationId}:
 *   get:
 *     summary: Get integration by ID
 *     description: Retrieves a specific integration using its ID.
 *     tags:
 *       - Integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: integrationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the integration.
 *     responses:
 *       200:
 *         description: Integration retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Integration not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/integration/:integrationId",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ANALYST]),
  getIntegration,
);

/**
 * @swagger
 * /api/users/risk-assessments:
 *   get:
 *     summary: Get TEAVS-ADCRS risk assessments
 *     tags: [Risk Assessments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: risk_level
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Risk assessments retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/risk-assessments",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ANALYST]),
  getRiskAssessments,
);

/**
 * @swagger
 * /api/users/risk-assessments/{assessmentId}:
 *   get:
 *     summary: Get a TEAVS-ADCRS risk assessment by ID
 *     tags: [Risk Assessments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Risk assessment retrieved successfully
 *       404:
 *         description: Risk assessment not found
 */
router.get(
  "/risk-assessments/:assessmentId",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ANALYST]),
  getRiskAssessment,
);

/**
 * @swagger
 * /api/users/training-models:
 *   get:
 *     summary: Get training models
 *     description: Retrieves a list of training models for the authenticated user.
 *     tags:
 *       - Training Models
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Training models retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/training-models", authenticate, getTrainingModels);

/**
 * @swagger
 * /api/users/training-models/{file_id}:
 *   get:
 *     summary: Get training model by file ID
 *     description: Retrieves a specific training model using its file ID.
 *     tags:
 *       - Training Models
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: file_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The file ID of the training model.
 *     responses:
 *       200:
 *         description: Training model retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Training model not found
 *       500:
 *         description: Internal server error
 */
router.get("/training-models/:file_id", authenticate, getOneTrainingModel);
/**
 * Authentication Routes
 */

/**
 * @swagger
 * /api/users/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Registers a new user. This endpoint requires authentication and admin authorization.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username for the new user
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password for the new user
 *               role:
 *                 type: string
 *                 description: Role assigned to the new user
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       500:
 *         description: Internal server error
 */
router.post("/auth/register", authenticate, authorize(["admin"]), register);

/**
 * @swagger
 * /api/users/auth/login:
 *   post:
 *     summary: Log in a user
 *     description: Authenticates a user using their username and password and returns authentication tokens.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username of the user
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password of the user
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       400:
 *         description: Invalid login request
 *       401:
 *         description: Invalid username or password
 *       500:
 *         description: Internal server error
 */
router.post("/auth/login", login);

/**
 * @swagger
 * /api/users/auth/refresh:
 *   post:
 *     summary: Refresh authentication token
 *     description: Generates a new access token using a valid refresh token. The refresh token can be provided through a cookie or the request body.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Refresh token used to generate a new access token
 *     responses:
 *       200:
 *         description: Authentication token refreshed successfully
 *       401:
 *         description: Refresh token missing, invalid, or expired
 *       500:
 *         description: Internal server error
 */
router.post("/auth/refresh", refresh);

/**
 * @swagger
 * /api/users/auth/logout/{userId}:
 *   post:
 *     summary: Log out a user
 *     description: Logs out the specified user and clears the refresh token cookie. The authenticated user must be logging out their own account or have admin privileges.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to log out
 *     responses:
 *       200:
 *         description: User logged out successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User is not authorized to log out this account
 *       500:
 *         description: Internal server error
 */
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
 *     summary: Get user information
 *     description: Retrieves user information. This endpoint is only accessible to authenticated administrators.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Users retrieved successfully
 *                 user:
 *                   type: array
 *       401:
 *         description: Unauthorized - No valid token provided
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get("/user", authenticate, authorize(["admin"]), getUser);

/**
 * @swagger
 * /api/users/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview
 *     description: Retrieves the dashboard overview for the authenticated user.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/dashboard/overview",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ANALYST]),
  getUserDashboard,
);

/**
 * @swagger
 * /api/users/dashboard/charts:
 *   get:
 *     summary: Get dashboard charts
 *     description: Retrieves dashboard chart data for the authenticated user.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard charts retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/dashboard/charts",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ANALYST]),
  getUserDashboardCharts,
);

/**
 * @swagger
 * /api/users/dashboard/activity:
 *   get:
 *     summary: Get dashboard activity
 *     description: Retrieves dashboard activity for the authenticated user.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard activity retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/dashboard/activity",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ANALYST]),
  getUserDashboardActivity,
);

/**
 * @swagger
 * /api/users/hazards:
 *   get:
 *     summary: Get hazards
 *     description: Retrieves a list of hazards for the authenticated user.
 *     tags:
 *       - Hazards
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hazards retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/hazards",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ANALYST]),
  getHazards,
);

/**
 * @swagger
 * /api/users/hazards/{hazardId}:
 *   get:
 *     summary: Get hazard by ID
 *     description: Retrieves a specific hazard using its ID.
 *     tags:
 *       - Hazards
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hazardId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the hazard.
 *     responses:
 *       200:
 *         description: Hazard retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Hazard not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/hazards/:hazardId",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.ANALYST]),
  getHazard,
);

export default router;
