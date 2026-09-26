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
import { Notification } from "./models/notification.model";

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
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "user_account" (
      "user_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "username" VARCHAR(255) NOT NULL UNIQUE,
      "password_hashed" VARCHAR(255) NOT NULL,
      "access_token" TEXT,
      "refresh_token" TEXT,
      "role" VARCHAR(50) NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "is_disabled" BOOLEAN NOT NULL DEFAULT FALSE,
      "disabled_by" UUID REFERENCES "user_account" ("user_id") ON DELETE SET NULL,
      "disabled_at" TIMESTAMPTZ
    )
  `);
  await sequelize.query(
    'ALTER TABLE "user_account" ADD COLUMN IF NOT EXISTS "is_disabled" BOOLEAN NOT NULL DEFAULT FALSE',
  );
  await sequelize.query(
    'ALTER TABLE "user_account" ADD COLUMN IF NOT EXISTS "disabled_by" UUID REFERENCES "user_account" ("user_id") ON DELETE SET NULL',
  );
  await sequelize.query(
    'ALTER TABLE "user_account" ADD COLUMN IF NOT EXISTS "disabled_at" TIMESTAMPTZ',
  );
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
  Notification,
};

export * from "./models";
