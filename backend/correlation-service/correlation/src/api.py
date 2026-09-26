import json
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from hazard_source import (
    HazardSourceError,
    get_active_hazards,
    hazard_source_available,
)

from rules_engine import (
    analyse_against_hazard,
    build_content,
    classify_relationship,
    get_enabled_checks,
    get_model_version,
    get_threshold,
)


def now_iso() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


def invalid_input_result(
    detail: str,
) -> Dict[str, Any]:
    return {
        "is_hazard_related": False,
        "correlation_probability": 0.0,
        "relationship_type": "unrelated",
        "hazard": None,
        "match_count": 0,
        "status": "invalid_input",
        "status_detail": detail,
        "model_version": get_model_version(),
        "evaluated_at": now_iso(),
        "hazards_checked": 0,
        "evidence": {
            "checks_fired": [],
        },
    }


def analyse(
    text: Optional[str] = None,
    url: Optional[str] = None,
    observed_time: Optional[str] = None,
    state: Optional[str] = None,
) -> Dict[str, Any]:
    if not text and not url:
        return invalid_input_result(
            "Neither text nor url supplied"
        )

    evaluated_at = now_iso()

    try:
        hazards = get_active_hazards(
            state=state,
        )
    except HazardSourceError as exc:
        return {
            "is_hazard_related": False,
            "correlation_probability": 0.0,
            "relationship_type": "unrelated",
            "hazard": None,
            "match_count": 0,
            "status": "no_hazards_available",
            "status_detail": str(exc),
            "model_version": get_model_version(),
            "evaluated_at": evaluated_at,
            "hazards_checked": 0,
            "evidence": {
                "checks_fired": [],
            },
        }

    results = []

    content = build_content(
        text,
        url,
    )

    for hazard in hazards:
        analysis = analyse_against_hazard(
            text=text,
            url=url,
            hazard=hazard,
        )

        if analysis["is_hazard_related"]:
            relationship_type = classify_relationship(
                content=content,
                hazard=hazard,
                checks_fired=analysis["checks_fired"],
            )

            results.append(
                {
                    "hazard": hazard,
                    "score": analysis[
                        "correlation_probability"
                    ],
                    "relationship_type": relationship_type,
                    "checks_fired": analysis[
                        "checks_fired"
                    ],
                    "check_details": analysis[
                        "check_details"
                    ],
                }
            )

    results.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    if not results:
        return {
            "is_hazard_related": False,
            "correlation_probability": 0.0,
            "relationship_type": "unrelated",
            "hazard": None,
            "match_count": 0,
            "status": "ok",
            "status_detail": (
                "Content did not relate to any active hazard"
            ),
            "model_version": get_model_version(),
            "evaluated_at": evaluated_at,
            "hazards_checked": len(hazards),
            "evidence": {
                "checks_fired": [],
            },
        }

    best = results[0]

    response: Dict[str, Any] = {
        "is_hazard_related": True,
        "correlation_probability": best["score"],
        "relationship_type": best[
            "relationship_type"
        ],
        "hazard": best["hazard"],
        "match_count": len(results),
        "status": "ok",
        "status_detail": None,
        "model_version": get_model_version(),
        "evaluated_at": evaluated_at,
        "hazards_checked": len(hazards),
        "evidence": {
            "checks_fired": best[
                "checks_fired"
            ],
            "details": best[
                "check_details"
            ],
        },
    }

    if len(results) > 1:
        response["other_matches"] = [
            item["hazard"]
            for item in results[1:]
        ]

    return response


def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "model_version": get_model_version(),
        "threshold": get_threshold(),
        "checks_enabled": get_enabled_checks(),
        "hazard_source": "live_api",
        "hazard_source_available": (
            hazard_source_available()
        ),
    }


def main() -> None:
    try:
        raw_input = sys.stdin.read()

        if not raw_input.strip():
            print(
                json.dumps(
                    {
                        "error": "No input supplied",
                    }
                )
            )
            return

        payload = json.loads(raw_input)

        action = payload.get("action")

        if action == "health":
            result = health()

        elif action == "analyse":
            result = analyse(
                text=payload.get("text"),
                url=payload.get("url"),
                observed_time=payload.get(
                    "observed_time"
                ),
                state=payload.get("state"),
            )

        else:
            result = {
                "error": (
                    "Unknown action. "
                    "Expected 'analyse' or 'health'."
                )
            }

        print(
            json.dumps(
                result,
                ensure_ascii=False,
            )
        )

    except Exception as exc:
        print(
            json.dumps(
                {
                    "error": str(exc),
                }
            )
        )


if __name__ == "__main__":
    main()