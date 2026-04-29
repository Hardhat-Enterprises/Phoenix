import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

export class ReferenceDay extends Model {
  declare ref_date: Date;
  declare locale_id: number;
  declare dow: string;
  declare is_weekend: boolean;
  declare season: number;
  declare is_holiday: boolean;
}

ReferenceDay.init(
  {
    ref_date: {
      type: DataTypes.DATE,
      primaryKey: true,
    },
    locale_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    dow: {
      type: DataTypes.STRING(20),
    },
    is_weekend: {
      type: DataTypes.BOOLEAN,
    },
    season: {
      type: DataTypes.INTEGER,
    },
    is_holiday: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    sequelize,
    tableName: "reference_day",
    timestamps: false,
  },
);
