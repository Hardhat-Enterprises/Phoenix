import { Router } from "express";
import { getHealth, getUser } from "../controllers/user.controller";
import { getThreats, getThreat } from "../controllers/threat.controller";
import { getHazards, getHazard } from "../controllers/hazard.controller";

const router = Router();

router.get("/health", getHealth);
router.get("/user", getUser);

router.get("/threats", getThreats);
router.get("/threats/:threatId", getThreat);

router.get("/hazards", getHazards);
router.get("/hazards/:hazardId", getHazard);

export default router;
