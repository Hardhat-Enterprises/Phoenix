import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface CyberThreatAttributes {
  threat_id: number;
  threat_type: string;
  source_id?: number | null;
  title?: string | null;
  description?: string | null;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  status: "Active" | "Monitoring" | "Resolved" | "Archived";
  category?: string | null;
  confidence_score?: number | null;
  detected_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

type CyberThreatCreationAttributes = Optional<
  CyberThreatAttributes,
  | "threat_id"
  | "source_id"
  | "title"
  | "description"
  | "category"
  | "confidence_score"
  | "created_at"
  | "updated_at"
>;

export class CyberThreat
  extends Model<CyberThreatAttributes, CyberThreatCreationAttributes>
  implements CyberThreatAttributes
{
  declare threat_id: number;
  declare threat_type: string;
  declare source_id: number | null;
  declare title: string | null;
  declare description: string | null;
  declare risk_level: "Low" | "Medium" | "High" | "Critical";
  declare status: "Active" | "Monitoring" | "Resolved" | "Archived";
  declare category: string | null;
  declare confidence_score: number | null;
  declare detected_at: Date;
  declare created_at: Date;
  declare updated_at: Date;
}

CyberThreat.init(
  {
    threat_id: {
      type: DataTypes.UUID,
      autoIncrement: true,
      primaryKey: true,
    },
    threat_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    source_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    risk_level: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [["Low", "Medium", "High", "Critical"]],
      },
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [["Active", "Monitoring", "Resolved", "Archived"]],
      },
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    confidence_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    detected_at: {
      type: DataTypes.DATE,
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
    timestamps: false,
  },
);
