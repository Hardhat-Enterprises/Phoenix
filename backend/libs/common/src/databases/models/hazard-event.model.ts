import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface HazardEventAttributes {
  hazard_event_id: string;
  hazard_type: string;
  severity_level: "low" | "medium" | "high" | "critical";
  event_status: string;
  start_time: Date;
  end_time?: Date | null;
  geo_location_id?: string | null;
  source_id?: string | null;
  source_ref_event?: string | null;
  description?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type HazardEventCreationAttributes = Optional<
  HazardEventAttributes,
  | "hazard_event_id"
  | "end_time"
  | "geo_location_id"
  | "source_id"
  | "source_ref_event"
  | "description"
  | "created_at"
  | "updated_at"
>;

export class HazardEvent
  extends Model<HazardEventAttributes, HazardEventCreationAttributes>
  implements HazardEventAttributes
{
  declare hazard_event_id: string;
  declare hazard_type: string;
  declare severity_level: "low" | "medium" | "high" | "critical";
  declare event_status: string;
  declare start_time: Date;
  declare end_time: Date | null;
  declare geo_location_id: string | null;
  declare source_id: string | null;
  declare source_ref_event: string | null;
  declare description: string | null;
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
    hazard_type: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    severity_level: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        isIn: [["low", "medium", "high", "critical"]],
      },
    },
    event_status: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    geo_location_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    source_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    source_ref_event: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
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
    tableName: "hazard_event",
    timestamps: false,
  }
);