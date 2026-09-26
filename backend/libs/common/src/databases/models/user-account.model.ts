import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface UserAccountAttributes {
  user_id: string;
  username: string;
  password_hashed: string;
  access_token?: string | null;
  refresh_token?: string | null;
  created_at?: Date;
  updated_at?: Date;
  role: string;
  is_disabled?: boolean;
  disabled_by?: string | null;
  disabled_at?: Date | null;
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
  | "is_disabled"
  | "disabled_by"
  | "disabled_at"
>;

export class UserAccount
  extends Model<UserAccountAttributes, UserCreationAttributes>
  implements UserAccountAttributes
{
  declare user_id: string;
  declare username: string;
  declare password_hashed: string;
  declare access_token: string | null;
  declare refresh_token: string | null;
  declare role: string;
  declare created_at: Date;
  declare updated_at: Date;
  declare is_disabled: boolean;
  declare disabled_by: string | null;
  declare disabled_at: Date | null;
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
    is_disabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    disabled_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "user_account", key: "user_id" },
      onDelete: "SET NULL",
    },
    disabled_at: {
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
    tableName: "user_account",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
