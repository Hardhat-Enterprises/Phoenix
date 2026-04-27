import * as path from "path";

interface Config {
  SERVICE_NAME: string;
  PORT: number;
  DEFAULT_TIMEOUT: number;
  AUTH_JWT_SECRET: string;
  GATEWAY_JWT_SECRET: string;
  GATEWAY_JWT_EXPIRES_IN: string;
  LOG_LEVEL: string;
  USER_SERVICE_PORT: number;
  SQLITE_STORAGE_PATH: string;
}

export const config: Config = {
  SERVICE_NAME: require(path.resolve(process.cwd(), "package.json")).name,
  PORT: Number(process.env.PORT) || 3000,
  DEFAULT_TIMEOUT: Number(process.env.DEFAULT_TIMEOUT || "30000"),
  AUTH_JWT_SECRET:
    process.env.AUTH_JWT_SECRET || "your-default-auth-secret-key",
  GATEWAY_JWT_SECRET:
    process.env.GATEWAY_JWT_SECRET || "your-default-gateway-secret-key",
  GATEWAY_JWT_EXPIRES_IN: process.env.GATEWAY_JWT_EXPIRES_IN || "1m",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  USER_SERVICE_PORT: Number(process.env.USER_SERVICE_PORT) || 50051,
  SQLITE_STORAGE_PATH:
    process.env.SQLITE_STORAGE_PATH || "./database/phoenix.sqlite",
};