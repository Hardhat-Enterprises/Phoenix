import * as path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as dotenv from "dotenv";

import { logger } from "@phoenix/common";

import { correlationHandler } from "./grpc/correlation.handler";

dotenv.config();

const PROTO_PATH = path.resolve(
  process.env.CORRELATION_PROTO_PATH ||
    "dist/libs/proto/correlation.proto",
);

const packageDefinition =
  protoLoader.loadSync(
    PROTO_PATH,
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    },
  );

const grpcObject = grpc.loadPackageDefinition(
  packageDefinition,
) as any;

const correlationPackage =
  grpcObject.correlation;

const startGrpcServer = async () => {
  try {
    const server = new grpc.Server();

    server.addService(
      correlationPackage.CorrelationService.service,
      correlationHandler,
    );

    const port =
      process.env.CORRELATION_SERVICE_PORT ||
      "50055";

    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          logger.error(
            `Failed to start correlation-service: ${error}`,
          );

          process.exit(1);
        }

        logger.info(
          `Correlation service gRPC running on port ${boundPort}`,
        );
      },
    );
  } catch (error) {
    logger.error(
      `Failed to start correlation-service: ${error}`,
    );

    process.exit(1);
  }
};

startGrpcServer();