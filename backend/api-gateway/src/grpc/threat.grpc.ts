import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

const PROTO_PATH = path.join(__dirname, "../../../libs/proto/threat.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto: any = grpc.loadPackageDefinition(packageDefinition).threat;

export const threatGrpcClient = new proto.ThreatService(
  "localhost:50052",
  grpc.credentials.createInsecure()
);
