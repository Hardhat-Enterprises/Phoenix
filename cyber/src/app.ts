import express from "express";
import dotenv from "dotenv";
import securityAlignedRoutes from "./routes/securityAlignedRoutes";
import { authenticateToken } from "./middleware/auth.ts";
import { errorHandler } from "./middleware/errorHandler";
import { loginRateLimit } from "./middleware/rateLimit";
import { requireRole } from "./middleware/rbac.ts";
import { validate } from "./middleware/validate.ts";
import { loginSchema } from "./schemas/authSchemas.ts";
dotenv.config();

const app = express();

app.use(express.json());
app.get("/", (_req, res) => {
  res.send("Phoenix cyber backend is running");
});
app.get("/cyber/protected-test", authenticateToken, (req, res) => {
  res.json({
    status: 200,
    message: "Token accepted",
    user: req.user,
  });
});

app.use(securityAlignedRoutes);

app.post("/cyber/validation-test", validate(loginSchema), (req, res) => {
  res.json({
    status: 200,
    message: "Validation passed",
    data: req.body,
  });
});

app.get("/test-error", (_req, _res) => {
  throw new Error("Test error");
});
app.use(errorHandler);

app.get("/cyber/rate-limit-test", loginRateLimit, (_req, res) => {
  res.json({
    status: 200,
    message: "Request allowed",
    data: [],
  });
});

app.get(
  "/cyber/admin-test",
  authenticateToken,
  requireRole(["system_admin"]),
  (req, res) => {
    res.json({
      status: 200,
      message: "Access granted",
      user: req.user,
    });
  }
);

export default app;