import { Sequelize } from "sequelize";
import { config } from "../config/config";
import { logger } from "../config";
export const sequelize = new Sequelize(config.SUPABASE_CONNECTION_STRING, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info(
      `PostgreSQL connected at: ${config.SUPABASE_CONNECTION_STRING}`,
    );
  } catch (error) {
    logger.error("Failed to connect to PostgreSQL:", error);
    throw error;
  }
}
