import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface UserAttributes {
  id: number;
  name: string;
  email: string;
  created_at?: Date;
  updated_at?: Date;
}

type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "created_at" | "updated_at"
>;

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: number;
  declare name: string;
  declare email: string;
  declare created_at: Date;
  declare updated_at: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
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
    tableName: "users",
    timestamps: false,
  },
);
