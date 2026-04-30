import * as path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as dotenv from "dotenv";
import { ingestionHandler } from "./grpc/ingestion.handler";
import { connectRabbitMQ, logger, RabbitMQQueueType } from "@phoenix/common";
import {
  consumeCyberData,
  consumeHazardData,
} from "./rabitmq/rabbitmq-consumer";

dotenv.config();

//const PROTO_PATH = path.resolve(process.cwd(), "libs/proto/ingestion.proto");
const PROTO_PATH = path.resolve(`${process.env.INGESTION_PROTO_PATH}`);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDefinition) as any;
const ingestionPackage = grpcObject.ingestion;

const startGrpcServer = async () => {
  try {
    logger.info(`Connecting to RabbitMQ at ${process.env.RABBITMQ_URL}`);
    await connectRabbitMQ(process.env.RABBITMQ_URL!);
    await consumeHazardData(RabbitMQQueueType.HAZARD_CREATION_QUEUE);
    await consumeCyberData(RabbitMQQueueType.CYBER_CREATION_QUEUE);
    const server = new grpc.Server();

    server.addService(
      ingestionPackage.IngestionService.service,
      ingestionHandler,
    );

    const port = process.env.INGESTION_SERVICE_PORT || "50053";

    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          console.error("Failed to start data-ingestion-service:", error);
          return;
        }
        console.log(`Data ingestion service gRPC running on port ${boundPort}`);
      },
    );
  } catch (error) {
    logger.error("Failed to start data-ingestion-service:", error);
    process.exit(1);
  }
};

startGrpcServer();
