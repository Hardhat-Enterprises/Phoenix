import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface HazardEventAttributes {
  hazard_event_id: string;
  url: string;
  text: string;
  timestamp: Date;
  hazard_type: string;
  hazard_severity: number;
  hazard_timestamp: Date;
  hazard_location: string;
  hazard_status: string;
  alert_level: string;
  source: string;
  created_at?: Date;
  updated_at?: Date;
}

type HazardEventCreationAttributes = Optional<
  HazardEventAttributes,
  "hazard_event_id" | "created_at" | "updated_at"
>;

export class HazardEvent
  extends Model<HazardEventAttributes, HazardEventCreationAttributes>
  implements HazardEventAttributes
{
  declare hazard_event_id: string;
  declare url: string;
  declare text: string;
  declare timestamp: Date;
  declare hazard_type: string;
  declare hazard_severity: number;
  declare hazard_timestamp: Date;
  declare hazard_location: string;
  declare hazard_status: string;
  declare alert_level: string;
  declare source: string;
  declare created_at: Date;
  declare updated_at: Date;
}

HazardEvent.init(
  {
    hazard_event_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    hazard_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    hazard_severity: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
    },
    hazard_timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    hazard_location: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    hazard_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    alert_level: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
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
    tableName: "hazard_event",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
