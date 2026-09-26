import os
from typing import Any, Dict, List, Optional

import requests


DATAQUOLL_BASE_URL = os.getenv(
    "DATAQUOLL_BASE_URL",
    "https://dataquoll.io/api/v1",
)

DATAQUOLL_API_KEY = os.getenv("DATAQUOLL_API_KEY")

REQUEST_TIMEOUT = int(
    os.getenv("DATAQUOLL_TIMEOUT_SECONDS", "30")
)

PAGE_LIMIT = min(
    int(os.getenv("DATAQUOLL_PAGE_LIMIT", "500")),
    500,
)


class HazardSourceError(Exception):
    """Raised when the live hazard source cannot be queried."""


def _normalise_feature(feature: Dict[str, Any]) -> Dict[str, Any]:
    properties = feature.get("properties") or {}
    location = properties.get("location") or {}
    timestamps = properties.get("timestamps") or {}

    return {
        "hazard_id": feature.get("id"),
        "hazard_type": properties.get("eventType"),
        "location": {
            "suburb": location.get("suburb"),
            "state": (
                location.get("state")
                or properties.get("location_state")
                or properties.get("source", {}).get("state")
            ),
        },
        "status": properties.get("status"),
        "severity": properties.get("severity"),
        "start_time": (
            timestamps.get("reported")
            or timestamps.get("updated")
        ),
        "title": properties.get("title"),
        "description": (
            properties.get("details", {}) or {}
        ).get("description"),
        "warning_level": properties.get("warningLevel"),
        "urgency": properties.get("urgency"),
        "certainty": properties.get("certainty"),
        "agency": (
            properties.get("source", {}) or {}
        ).get("agency"),
        "raw": feature,
    }


def get_active_hazards_from_store() -> List[Dict[str, Any]]:
    """
    Placeholder for the future Phoenix database-backed implementation.

    The integration guide explicitly describes this as the optional
    ingestion-pipeline path.

    When implemented, this function should return the same normalised
    structure as get_active_hazards().
    """

    raise NotImplementedError(
        "Database-backed hazard retrieval is not configured"
    )


def get_active_hazards(
    state: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieve active hazards from DataQuoll.

    Returns:
        A list of normalised hazard dictionaries.

    Raises:
        HazardSourceError if the API cannot be reached or returns
        an unsuccessful response.
    """

    if not DATAQUOLL_API_KEY:
        raise HazardSourceError(
            "DATAQUOLL_API_KEY is not configured"
        )

    url = f"{DATAQUOLL_BASE_URL.rstrip('/')}/incidents"

    headers = {
        "Authorization": f"Bearer {DATAQUOLL_API_KEY}",
        "Accept": "application/json",
    }

    params: Dict[str, Any] = {
        "limit": PAGE_LIMIT,
        "status": "active",
    }

    if state:
        params["state"] = state.lower()

    hazards: List[Dict[str, Any]] = []

    while True:
        try:
            response = requests.get(
                url,
                headers=headers,
                params=params,
                timeout=REQUEST_TIMEOUT,
            )
        except requests.RequestException as exc:
            raise HazardSourceError(
                f"DataQuoll request failed: {exc}"
            ) from exc

        if response.status_code >= 400:
            detail = response.text[:500]

            raise HazardSourceError(
                f"DataQuoll returned HTTP "
                f"{response.status_code}: {detail}"
            )

        try:
            body = response.json()
        except ValueError as exc:
            raise HazardSourceError(
                "DataQuoll returned invalid JSON"
            ) from exc

        features = body.get("features") or []

        for feature in features:
            hazards.append(
                _normalise_feature(feature)
            )

        meta = body.get("meta") or {}

        # DataQuoll's cursor is opaque.
        next_cursor = (
            meta.get("next_cursor")
            or body.get("nextCursor")
        )

        if not next_cursor:
            break

        params["cursor"] = next_cursor

    return hazards


def hazard_source_available() -> bool:
    return bool(DATAQUOLL_API_KEY)