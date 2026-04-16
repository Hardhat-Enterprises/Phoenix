import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface RiskAssessmentAttributes {
  integration_event_id: string;
  related_hazard_event_id?: string | null;
  related_threat_id?: number | null;
  correlation_score?: number | null;
  linkage_reason?: string | null;
  integration_confidence?: number | null;
  linked_event_type?: number | null;
  event_status?: number | null;
  event_time?: Date | null;
  detected_at?: Date | null;
  reported_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

type RiskAssessmentCreationAttributes = Optional<
  RiskAssessmentAttributes,
  | "integration_event_id"
  | "related_hazard_event_id"
  | "related_threat_id"
  | "correlation_score"
  | "linkage_reason"
  | "integration_confidence"
  | "linked_event_type"
  | "event_status"
  | "event_time"
  | "detected_at"
  | "reported_at"
  | "created_at"
  | "updated_at"
>;

export class RiskAssessment
  extends Model<RiskAssessmentAttributes, RiskAssessmentCreationAttributes>
  implements RiskAssessmentAttributes
{
  declare integration_event_id: string;
  declare related_hazard_event_id: string | null;
  declare related_threat_id: number | null;
  declare correlation_score: number | null;
  declare linkage_reason: string | null;
  declare integration_confidence: number | null;
  declare linked_event_type: number | null;
  declare event_status: number | null;
  declare event_time: Date | null;
  declare detected_at: Date | null;
  declare reported_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;
}

RiskAssessment.init(
  {
    integration_event_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    related_hazard_event_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    related_threat_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    correlation_score: {
      type: DataTypes.REAL,
      allowNull: true,
    },
    linkage_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    integration_confidence: {
      type: DataTypes.REAL,
      allowNull: true,
    },
    linked_event_type: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    event_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    event_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    detected_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reported_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: "risk_assessment",
    timestamps: false,
  }
);