// app.ts

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
<<<<<<< HEAD
import { config, connectRabbitMQ, logger } from "@phoenix/common";
import userRoutes from "./routes/user.routes";
import ingestionRoutes from "./routes/ingestion.routes";
import notificationRoutes from "./routes/notification.routes";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@phoenix/common";
// import authRoutes from "./routes/auth.routes";
=======

import { config, logger } from "@phoenix/common";

import userRoutes from "./routes/user.routes";
import threatRoutes from "./routes/threat.routes";
>>>>>>> c6d91c741380a9aca25e00ebe6a6751181daa0c2

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

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

<<<<<<< HEAD
app.use("/api/users", userRoutes);
app.use("/api/ingestion", ingestionRoutes);
app.use("/api/notifications", notificationRoutes);

const startServer = async () => {
  await connectRabbitMQ(process.env.RABBITMQ_URL!);
=======
app.use("/api/threats", threatRoutes);

app.use("/api/data-ingestion", threatRoutes);

const startServer = () => {
>>>>>>> c6d91c741380a9aca25e00ebe6a6751181daa0c2
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
