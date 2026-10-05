"""
Evidence checks E1 to E7.

DESIGN PRINCIPLES
-----------------
1. Each check is a pure function: (Message, Hazard, config) -> CheckResult.
   No shared state, no ordering dependency. Any check can be tested alone.

2. A check never raises. Missing data produces status="not_evaluated" with a
   reason, not an exception. A prediction must not fail because a feed omitted
   a field.

3. Every result carries its evidence: what matched, and where. This is what
   makes a rule decision explainable to a reviewer without reading code.

4. Checks do not know about weights, thresholds or scoring. They report what
   they observed. Scoring is correlate.py's job.

ADDING A CHECK: see docs/EXTENDING.md.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Callable, Optional
from urllib.parse import urlparse

from .schema import Hazard, Message, parse_time


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

FIRED = "fired"
NOT_FIRED = "not_fired"
NOT_EVALUATED = "not_evaluated"
DISABLED = "disabled"


@dataclass
class CheckResult:
    check_id: str
    name: str
    status: str                     # fired | not_fired | not_evaluated | disabled
    tier: str                       # high | supporting
    weight: float
    evidence: list[str] = field(default_factory=list)
    reason: Optional[str] = None    # why not_evaluated / disabled

    @property
    def did_fire(self) -> bool:
        return self.status == FIRED

    def to_dict(self) -> dict:
        return {
            "check_id": self.check_id,
            "name": self.name,
            "status": self.status,
            "tier": self.tier,
            "weight": self.weight,
            "evidence": self.evidence,
            "reason": self.reason,
        }


def _result(cfg: dict, check_id: str, status: str,
            evidence: list[str] | None = None,
            reason: str | None = None) -> CheckResult:
    spec = cfg["checks"][check_id]
    return CheckResult(
        check_id=check_id,
        name=spec["name"],
        status=status,
        tier=spec["tier"],
        weight=float(spec["weight"]),
        evidence=evidence or [],
        reason=reason,
    )


# ---------------------------------------------------------------------------
# Matching helpers
# ---------------------------------------------------------------------------

def _find_terms(content: str, terms: list[str]) -> list[str]:
    """
    Return terms present in content, matched on word boundaries.

    Word boundaries matter: without them "fire" matches "firefighter",
    "verified" and "campfire", which produces false positives that are hard to
    diagnose later.
    """
    hits = []
    for term in terms:
        pattern = r"\b" + re.escape(term.lower()) + r"\b"
        if re.search(pattern, content):
            hits.append(term)
    return hits


def _url_host(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        parsed = urlparse(url if "://" in url else f"http://{url}")
        return (parsed.hostname or "").lower() or None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# E1 - Explicit disaster reference
# ---------------------------------------------------------------------------

def check_e1(msg: Message, hz: Hazard, cfg: dict, vocab: dict, **_) -> CheckResult:
    """
    Does the content reference this hazard's type, or a disaster generally?

    A specific type match ("flood" against a flood hazard) is strong evidence.
    A generic disaster word alone is weaker and recorded separately, so the
    distinction survives into the audit trail.
    """
    content = msg.combined_content()
    if not content:
        return _result(cfg, "E1", NOT_EVALUATED, reason="No text or url supplied")

    evidence: list[str] = []

    if hz.hazard_type:
        terms = vocab["hazard_terms"].get(hz.hazard_type.strip().lower(), [])
        for hit in _find_terms(content, terms):
            evidence.append(f"hazard_type:{hz.hazard_type}:'{hit}'")

    for hit in _find_terms(content, vocab.get("generic_disaster_terms", [])):
        evidence.append(f"generic:'{hit}'")

    if not hz.hazard_type and not evidence:
        return _result(cfg, "E1", NOT_EVALUATED,
                       reason="Hazard has no hazard_type and no generic terms matched")

    return _result(cfg, "E1", FIRED if evidence else NOT_FIRED, evidence=evidence)


# ---------------------------------------------------------------------------
# E2 - Location match
# ---------------------------------------------------------------------------

def check_e2(msg: Message, hz: Hazard, cfg: dict, **_) -> CheckResult:
    """
    Does the content name a place associated with this hazard?

    Checks suburb, LGA and state. State-level matches are weaker than suburb
    matches; both are recorded so a reviewer can tell them apart.
    """
    # Location matching uses TEXT ONLY, never the URL. Domain names contain
    # arbitrary substrings: "vic-relief.example" matches the state code "VIC"
    # and produced a false correlation during live testing.
    content = (msg.text or "").lower()
    if not content:
        return _result(cfg, "E2", NOT_EVALUATED,
                       reason="No message text supplied (URLs are not searched "
                              "for locations)")

    terms = hz.location_terms()
    if not terms:
        return _result(cfg, "E2", NOT_EVALUATED, reason="Hazard has no location fields")

    evidence = []
    for level, value in (("suburb", hz.suburb), ("street", hz.street),
                         ("lga", hz.lga), ("state", hz.state)):
        if value and _find_terms(content, [value.strip().lower()]):
            evidence.append(f"{level}:'{value}'")

    return _result(cfg, "E2", FIRED if evidence else NOT_FIRED, evidence=evidence)


# ---------------------------------------------------------------------------
# E3 - Time window  (SUPPORTING ONLY)
# ---------------------------------------------------------------------------

def check_e3(msg: Message, hz: Hazard, cfg: dict, **_) -> CheckResult:
    """
    Was the content observed while the hazard was active, or shortly after?

    SUPPORTING EVIDENCE ONLY. Temporal coincidence never establishes hazard
    relevance on its own; the structural constraint in correlate.py enforces
    this. A phishing message that merely arrives during a flood is not
    hazard-related.

    The tail window exists because disaster scams frequently follow an event
    rather than coincide with it.
    """
    if msg.observed_time is None:
        return _result(cfg, "E3", NOT_EVALUATED, reason="Message has no observed_time")
    if hz.start_time is None:
        return _result(cfg, "E3", NOT_EVALUATED, reason="Hazard has no start_time")

    tail = timedelta(hours=float(cfg["checks"]["E3"].get("tail_hours", 168)))
    window_end = (hz.end_time or hz.start_time) + tail

    if msg.observed_time < hz.start_time:
        delta = hz.start_time - msg.observed_time
        return _result(cfg, "E3", NOT_FIRED,
                       evidence=[f"observed {_humanise(delta)} before hazard start"])

    if msg.observed_time <= window_end:
        delta = msg.observed_time - hz.start_time
        return _result(cfg, "E3", FIRED,
                       evidence=[f"observed {_humanise(delta)} after hazard start"])

    delta = msg.observed_time - window_end
    return _result(cfg, "E3", NOT_FIRED,
                   evidence=[f"observed {_humanise(delta)} after window closed"])


def _humanise(delta: timedelta) -> str:
    hours = delta.total_seconds() / 3600
    if hours < 24:
        return f"{hours:.1f}h"
    return f"{hours / 24:.1f}d"


# ---------------------------------------------------------------------------
# E4 - Agency impersonation
# ---------------------------------------------------------------------------

def check_e4(msg: Message, hz: Hazard, cfg: dict, agencies: dict, **_) -> CheckResult:
    """
    Does the content invoke an emergency or relief authority?

    Fires when an agency is named but the URL does not belong to that agency's
    real domain. Naming an agency AND linking to its genuine domain is normal
    legitimate behaviour, not impersonation.

    A trusted government domain suppresses the check entirely.
    """
    content = msg.combined_content()
    if not content:
        return _result(cfg, "E4", NOT_EVALUATED, reason="No text or url supplied")

    host = _url_host(msg.url)

    named: list[tuple[str, str, list[str]]] = []
    for entry in agencies.get("agencies", []):
        hits = _find_terms(content, entry.get("aliases", []))
        if hits:
            named.append((entry["name"], hits[0], entry.get("domains", [])))

    if not named:
        return _result(cfg, "E4", NOT_FIRED)

    # Legitimate: content names an agency and links to that agency's domain.
    if host:
        for agency_name, _, domains in named:
            if any(host == d or host.endswith("." + d) for d in domains):
                return _result(cfg, "E4", NOT_FIRED,
                               evidence=[f"references {agency_name} on its own domain ({host})"])

        for suffix in agencies.get("trusted_domain_suffixes", []):
            if host.endswith(suffix):
                return _result(cfg, "E4", NOT_FIRED,
                               evidence=[f"references agency on trusted domain ({host})"])

    evidence = [f"names '{hit}' ({agency_name})" for agency_name, hit, _ in named]
    evidence.append(f"link host: {host}" if host else "no url supplied")
    return _result(cfg, "E4", FIRED, evidence=evidence)


# ---------------------------------------------------------------------------
# E5 - Relief or donation framing
# ---------------------------------------------------------------------------

def check_e5(msg: Message, hz: Hazard, cfg: dict, vocab: dict, **_) -> CheckResult:
    """
    Does the content solicit money, claims or credentials in a relief frame?

    Groups are reported by name so evidence reads as
    "payment_solicitation:'relief payment'" rather than a bare keyword.
    """
    content = msg.combined_content()
    if not content:
        return _result(cfg, "E5", NOT_EVALUATED, reason="No text or url supplied")

    evidence = []
    for group, terms in vocab.get("relief_framing", {}).items():
        for hit in _find_terms(content, terms):
            evidence.append(f"{group}:'{hit}'")

    return _result(cfg, "E5", FIRED if evidence else NOT_FIRED, evidence=evidence)


# ---------------------------------------------------------------------------
# E6 - Campaign burst  (DISABLED BY DEFAULT)
# ---------------------------------------------------------------------------

def check_e6(msg: Message, hz: Hazard, cfg: dict,
             history_provider: Optional[Callable] = None, **_) -> CheckResult:
    """
    Are similar submissions clustered near this hazard's onset?

    DISABLED BY DEFAULT. Requires submission history, which the current
    stateless inference path does not provide.

    This is NOT a paid-API limitation. Phoenix already stores every prediction
    in its IntegrationLog table (the source behind GET /api/users/integration).
    Wiring that in is a future task; the interface below is ready for it.

    A history_provider must accept (Message, Hazard) and return a list of prior
    submissions. See docs/EXTENDING.md.
    """
    if not cfg["checks"]["E6"].get("enabled", False):
        return _result(cfg, "E6", DISABLED,
                       reason="Requires submission history; not wired to IntegrationLog yet")

    if history_provider is None:
        return _result(cfg, "E6", NOT_EVALUATED,
                       reason="Check enabled but no history_provider supplied")

    try:
        similar = history_provider(msg, hz)
    except Exception as exc:                                   # noqa: BLE001
        return _result(cfg, "E6", NOT_EVALUATED,
                       reason=f"history_provider failed: {type(exc).__name__}")

    count = len(similar or [])
    threshold = int(cfg["checks"]["E6"].get("min_similar", 3))
    if count >= threshold:
        return _result(cfg, "E6", FIRED,
                       evidence=[f"{count} similar submissions near hazard onset"])
    return _result(cfg, "E6", NOT_FIRED,
                   evidence=[f"{count} similar submissions (threshold {threshold})"])


# ---------------------------------------------------------------------------
# E7 - Domain registered for this event
# ---------------------------------------------------------------------------

def check_e7(msg: Message, hz: Hazard, cfg: dict, **_) -> CheckResult:
    """
    Was the URL's domain registered around the time of this hazard?

    Research on maliciously registered phishing domains reports an average
    lifespan of roughly 8.6 days: scammers register cheap domains to match a
    live event, harvest, and abandon before takedown. A domain created for
    this specific event is strong evidence the content targets it.

    Requires `domain_registered` on the message, added offline by
    src/domain_intel.py. This check makes NO network call; the engine stays
    offline at prediction time.

    Age is evidence, not proof. A compromised legitimate domain will look old,
    which is why an established domain is REPORTED but not scored negatively.
    """
    spec = cfg["checks"]["E7"]

    registered_raw = msg.raw.get("domain_registered")
    if not registered_raw:
        note = msg.raw.get("domain_note")
        reason = ("No domain registration date on the message."
                  "E7 is optional: the other checks work without it.")
        if note:
            reason = f"{reason} ({note})"
        return _result(cfg, "E7", NOT_EVALUATED, reason=reason)

    registered = parse_time(registered_raw)
    if registered is None:
        return _result(cfg, "E7", NOT_EVALUATED,
                       reason=f"Could not parse domain_registered: {registered_raw!r}")

    if hz.start_time is None:
        return _result(cfg, "E7", NOT_EVALUATED,
                       reason="Hazard has no start_time to compare against")

    domain = msg.raw.get("domain", "domain")
    window = timedelta(days=float(spec.get("window_days_before", 14)))
    established = timedelta(days=float(spec.get("established_domain_days", 365)))

    age_at_hazard = hz.start_time - registered

    # Registered after the hazard began, or shortly before it was reported.
    if registered >= (hz.start_time - window):
        when = ("after hazard start" if registered >= hz.start_time
                else f"{_humanise(hz.start_time - registered)} before hazard start")
        return _result(cfg, "E7", FIRED,
                       evidence=[f"{domain} registered {when}, within the "
                                 f"{spec.get('window_days_before')}d event window"])

    # Long-established domain: reported as counter-evidence, not scored down.
    if age_at_hazard >= established:
        return _result(cfg, "E7", NOT_FIRED,
                       evidence=[f"{domain} registered {_humanise(age_at_hazard)} "
                                 f"before the hazard, established infrastructure "
                                 f"(counter-evidence, not scored negatively)"])

    return _result(cfg, "E7", NOT_FIRED,
                   evidence=[f"{domain} registered {_humanise(age_at_hazard)} "
                             f"before the hazard, outside the event window"])


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------
# Adding a check means writing the function and adding one line here, plus a
# config entry. Nothing else in the codebase needs to know.

CHECK_REGISTRY: dict[str, Callable[..., CheckResult]] = {
    "E1": check_e1,
    "E2": check_e2,
    "E3": check_e3,
    "E4": check_e4,
    "E5": check_e5,
    "E6": check_e6,
    "E7": check_e7,
}
