import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database"; // adjust if needed

class DataIngestionStreamingLog extends Model {}

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
    },
    ingestion_type: {
      type: DataTypes.ENUM("hazard", "cyber_threat", "risk_assessment"),
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSONB,
    },
    processing_status: {
      type: DataTypes.ENUM("received", "processing", "processed", "failed"),
      defaultValue: "received",
    },
    fail_reason: {
      type: DataTypes.TEXT,
    },
    received_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    processed_at: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    tableName: "data_ingestion_streaming_log",
    timestamps: false,
  }
);

export default DataIngestionStreamingLog;