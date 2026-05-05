import { Router } from "express";
import {
  getHealth,
  getUser,
  register,
  login,
  refresh,
  logout,
} from "../controllers/user.controller";

import { getThreats, getThreat } from "../controllers/threat.controller";
import { getHazards, getHazard } from "../controllers/hazard.controller";

import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.get("/health", getHealth);

// Auth routes (no protection)
router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/refresh", refresh);
router.post("/auth/logout", logout);

// Protected routes
router.get("/user", authenticate, authorize(["admin"]), getUser);

router.get("/threats", authenticate, getThreats);
router.get("/threats/:threatId", authenticate, getThreat);

router.get("/hazards", authenticate, getHazards);
router.get("/hazards/:hazardId", authenticate, getHazard);

export default router;