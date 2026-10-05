"""
Schema adapter for hazard records.

WHY THIS FILE EXISTS
--------------------
Hazard data reaches us in three different shapes:

  1. Flat columns          - the legacy dataset (hazard_type, hazard_location, ...)
  2. Nested hazard object  - the Unified Core Model proposal's input contract
  3. DataQuoll GeoJSON     - live incident feed

The rule engine should not know or care which one it was given. Every field
access goes through this adapter, so when the flat -> nested migration happens,
exactly one file changes and no rule logic is touched.

If you add a fourth source, add a detector and a normaliser here. Do not add
field handling anywhere else.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional


# ---------------------------------------------------------------------------
# Canonical internal representation
# ---------------------------------------------------------------------------

@dataclass
class Hazard:
    """
    The single hazard shape the rule engine works with.

    Every field is optional because real feeds are incomplete. Rules must
    degrade gracefully rather than assume presence, and must record when a
    check could not be evaluated because data was missing.
    """
    hazard_id: Optional[str] = None
    hazard_type: Optional[str] = None      # bushfire, flood, storm, ...
    description: Optional[str] = None
    suburb: Optional[str] = None
    street: Optional[str] = None
    lga: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None           # active, contained, controlled, ...
    severity: Optional[str] = None         # Extreme, Severe, Moderate, Minor
    agency: Optional[str] = None
    raw: dict = field(default_factory=dict, repr=False)

    def location_terms(self) -> list[str]:
        """All place names associated with this hazard, lowercased."""
        terms = [self.suburb, self.street, self.lga, self.state]
        return [t.strip().lower() for t in terms if t and t.strip()]

    def is_active(self) -> bool:
        if not self.status:
            return False
        return self.status.strip().lower() in {"active", "contained", "controlled"}


@dataclass
class Message:
    """A candidate threat: the content being assessed."""
    text: Optional[str] = None
    url: Optional[str] = None
    observed_time: Optional[datetime] = None
    message_id: Optional[str] = None
    raw: dict = field(default_factory=dict, repr=False)

    def combined_content(self) -> str:
        """Text and URL together, lowercased. Used by keyword checks."""
        return " ".join(p for p in (self.text, self.url) if p).lower()


# ---------------------------------------------------------------------------
# Time parsing
# ---------------------------------------------------------------------------

def parse_time(value: Any) -> Optional[datetime]:
    """
    Parse an ISO 8601 timestamp into a timezone-aware datetime.

    Returns None rather than raising. A missing or malformed timestamp is a
    normal condition in real feeds; it must not crash a prediction. The rule
    that needs it will record "not_evaluated".
    """
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str):
        return None

    text = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
            try:
                dt = datetime.strptime(text, fmt)
                break
            except ValueError:
                continue
        else:
            return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Source detection and normalisation
# ---------------------------------------------------------------------------

def _looks_like_geojson(d: dict) -> bool:
    """
    Detect a GeoJSON Feature.

    Does NOT require type == "Feature". Real API responses include it, but
    records that have been stored, copied or hand-built often lose it, and
    falling through to the flat parser silently produced an EMPTY hazard with
    no error. Every check then reported not_evaluated and the caller received
    a confident "not related" based on nothing.

    Detect on structure instead: a properties dict carrying recognisable
    incident fields.
    """
    if d.get("type") == "Feature" and "properties" in d:
        return True
    props = d.get("properties")
    if isinstance(props, dict):
        return any(k in props for k in ("eventType", "location", "timestamps", "source"))
    return False


def _looks_like_nested(d: dict) -> bool:
    h = d.get("hazard")
    return isinstance(h, dict)


def _places_from_address(address: str | None) -> tuple[str | None, str | None]:
    """
    Extract locality from a DataQuoll address string.

    Real records put the place name in `location.address`, not `location.suburb`.
    Observed live format: "Ballarto Rd, Cardinia" — street first, locality after
    the comma. Returns (suburb, street).

    Returns (None, None) when there is no comma, since a bare street name with
    no locality is not a place E2 can usefully match on.
    """
    if not address or "," not in address:
        return None, None
    parts = [p.strip() for p in address.split(",") if p.strip()]
    if len(parts) < 2:
        return None, None
    # Last segment is the locality; anything before it is street detail.
    return parts[-1], parts[0]


def from_geojson(feature: dict) -> Hazard:
    """Normalise a DataQuoll /incidents GeoJSON Feature."""
    props = feature.get("properties", {}) or {}
    loc = props.get("location", {}) or {}
    ts = props.get("timestamps", {}) or {}
    src = props.get("source", {}) or {}
    det = props.get("details", {}) or {}
    geom = feature.get("geometry", {}) or {}
    coords = geom.get("coordinates") or [None, None]

    # DataQuoll has no explicit end time. Retraction is the closest signal.
    retraction = props.get("retraction", {}) or {}
    end = parse_time(retraction.get("retractedAt")) if retraction.get("retracted") else None

    # Live records frequently omit `suburb` and put the locality inside
    # `address` instead. Fall back to parsing it out, otherwise E2 can only
    # ever match at state level.
    suburb = loc.get("suburb")
    street = None
    if not suburb:
        suburb, street = _places_from_address(loc.get("address"))

    return Hazard(
        hazard_id=feature.get("id"),
        hazard_type=props.get("eventType"),
        description=det.get("description") or props.get("title"),
        suburb=suburb,
        street=street,
        lga=loc.get("lga"),
        state=loc.get("state") or src.get("state"),
        latitude=loc.get("latitude") if loc.get("latitude") is not None else coords[1],
        longitude=loc.get("longitude") if loc.get("longitude") is not None else coords[0],
        start_time=parse_time(ts.get("reported")),
        end_time=end,
        status=props.get("status"),
        severity=props.get("severity"),
        agency=src.get("agency"),
        raw=feature,
    )


def from_nested(payload: dict) -> Hazard:
    """Normalise the Unified Core Model proposal's nested hazard object."""
    h = payload.get("hazard", {}) or {}
    return Hazard(
        hazard_id=h.get("hazard_id") or h.get("id"),
        hazard_type=h.get("hazard_type"),
        description=h.get("description"),
        suburb=h.get("suburb"),
        lga=h.get("lga"),
        state=h.get("location") or h.get("state"),
        latitude=h.get("latitude"),
        longitude=h.get("longitude"),
        start_time=parse_time(h.get("start_time")),
        end_time=parse_time(h.get("end_time")),
        status=h.get("status"),
        severity=h.get("severity"),
        raw=payload,
    )


