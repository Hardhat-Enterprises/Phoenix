import amqp, { ChannelModel, ConfirmChannel } from "amqplib";
import { logger } from "@phoenix/common";

export interface NotificationRabbitMQConnection {
  connection: ChannelModel;
  channel: ConfirmChannel;
}

export const connectNotificationRabbitMQ = async (
  url: string,
): Promise<NotificationRabbitMQConnection> => {
  try {
    const connection = await amqp.connect(url);
    const channel = await connection.createConfirmChannel();
    logger.info("Notification service connected to RabbitMQ");
    return { connection, channel };
  } catch (error) {
    logger.error(`Notification service RabbitMQ connection failed: ${error}`);
    throw error;
  }
};
