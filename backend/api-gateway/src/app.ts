// app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { config, connectRabbitMQ, logger } from "@phoenix/common";
import userRoutes from "./routes/user.routes";
import ingestionRoutes from "./routes/ingestion.routes";
import notificationRoutes from "./routes/notification.routes";
// import authRoutes from "./routes/auth.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// app.use("/auth", authRoutes);

app.get("/health", (_, res) => {
  logger.info(`${config.SERVICE_NAME} running on port ${config.PORT}`);
  res.json({ message: "API Gateway is running" });
});

app.use("/api/users", userRoutes);
app.use("/api/ingestion", ingestionRoutes);
app.use("/api/notifications", notificationRoutes);

const startServer = async () => {
  try {
    await connectRabbitMQ(process.env.RABBITMQ_URL!);
    (app.listen(config.PORT),
      () => {
        logger.info(`${config.SERVICE_NAME} running on port ${config.PORT}`);
      });
  } catch (error) {
    logger.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();
