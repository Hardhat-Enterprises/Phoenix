import { Router } from "express";
import {
    getHealth,
    getUser,
    getDashboardOverview,
    getDashboardCharts,
    getDashboardActivity,
} from "../controllers/user.controller";

const router = Router();

router.get("/health", getHealth);
router.get("/user", getUser);

router.get("/dashboard/overview", getDashboardOverview);
router.get("/dashboard/charts", getDashboardCharts);
router.get("/dashboard/activity", getDashboardActivity);

export default router;