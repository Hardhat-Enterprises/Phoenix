import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface EventStatusAttributes {
  event_status_id: string;
  event_status_description: string;
}

type EventStatusCreationAttributes = Optional<
  EventStatusAttributes,
  "event_status_id"
>;

export class EventStatus
  extends Model<EventStatusAttributes, EventStatusCreationAttributes>
  implements EventStatusAttributes
{
  declare event_status_id: string;
  declare event_status_description: string;
}

EventStatus.init(
  {
    event_status_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    event_status_description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "event_status",
    timestamps: false,
  }
);