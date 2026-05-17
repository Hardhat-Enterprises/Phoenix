import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { threatHandlers } from "./grpc/threat.handler";

const PROTO_PATH = path.join(__dirname, "../../libs/proto/threat.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto: any = grpc.loadPackageDefinition(packageDefinition).threat;

const server = new grpc.Server();

server.addService(proto.ThreatService.service, threatHandlers);

server.bindAsync(
  "0.0.0.0:50052",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log("Threat service gRPC running on port 50052");
  }
);
