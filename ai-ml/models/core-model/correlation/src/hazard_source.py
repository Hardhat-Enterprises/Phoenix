"""
Where active hazards come from.

TWO SOURCES, ONE INTERFACE
--------------------------
1. LIVE FETCH        implemented. Calls the incident API on demand.
2. BACKEND STORE     stub. To be implemented once the backend ingestion
                     pipeline is agreed.

Both return the same thing: a list of hazard records. Callers use
get_active_hazards() and do not care which source answered.

LIVE FETCH IS A TESTING-STAGE CHOICE
------------------------------------
It is fine now and NOT fine in production. Be explicit about why:

  quota      the free tier allows 5,000 requests per MONTH, roughly 166 a
             day. One call per prediction is comfortable during testing and
             becomes a hard ceiling under real traffic.
  latency    every prediction waits on an external API round trip.
  fragility  if the incident API is slow or down, predictions fail with it.

The backend already operates an ingestion pipeline that receives and stores
hazard events. Once we publish into it, get_active_hazards_from_store()
becomes the production path and live fetch stays as a development fallback.

NO API KEY? STILL WORKS
-----------------------
evaluate() takes a hazard directly and never touches the network, so the
correlation logic runs with no key at all. Only the convenience of "find
hazards for me" needs one.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# API key loading
# ---------------------------------------------------------------------------
# The key is read from, in order of precedence:
#
#   1. an existing environment variable   (CI, containers, backend deployment)
#   2. a .env file in the project root    (local development)
#
# The .env file is gitignored and MUST NOT be committed. A key committed to a
# repository stays in the git history permanently, visible to anyone with
# repository access, even after the file is deleted.
#
# Deliberately implemented without python-dotenv: it is ten lines, and this
# component's only dependencies are pyyaml and requests. Keeping it that way
# makes it easier for the backend to embed.

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def _load_env_file() -> None:
    """
    Read .env into the environment, if present.

    Never overwrites a variable that is already set: an explicitly exported
    value should always win over a file, which matters in deployment.
    """
    if not _ENV_FILE.exists():
        return
    try:
        for line in _ENV_FILE.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
    except OSError:
        # An unreadable .env is not worth crashing over. has_api_key() will
        # report False and the caller degrades to "no hazards visible".
        pass


_load_env_file()


def has_api_key() -> bool:
    """True when a live fetch is possible."""
    return bool(os.environ.get("DATAQUOLL_API_KEY"))


def get_active_hazards(state: Optional[str] = None,
                       source: str = "auto") -> list[dict]:
    """
    Active hazards, from whichever source is available.

    Args:
        state:  optional state filter, e.g. "vic". Narrows the sweep and cuts
                noise. Recommended: a scam usually targets one jurisdiction.
        source: "auto"  use the backend store if implemented, else live fetch
                "live"  force live fetch
                "store" force the backend store

    Returns a list of hazard records. Empty list if none are available, never
    raises for a missing key or an unreachable API: an empty list produces
    "no matches", which is a truthful answer when we cannot see any hazards.
    """
    if source in ("auto", "store"):
        try:
            return get_active_hazards_from_store(state)
        except NotImplementedError:
            if source == "store":
                raise
            # fall through to live fetch under "auto"

    return get_active_hazards_live(state)


def get_active_hazards_live(state: Optional[str] = None,
                            max_records: int = 200) -> list[dict]:
    """
    Fetch current incidents directly from the incident API.

    Applies the same relevance filtering used everywhere else: disaster event
    types only, forecast advisories excluded.
    """
    if not has_api_key():
        return []

    # Imported here rather than at module load so the absence of `requests`
    # never breaks importing this module. The rule engine itself has no
    # network dependency and should stay importable without one.
    from .dataquoll import (DataQuollClient, DataQuollError,
                            filter_relevant, DISASTER_EVENT_TYPES)

    try:
        client = DataQuollClient()
        raw = client.incidents(state=state,
                               event_type=",".join(DISASTER_EVENT_TYPES),
                               limit=200, max_records=max_records)
    except (DataQuollError, ImportError):
        # An unreachable API is not an exception the caller should handle.
        # No hazards visible means no correlation, which is honest.
        return []

    return filter_relevant(raw, disaster_only=True, verbose=False)


def get_active_hazards_from_store(state: Optional[str] = None) -> list[dict]:
    """
    Read active hazards from the backend's hazard store.

    NOT IMPLEMENTED. This is the production path once the backend ingestion
    pipeline is connected.

    The backend already runs a data ingestion service that receives hazard
    events over its message queue and writes them to a HazardEvent table. Its
    data source defaults to source_type "ai_model", so it was built expecting
    something upstream to feed it, and does not fetch from any external API
    itself.

    TO IMPLEMENT, two pieces:

      1. PUBLISH   push fetched incidents into the backend ingestion queue so
                   the HazardEvent table is populated.
      2. READ      replace the body of this function with a query for active
                   hazards, returning the same record shape as live fetch.

    Nothing else in this component changes. find_related_hazards() takes a
    list and does not care where it came from.
    """
    raise NotImplementedError(
        "Backend hazard store not yet connected. Using live fetch. "
        "See docs/SPECIFICATION.md, hazard sources.")
