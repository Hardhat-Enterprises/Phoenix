import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

type IngestionType = "hazard" | "cyber_threat";
type ProcessingStatus = "received" | "processing" | "processed" | "failed";

interface DataIngestionStreamingLogAttributes {
  ingestion_log_id: string;
  source_id?: string | null;
  ingestion_type: IngestionType;
  payload?: object | null;
  processing_status: ProcessingStatus;
  fail_reason?: string | null;
  received_at?: Date;
  processed_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

type DataIngestionStreamingLogCreationAttributes = Optional<
  DataIngestionStreamingLogAttributes,
  | "ingestion_log_id"
  | "source_id"
  | "payload"
  | "processing_status"
  | "fail_reason"
  | "received_at"
  | "processed_at"
  | "created_at"
  | "updated_at"
>;

export class DataIngestionStreamingLog
  extends Model<
    DataIngestionStreamingLogAttributes,
    DataIngestionStreamingLogCreationAttributes
  >
  implements DataIngestionStreamingLogAttributes
{
  declare ingestion_log_id: string;
  declare source_id: string | null;
  declare ingestion_type: IngestionType;
  declare payload: object | null;
  declare processing_status: ProcessingStatus;
  declare fail_reason: string | null;
  declare received_at: Date;
  declare processed_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;
}

DataIngestionStreamingLog.init(
  {
    ingestion_log_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    source_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "data_source",
        key: "source_id",
      },
    },
    ingestion_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [["hazard", "cyber_threat"]],
      },
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    processing_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "received",
      validate: {
        isIn: [["received", "processing", "processed", "failed"]],
      },
    },
    fail_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    received_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "data_ingestion_streaming_log",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
