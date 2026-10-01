import { getChannel, logger } from "@phoenix/common";
import {
  coreModelIntegration,
  createCyberData,
  createHazardData,
} from "../services/ingestion.service";

export const consumeHazardData = async (queueName: string) => {
  const channel = getChannel();

  await channel.assertQueue(queueName, { durable: true });

  logger.info(
    `RabbitMQ hazard consumer started for queue: ${queueName}`,
  );

  channel.consume(
    queueName,
    async (msg) => {
      if (!msg) {
        logger.warn(
          `RabbitMQ hazard consumer received an empty message for queue: ${queueName}`,
        );
        return;
      }

      const content = msg.content.toString();

      logger.info(
        `RabbitMQ message received from queue: ${queueName}`,
      );

      try {
        await createHazardData(content);

        channel.ack(msg);

        logger.info(
          `RabbitMQ hazard message processed successfully from queue: ${queueName}`,
        );
      } catch (error) {
        logger.error(
          `RabbitMQ hazard message processing failed for queue ${queueName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
    { noAck: false },
  );
};

export const consumeCyberData = async (queueName: string) => {
  const channel = getChannel();

  await channel.assertQueue(queueName, { durable: true });

  logger.info(
    `RabbitMQ cyber consumer started for queue: ${queueName}`,
  );

  channel.consume(
    queueName,
    async (msg) => {
      if (!msg) {
        logger.warn(
          `RabbitMQ cyber consumer received an empty message for queue: ${queueName}`,
        );
        return;
      }

      const content = msg.content.toString();

      logger.info(
        `RabbitMQ message received from queue: ${queueName}`,
      );

      try {
        await createCyberData(content);

        channel.ack(msg);

        logger.info(
          `RabbitMQ cyber message processed successfully from queue: ${queueName}`,
        );
      } catch (error) {
        logger.error(
          `RabbitMQ cyber message processing failed for queue ${queueName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
    { noAck: false },
  );
};

export const consumeCoreModelIntegrationData = async (
  queueName: string,
) => {
  const channel = getChannel();

  await channel.assertQueue(queueName, { durable: true });

  logger.info(
    `RabbitMQ core model consumer started for queue: ${queueName}`,
  );

  channel.consume(
    queueName,
    async (msg) => {
      if (!msg) {
        logger.warn(
          `RabbitMQ core model consumer received an empty message for queue: ${queueName}`,
        );
        return;
      }

      const content = msg.content.toString();

      logger.info(
        `RabbitMQ message received from queue: ${queueName}`,
      );

      try {
        const payload = JSON.parse(content);

        await coreModelIntegration(payload);

        channel.ack(msg);

        logger.info(
          `RabbitMQ core model message processed successfully from queue: ${queueName}`,
        );
      } catch (error) {
        logger.error(
          `RabbitMQ core model message processing failed for queue ${queueName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        // Acknowledge invalid messages so they are not repeatedly
        // delivered and become stuck in the queue.
        channel.ack(msg);

        logger.warn(
          `RabbitMQ core model invalid message acknowledged and discarded from queue: ${queueName}`,
        );
      }
    },
    { noAck: false },
  );
};
