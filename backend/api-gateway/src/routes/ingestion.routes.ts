import { Router } from "express";
import { getHealth, ingestData, createHazard } from "../controllers/ingestion.controller";

const router = Router();

router.get("/health", getHealth);
router.post("/hazards", createHazard);

router.post("/", ingestData);

export default router;