import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface CyberThreatAttributes {
  threat_id: string;
  event_id: string;
  timestamp: Date;
  event_type: "cyber";
  source: string;
  threat_type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence_score: number;
  details: string;
  created_at?: Date;
  updated_at?: Date;
}

type CyberThreatCreationAttributes = Optional<
  CyberThreatAttributes,
  | "threat_id"
  | "event_id"
  | "timestamp"
  | "event_type"
  | "source"
  | "threat_type"
  | "severity"
  | "confidence_score"
  | "details"
  | "created_at"
  | "updated_at"
>;

export class CyberThreat
  extends Model<CyberThreatAttributes, CyberThreatCreationAttributes>
  implements CyberThreatAttributes
{
  declare threat_id: string;
  declare event_id: string;
  declare timestamp: Date;
  declare event_type: "cyber";
  declare source: string;
  declare threat_type: string;
  declare severity: "low" | "medium" | "high" | "critical";
  declare confidence_score: number;
  declare details: string;
  declare created_at: Date;
  declare updated_at: Date;
}

CyberThreat.init(
  {
    threat_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    event_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [["cyber"]],
      },
    },
    source: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    threat_type: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    severity: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [["low", "medium", "high", "critical"]],
      },
    },
    confidence_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "cyber_threat",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
