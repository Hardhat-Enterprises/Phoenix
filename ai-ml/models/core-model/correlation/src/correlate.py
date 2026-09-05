"""
Correlation scoring and output construction.

RESPONSIBILITY
--------------
rules.py observes evidence. This file decides what that evidence means:
applies weights, enforces the structural constraint, compares against the
threshold, and determines relationship_type.

The separation matters. Changing how evidence is weighted must never require
touching the checks themselves.

OUTPUT SCOPE
------------
This produces the CORRELATION HEAD's outputs only:

    is_hazard_related, correlation_probability, relationship_type, hazard_id

It deliberately does NOT produce is_phishing or risk_level. Those belong to
the phishing head and the combine step respectively. Keeping the boundary
clean is what allows each component to be replaced independently, which is the
whole point of the Option 3 architecture.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
from pathlib import Path
from typing import Any, Callable, Optional

import yaml

from .rules import CHECK_REGISTRY, CheckResult, DISABLED, NOT_EVALUATED
from .schema import Hazard, Message, hazard_is_empty, to_hazard, to_message


# ---------------------------------------------------------------------------
# Configuration loading
# ---------------------------------------------------------------------------

CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"


@dataclass
class Config:
    rules: dict
    agencies: dict
    keywords: dict

    @property
    def version(self) -> str:
        return self.rules.get("version", "unknown")


def load_config(config_dir: Path | str | None = None) -> Config:
    """Load all three config files. Fails loudly: a missing config is a bug."""
    d = Path(config_dir) if config_dir else CONFIG_DIR
    def _read(name: str) -> dict:
        path = d / name
        if not path.exists():
            raise FileNotFoundError(f"Required config missing: {path}")
        with open(path, "r", encoding="utf-8") as fh:
            return yaml.safe_load(fh) or {}
    return Config(rules=_read("rules.yaml"),
                  agencies=_read("agencies.yaml"),
                  keywords=_read("keywords.yaml"))


# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------

@dataclass
class CorrelationResult:
    is_hazard_related: bool
    correlation_probability: float
    relationship_type: str
    hazard_id: Optional[str]
    checks: list[CheckResult] = field(default_factory=list)
    rules_version: str = "unknown"
    threshold_used: float = 0.0
    threshold_status: str = ""
    notes: list[str] = field(default_factory=list)

    def fired(self) -> list[str]:
        return [c.check_id for c in self.checks if c.did_fire]

    def to_dict(self, include_checks: bool = True) -> dict:
        out: dict[str, Any] = {
            "is_hazard_related": self.is_hazard_related,
            "correlation_probability": round(self.correlation_probability, 4),
            "relationship_type": self.relationship_type,
            "hazard_id": self.hazard_id,
        }
        if include_checks:
            out["evidence"] = {
                "checks_fired": self.fired(),
                "detail": [c.to_dict() for c in self.checks],
                "rules_version": self.rules_version,
                "threshold_used": self.threshold_used,
                "threshold_status": self.threshold_status,
                "notes": self.notes,
            }
        return out


# ---------------------------------------------------------------------------
# Core evaluation
# ---------------------------------------------------------------------------

def evaluate(message: Any, hazard: Any, config: Config | None = None,
             history_provider: Optional[Callable] = None) -> CorrelationResult:
    """
    Assess whether one message is related to one hazard.

    Accepts raw dicts in any supported shape; normalisation is handled by
    schema.py. Never raises on incomplete input.
    """
    cfg = config or load_config()
    msg: Message = to_message(message)
    hz: Hazard = to_hazard(hazard)

    # ---- run every check ------------------------------------------------
    results: list[CheckResult] = []
    for check_id, fn in CHECK_REGISTRY.items():
        spec = cfg.rules["checks"].get(check_id)
        if spec is None:
            continue
        if not spec.get("enabled", True) and check_id != "E6":
            # E6 handles its own disabled state so it can report the reason.
            results.append(CheckResult(
                check_id=check_id, name=spec["name"], status=DISABLED,
                tier=spec["tier"], weight=float(spec["weight"]),
                reason="Disabled in rules.yaml"))
            continue
        results.append(fn(msg, hz, cfg.rules,
                          vocab=cfg.keywords,
                          agencies=cfg.agencies,
                          history_provider=history_provider))

    # ---- score ----------------------------------------------------------
    score, notes = _score(results, cfg.rules)

    threshold = float(cfg.rules["threshold"]["value"])
    threshold_status = cfg.rules["threshold"].get("status", "")

    high_fired = [c for c in results if c.did_fire and c.tier == "high"]
    require_high = cfg.rules.get("require_high_weight_evidence", True)

    if require_high and not high_fired:
        is_related = False
        if any(c.did_fire for c in results):
            notes.append(
                "Supporting evidence fired but no high-weight check did. "
                "Correlation suppressed: temporal or volume coincidence alone "
                "does not establish hazard relevance.")
    else:
        is_related = score >= threshold

    # ---- hazard-specificity requirement (K-0) ---------------------------
    # Some high-tier checks (agency impersonation, relief framing) detect
    # content patterns without verifying the content relates to THIS hazard.
    # Require at least one check that does verify it.
    spec_cfg = cfg.rules.get("require_hazard_specific_evidence", {}) or {}
    if is_related and spec_cfg.get("enabled", False):
        required = set(spec_cfg.get("require_one_of", []))
        accepted_levels = spec_cfg.get("accepted_location_levels")
        accepted_refs = spec_cfg.get("accepted_disaster_reference")

        specific_fired = set()
        for c in results:
            if not c.did_fire or c.check_id not in required:
                continue
            # E2 matches at suburb / street / lga / state. A state-level match
            # is too coarse to tie content to one event, so it does not count
            # as hazard-specific evidence.
            if c.check_id == "E2" and accepted_levels:
                if not any(e.split(":")[0] in accepted_levels for e in c.evidence):
                    continue
            # E1 matches either this hazard's type, or a generic disaster word.
            # Generic words ("emergency", "disaster") match every hazard, so
            # they cannot tie content to this particular event.
            if c.check_id == "E1" and accepted_refs:
                if not any(e.split(":")[0] in accepted_refs for e in c.evidence):
                    continue
            specific_fired.add(c.check_id)

        if required and not specific_fired:
            is_related = False
            notes.append(
                f"Correlation suppressed: no hazard-specific evidence. None of "
                f"{sorted(required)} fired at a level specific to this hazard, "
                f"so nothing ties this content to this particular event rather "
                f"than to disasters generally.")

    # ---- hard vetoes ----------------------------------------------------
    # Applied LAST, after scoring, because a veto overrides all evidence.
    # The score is still reported so a reviewer can see what the evidence
    # said before the veto suppressed it.
    vetoes = _check_vetoes(msg, hz, cfg.rules)
    if vetoes:
        is_related = False
        notes.extend(f"VETO: {v}" for v in vetoes)

    rel_type = _relationship_type(results, cfg.rules, is_related)

    # An unparseable hazard produces "not related" for the wrong reason. Say so
    # rather than letting the caller treat it as a real determination.
    if hazard_is_empty(hz):
        notes.insert(0, "WARNING: no usable fields extracted from the hazard record. "
                        "This result reflects missing data, not an assessment. "
                        "Check the record format.")

    # Surface data-quality problems rather than hiding them.
    for c in results:
        if c.status == NOT_EVALUATED:
            notes.append(f"{c.check_id} not evaluated: {c.reason}")

    return CorrelationResult(
        is_hazard_related=is_related,
        correlation_probability=score,
        relationship_type=rel_type,
        hazard_id=hz.hazard_id,
        checks=results,
        rules_version=cfg.version,
        threshold_used=threshold,
        threshold_status=threshold_status,
        notes=notes,
    )


def _check_vetoes(msg: Message, hz: Hazard, rules: dict) -> list[str]:
    """
    Hard constraints that override all accumulated evidence.

    A veto encodes something logically impossible, not merely unlikely. If one
    fires, is_hazard_related is false no matter how many checks fired.

    Returns a list of human-readable veto reasons. Empty means no veto.
    """
    vetoes: list[str] = []
    cfg = rules.get("vetoes", {}) or {}

    # --- message observed before the hazard existed ---------------------
    spec = cfg.get("message_predates_hazard", {}) or {}
    if spec.get("enabled", True):
        if msg.observed_time is not None and hz.start_time is not None:
            grace = timedelta(hours=float(spec.get("grace_hours", 0)))
            earliest_plausible = hz.start_time - grace
            if msg.observed_time < earliest_plausible:
                delta = hz.start_time - msg.observed_time
                vetoes.append(
                    f"message observed {_humanise_delta(delta)} before the hazard "
                    f"was reported, beyond the {spec.get('grace_hours', 0)}h "
                    f"forecast-activity grace window. Content cannot exploit an "
                    f"event that has not happened.")

    return vetoes


def _humanise_delta(delta: timedelta) -> str:
    hours = delta.total_seconds() / 3600
    if hours < 48:
        return f"{hours:.1f}h"
    days = hours / 24
    if days < 60:
        return f"{days:.1f}d"
    return f"{days / 30:.1f} months"


def _score(results: list[CheckResult], rules: dict) -> tuple[float, list[str]]:
    """
    Weighted score, normalised by the weight that was actually evaluable.

    Normalising by evaluable weight rather than total weight means a hazard
    missing its start_time is not silently penalised for E3 being unavailable.
    Without this, incomplete feed data would look like weak correlation.
    """
    notes: list[str] = []
    earned = 0.0
    available = 0.0

    for c in results:
        if c.status in (DISABLED, NOT_EVALUATED):
            continue
        available += c.weight
        if c.did_fire:
            earned += c.weight

    if available == 0:
        notes.append("No checks could be evaluated; score is not meaningful.")
        return 0.0, notes

    total_weight = sum(
        float(s["weight"]) for s in rules["checks"].values() if s.get("enabled", True)
    )
    if available < total_weight * 0.6:
        notes.append(
            f"Only {available:.2f} of {total_weight:.2f} weight was evaluable. "
            "Score computed on partial evidence.")

    return earned / available, notes


def _relationship_type(results: list[CheckResult], rules: dict, is_related: bool) -> str:
    """
    Determine relationship_type from which checks fired.

    Rules are evaluated in config order; first match wins. Order therefore
    encodes specificity: more specific relationships must be listed first.
    """
    if not is_related:
        return "unrelated"

    fired = {c.check_id for c in results if c.did_fire}

    for rule in rules.get("relationship_types", []):
        requires = set(rule.get("requires", []))
        any_of = set(rule.get("any_of", []))

        if requires and not requires.issubset(fired):
            continue
        if any_of and not (any_of & fired):
            continue
        if not requires and not any_of and fired:
            continue          # the catch-all "unrelated" rule; skip when evidence exists
        return rule["type"]

    return "uncertain"


# ---------------------------------------------------------------------------
# Batch helper
# ---------------------------------------------------------------------------

def evaluate_pairs(messages: list[Any], hazards: list[Any],
                   config: Config | None = None) -> list[dict]:
    """
    Evaluate every message against every hazard (cross-product).

    Used for dataset construction and for regression testing the rule. The same
    message scored against several hazards is a genuinely strong test: keyword
    matching alone cannot pass it, because the message does not change.
    """
    cfg = config or load_config()
    out = []
    for m in messages:
        for h in hazards:
            res = evaluate(m, h, cfg)
            out.append({
                "message_id": to_message(m).message_id,
                "hazard_id": to_hazard(h).hazard_id,
                **res.to_dict(include_checks=False),
                "checks_fired": res.fired(),
            })
    return out


# ---------------------------------------------------------------------------
# Candidate matching
# ---------------------------------------------------------------------------
# evaluate() answers "is this ONE message related to this ONE hazard". Real
# callers do not know which hazard to ask about, they have a suspicious link
# and nothing else. This closes that gap.
#
# DESIGN NOTE: this takes a LIST of hazards, not a store. correlate.py stays
# free of storage dependencies, so it remains offline and testable. The caller
# pulls active hazards from wherever they live and passes them in.
#
# There is deliberately NO separate pre-filter. Filtering by hazard type and
# time window already happens inside E1 and E3. A second filter with its own
# keyword list would be duplicated logic that drifts out of step with the
# rules, which is the pattern behind most defects found so far.
#
# Brute force is fast enough: ~78ms against 300 active hazards, which is more
# than the expected national total. Optimise only if that stops being true.

def find_related_hazards(message: Any, hazards: list[Any],
                         config: Config | None = None,
                         include_unrelated: bool = False) -> dict:
    """
    Given one message and the currently active hazards, find which it relates to.

    Args:
        message:  {text, url, observed_time}. No hazard_id needed.
        hazards:  active hazard records, any supported format. Caller should
                  narrow by state first where possible, both to cut noise and
                  because a scam usually targets one jurisdiction.
        include_unrelated: keep non-matching hazards in the output. Useful for
                  debugging why something did NOT match; noisy otherwise.

    Returns a dict with matches sorted by correlation_probability, highest
    first, plus a summary.

    Multiple matches are expected and are not an error. A message naming a
    hazard type but no location genuinely relates to every active hazard of
    that type. See the type-level matching limitation in docs/KNOWN_ISSUES.md.
    """
    cfg = config or load_config()

    evaluated = []
    for hz in hazards:
        result = evaluate(message, hz, cfg)
        record = result.to_dict(include_checks=False)
        record["checks_fired"] = result.fired()
        if not result.is_hazard_related and result.notes:
            # Surface the first reason so a caller can explain a non-match
            # without digging through the full evidence block.
            record["reason"] = result.notes[0]
        evaluated.append((result, record))

    matches = [rec for res, rec in evaluated if res.is_hazard_related]
    matches.sort(key=lambda r: r["correlation_probability"], reverse=True)

    out = {
        "hazards_checked": len(hazards),
        "match_count": len(matches),
        "best_match": matches[0] if matches else None,
        "matches": matches,
    }

    if include_unrelated:
        out["unrelated"] = [rec for res, rec in evaluated if not res.is_hazard_related]

    if not hazards:
        out["note"] = ("No active hazards supplied. Either none are currently "
                       "active, or hazards could not be retrieved. Check that "
                       "DATAQUOLL_API_KEY is configured.")
    elif not matches:
        out["note"] = ("Content did not relate to any active hazard. It may still "
                       "be phishing, which is the phishing head's determination, "
                       "not this component's.")
    elif len(matches) > 1:
        out["note"] = (f"Related to {len(matches)} hazards. Expected when content "
                       "names a hazard type but no specific location.")

    return out
