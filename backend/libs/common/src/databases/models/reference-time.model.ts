import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface ReferenceTimeAttributes {
  ref_time: string;
  is_nighttime: boolean;
  is_business_hours: boolean;
}

export class ReferenceTime
  extends Model<ReferenceTimeAttributes>
  implements ReferenceTimeAttributes
{
  declare ref_time: string;
  declare is_nighttime: boolean;
  declare is_business_hours: boolean;
}

ReferenceTime.init(
  {
    ref_time: {
      type: DataTypes.TIME,
      allowNull: false,
      primaryKey: true,
    },
    is_nighttime: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    is_business_hours: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "reference_time",
    timestamps: false,
  },
);