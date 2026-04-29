import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface DataSourceAttributes {
  source_id: string;
  source_name?: string | null;
  source_type?: string | null;
  access_method?: string | null;
  source_url?: string | null;
}

type DataSourceCreationAttributes = Optional<
  DataSourceAttributes,
  "source_id" | "source_name" | "source_type" | "access_method" | "source_url"
>;

export class DataSource
  extends Model<DataSourceAttributes, DataSourceCreationAttributes>
  implements DataSourceAttributes
{
  declare source_id: string;
  declare source_name: string | null;
  declare source_type: string | null;
  declare access_method: string | null;
  declare source_url: string | null;
}

DataSource.init(
  {
    source_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    source_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    source_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    access_method: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    source_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "data_source",
    timestamps: false,
  },
);
