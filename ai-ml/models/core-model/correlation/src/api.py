"""
Public API for the correlation component.

This is the only module backend needs to import. Everything else is internal.

    from correlation.src.api import analyse

    result = analyse(
        text="Bushfire relief for Cardinia residents. Claim your payment.",
        url="https://vic-relief-claims.example/apply",
        observed_time="2026-09-04T03:00:00Z",
        state="vic",
    )

What it does, in order:

    1. fetch currently active hazards from the incident API
    2. look up the URL's domain registration date (for E7)
    3. evaluate the content against every active hazard
    4. return the best match, plus any others

There is no trained model, no pickle, no joblib, no weights file. The logic is
rules, and the rules live in config/*.yaml. Nothing needs deserialising and
there is no model artifact to version or load.

HAZARD SOURCE
-------------
Hazards come from the live incident API on each call. This is a deliberate
interim arrangement until the backend ingestion pipeline is connected, at
which point get_active_hazards_from_store() in hazard_source.py becomes the
source and nothing here changes.

The live path has a hard limit: the API allows 5,000 requests per month,
roughly 166 per day. That is workable during integration and testing and is
NOT sufficient for production traffic. See docs/LIMITATIONS.md.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from .correlate import Config, evaluate, find_related_hazards, load_config
from .hazard_source import get_active_hazards, has_api_key
from .schema import to_hazard

__all__ = ["analyse", "analyse_against_hazard", "health", "MODEL_VERSION"]

MODEL_VERSION = "correlation-1.0.0"

_CONFIG: Config | None = None


def _config() -> Config:
    """Load config once and reuse. Reading YAML per request is wasteful."""
    global _CONFIG
    if _CONFIG is None:
        _CONFIG = load_config()
    return _CONFIG


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hazard_summary(hazard_record: Any) -> dict:
    """
    Describe which hazard a result refers to.

    The caller needs more than an id: a frontend showing "related to an active
    bushfire in Cardinia" cannot do that from an opaque identifier.
    """
    h = to_hazard(hazard_record)
    # Location is grouped rather than flattened. Records from the incident API
    # separate suburb and state cleanly; a caller-supplied hazard may provide a
    # single generic "location" value, which lands in the state field. Grouping
    # avoids asserting a precision the input may not have.
    return {
        "hazard_id": h.hazard_id,
        "hazard_type": h.hazard_type,
        "location": {
            "suburb": h.suburb,
            "state": h.state,
        },
        "status": h.status,
        "severity": h.severity,
        "start_time": h.start_time.isoformat() if h.start_time else None,
    }


def _enrich_domain(message: dict) -> dict:
    """
    Add the URL's domain registration date, used by E7.

    A failed lookup is not an error. E7 reports not_evaluated and the other
    checks proceed unaffected.
    """
    if not message.get("url"):
        return message
    try:
        from .domain_intel import enrich_message
        return enrich_message(message, polite_delay=0)
    except Exception as exc:                                  # noqa: BLE001
        message = dict(message)
        message["domain_note"] = f"domain lookup unavailable: {type(exc).__name__}"
        return message


def analyse(text: Optional[str] = None,
            url: Optional[str] = None,
            observed_time: Optional[str] = None,
            state: Optional[str] = None,
            include_all_matches: bool = True,
            include_evidence: bool = True) -> dict:
    """
    Assess whether content relates to any currently active hazard.

    Args:
        text:           message body. At least one of text or url is required.
        url:            link contained in the message.
        observed_time:  ISO 8601. When the content was seen. Defaults to now.
        state:          optional filter, e.g. "vic". Narrows the hazards
                        checked. Recommended when known: it cuts noise and
                        reflects that a scam usually targets one jurisdiction.
        include_all_matches: return every matching hazard, not just the best.
        include_evidence:    return which checks fired and why.

    Returns a dict. See docs/CONTRACT.md for the full shape.

    Never raises for missing data or an unreachable API. An empty hazard list
    produces is_hazard_related false with a status explaining why, which is a
    truthful answer when no hazards can be seen.
    """
    if not text and not url:
        return {
            "is_hazard_related": False,
            "correlation_probability": 0.0,
            "relationship_type": "unrelated",
            "hazard": None,
            "status": "invalid_input",
            "status_detail": "At least one of text or url must be provided.",
            "model_version": MODEL_VERSION,
            "evaluated_at": _now_iso(),
            "hazards_checked": 0,
        }

    message = {
        "text": text,
        "url": url,
        "observed_time": observed_time or _now_iso(),
    }
    message = _enrich_domain(message)

    hazards = get_active_hazards(state=state)

    if not hazards:
        detail = ("No API key configured, so active hazards could not be retrieved."
                  if not has_api_key() else
                  "No active hazards were returned for the requested area.")
        return {
            "is_hazard_related": False,
            "correlation_probability": 0.0,
            "relationship_type": "unrelated",
            "hazard": None,
            "status": "no_hazards_available",
            "status_detail": detail,
            "model_version": MODEL_VERSION,
            "evaluated_at": _now_iso(),
            "hazards_checked": 0,
        }

    result = find_related_hazards(message, hazards, _config())

    response: dict = {
        "is_hazard_related": result["match_count"] > 0,
        "correlation_probability": 0.0,
        "relationship_type": "unrelated",
        "hazard": None,
        "status": "ok",
        "status_detail": None,
        "model_version": MODEL_VERSION,
        "evaluated_at": _now_iso(),
        "hazards_checked": result["hazards_checked"],
    }

    if result["match_count"] > 0:
        best = result["best_match"]
        best_record = next(
            (h for h in hazards if to_hazard(h).hazard_id == best["hazard_id"]),
            None)

        response["correlation_probability"] = best["correlation_probability"]
        response["relationship_type"] = best["relationship_type"]
        response["hazard"] = _hazard_summary(best_record) if best_record else {
            "hazard_id": best["hazard_id"]}
        response["match_count"] = result["match_count"]

        if include_all_matches and result["match_count"] > 1:
            response["other_matches"] = [
                {"hazard": _hazard_summary(
                    next((h for h in hazards
                          if to_hazard(h).hazard_id == m["hazard_id"]), {})),
                 "correlation_probability": m["correlation_probability"],
                 "relationship_type": m["relationship_type"]}
                for m in result["matches"][1:]
            ]

        if include_evidence and best_record is not None:
            full = evaluate(message, best_record, _config())
            response["evidence"] = {
                "checks_fired": full.fired(),
                "detail": [c.to_dict() for c in full.checks],
                "notes": full.notes,
                "rules_version": full.rules_version,
                "threshold_used": full.threshold_used,
            }
    else:
        response["status_detail"] = (
            "Content did not relate to any active hazard. This says nothing "
            "about whether it is malicious: that is the phishing component's "
            "determination.")
        response["match_count"] = 0

    return response


def analyse_against_hazard(text: Optional[str],
                           url: Optional[str],
                           hazard: dict,
                           observed_time: Optional[str] = None,
                           include_evidence: bool = True) -> dict:
    """
    Assess content against ONE specific hazard supplied by the caller.

    Makes no network call for hazards. Use this when the hazard is already
    known, for example once the backend ingestion pipeline supplies it, or
    when re-checking a stored result.
    """
    message = {
        "text": text,
        "url": url,
        "observed_time": observed_time or _now_iso(),
    }
    message = _enrich_domain(message)

    result = evaluate(message, hazard, _config())

    response: dict = {
        "is_hazard_related": result.is_hazard_related,
        "correlation_probability": round(result.correlation_probability, 4),
        "relationship_type": result.relationship_type,
        "hazard": _hazard_summary(hazard),
        "status": "ok",
        "status_detail": None,
        "model_version": MODEL_VERSION,
        "evaluated_at": _now_iso(),
        "hazards_checked": 1,
    }

    if include_evidence:
        response["evidence"] = {
            "checks_fired": result.fired(),
            "detail": [c.to_dict() for c in result.checks],
            "notes": result.notes,
            "rules_version": result.rules_version,
            "threshold_used": result.threshold_used,
        }

    return response


def health() -> dict:
    """
    Readiness check. Suitable for a backend health endpoint.

    Reports whether the component can retrieve hazards. Without an API key the
    rules still work through analyse_against_hazard(), but analyse() cannot
    find hazards on its own.
    """
    cfg = _config()
    enabled = [k for k, v in cfg.rules["checks"].items() if v.get("enabled", True)]
    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "rules_version": cfg.version,
        "threshold": cfg.rules["threshold"]["value"],
        "checks_enabled": enabled,
        "hazard_source": "live_api",
        "hazard_source_available": has_api_key(),
    }
