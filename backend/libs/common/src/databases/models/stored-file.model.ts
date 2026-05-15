import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface StoredFileAttributes {
  file_id: string;
  original_name: string;
  mime_type: string;
  size: number;
  file_data: Buffer;
  created_at?: Date;
  updated_at?: Date;
}

type StoredFileCreationAttributes = Optional<
  StoredFileAttributes,
  | "file_id"
  | "original_name"
  | "mime_type"
  | "size"
  | "file_data"
  | "created_at"
  | "updated_at"
>;

export class StoredFile
  extends Model<StoredFileAttributes, StoredFileCreationAttributes>
  implements StoredFileAttributes
{
  declare file_id: string;
  declare original_name: string;
  declare mime_type: string;
  declare size: number;
  declare file_data: Buffer;
  declare created_at: Date;
  declare updated_at: Date;
}

StoredFile.init(
  {
    file_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    original_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    file_data: {
      type: DataTypes.BLOB("long"),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "stored_file",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
