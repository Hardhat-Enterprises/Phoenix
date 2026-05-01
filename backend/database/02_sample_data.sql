-- =========================
-- DATA_SOURCE
-- =========================
INSERT INTO data_source (
    source_name,
    source_type,
    access_method,
    source_url
)
VALUES 
    ('Bureau of Meteorology', 'Weather', 'API', 'https://bom.gov.au'),
    ('Cyber Feed', 'Cyber', 'API', 'https://cyberfeed.com');


-- =========================
-- GEO_LOCATION
-- =========================
INSERT INTO geo_location (
    country,
    state_region,
    local_government_area,
    suburb,
    latitude,
    longitude,
    geo_precision
)
VALUES 
    ('Australia', 'Victoria', 'Melbourne', 'CBD', -37.8136, 144.9631, 'high'),
    ('Australia', 'New South Wales', 'Sydney', 'Parramatta', -33.8150, 151.0011, 'high');


-- =========================
-- HAZARD_EVENT (FIXED)
-- =========================
INSERT INTO hazard_event (
    hazard_type,
    severity_level,
    event_status,
    start_time,
    source_id,
    description
)
SELECT
    'Flood',
    'high',
    'active',
    NOW(),
    s.source_id,
    'Severe flooding due to heavy rainfall'
FROM data_source s
WHERE s.source_name = 'Bureau of Meteorology'
LIMIT 1;


-- =========================
-- HAZARD_LOCATION (NEW - IMPORTANT)
-- =========================
INSERT INTO hazard_location (
    hazard_event_id,
    geo_location_id
)
SELECT
    h.hazard_event_id,
    g.geo_location_id
FROM hazard_event h
CROSS JOIN geo_location g
WHERE h.hazard_type = 'Flood'
  AND g.state_region = 'Victoria'
LIMIT 1;


-- =========================
-- CYBER_THREAT
-- =========================
INSERT INTO cyber_threat (
    threat_type,
    source_id,
    title,
    description,
    risk_level,
    status,
    confidence_score,
    detected_at
)
SELECT
    'Phishing',
    s.source_id,
    'Email phishing attack',
    'Users receiving malicious emails',
    'High',
    'Active',
    0.85,
    NOW()
FROM data_source s
WHERE s.source_name = 'Cyber Feed'
LIMIT 1;


-- =========================
-- THREAT_LOCATION (NEW - MATCHING DESIGN)
-- =========================
INSERT INTO threat_location (
    threat_id,
    geo_location_id
)
SELECT
    t.threat_id,
    g.geo_location_id
FROM cyber_threat t
CROSS JOIN geo_location g
WHERE g.state_region = 'New South Wales'
LIMIT 1;


-- =========================
-- LINKED_EVENT_TYPE
-- =========================
INSERT INTO linked_event_type (
    linked_event_type_description
)
VALUES 
    ('Hazard Only'),
    ('Cyber Only'),
    ('Combined Event');


-- =========================
-- EVENT_STATUS
-- =========================
INSERT INTO event_status (
    event_status_description
)
VALUES 
    ('Active'),
    ('Monitoring'),
    ('Resolved');


-- =========================
-- RISK_ASSESSMENT
-- =========================
INSERT INTO risk_assessment (
    related_hazard_event_id,
    related_threat_id,
    correlation_score,
    linkage_reason,
    integration_confidence,
    linked_event_type,
    event_status,
    event_time
)
SELECT
    h.hazard_event_id,
    t.threat_id,
    0.75,
    'Flood caused network disruption leading to cyber vulnerability',
    0.80,
    let.linked_event_type_id,
    es.event_status_id,
    NOW()
FROM hazard_event h
CROSS JOIN cyber_threat t
CROSS JOIN linked_event_type let
CROSS JOIN event_status es
WHERE let.linked_event_type_description = 'Combined Event'
  AND es.event_status_description = 'Active'
LIMIT 1;