import { Router } from "express";
import { getHealth, ingestData } from "../controllers/ingestion.controller";

const router = Router();

router.get("/health", getHealth);
router.post("/stream", ingestData);

export default router;
