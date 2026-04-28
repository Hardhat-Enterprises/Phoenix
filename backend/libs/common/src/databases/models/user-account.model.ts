import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface UserAccountAttributes {
  user_id: string;
  username: string;
  password_hashed: string;
  access_token: string;
  refresh_token: string;
  created_at?: Date;
  updated_at?: Date;
  role: string;
}

type UserCreationAttributes = Optional<
  UserAccountAttributes,
  | "user_id"
  | "username"
  | "password_hashed"
  | "access_token"
  | "refresh_token"
  | "created_at"
  | "updated_at"
  | "role"
  | "created_at"
  | "updated_at"
>;

export class UserAccount
  extends Model<UserAccountAttributes, UserCreationAttributes>
  implements UserAccountAttributes
{
  declare user_id: string;
  declare username: string;
  declare password_hashed: string;
  declare access_token: string;
  declare refresh_token: string;
  declare role: string;
  declare created_at: Date;
  declare updated_at: Date;
}

UserAccount.init(
  {
    user_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password_hashed: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    access_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    refresh_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
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
    tableName: "user_account",
    timestamps: false,
  },
);
