import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface ReferenceDayAttributes {
  ref_date: string;
  locale_id: number;
  dow: string;
  is_weekend: boolean;
  season: number;
  is_holiday: boolean;
}

export class ReferenceDay
  extends Model<ReferenceDayAttributes>
  implements ReferenceDayAttributes
{
  declare ref_date: string;
  declare locale_id: number;
  declare dow: string;
  declare is_weekend: boolean;
  declare season: number;
  declare is_holiday: boolean;
}

ReferenceDay.init(
  {
    ref_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      primaryKey: true,
    },
    locale_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    dow: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_weekend: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    season: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    is_holiday: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "reference_day",
    timestamps: false,
  },
);