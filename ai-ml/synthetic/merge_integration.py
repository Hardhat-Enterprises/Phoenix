"""
merge_integration.py  —  AI005 Integration Pipeline

Generates ~100 sample rows as proof-of-output across cyber and misinformation
streams, linked to a minimal parent hazard pool. The reusable generator code
is the primary deliverable.

Schema compliance:
  - Column names follow Hazard_Data_Schema_Documentation.docx exactly
  - Integration layer fields follow AI001 Integration & Architecture schema
  - severity_level uses the severity_mapping from scenario_settings.json
  - state_region / local_government_area used throughout (not state/region)
"""

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from disaster_random import build_rows as build_disaster_rows
from cyber_generator import generate_cyber_rows
from misinfo_generator import generate_misinfo_rows

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent
DATA_DIR   = BASE_DIR / "data"
DOCS_DIR   = BASE_DIR / "docs"
CONFIG_DIR = BASE_DIR / "config"

# ── Master schema columns ──────────────────────────────────────────────────────
# Ordered to match: identifiers → event → time → geo → weather → forecast →
#                   impact → integration → stream-specific → ML placeholders → audit
MASTER_COLUMNS = [
    # Identifiers
    "hazard_event_id",
    "integration_id",
    "parent_hazard_event_id",
    "threat_id",
    "source_record_id",
    "source_dataset",
    "source_system",

    # AI001 integration layer
    "linked_event_type",
    "related_hazard_id",
    "correlation_score",
    "integration_confidence",
    "linkage_reason",

    # Stream label
    "threat_stream",

    # Hazard classification
    "event_type",
    "event_subtype",
    "event_name",
    "severity_score",
    "severity_level",
    "risk_category",
    "event_status",
    "hazard_type",

    # Time (AI001 time attributes)
    "start_time",
    "peak_time",
    "end_time",
    "observation_time",
    "duration_hours",
    "event_time",
    "detected_at",
    "reported_at",
    "timestamp",

    # Geolocation (schema-canonical naming)
    "state_region",
    "local_government_area",
    "suburb",
    "latitude",
    "longitude",
    "country",
    "station_number",
    "geo_precision",

    # Observed weather
    "temperature_c",
    "rainfall_mm",
    "humidity_pct",
    "wind_speed_kmh",
    "wind_direction_deg",
    "river_level_m",
    "fire_danger_index",

    # Forecast weather
    "forecast_issue_time",
    "forecast_valid_from",
    "forecast_valid_to",
    "forecast_temperature_c",
    "forecast_rainfall_mm",
    "forecast_wind_speed_kmh",
    "forecast_humidity_pct",
    "forecast_fire_danger_index",

    # Impact
    "fatalities",
    "injuries",
    "economic_loss_million",
    "affected_population",

    # Cyber-specific
    "attack_vector",
    "impersonation",
    "target",
    "outcome",
    "success",
    "confidence_score",

    # Misinformation-specific
    "alert_level",
    "misinformation_level",
    "social_media_spike",
    "cyber_frequency_level",

    # Shared threat field
    "threat_type",

    # ML placeholders (AI001 output fields; null at generation — populated downstream)
    "risk_score",
    "anomaly_flag",
    "anomaly_score",
    "ml_label",
    "priority_level",
    "response_status",

    # Audit
    "created_at",
    "updated_at",
]

# Required on every row — validation hard-fails on any null
REQUIRED_FIELDS = [
    "hazard_event_id",
    "integration_id",
    "source_record_id",
    "source_dataset",
    "source_system",
    "threat_stream",
    "event_type",
]

EXPECTED_STREAMS = {"cyber", "misinformation"}

# Parent columns enriched into child rows; child values are NEVER overwritten
PARENT_ENRICH_COLS = [
    "event_subtype", "event_name", "event_status",
    "severity_score", "risk_category",
    "start_time", "peak_time", "end_time", "observation_time", "duration_hours",
    "state_region", "local_government_area", "suburb",
    "latitude", "longitude", "country", "station_number",
    "temperature_c", "rainfall_mm", "humidity_pct",
    "wind_speed_kmh", "wind_direction_deg", "river_level_m", "fire_danger_index",
    "forecast_issue_time", "forecast_valid_from", "forecast_valid_to",
    "forecast_temperature_c", "forecast_rainfall_mm", "forecast_wind_speed_kmh",
    "forecast_humidity_pct", "forecast_fire_danger_index",
    "fatalities", "injuries", "economic_loss_million", "affected_population",
    "created_at", "updated_at",
]


