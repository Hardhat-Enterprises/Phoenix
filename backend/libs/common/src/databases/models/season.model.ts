import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize-connection-handler";

interface SeasonAttributes {
  season_id: number;
  season_description: string;
}

export class Season
  extends Model<SeasonAttributes>
  implements SeasonAttributes
{
  declare season_id: number;
  declare season_description: string;
}

Season.init(
  {
    season_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    season_description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "season",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
