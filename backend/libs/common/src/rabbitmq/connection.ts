import amqp, { Channel } from "amqplib";

let channel: Channel;

export async function connectRabbitMQ(url: string): Promise<Channel> {
  const connection = await amqp.connect(url);
  channel = await connection.createChannel();

  console.log("RabbitMQ connected");

  return channel;
}

export function getChannel(): Channel {
  if (!channel) {
    throw new Error("RabbitMQ not connected");
  }

  return channel;
}
