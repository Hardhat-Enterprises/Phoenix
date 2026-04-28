import { Sequelize } from "sequelize";
import { config } from "../config/config";
import { logger } from "../config";
export const sequelize = new Sequelize({
  dialect: "postgres",
  host: config.POSTGRES_HOST,
  port: config.POSTGRES_PORT,
  username: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  database: config.POSTGRES_DB,
  logging: false,
});

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info(
      `PostgreSQL connected at: ${config.POSTGRES_HOST}:${config.POSTGRES_PORT}`,
    );
  } catch (error) {
    logger.error("Failed to connect to PostgreSQL:", error);
    throw error;
  }
}
