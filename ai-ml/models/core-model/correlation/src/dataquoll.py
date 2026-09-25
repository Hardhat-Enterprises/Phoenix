"""
API KEY
-------
Set the environment variable, never hardcode it, never commit it:

    export DATAQUOLL_API_KEY="your_key_here"
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Iterator, Optional

try:
    import requests
except ImportError:                                        # pragma: no cover
    requests = None


BASE_URL = "https://dataquoll.io/api/v1"
DEFAULT_CACHE = Path(__file__).resolve().parent.parent / "data" / "hazards"


class DataQuollError(RuntimeError):
    """Raised for API errors that the caller should see rather than swallow."""


class DataQuollClient:
    """
    Minimal client for the endpoints we actually use.

    Deliberately small. It fetches, paginates and caches. It does not transform,
    that is schema.py's job, so there is exactly one place that understands
    field names.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: str = BASE_URL,
                 timeout: int = 30):
        if requests is None:
            raise ImportError("requests is required: pip install requests")
        self.api_key = api_key or os.environ.get("DATAQUOLL_API_KEY")
        if not self.api_key:
            raise DataQuollError(
                "No API key. Set DATAQUOLL_API_KEY or pass api_key=...")
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/geo+json, application/json",
        })

    # -- low level ---------------------------------------------------------

    def _get(self, path: str, params: dict | None = None) -> dict:
        url = f"{self.base_url}{path}"
        for attempt in range(3):
            resp = self._session.get(url, params=params or {}, timeout=self.timeout)

            if resp.status_code == 429:
                # Rate limited. Back off and retry rather than failing the run.
                wait = int(resp.headers.get("Retry-After", 2 ** (attempt + 1)))
                print(f"  rate limited, waiting {wait}s")
                time.sleep(wait)
                continue

            if resp.status_code == 401:
                raise DataQuollError("401: API key rejected. Check DATAQUOLL_API_KEY.")
            if resp.status_code == 403:
                raise DataQuollError(
                    f"403: not available on this plan. {path} may require a paid tier "
                    "(history and archive snapshots are Developer and above).")
            if resp.status_code == 404:
                raise DataQuollError(f"404: not found: {path}")
            if not resp.ok:
                raise DataQuollError(f"{resp.status_code}: {resp.text[:200]}")

            return resp.json()

        raise DataQuollError("Rate limited three times in a row. Try again later.")

    # -- endpoints ---------------------------------------------------------

    def incidents(self, state: str | None = None, event_type: str | None = None,
                  status: str | None = None, limit: int = 100,
                  max_records: int | None = None) -> list[dict]:
        """
        Current incidents as a list of GeoJSON Features.

        Handles pagination via the cursor in meta.next_cursor. `max_records`
        caps the total pulled, which matters on a 5,000 request/month budget.
        """
        params: dict = {"limit": min(limit, 500)}
        if state:
            params["state"] = state
        if event_type:
            params["eventType"] = event_type
        if status:
            params["status"] = status

        features: list[dict] = []
        cursor = None
        page = 0

        while True:
            if cursor:
                params["cursor"] = cursor
            data = self._get("/incidents", params)
            batch = data.get("features", [])
            features.extend(batch)
            page += 1
            print(f"  page {page}: +{len(batch)} (total {len(features)})")

            if max_records and len(features) >= max_records:
                features = features[:max_records]
                break

            meta = data.get("meta", {}) or {}
            cursor = meta.get("next_cursor")
            if not cursor or not batch:
                break

        return features

    def incident(self, incident_id: str) -> dict:
        """A single incident as a GeoJSON Feature."""
        return self._get(f"/incidents/{incident_id}")

    def nearby(self, lat: float, lng: float, radius_km: float,
               limit: int = 50) -> list[dict]:
        """Incidents within radius_km of a point, sorted by distance."""
        data = self._get("/incidents/nearby",
                         {"lat": lat, "lng": lng, "radius": radius_km, "limit": limit})
        return data.get("features", [])

    def schema(self) -> dict:
        """Enum vocabulary. Useful for checking eventType values we map in keywords.yaml."""
        return self._get("/schema")

    def attribution(self) -> dict:
        """Required attribution text. Some sources mandate display."""
        return self._get("/attribution")


# ---------------------------------------------------------------------------
# Relevance filtering
# ---------------------------------------------------------------------------
# Not every "incident" DataQuoll returns is useful for correlation testing.
# An unfiltered pull is dominated by small local callouts and forecast
# advisories, neither of which a scammer would exploit and neither of which
# tells us anything about whether the rule works.

# Event types a disaster scam would plausibly exploit. Excludes rescue,
# medical, alarm, vehicle_accident and other, which are emergency-services
# callouts rather than public disasters.
DISASTER_EVENT_TYPES = [
    "bushfire", "grass_fire", "flood", "storm", "cyclone",
    "earthquake", "extreme_heat",
]

# Feeds that publish forecasts and advisories rather than active incidents.
# CFA-FDR publishes daily fire danger ratings with reported=null; they are
# tagged featureType "incident" but are not events.
NON_INCIDENT_FEEDS = {"vic-cfa-fire-danger"}
NON_INCIDENT_AGENCIES = {"CFA-FDR"}


