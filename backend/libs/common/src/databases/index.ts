import { sequelize, connectDatabase } from "./sequelize-connection-handler";

import { HazardEvent } from "./models/hazard-event.model";
import { CyberThreat } from "./models/cyber-threat.model";
import { IntegrationLog } from "./models/integration_log.model";
import { DataIngestionStreamingLog } from "./models/data-ingestion-streaming-log.model";

import { GeoLocation } from "./models/location-geo.model";
import { HazardLocation } from "./models/location-hazard.model";
import { ThreatLocation } from "./models/location-threat.model";
import { EventStatus } from "./models/status-event.model";
import { UserAccount } from "./models/user-account.model";
import { DataSource } from "./models/data-source.model";
import { LinkedEventType } from "./models/linked-event-typed";
import { Season } from "./models/season.model";
import { ReferenceDay } from "./models/reference-day.model";
import { ReferenceTime } from "./models/reference-time.model";

DataSource.hasMany(DataIngestionStreamingLog, {
  foreignKey: "source_id",
  sourceKey: "source_id",
  as: "streaming_logs",
});

DataIngestionStreamingLog.belongsTo(DataSource, {
  foreignKey: "source_id",
  targetKey: "source_id",
  as: "source",
});

/**
 * Existing reference-data relationship.
 */
Season.hasMany(ReferenceDay, {
  foreignKey: "season",
  sourceKey: "season_id",
  as: "reference_days",
});

ReferenceDay.belongsTo(Season, {
  foreignKey: "season",
  targetKey: "season_id",
  as: "season_ref",
});

export async function initDatabase(): Promise<void> {
  await connectDatabase();
  console.log("Database connected successfully.");
}

export {
  sequelize,
  HazardEvent,
  CyberThreat,
  IntegrationLog,
  DataIngestionStreamingLog,
  GeoLocation,
  HazardLocation,
  ThreatLocation,
  EventStatus,
  UserAccount,
  DataSource,
  LinkedEventType,
  Season,
  ReferenceDay,
  ReferenceTime,
};

export * from "./models";
