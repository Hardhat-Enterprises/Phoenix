import { getChannel, logger } from "@phoenix/common";
import {
  coreModelIntegration,
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

export const consumeCoreModelIntegrationData = async (queueName: string) => {
  const channel = getChannel();
  await channel.assertQueue(queueName, { durable: true });
  channel.consume(
    queueName,
    async (msg) => {
      if (msg) {
        try {
          const content = msg.content.toString();
          logger.info(
            `Received ADCRS integration message ${msg.properties.messageId || "without-id"}`,
          );
          await coreModelIntegration(JSON.parse(content));
          channel.ack(msg);
        } catch (error) {
          logger.error(`Rejected invalid ADCRS integration message: ${error}`);
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false },
  );
};
