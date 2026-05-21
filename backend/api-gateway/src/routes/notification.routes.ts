import { Router } from "express";
import { getHealth, getNotifications } from "../controllers/notification.controller";

const router = Router();

router.get("/health", getHealth);
router.get("/", getNotifications);

export default router;
