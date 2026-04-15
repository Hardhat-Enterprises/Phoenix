# AI005 Validation Report

Generated: 2026-04-14T10:48:08.825358+00:00

- Master row count              : 66
- Master columns                : 76
- Unique hazard_event_id         : 66
- Linked parent rows exported    : 39
- Missing hazard_event_id        : 0
- Missing threat_stream          : 0
- Missing parent link (cyber)    : 0
- Duplicate rows                 : 0

## Threat stream counts

- cyber: 33
- misinformation: 33

## Severity level distribution

- <NA>: 33
- medium: 12
- high: 12
- critical: 5
- low: 4

## Schema alignment

- Columns in master             : ['hazard_event_id', 'integration_id', 'parent_hazard_event_id', 'threat_id', 'source_record_id', 'source_dataset', 'source_system', 'linked_event_type', 'related_hazard_id', 'correlation_score', 'integration_confidence', 'linkage_reason', 'threat_stream', 'event_type', 'event_subtype', 'event_name', 'severity_score', 'severity_level', 'risk_category', 'event_status', 'hazard_type', 'start_time', 'peak_time', 'end_time', 'observation_time', 'duration_hours', 'event_time', 'detected_at', 'reported_at', 'timestamp', 'state_region', 'local_government_area', 'suburb', 'latitude', 'longitude', 'country', 'station_number', 'geo_precision', 'temperature_c', 'rainfall_mm', 'humidity_pct', 'wind_speed_kmh', 'wind_direction_deg', 'river_level_m', 'fire_danger_index', 'forecast_issue_time', 'forecast_valid_from', 'forecast_valid_to', 'forecast_temperature_c', 'forecast_rainfall_mm', 'forecast_wind_speed_kmh', 'forecast_humidity_pct', 'forecast_fire_danger_index', 'fatalities', 'injuries', 'economic_loss_million', 'affected_population', 'attack_vector', 'impersonation', 'target', 'outcome', 'success', 'confidence_score', 'alert_level', 'misinformation_level', 'social_media_spike', 'cyber_frequency_level', 'threat_type', 'risk_score', 'anomaly_flag', 'anomaly_score', 'ml_label', 'priority_level', 'response_status', 'created_at', 'updated_at']