def is_real_incident(feature: dict) -> tuple[bool, str]:
    """
    Is this an actual event, or a forecast/advisory dressed as one?

    Returns (keep, reason). Reason explains the exclusion so filtering is
    auditable rather than silent.
    """
    props = feature.get("properties", {}) or {}
    src = props.get("source", {}) or {}
    ts = props.get("timestamps", {}) or {}

    if src.get("feedId") in NON_INCIDENT_FEEDS:
        return False, f"forecast feed ({src.get('feedId')})"
    if src.get("agency") in NON_INCIDENT_AGENCIES:
        return False, f"forecast agency ({src.get('agency')})"
    if ts.get("reported") is None:
        return False, "no reported time, not a dated event"

    return True, "ok"


def filter_relevant(features: list[dict], disaster_only: bool = True,
                    verbose: bool = True) -> list[dict]:
    """
    Keep only records worth testing correlation against.

    Two filters:
      1. Real incidents, not forecasts or advisories
      2. Optionally, only disaster event types a scam would exploit
    """
    kept, dropped = [], {}

    for f in features:
        ok, reason = is_real_incident(f)
        if not ok:
            dropped[reason] = dropped.get(reason, 0) + 1
            continue

        if disaster_only:
            et = (f.get("properties", {}) or {}).get("eventType")
            if et not in DISASTER_EVENT_TYPES:
                r = f"non-disaster type ({et})"
                dropped[r] = dropped.get(r, 0) + 1
                continue

        kept.append(f)

    if verbose:
        print(f"\nRelevance filter: kept {len(kept)} of {len(features)}")
        for reason, n in sorted(dropped.items(), key=lambda x: -x[1]):
            print(f"  dropped {n:>3}  {reason}")

    return kept


# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------

def save_hazards(features: list[dict], path: Path | str) -> Path:
    """
    Write fetched incidents to disk.

    Cache rather than refetch. The free tier is 5,000 requests a month, and
    dataset building should not burn that budget on repeated identical pulls.
    """
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "count": len(features),
        "source": "dataquoll.io/api/v1/incidents",
        "features": features,
    }
    p.write_text(json.dumps(payload, indent=2))
    return p


def load_hazards(path: Path | str) -> list[dict]:
    """Read cached incidents back. Returns the GeoJSON Features list."""
    data = json.loads(Path(path).read_text())
    return data.get("features", [])


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    import argparse
    ap = argparse.ArgumentParser(description="Fetch hazards from DataQuoll")
    ap.add_argument("--state", help="e.g. vic or vic,nsw")
    ap.add_argument("--event-type", help="e.g. flood,bushfire")
    ap.add_argument("--limit", type=int, default=100)
    ap.add_argument("--max", type=int, default=100, help="Cap total records")
    ap.add_argument("--out", default=str(DEFAULT_CACHE / "incidents.json"))
    ap.add_argument("--check", action="store_true", help="Verify the key works")
    ap.add_argument("--all", action="store_true",
                    help="Keep everything, including forecasts and non-disaster "
                         "callouts. Default is to filter to real disaster incidents.")
    ap.add_argument("--disaster-types", action="store_true", default=True,
                    help="(default) Restrict to bushfire, flood, storm, cyclone, "
                         "earthquake, extreme_heat, grass_fire")
    args = ap.parse_args()

    try:
        client = DataQuollClient()
    except (DataQuollError, ImportError) as exc:
        print(f"ERROR: {exc}")
        return 1

    if args.check:
        try:
            feats = client.incidents(limit=1, max_records=1)
            print(f"OK. Key works. Retrieved {len(feats)} incident.")
            if feats:
                props = feats[0].get("properties", {})
                print(f"   sample: {props.get('eventType')} / "
                      f"{(props.get('location') or {}).get('state')}")
            return 0
        except DataQuollError as exc:
            print(f"FAILED: {exc}")
            return 1

    # Ask the API for disaster types directly when the caller has not
    # specified one. Filtering server-side saves quota on a 5,000/month budget.
    event_type = args.event_type
    if not event_type and not args.all:
        event_type = ",".join(DISASTER_EVENT_TYPES)

    print(f"Fetching incidents (state={args.state}, type={event_type})...")
    try:
        feats = client.incidents(state=args.state, event_type=event_type,
                                 limit=args.limit, max_records=args.max)
    except DataQuollError as exc:
        print(f"ERROR: {exc}")
        return 1

    raw_count = len(feats)
    if not args.all:
        feats = filter_relevant(feats, disaster_only=True, verbose=True)
        if not feats:
            print("\nNothing left after filtering. Options:")
            print("  - try a different --state, or omit it for all states")
            print("  - use --all to keep forecasts and non-disaster callouts")
            print("  - increase --max, significant events may be further down the feed")
            return 1

    out = save_hazards(feats, args.out)
    print(f"\nSaved {len(feats)} of {raw_count} incidents to {out}")

    types: dict[str, int] = {}
    for f in feats:
        t = (f.get("properties") or {}).get("eventType", "unknown")
        types[t] = types.get(t, 0) + 1
    print("Event types:", ", ".join(f"{k}={v}" for k, v in sorted(types.items())))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
