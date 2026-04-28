import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

export class Season extends Model {
  declare season_id: number;
  declare season_description: string;
}

Season.init(
  {
    season_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    season_description: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "season",
    timestamps: false,
  },
);
