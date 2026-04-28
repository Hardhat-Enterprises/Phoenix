import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

export class ReferenceTime extends Model {
  declare ref_time: string;
  declare is_nighttime: boolean;
  declare is_business_hours: boolean;
}

ReferenceTime.init(
  {
    ref_time: {
      type: DataTypes.TIME,
      primaryKey: true,
    },
    is_nighttime: {
      type: DataTypes.BOOLEAN,
    },
    is_business_hours: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    sequelize,
    tableName: "reference_time",
    timestamps: false,
  },
);
