import { Router } from "express";
import { getHealth, getUser } from "../controllers/user.controller";

const router = Router();

router.get("/health", getHealth);
router.get("/user", getUser);
export default router;
