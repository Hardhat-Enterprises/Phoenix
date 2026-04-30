import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface DataIngestionLogAttributes {
  ingestion_log_id: string;
  payload?: string | null;
  status?: string | null;
  fail_reason?: string | null;
}

type DataIngestionLogCreationAttributes = Optional<
  DataIngestionLogAttributes,
  "ingestion_log_id" | "payload" | "status" | "fail_reason"
>;

export class DataIngestionLog
  extends Model<DataIngestionLogAttributes, DataIngestionLogCreationAttributes>
  implements DataIngestionLogAttributes
{
  declare ingestion_log_id: string;
  declare payload: string | null;
  declare status: string | null;
  declare fail_reason: string | null;
}

DataIngestionLog.init(
  {
    ingestion_log_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    payload: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    fail_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "data_ingestion_log",
    timestamps: false,
  },
);
