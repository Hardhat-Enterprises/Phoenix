// app.ts

import express from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import {
  config,
  connectRabbitMQ,
  connectRedis,
  logger,
} from "@phoenix/common";

import userRoutes from "./routes/user.routes";
import ingestionRoutes from "./routes/ingestion.routes";
import notificationRoutes from "./routes/notification.routes";
import threatRoutes from "./routes/threat.routes";
import storageRoutes from "./routes/storage.routes";

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "@phoenix/common";
import { setNotificationWebSocketGateway } from "./controllers/notification.controller";
import { startNotificationRealtimeConsumer } from "./realtime/notification-realtime-consumer";
import { NotificationWebSocketGateway } from "./realtime/notification-websocket";

// import authRoutes from "./routes/auth.routes";

dotenv.config();

const app = express();
const server = createServer(app);
const notificationWebSocketGateway = new NotificationWebSocketGateway(server);
setNotificationWebSocketGateway(notificationWebSocketGateway);

app.use(cors());
app.use(express.json());

// app.use("/auth", authRoutes);

app.get("/health", (_, res) => {
  logger.info(`${config.SERVICE_NAME} running on port ${config.PORT}`);
  res.json({ message: "API Gateway is running" });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/users", userRoutes);
app.use("/api/users/threats", threatRoutes);
app.use("/api/ingestion", ingestionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/storage", storageRoutes);

const startServer = async () => {
  try {
    // Required dependency
    const channel = await connectRabbitMQ(process.env.RABBITMQ_URL!);
    await startNotificationRealtimeConsumer(
      channel,
      (notification) => notificationWebSocketGateway.broadcastCreated(notification),
    );

    // Optional dependency
    const redisAvailable = await connectRedis();

    if (redisAvailable) {
      logger.info("Redis connected successfully.");
    } else {
      logger.warn(
        "Redis unavailable. Continuing without cache.",
      );
    }

    server.listen(config.PORT, () => {
      logger.info(
        `${config.SERVICE_NAME} running on port ${config.PORT}`,
      );
    });
  } catch (error) {
    logger.error(`Error starting server: ${error}`);
    process.exit(1);
  }
};

startServer();
