// app.ts

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { config, logger } from "@phoenix/common";

import userRoutes from "./routes/user.routes";
import threatRoutes from "./routes/threat.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  logger.info(`${config.SERVICE_NAME} running on port ${config.PORT}`);

  res.json({
    message: "API Gateway is running",
  });
});

app.use("/api/users", userRoutes);

app.use("/api/threats", threatRoutes);

app.use("/api/data-ingestion", threatRoutes);

const startServer = () => {
  try {
    app.listen(config.PORT, () => {
      logger.info(
        `${config.SERVICE_NAME} running on port ${config.PORT}`
      );
    });
  } catch (error) {
    logger.error("Error starting server:", error);

    process.exit(1);
  }
};

startServer();
