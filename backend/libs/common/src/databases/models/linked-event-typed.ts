import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface LinkedEventTypeAttributes {
  linked_event_type_id: string;
  linked_event_type_description?: string | null;
}

type LinkedEventTypeCreationAttributes = Optional<
  LinkedEventTypeAttributes,
  "linked_event_type_id" | "linked_event_type_description"
>;

export class LinkedEventType
  extends Model<LinkedEventTypeAttributes, LinkedEventTypeCreationAttributes>
  implements LinkedEventTypeAttributes
{
  declare linked_event_type_id: string;
  declare linked_event_type_description: string | null;
}

LinkedEventType.init(
  {
    linked_event_type_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    linked_event_type_description: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "linked_event_type",
    timestamps: false,
  },
);
