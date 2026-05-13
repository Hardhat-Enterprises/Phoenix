import { Router } from "express";
import {
  getHealth,
  getUser,
  getLocations,
  getEventStatuses,
  getLinkedEventTypes,
  getSeasons,
  getReferenceDays,
  getReferenceTimes,
} from "../controllers/user.controller";
import { getThreats, getThreat } from "../controllers/threat.controller";
import { getHazards, getHazard } from "../controllers/hazard.controller";
import { getRisk, getRisks } from "../controllers/risk.controller";

const router = Router();

router.get("/health", getHealth);
router.get("/user", getUser);
router.get("/meta/locations", getLocations);
router.get("/meta/event-statuses", getEventStatuses);
router.get("/meta/linked-event-types", getLinkedEventTypes);
router.get("/meta/seasons", getSeasons);
router.get("/meta/reference-days", getReferenceDays);
router.get("/meta/reference-times", getReferenceTimes);

router.get("/threats", getThreats);
router.get("/threats/:threatId", getThreat);

router.get("/hazards", getHazards);
router.get("/hazards/:hazardId", getHazard);

router.get("/risks", getRisks);
router.get("/risks/:riskId", getRisk);

export default router;
