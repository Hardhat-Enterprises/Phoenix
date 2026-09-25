import { Router } from "express";
import { cacheMetrics } from "@phoenix/common/redis/cacheMetrics";

const router = Router();

router.get("/cache-metrics",
(req,res)=>{
    res.json(
        cacheMetrics.getMetrics()
    );
});