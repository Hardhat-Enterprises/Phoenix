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
  STORAGE_SERVICE_PORT: number;
  NOTIFICATION_SERVICE_PORT: number;
  SUPABASE_CONNECTION_STRING: string;
}

export const config: Config = {
  SERVICE_NAME: require(path.resolve(process.cwd(), "package.json")).name,
  PORT: Number(process.env.PORT) || 3000,
  DEFAULT_TIMEOUT: Number(process.env.DEFAULT_TIMEOUT) || 30000,
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET as string,
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  USER_SERVICE_PORT: Number(process.env.USER_SERVICE_PORT) || 50051,
  STORAGE_SERVICE_PORT: Number(process.env.STORAGE_SERVICE_PORT) || 50054,
  NOTIFICATION_SERVICE_PORT:
    Number(process.env.NOTIFICATION_SERVICE_PORT) || 50052,
  SUPABASE_CONNECTION_STRING: process.env.SUPABASE_CONNECTION_STRING as string,
};
