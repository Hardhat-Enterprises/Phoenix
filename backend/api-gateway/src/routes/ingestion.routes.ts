import { Router } from "express";
import { getHealth, ingestData } from "../controllers/ingestion.controller";

const router = Router();

router.get("/health", getHealth);
router.post("/", ingestData);

export default router;