import { sequelize, connectDatabase } from "./sequelize-connection-handler";
import { HazardEvent } from "./models/hazard-event.model";
import { CyberThreat } from "./models/cyber-threat.model";
import { RiskAssessment } from "./models/risk-assessment.model";
import { GeoLocation } from "./models/location-geo.model";
import { HazardLocation } from "./models/location-hazard.model";
import { ThreatLocation } from "./models/location-threat.model";
import { EventStatus } from "./models/status-event.model";


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

GeoLocation.hasMany(HazardEvent, {
  foreignKey: "geo_location_id",
  sourceKey: "geo_location_id",
});

HazardEvent.belongsTo(GeoLocation, {
  foreignKey: "geo_location_id",
  targetKey: "geo_location_id",
});

HazardEvent.belongsToMany(GeoLocation, {
  through: HazardLocation,
  foreignKey: "hazard_event_id",
  otherKey: "geo_location_id",
});

GeoLocation.belongsToMany(HazardEvent, {
  through: HazardLocation,
  foreignKey: "geo_location_id",
  otherKey: "hazard_event_id",
});

CyberThreat.belongsToMany(GeoLocation, {
  through: ThreatLocation,
  foreignKey: "threat_id",
  otherKey: "geo_location_id",
});

GeoLocation.belongsToMany(CyberThreat, {
  through: ThreatLocation,
  foreignKey: "geo_location_id",
  otherKey: "threat_id",
});

export async function initDatabase(): Promise<void> {
  await connectDatabase();
  await sequelize.sync({ alter: true });
  console.log("Database synced successfully.");
}

export {sequelize,
  HazardEvent,
  CyberThreat,
  RiskAssessment,
  GeoLocation,
  HazardLocation,
  ThreatLocation,
  EventStatus,};