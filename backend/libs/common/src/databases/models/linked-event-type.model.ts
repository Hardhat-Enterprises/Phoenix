import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface LinkedEventTypeAttributes {
  linked_event_type_id: string;
  linked_event_type_description: string;
}

type LinkedEventTypeCreationAttributes = Optional<
  LinkedEventTypeAttributes,
  "linked_event_type_id"
>;

export class LinkedEventType
  extends Model<LinkedEventTypeAttributes, LinkedEventTypeCreationAttributes>
  implements LinkedEventTypeAttributes
{
  declare linked_event_type_id: string;
  declare linked_event_type_description: string;
}

LinkedEventType.init(
  {
    linked_event_type_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    linked_event_type_description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "linked_event_type",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