def from_flat(row: dict) -> Hazard:
    """
    Normalise the legacy flat dataset.

    WARNING: hazard fields in the legacy dataset were found to be assigned
    independently of message content. Correlation results computed against this
    source are mechanically valid but have no ground truth. See
    docs/DECISIONS.md.
    """
    return Hazard(
        hazard_id=row.get("hazard_id"),
        hazard_type=row.get("hazard_type"),
        description=row.get("hazard_description"),
        state=row.get("hazard_location"),
        start_time=parse_time(row.get("hazard_timestamp")),
        status=row.get("hazard_status"),
        severity=str(row["hazard_severity"]) if row.get("hazard_severity") is not None else None,
        raw=row,
    )


def hazard_is_empty(h: "Hazard") -> bool:
    """
    True when nothing usable was extracted.

    A hazard with no id, type, location or start time cannot support any check.
    Callers should surface this rather than treating the resulting "not
    related" as a real answer.
    """
    return not any([h.hazard_id, h.hazard_type, h.state, h.suburb,
                    h.lga, h.start_time])


def to_hazard(source: Any) -> Hazard:
    """
    Accept any supported shape and return a Hazard.

    This is the only function callers should use. Adding a new input format
    means adding a branch here, and nothing else changes.
    """
    if isinstance(source, Hazard):
        return source
    if not isinstance(source, dict):
        raise TypeError(f"Cannot build Hazard from {type(source).__name__}")

    if _looks_like_geojson(source):
        return from_geojson(source)
    if _looks_like_nested(source):
        return from_nested(source)
    return from_flat(source)


def to_message(source: Any) -> Message:
    """Accept a dict (flat or proposal-shaped) and return a Message."""
    if isinstance(source, Message):
        return source
    if not isinstance(source, dict):
        raise TypeError(f"Cannot build Message from {type(source).__name__}")

    return Message(
        text=source.get("text"),
        url=source.get("url"),
        observed_time=parse_time(source.get("observed_time") or source.get("timestamp")),
        message_id=source.get("message_id") or source.get("id"),
        raw=source,
    )
