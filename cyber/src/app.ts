import express from "express";
import dotenv from "dotenv";
import securityAlignedRoutes from "./routes/securityAlignedRoutes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

app.use(express.json());
app.get("/", (_req, res) => {
  res.send("Phoenix cyber backend is running");
});
app.use(securityAlignedRoutes);
app.get("/test-error", (_req, _res) => {
  throw new Error("Test error");
});
app.use(errorHandler);

export default app;