import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

//const PROTO_PATH = path.resolve(process.cwd(), "libs/proto/ingestion.proto");
import fs from "fs";

const distPath = path.resolve(process.cwd(), 'dist/libs/proto/ingestion.proto');
const devPath = path.resolve(process.cwd(), 'libs/proto/ingestion.proto');

const PROTO_PATH = fs.existsSync(distPath) ? distPath : devPath;

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDefinition) as any;
const ingestionPackage = grpcObject.ingestion;

export const ingestionGrpcClient = new ingestionPackage.IngestionService(
  process.env.INGESTION_SERVICE_URL || "localhost:50053",
  grpc.credentials.createInsecure(),
);