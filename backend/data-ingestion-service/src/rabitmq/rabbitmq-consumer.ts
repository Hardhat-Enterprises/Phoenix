import { getChannel } from "@phoenix/common";
import {
  createCyberData,
  createHazardData,
} from "../services/ingestion.service";

export const consumeHazardData = async (queueName: string) => {
  const channel = getChannel();
  await channel.assertQueue(queueName, { durable: true });
  channel.consume(
    queueName,
    async (msg) => {
      if (msg) {
        const content = msg.content.toString();
        console.log(`Received message from ${queueName}:`, content);
        await createHazardData(content);
        // Acknowledge the message after processing
        channel.ack(msg);
      }
    },
    { noAck: false },
  );
};

export const consumeCyberData = async (queueName: string) => {
  const channel = getChannel();
  await channel.assertQueue(queueName, { durable: true });
  channel.consume(
    queueName,
    async (msg) => {
      if (msg) {
        const content = msg.content.toString();
        console.log(`Received message from ${queueName}:`, content);
        await createCyberData(content);
        // Acknowledge the message after processing
        channel.ack(msg);
      }
    },
    { noAck: false },
  );
};
