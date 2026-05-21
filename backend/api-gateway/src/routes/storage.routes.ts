import { Router } from "express";
import { getHealth, uploadFile } from "../controllers/storage.controller";
import multer from "multer";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/health", getHealth);

const upload = multer({ dest: "uploads/" });
router.post("/upload", authenticate, upload.single("file"), uploadFile);
export default router;
