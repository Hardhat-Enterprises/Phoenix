import { Router } from "express";
import { getHealth, uploadFile } from "../controllers/storage.controller";
import multer from "multer";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

const upload = multer({ dest: "uploads/" });

/**
 * @swagger
 * tags:
 *   name: Storage
 *   description: Storage service endpoints
 */

/**
 * @swagger
 * /api/storage/health:
 *   get:
 *     summary: Check Storage Service
 *     description: Returns the current health status of the storage service.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *          description: Storage service is healthy
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: integer
 *                    example: 200
 *                  message:
 *                    type: string
 *                    example: "Storage service is healthy "
 *       500:
 *          description: Error fetching storage health
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  status:
 *                    type: integer
 *                    example: 500
 *                  message:
 *                    type: string
 *                    example: "Error fetching storage health"
 *                  error:
 *                    type: string
 *                    example: "Internal server error"
 */
router.get("/health", getHealth);

/**
 * @swagger
 * /api/storage/upload:
 *   post:
 *     summary: Upload a file
 *     tags:
 *       - Storage
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File upload successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "File upload successful"
 *                 data:
 *                   description: Upload file data
 *       400:
 *         description: No file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "No file uploaded"
 *       401:
 *         description: Unauthorized or no authentication token was provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: "No token provided"
 *       500:
 *         description: Error uploading file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "Error uploading file"
 */
router.post("/upload", authenticate, upload.single("file"), uploadFile);
export default router;
