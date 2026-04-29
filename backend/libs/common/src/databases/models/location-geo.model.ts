import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface GeoLocationAttributes {
  geo_location_id: string;
  country?: string | null;
  state_region?: string | null;
  local_government_area?: string | null;
  suburb?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geo_precision?: string | null;
}

type GeoLocationCreationAttributes = Optional<
  GeoLocationAttributes,
  "geo_location_id"
>;

export class GeoLocation
  extends Model<GeoLocationAttributes, GeoLocationCreationAttributes>
  implements GeoLocationAttributes
{
  declare geo_location_id: string;
  declare country: string | null;
  declare state_region: string | null;
  declare local_government_area: string | null;
  declare suburb: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare geo_precision: string | null;
}

GeoLocation.init(
  {
    geo_location_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    state_region: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    local_government_area: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    suburb: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    geo_precision: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "geo_location",
    timestamps: false,
  }
);