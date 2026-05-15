import { Router } from "express";
import { getHealth } from "../controllers/storage.controller";

const router = Router();

router.get("/health", getHealth);

export default router;
