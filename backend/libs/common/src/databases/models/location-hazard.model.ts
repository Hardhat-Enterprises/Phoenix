import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface HazardLocationAttributes {
  hazard_event_id: string;
  geo_location_id: string;
}

export class HazardLocation
  extends Model<HazardLocationAttributes>
  implements HazardLocationAttributes
{
  declare hazard_event_id: string;
  declare geo_location_id: string;
}

HazardLocation.init(
  {
    hazard_event_id: {
      type: DataTypes.UUID,
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
    tableName: "hazard_location",
    timestamps: false,
  }
);