interface Config {
  SERVICE_NAME: string;
  PORT: number;
  DEFAULT_TIMEOUT: number;
  AUTH_JWT_SECRET: string;
  GATEWAY_JWT_SECRET: string;
  GATEWAY_JWT_EXPIRES_IN: string;
  LOG_LEVEL: string;
  USER_SERVICE_PORT: number;
  REDIS_HOST: string;
  REDIS_PORT: number;
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
}

export const config: Config = {
  SERVICE_NAME: process.env.SERVICE_NAME || "phoenix-service",
  PORT: Number(process.env.PORT) || 3000,
  DEFAULT_TIMEOUT: Number(process.env.DEFAULT_TIMEOUT || "30000"),
  AUTH_JWT_SECRET:
    process.env.AUTH_JWT_SECRET || "your-default-auth-secret-key",
  GATEWAY_JWT_SECRET:
    process.env.GATEWAY_JWT_SECRET || "your-default-gateway-secret-key",
  GATEWAY_JWT_EXPIRES_IN: process.env.GATEWAY_JWT_EXPIRES_IN || "1m",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  USER_SERVICE_PORT: Number(process.env.USER_SERVICE_PORT) || 50051,
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
  POSTGRES_HOST: process.env.POSTGRES_HOST || "localhost",
  POSTGRES_PORT: Number(process.env.POSTGRES_PORT) || 5432,
  POSTGRES_USER: process.env.POSTGRES_USER || "phoenix_user",
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "phoenix_pass",
  POSTGRES_DB: process.env.POSTGRES_DB || "phoenix_db",
};