# ── Settings ───────────────────────────────────────────────────────────────────

def load_settings() -> dict:
    path = CONFIG_DIR / "scenario_settings.json"
    if not path.exists():
        raise FileNotFoundError(f"scenario_settings.json not found at {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def apply_severity_mapping(df: pd.DataFrame, mapping: dict) -> pd.DataFrame:
    """Normalise severity_level using the mapping from scenario_settings.json."""
    if "severity_level" not in df.columns:
        return df
    df = df.copy()
    df["severity_level"] = (
        df["severity_level"]
        .astype(str)
        .str.strip()
        .str.lower()
        .map(lambda v: mapping.get(v, v) if v not in ("nan", "none", "") else pd.NA)
    )
    return df


# ── Parent generation ──────────────────────────────────────────────────────────

def generate_parent(n_rows: int) -> pd.DataFrame:
    rows = build_disaster_rows(total_rows=n_rows)
    df = pd.DataFrame(rows)
    if "integration_id" not in df.columns:
        df["integration_id"] = [str(uuid.uuid4()) for _ in range(len(df))]
    return df


# ── Merge helpers ──────────────────────────────────────────────────────────────

def enrich_from_parent(child_df: pd.DataFrame, parent_df: pd.DataFrame,
                       child_fk: str) -> pd.DataFrame:
    """
    Left-join child rows to parent on child_fk → parent.hazard_event_id.
    Only PARENT_ENRICH_COLS are pulled in; existing child columns are preserved.
    """
    # Only pull enrich cols that actually exist on the parent
    available = [c for c in PARENT_ENRICH_COLS if c in parent_df.columns]
    parent_subset = parent_df[["hazard_event_id"] + available].rename(
        columns={"hazard_event_id": child_fk}
    )

    # Keep track of child-side columns before merge so we can resolve conflicts
    child_cols_before = set(child_df.columns)

    merged = child_df.merge(parent_subset, on=child_fk, how="left", suffixes=("", "_parent"))

    # Drop _parent columns — child values already take priority
    merged = merged[[c for c in merged.columns if not c.endswith("_parent")]]
    return merged


# ── Schema alignment ───────────────────────────────────────────────────────────

def align_to_master(df: pd.DataFrame) -> pd.DataFrame:
    for col in MASTER_COLUMNS:
        if col not in df.columns:
            df[col] = pd.NA
    return df[MASTER_COLUMNS]


# ── Validation ─────────────────────────────────────────────────────────────────

def validate(df: pd.DataFrame) -> None:
    errors = []

    for field in REQUIRED_FIELDS:
        n_null = df[field].isna().sum()
        if n_null > 0:
            errors.append(f"  FAIL: '{field}' has {n_null} null value(s)")

    dup_count = df.duplicated(subset=["hazard_event_id", "source_record_id"]).sum()
    if dup_count > 0:
        errors.append(f"  FAIL: {dup_count} duplicate (hazard_event_id, source_record_id) pairs")

    unexpected_streams = set(df["threat_stream"].dropna()) - EXPECTED_STREAMS
    if unexpected_streams:
        errors.append(f"  FAIL: unexpected threat_stream values: {unexpected_streams}")

    if errors:
        print("\n[VALIDATION FAILED]")
        for e in errors:
            print(e)
        sys.exit(1)

    print("[VALIDATION PASSED]")
    print(f"  Rows             : {len(df)}")
    print(f"  Unique hazard IDs: {df['hazard_event_id'].nunique()}")
    print(f"  Threat streams   : {df['threat_stream'].value_counts().to_dict()}")
    print(f"  Severity levels  : {df['severity_level'].value_counts(dropna=False).to_dict()}")


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    settings   = load_settings()
    row_dist   = settings["row_distribution"]
    sev_map    = settings["severity_mapping"]

    # Derive per-stream row counts from weights (target ~100 total sample rows)
    TARGET_TOTAL = 100
    total_weight = sum(row_dist.values())
    n_cyber   = max(1, round(TARGET_TOTAL * row_dist["cyber_weight"]   / total_weight))
    n_misinfo = max(1, round(TARGET_TOTAL * row_dist["misinfo_weight"] / total_weight))
    n_parent  = max(n_cyber, n_misinfo) + 10  # small pool with headroom for sampling

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Generate parent hazard events (schema-compliant)
    parent_df = generate_parent(n_parent)
    parent_df = apply_severity_mapping(parent_df, sev_map)

    # 2. Generate child streams directly from parent pool (links are native)
    cyber_df   = generate_cyber_rows(parent_df,  n=n_cyber,   settings=settings)
    misinfo_df = generate_misinfo_rows(parent_df, n=n_misinfo, settings=settings)

    # 3. Enrich child rows with parent context (child fields never overwritten)
    cyber_merged   = enrich_from_parent(cyber_df,   parent_df, child_fk="parent_hazard_event_id")
    misinfo_merged = enrich_from_parent(misinfo_df, parent_df, child_fk="hazard_event_id")

    # 4. Align to master schema and concat
    master_df = pd.concat([
        align_to_master(cyber_merged),
        align_to_master(misinfo_merged),
    ], ignore_index=True)

    # 5. Validate — hard-fail on required-field nulls
    validate(master_df)

    # 6. Export only linked parent rows (not the full pool)
    linked_ids = (
        set(master_df["hazard_event_id"].dropna()) |
        set(master_df["parent_hazard_event_id"].dropna())
    )
    linked_parent_df = parent_df[parent_df["hazard_event_id"].isin(linked_ids)]

    linked_parent_df.to_csv(DATA_DIR / "parent_disaster_dataset.csv",      index=False)
    cyber_df.to_csv(        DATA_DIR / "cyber_network_threat_dataset.csv",  index=False)
    misinfo_df.to_csv(      DATA_DIR / "social_misinformation_dataset.csv", index=False)
    master_df.to_csv(       DATA_DIR / "master_ai005_dataset.csv",          index=False)
    master_df.to_json(      DATA_DIR / "master_ai005_dataset.json",
                            orient="records", indent=2)

    # 7. Validation report
    now_str = datetime.now(tz=timezone.utc).isoformat()
    with open(DOCS_DIR / "validation_report.md", "w", encoding="utf-8") as f:
        f.write("# AI005 Validation Report\n\n")
        f.write(f"Generated: {now_str}\n\n")
        f.write(f"- Master row count              : {len(master_df)}\n")
        f.write(f"- Master columns                : {len(master_df.columns)}\n")
        f.write(f"- Unique hazard_event_id         : {master_df['hazard_event_id'].nunique()}\n")
        f.write(f"- Linked parent rows exported    : {len(linked_parent_df)}\n")
        f.write(f"- Missing hazard_event_id        : {master_df['hazard_event_id'].isna().sum()}\n")
        f.write(f"- Missing threat_stream          : {master_df['threat_stream'].isna().sum()}\n")
        f.write(f"- Missing parent link (cyber)    : {cyber_merged['parent_hazard_event_id'].isna().sum()}\n")
        f.write(f"- Duplicate rows                 : {master_df.duplicated().sum()}\n")
        f.write("\n## Threat stream counts\n\n")
        for stream, count in master_df["threat_stream"].value_counts().items():
            f.write(f"- {stream}: {count}\n")
        f.write("\n## Severity level distribution\n\n")
        for sev, count in master_df["severity_level"].value_counts(dropna=False).items():
            f.write(f"- {sev}: {count}\n")
        f.write("\n## Schema alignment\n\n")
        f.write(f"- Columns in master             : {list(master_df.columns)}\n")

    print(f"\nAI005 pipeline complete.")
    print(f"  Master CSV   : {DATA_DIR / 'master_ai005_dataset.csv'}")
    print(f"  Master JSON  : {DATA_DIR / 'master_ai005_dataset.json'}")
    print(f"  Parent rows  : {DATA_DIR / 'parent_disaster_dataset.csv'} ({len(linked_parent_df)} rows)")


if __name__ == "__main__":
    main()
