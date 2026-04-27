import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface ThreatLocationAttributes {
  threat_id: number;
  geo_location_id: string;
}

export class ThreatLocation
  extends Model<ThreatLocationAttributes>
  implements ThreatLocationAttributes
{
  declare threat_id: number;
  declare geo_location_id: string;
}

ThreatLocation.init(
  {
    threat_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    geo_location_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    sequelize,
    tableName: "threat_location",
    timestamps: false,
  }
);