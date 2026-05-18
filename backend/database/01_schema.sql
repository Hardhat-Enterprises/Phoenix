/*PROJECT PHOENIX BACKEND DATABASE CREATION SCRIPT
  Implementing backend structured data schema for Project Phoenix
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;


/*GEOLOCATION TABLE */
CREATE TABLE geo_location (
    geo_location_id                 UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid()
    ,country                        VARCHAR(100)
    ,state_region                   VARCHAR(100)
    ,local_government_area          VARCHAR(100)
    ,suburb                         VARCHAR(100)
    ,latitude                       DECIMAL(9,6)
    ,longitude                      DECIMAL(9,6)
    ,geo_precision                  VARCHAR(50)
);


/*DATA_SOURCE TABLE
  Added because hazard_event and cyber_threat reference source_id */
CREATE TABLE data_source (
    source_id                       UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid()
    ,source_name                    VARCHAR(255)
    ,source_type                    VARCHAR(100)
    ,access_method                  VARCHAR(100)
    ,source_url                     TEXT
);


/*LINKED_EVENT_TYPE TABLE
  Dimensional table */
CREATE TABLE linked_event_type (
    linked_event_type_id            UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid()
    ,linked_event_type_description  VARCHAR(100)
);


/*EVENT_STATUS TABLE
  Dimensional table */
CREATE TABLE event_status (
    event_status_id                 UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid()
    ,event_status_description       VARCHAR(100)
);


/*SEASON
  Dimensional reference table */
CREATE TABLE season (
    season_id                       INT
        PRIMARY KEY
    ,season_description             VARCHAR(50)
);


/*REFERENCE_DAY TABLE
  Reference table */
CREATE TABLE reference_day (
    ref_date                        DATE
    ,locale_id                      INT
    ,dow                            VARCHAR(20)
    ,is_weekend                     BOOLEAN
    ,season                         INT
    ,is_holiday                     BOOLEAN
    ,PRIMARY KEY (ref_date, locale_id)
    ,FOREIGN KEY (season) REFERENCES season(season_id)
);


/*REFERENCE_TIME
  Reference table */
CREATE TABLE reference_time (
    ref_time                        TIME
        PRIMARY KEY
    ,is_nighttime                   BOOLEAN
    ,is_business_hours              BOOLEAN
);


/*HAZARD_EVENT TABLE
  Entity table */
CREATE TABLE hazard_event (
    hazard_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    url TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,

    hazard_type VARCHAR(100) NOT NULL,
    hazard_severity NUMERIC(3, 2) NOT NULL,
    hazard_timestamp TIMESTAMPTZ NOT NULL,
    hazard_location VARCHAR(100) NOT NULL,
    hazard_status VARCHAR(50) NOT NULL,
    alert_level VARCHAR(50) NOT NULL,

    source VARCHAR(100) NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


/*CYBER_THREAT TABLE
  Entity table */
CREATE TABLE cyber_threat (
    threat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_id TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    source TEXT NOT NULL,
    threat_type TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    confidence_score DECIMAL(5, 2) NOT NULL,
    details TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);



/*RISK_ASSESSMENT OR INTEGRATION TABLE
  Fact table */
CREATE TABLE integration_log (
    integration_event_id            UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid()
    ,integration_type               TEXT
        NOT NULL CHECK (integration_type in ('core', 'anomaly', 'time-series'))
    ,input                          TEXT
    ,output                         TEXT
    ,status                         TEXT
        NOT NULL CHECK (status in ('created', 'processing', 'completed', 'error'))
    ,note                           TEXT
    ,created_at                     TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP
    ,updated_at                     TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP
);


/*HAZARD_LOCATION TABLE
  Joining table */
CREATE TABLE hazard_location (
    hazard_event_id                 UUID
    ,geo_location_id                UUID
    ,PRIMARY KEY (hazard_event_id, geo_location_id)
    ,FOREIGN KEY (hazard_event_id) REFERENCES hazard_event(hazard_event_id)
    ,FOREIGN KEY (geo_location_id) REFERENCES geo_location(geo_location_id)
);


/*THREAT_LOCATION TABLE
  Joining table */
CREATE TABLE threat_location (
    threat_id                       UUID
    ,geo_location_id                UUID
    ,PRIMARY KEY (threat_id, geo_location_id)
    ,FOREIGN KEY (threat_id) REFERENCES cyber_threat(threat_id)
    ,FOREIGN KEY (geo_location_id) REFERENCES geo_location(geo_location_id)
);


/*USER TABLE
  New addition to schema to support front end */
CREATE TABLE user_account (
    user_id                         UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid()
    ,password_hashed                VARCHAR(255)
    ,role                           VARCHAR(50)
    ,access_token                   VARCHAR(255)
    ,refresh_token                  VARCHAR(255)
    ,username                       VARCHAR(100)
        UNIQUE
    ,created_at                     TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP
    ,updated_at                     TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP  
);

/*DATA_INGESTION_STREAMING_LOG TABLE
  Stores logs for incoming streamed ingestion records */
CREATE TABLE data_ingestion_streaming_log (
    ingestion_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID,
    ingestion_type VARCHAR(50) NOT NULL
        CHECK (ingestion_type IN ('hazard', 'cyber_threat')),
    payload JSONB,
    processing_status VARCHAR(50) NOT NULL DEFAULT 'received'
        CHECK (processing_status IN ('received', 'processing', 'processed', 'failed')),
    fail_reason TEXT,
    received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES data_source(source_id)
);


/*INDEXES
  Based on schema documentation */
CREATE INDEX idx_hazard_type
    ON hazard_event(hazard_type);

CREATE INDEX idx_hazard_severity_level
    ON hazard_event(severity_level);

CREATE INDEX idx_hazard_start_time
    ON hazard_event(start_time);

CREATE INDEX idx_hazard_geo_time
    ON hazard_event(geo_location_id, start_time);

CREATE INDEX idx_cyber_threat_severity
    ON cyber_threat (severity);

CREATE INDEX idx_threat_status_detected_at
    ON cyber_threat(status, detected_at);

CREATE INDEX idx_streaming_log_type
    ON data_ingestion_streaming_log(ingestion_type);

CREATE INDEX idx_streaming_log_status
    ON data_ingestion_streaming_log(processing_status);

CREATE INDEX idx_streaming_log_received_at
    ON data_ingestion_streaming_log(received_at);

CREATE INDEX idx_integration_log_integration_type
    ON integration_log(integration_type);

CREATE INDEX idx_integration_log_status
    ON integration_log(status);