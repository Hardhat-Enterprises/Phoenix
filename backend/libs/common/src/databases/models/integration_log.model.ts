import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

type IntegrationType = "core" | "anomaly" | "time-series";
type IntegrationStatus = "created" | "processing" | "completed" | "error";

interface IntegrationLogAttributes {
  integration_event_id: string;
  integration_type: IntegrationType;
  input?: string | null;
  output?: string | null;
  status: IntegrationStatus;
  note?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type IntegrationLogCreationAttributes = Optional<
  IntegrationLogAttributes,
  | "integration_event_id"
  | "input"
  | "output"
  | "note"
  | "created_at"
  | "updated_at"
>;

export class IntegrationLog
  extends Model<IntegrationLogAttributes, IntegrationLogCreationAttributes>
  implements IntegrationLogAttributes
{
  declare integration_event_id: string;
  declare integration_type: IntegrationType;
  declare input: string | null;
  declare output: string | null;
  declare status: IntegrationStatus;
  declare note: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

IntegrationLog.init(
  {
    integration_event_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    integration_type: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        isIn: [["core", "anomaly", "time-series"]],
      },
    },
    input: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    output: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        isIn: [["created", "processing", "completed", "error"]],
      },
    },
    note: {
      type: DataTypes.TEXT,
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
    tableName: "integration_log",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
