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

const router = Router();

router.get("/health", getHealth);
router.get("/user", getUser);
router.get("/meta/locations", getLocations);
router.get("/meta/event-statuses", getEventStatuses);
router.get("/meta/linked-event-types", getLinkedEventTypes);
router.get("/meta/seasons", getSeasons);
router.get("/meta/reference-days", getReferenceDays);
router.get("/meta/reference-times", getReferenceTimes);
export default router;