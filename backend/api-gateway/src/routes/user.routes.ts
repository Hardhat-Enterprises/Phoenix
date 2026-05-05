import { Router } from "express";
import { getHealth, getUser } from "../controllers/user.controller";
import { getThreats, getThreat } from "../controllers/threat.controller";
import { getHazards, getHazard } from "../controllers/hazard.controller";
import { cache } from "../../../libs/common/src/redis/cache.middleware";

const router = Router();

router.get("/health", getHealth);
router.get("/user", getUser);

// Example: GET /api/users
router.get(
  "/",
  cache({ ttl: 120, keyPrefix: "users" }),
  async (req, res) => {
    const users = router.get("/user", getUser); 
    res.json(users);
  }
);

router.get("/threats", getThreats);
router.get("/threats/:threatId", getThreat);

router.get("/hazards", getHazards);
router.get("/hazards/:hazardId", getHazard);

export default router;
