import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

interface Config {
  SERVICE_NAME: string;
  PORT: number;
  DEFAULT_TIMEOUT: number;
  AUTH_JWT_SECRET: string;
  LOG_LEVEL: string;
  USER_SERVICE_PORT: number;
  NOTIFICATION_SERVICE_PORT: number;
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
}

export const config: Config = {
  SERVICE_NAME: require(path.resolve(process.cwd(), "package.json")).name,
  PORT: Number(process.env.PORT) || 3000,
  DEFAULT_TIMEOUT: Number(process.env.DEFAULT_TIMEOUT) || 30000,
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET as string,
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  USER_SERVICE_PORT: Number(process.env.USER_SERVICE_PORT) || 50051,
  NOTIFICATION_SERVICE_PORT:
    Number(process.env.NOTIFICATION_SERVICE_PORT) || 50052,
  POSTGRES_HOST: process.env.POSTGRES_HOST as string,
  POSTGRES_PORT: Number(process.env.POSTGRES_PORT) || 5432,
  POSTGRES_USER: process.env.POSTGRES_USER as string,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD as string,
  POSTGRES_DB: process.env.POSTGRES_DB as string,
};
