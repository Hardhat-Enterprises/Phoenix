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
    hazard_event_id                 UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid()
    ,hazard_type                    TEXT
        NOT NULL
    ,severity_level                 TEXT
        NOT NULL
        CHECK (severity_level IN ('low', 'medium', 'high', 'critical'))
    ,event_status                   TEXT
    ,start_time                     TIMESTAMPTZ
    ,end_time                       TIMESTAMPTZ
    ,geo_location_id                UUID
    ,source_id                      UUID
    ,source_ref_event               TEXT
    ,description                    TEXT
    ,updated_at                     TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP
    ,created_at                     TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP
    ,FOREIGN KEY (geo_location_id) REFERENCES geo_location(geo_location_id)
    ,FOREIGN KEY (source_id) REFERENCES data_source(source_id)
);


/*CYBER_THREAT TABLE
  Entity table */
CREATE TABLE cyber_threat (
    threat_id                       UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid()
    ,threat_type                    VARCHAR(100)
        NOT NULL
    ,source_id                      UUID
    ,title                          VARCHAR(255)
    ,description                    TEXT
    ,risk_level                     VARCHAR(20)
        CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical'))
    ,status                         VARCHAR(20)
        CHECK (status IN ('Active', 'Monitoring', 'Resolved', 'Archived'))
    ,category                       VARCHAR(50)
    ,confidence_score               DECIMAL(5,2)
    ,detected_at                    TIMESTAMPTZ
    ,updated_at                     TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP
    ,created_at                     TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP
    ,FOREIGN KEY (source_id) REFERENCES data_source(source_id)
);


/*RISK_ASSESSMENT OR INTEGRATION TABLE
  Fact table */
CREATE TABLE risk_assessment (
    integration_event_id            UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid()
    ,related_hazard_event_id        UUID
    ,related_threat_id              UUID
    ,correlation_score              REAL
    ,linkage_reason                 TEXT
    ,integration_confidence         REAL
    ,linked_event_type              UUID
    ,event_status                   UUID
    ,event_time                     TIMESTAMPTZ
    ,detected_at                    TIMESTAMPTZ
    ,reported_at                    TIMESTAMPTZ
    ,created_at                     TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP
    ,updated_at                     TIMESTAMPTZ
        DEFAULT CURRENT_TIMESTAMP
    ,FOREIGN KEY (related_hazard_event_id) REFERENCES hazard_event(hazard_event_id)
    ,FOREIGN KEY (related_threat_id) REFERENCES cyber_threat(threat_id)
    ,FOREIGN KEY (linked_event_type) REFERENCES linked_event_type(linked_event_type_id)
    ,FOREIGN KEY (event_status) REFERENCES event_status(event_status_id)
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

CREATE INDEX idx_threat_type
    ON cyber_threat(threat_type);

CREATE INDEX idx_threat_risk_level
    ON cyber_threat(risk_level);

CREATE INDEX idx_threat_detected_at
    ON cyber_threat(detected_at);

CREATE INDEX idx_threat_status_detected_at
    ON cyber_threat(status, detected_at);