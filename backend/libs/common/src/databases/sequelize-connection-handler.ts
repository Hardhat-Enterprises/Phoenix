import { Sequelize } from "sequelize";
import { config } from "../config/config";

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: config.SQLITE_STORAGE_PATH,
  logging: false,
});

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log(`SQLite connected at: ${config.SQLITE_STORAGE_PATH}`);
  } catch (error) {
    console.error("Failed to connect to SQLite:", error);
    throw error;
  }
}