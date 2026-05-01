import { Router } from "express";
import {
  getHealth,
  getUser,
  getUserDashboard,
} from "../controllers/user.controller";

const router = Router();

router.get("/health", getHealth);
router.get("/user", getUser);
router.get("/dashboard/overview", getUserDashboard);

export default router;
