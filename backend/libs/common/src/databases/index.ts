import { sequelize, connectDatabase } from "./sequelize-connection-handler";
import { HazardEvent } from "./models/hazard-event.model";
import { CyberThreat } from "./models/cyber-threat.model";
import { RiskAssessment } from "./models/risk-assessment.model";

HazardEvent.hasMany(RiskAssessment, {
  foreignKey: "related_hazard_event_id",
  sourceKey: "hazard_event_id",
});

RiskAssessment.belongsTo(HazardEvent, {
  foreignKey: "related_hazard_event_id",
  targetKey: "hazard_event_id",
});

CyberThreat.hasMany(RiskAssessment, {
  foreignKey: "related_threat_id",
  sourceKey: "threat_id",
});

RiskAssessment.belongsTo(CyberThreat, {
  foreignKey: "related_threat_id",
  targetKey: "threat_id",
});

export async function initDatabase(): Promise<void> {
  await connectDatabase();
  await sequelize.sync({ alter: true });
  console.log("Database synced successfully.");
}

export { sequelize, HazardEvent, CyberThreat, RiskAssessment };