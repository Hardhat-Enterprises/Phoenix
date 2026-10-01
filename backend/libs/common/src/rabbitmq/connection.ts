import amqp, { Channel, ChannelModel } from "amqplib";
import { logger } from "../config/logger";

let channel: Channel;
let connection: ChannelModel;
let rabbitMQConnected = false;

export async function connectRabbitMQ(url: string): Promise<Channel> {
  connection = await amqp.connect(url);
  channel = await connection.createChannel();

  rabbitMQConnected = true;

  connection.on("error", (error) => {
    rabbitMQConnected = false;

    logger.error(
      `RabbitMQ connection error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  });

  connection.on("close", () => {
    rabbitMQConnected = false;

    logger.error("RabbitMQ connection closed");
  });

  logger.info("RabbitMQ connected");

  return channel;
}

export function getChannel(): Channel {
  if (!channel || !rabbitMQConnected) {
    throw new Error("RabbitMQ not connected");
  }

  return channel;
}

export function isRabbitMQConnected(): boolean {
  return rabbitMQConnected;
}
