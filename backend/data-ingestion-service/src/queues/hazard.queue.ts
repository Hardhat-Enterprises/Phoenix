import amqp from "amqplib";
import { logger } from "@phoenix/common";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const HAZARD_QUEUE = "hazard.creation.queue";

export const publishHazardToQueue = async (data: any): Promise<string> => {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertQueue(HAZARD_QUEUE, { durable: true });

  const ingestionId = `hazard-${Date.now()}`;

  const message = {
    ingestionId,
    data,
    createdAt: new Date().toISOString(),
  };

  channel.sendToQueue(
    HAZARD_QUEUE,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );

  logger.info(`[SUCCESS] Hazard data published to RabbitMQ. ingestionId=${ingestionId}`);

  await channel.close();
  await connection.close();

  return ingestionId;
};