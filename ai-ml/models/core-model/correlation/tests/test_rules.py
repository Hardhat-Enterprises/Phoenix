"""
Test suite for the correlation rule baseline.

These tests are the contract. If you change a rule and a test fails, either the
change is wrong or the test needs updating with a documented reason. Do not
delete a test to make a change pass.

Run:  python -m pytest tests/ -v
      python tests/test_rules.py        (no pytest required)
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.correlate import evaluate, load_config          # noqa: E402
from src.schema import parse_time, to_hazard             # noqa: E402

CFG = load_config()

NOW = datetime(2026, 8, 23, 12, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

VIC_FLOOD = {
    "hazard": {
        "hazard_id": "vic-ses-1001",
        "hazard_type": "flood",
        "description": "Major flooding in western Victoria",
        "location": "Victoria",
        "start_time": "2026-08-22T04:00:00Z",
        "status": "active",
        "severity": "Severe",
    }
}

NSW_FIRE = {
    "hazard": {
        "hazard_id": "nsw-rfs-2002",
        "hazard_type": "bushfire",
        "description": "Bush fire near Warragamba",
        "location": "New South Wales",
        "start_time": "2020-01-02T04:00:00Z",
        "status": "active",
        "severity": "Extreme",
    }
}

DATAQUOLL_FEATURE = {
    "type": "Feature",
    "id": "nsw-rfs-1234567",
    "geometry": {"type": "Point", "coordinates": [150.604, -33.883]},
    "properties": {
        "source": {"state": "nsw", "agency": "RFS", "feedId": "1234567"},
        "title": "Bush Fire - Warragamba",
        "eventType": "bushfire",
        "status": "active",
        "severity": "Severe",
        "location": {"suburb": "Warragamba", "state": "NSW",
                     "latitude": -33.883, "longitude": 150.604},
        "details": {"description": "Bush fire burning in a south-easterly direction"},
        "timestamps": {"reported": "2026-08-22T14:30:00+10:00"},
    },
}


RECENT_UNRELATED_BUSHFIRE = {
    "hazard": {
        "hazard_id": "nsw-rfs-9999",
        "hazard_type": "bushfire",
        "description": "Bush fire near Warragamba",
        "location": "New South Wales",
        "start_time": "2026-08-20T04:00:00Z",   # 3 days before NOW — E3 WILL fire
        "status": "active",
        "severity": "Extreme",
    }
}


def msg(text=None, url=None, when=NOW):
    return {"text": text, "url": url,
            "observed_time": when.isoformat() if when else None}


# ---------------------------------------------------------------------------
# Schema adapter
# ---------------------------------------------------------------------------

def test_geojson_adapter():
    h = to_hazard(DATAQUOLL_FEATURE)
    assert h.hazard_id == "nsw-rfs-1234567"
    assert h.hazard_type == "bushfire"
    assert h.suburb == "Warragamba"
    assert h.state == "NSW"
    assert h.agency == "RFS"
    assert h.description.startswith("Bush fire burning")
    assert h.start_time is not None


def test_nested_adapter():
    h = to_hazard(VIC_FLOOD)
    assert h.hazard_id == "vic-ses-1001"
    assert h.hazard_type == "flood"
    assert h.state == "Victoria"


def test_flat_adapter_legacy():
    h = to_hazard({"hazard_type": "flood", "hazard_location": "Victoria",
                   "hazard_status": "active", "hazard_severity": 0.8})
    assert h.hazard_type == "flood"
    assert h.state == "Victoria"
    assert h.severity == "0.8"


def test_parse_time_never_raises():
    assert parse_time(None) is None
    assert parse_time("") is None
    assert parse_time("not a date") is None
    assert parse_time("2026-08-23T00:00:00Z") is not None


# ---------------------------------------------------------------------------
# E1 disaster reference
# ---------------------------------------------------------------------------

def test_e1_fires_on_matching_hazard_type():
    r = evaluate(msg("Flood relief information for residents"), VIC_FLOOD, CFG)
    assert "E1" in r.fired()


def test_e1_does_not_fire_on_wrong_hazard_type():
    # "flood" text against a bushfire hazard must not match on type.
    r = evaluate(msg("Flood relief information"), NSW_FIRE, CFG)
    e1 = next(c for c in r.checks if c.check_id == "E1")
    assert not any("hazard_type" in e for e in e1.evidence)


def test_e1_word_boundary_prevents_false_positive():
    # "campfire" must not match "fire".
    r = evaluate(msg("Photos from our campfire last weekend"), NSW_FIRE, CFG)
    e1 = next(c for c in r.checks if c.check_id == "E1")
    assert not e1.did_fire


# ---------------------------------------------------------------------------
# E2 location
# ---------------------------------------------------------------------------

def test_e2_fires_on_state_match():
    r = evaluate(msg("Residents across Victoria should prepare"), VIC_FLOOD, CFG)
    assert "E2" in r.fired()


def test_e2_fires_on_suburb_match():
    r = evaluate(msg("Fire near Warragamba today"), DATAQUOLL_FEATURE, CFG)
    assert "E2" in r.fired()


def test_e2_not_evaluated_without_location():
    r = evaluate(msg("Some text"), {"hazard": {"hazard_type": "flood"}}, CFG)
    e2 = next(c for c in r.checks if c.check_id == "E2")
    assert e2.status == "not_evaluated"


# ---------------------------------------------------------------------------
# E3 time  (supporting only)
# ---------------------------------------------------------------------------

def test_e3_fires_inside_window():
    r = evaluate(msg("text", when=NOW), VIC_FLOOD, CFG)
    assert "E3" in r.fired()


def test_e3_does_not_fire_before_hazard():
    before = datetime(2026, 8, 1, tzinfo=timezone.utc)
    r = evaluate(msg("text", when=before), VIC_FLOOD, CFG)
    e3 = next(c for c in r.checks if c.check_id == "E3")
    assert not e3.did_fire


def test_e3_not_evaluated_without_timestamp():
    r = evaluate({"text": "hi", "url": None}, VIC_FLOOD, CFG)
    e3 = next(c for c in r.checks if c.check_id == "E3")
    assert e3.status == "not_evaluated"


# ---------------------------------------------------------------------------
# E4 agency impersonation
# ---------------------------------------------------------------------------

def test_e4_fires_on_agency_with_untrusted_domain():
    r = evaluate(msg("Message from VicEmergency about your claim",
                     "https://vic-relief-claims.example/login"), VIC_FLOOD, CFG)
    assert "E4" in r.fired()


def test_e4_suppressed_on_genuine_agency_domain():
    r = evaluate(msg("Update from VicEmergency",
                     "https://emergency.vic.gov.au/respond"), VIC_FLOOD, CFG)
    e4 = next(c for c in r.checks if c.check_id == "E4")
    assert not e4.did_fire


def test_e4_suppressed_on_trusted_gov_suffix():
    r = evaluate(msg("Advice from the SES", "https://ses.qld.gov.au/alerts"),
                 VIC_FLOOD, CFG)
    e4 = next(c for c in r.checks if c.check_id == "E4")
    assert not e4.did_fire


# ---------------------------------------------------------------------------
# E5 relief framing
# ---------------------------------------------------------------------------

def test_e5_fires_on_payment_solicitation():
    r = evaluate(msg("Claim your disaster payment now"), VIC_FLOOD, CFG)
    assert "E5" in r.fired()


def test_e5_fires_on_account_verification():
    r = evaluate(msg("Please verify your account to continue"), VIC_FLOOD, CFG)
    assert "E5" in r.fired()


# ---------------------------------------------------------------------------
# E6 disabled by default
# ---------------------------------------------------------------------------

def test_e6_reports_disabled_not_silently_skipped():
    r = evaluate(msg("anything"), VIC_FLOOD, CFG)
    e6 = next(c for c in r.checks if c.check_id == "E6")
    assert e6.status == "disabled"
    assert "IntegrationLog" in (e6.reason or "")


# ---------------------------------------------------------------------------
# THE STRUCTURAL CONSTRAINT
# This is the most important behaviour in the system.
# ---------------------------------------------------------------------------

def test_time_alone_cannot_establish_correlation():
    """
    A generic phishing message arriving during a flood is NOT hazard-related.

    Only E3 (supporting) can fire here. Without a high-weight check, the result
    must be negative regardless of score.
    """
    r = evaluate(msg("Your parcel is held. Pay the fee: http://bit.ly/x", when=NOW),
                 VIC_FLOOD, CFG)
    assert r.is_hazard_related is False
    assert r.relationship_type == "unrelated"
    assert any("does not establish hazard relevance" in n for n in r.notes)


def test_relief_language_alone_does_not_falsely_correlate():
    """
    K-0 regression test. Previously failed by design; now passes.

    A flood-worded scam with no location reference should NOT correlate with
    an unrelated, but RECENT, bushfire. It currently does, because E3 (time)
    and E5 (relief framing) combine to cross the threshold even though neither
    is hazard-specific — E1/E2 (which do verify hazard-specificity) never fire.

    The hazard MUST be recent enough for E3 to fire (see
    RECENT_UNRELATED_BUSHFIRE) or this test passes for the wrong reason: E5
    alone (0.208) sits below the 0.25 threshold on its own. An earlier version
    of this test used a 2020-dated hazard and passed accidentally without
    exercising the actual bug.

    Resolved by require_hazard_specific_evidence in rules.yaml: at least one
    check that verifies the content relates to THIS hazard (E1 or E2 at
    suburb/street/lga level) must fire. Agency impersonation or relief
    language alone is no longer sufficient.
    """
    scam_no_location = msg("Flood relief payment available. Verify your account now.",
                           "https://vic-relief-payment.example/login", NOW)
    r = evaluate(scam_no_location, RECENT_UNRELATED_BUSHFIRE, CFG)

    fired = set(r.fired())
    assert "E3" in fired and "E5" in fired, (
        f"Test setup problem: expected E3+E5 to fire so the real bug is "
        f"exercised, but fired={fired}. Check the hazard's start_time is "
        f"still within the E3 tail window relative to NOW.")

    assert r.is_hazard_related is False, (
        "K-0: E3 (time) + E5 (relief framing) combined to cross the threshold "
        "with zero hazard-specific evidence (E1/E2 did not fire). See "
        "docs/KNOWN_ISSUES.md K-0.")


def test_same_message_different_hazard_flips_result():
    """
    The strongest available test of genuine correlation.

    A Victorian flood scam must correlate with the Victorian flood and NOT with
    an unrelated NSW bushfire. The message is identical in both cases, so
    keyword matching alone cannot pass this.
    """
    scam = msg("Victoria flood relief payment. Verify your account now.",
               "https://vic-flood-payment.example/login", NOW)

    matched = evaluate(scam, VIC_FLOOD, CFG)
    mismatched = evaluate(scam, NSW_FIRE, CFG)

    assert matched.is_hazard_related is True
    assert mismatched.is_hazard_related is False, (
        "Message correlated with an unrelated hazard. The rule is keyword "
        "matching rather than correlating.")


# ---------------------------------------------------------------------------
# Relationship types
# ---------------------------------------------------------------------------

def test_relationship_fake_relief():
    r = evaluate(msg("Flood relief payment for Victoria. Claim your compensation.",
                     "https://not-real.example/claim"), VIC_FLOOD, CFG)
    assert r.relationship_type == "fake_relief_or_donation"


def test_relationship_mentions_hazard_for_legitimate_content():
    """A genuine bulletin mentions the hazard without exploiting it."""
    r = evaluate(msg("Flooding continues across the region. Monitor conditions.",
                     "https://emergency.vic.gov.au/warnings"), VIC_FLOOD, CFG)
    assert r.is_hazard_related is True
    assert r.relationship_type in ("mentions_hazard", "exploits_hazard")


def test_unrelated_content_is_unrelated():
    r = evaluate(msg("Meeting moved to 3pm, see you there"), VIC_FLOOD, CFG)
    assert r.is_hazard_related is False
    assert r.relationship_type == "unrelated"


# ---------------------------------------------------------------------------
# Taxonomy reachability  (regression guard)
# ---------------------------------------------------------------------------

def test_every_relationship_type_is_reachable():
    """
    REGRESSION GUARD.

    A threshold set too high silently makes relationship types unreachable.
    This was a real bug: at threshold 0.50, four of six types could never be
    produced, because a single high-weight check normalises to only ~0.25.

    If this fails, the threshold and the weights have drifted out of step.
    Fix the calibration, do not delete this test.
    """
    checks = CFG.rules["checks"]
    total = sum(float(s["weight"]) for s in checks.values() if s.get("enabled", True))
    threshold = float(CFG.rules["threshold"]["value"])

    unreachable = []
    for rule in CFG.rules.get("relationship_types", []):
        needed = set(rule.get("requires", []))
        if not needed:
            continue                      # the catch-all "unrelated" rule
        any_of = rule.get("any_of", [])
        if any_of:
            needed = needed | {any_of[0]}  # cheapest satisfying option
        earned = sum(float(checks[c]["weight"]) for c in needed if c in checks)
        if earned / total < threshold:
            unreachable.append(f"{rule['type']} (max {earned/total:.3f})")

    assert not unreachable, (
        f"Threshold {threshold} makes these relationship types unreachable: "
        f"{unreachable}. Either lower the threshold or remove the dead types.")


# ---------------------------------------------------------------------------
# Live-data regressions (K-12, K-13)
# ---------------------------------------------------------------------------

def test_address_parsed_into_suburb_and_street():
    """
    K-13 regression. Real EMV records omit location.suburb and put the place
    in location.address as "Street, Locality". If this breaks, E2 silently
    degrades to state-level matching only.
    """
    feature = {
        "type": "Feature", "id": "vic-emv-ESTA:1",
        "geometry": {"type": "Point", "coordinates": [145.4, -38.1]},
        "properties": {
            "source": {"state": "vic", "agency": "EMV", "feedId": "vic-osom"},
            "title": "Ballarto Rd", "eventType": "bushfire", "status": "active",
            "location": {"state": "VIC", "address": "Ballarto Rd, Cardinia"},
            "details": {}, "timestamps": {"reported": "2026-08-30T12:21:00+00:00"}}}
    h = to_hazard(feature)
    assert h.suburb == "Cardinia", f"expected locality from address, got {h.suburb!r}"
    assert h.street == "Ballarto Rd", f"expected street from address, got {h.street!r}"


def test_forecast_records_are_filtered_out():
    """
    K-12 regression. CFA fire danger ratings are tagged featureType "incident"
    but have no reported time and describe no event. They must not be treated
    as correlation hazards.
    """
    from src.dataquoll import is_real_incident
    fdr = {"properties": {
        "source": {"agency": "CFA-FDR", "feedId": "vic-cfa-fire-danger"},
        "timestamps": {"reported": None}}}
    keep, reason = is_real_incident(fdr)
    assert keep is False, "fire danger forecast was not filtered out"

    real = {"properties": {
        "source": {"agency": "EMV", "feedId": "vic-osom"},
        "timestamps": {"reported": "2026-08-30T12:21:00+00:00"}}}
    keep, _ = is_real_incident(real)
    assert keep is True, "a genuine incident was incorrectly filtered out"


# ---------------------------------------------------------------------------
# K-0 fix: hazard specificity
# ---------------------------------------------------------------------------

def test_state_level_match_is_not_hazard_specific():
    """
    A hazard "in Victoria" plus a message mentioning Victoria covers most of
    the state. That is not evidence the content targets THIS event.
    """
    m = msg("Flood relief payment. Verify your account. Victoria residents.",
            "https://x.example/claim", NOW)
    hz = {"hazard": {"hazard_id": "s1", "hazard_type": "storm",
                     "location": "Victoria", "status": "active",
                     "start_time": "2026-08-22T04:00:00Z"}}
    r = evaluate(m, hz, CFG)
    assert r.is_hazard_related is False, (
        "State-level location match was accepted as hazard-specific evidence.")


def test_location_is_not_matched_inside_urls():
    """
    Domain names contain arbitrary substrings. The domain 'vic-relief.example'
    matched the state code VIC and produced a false correlation in live
    testing. E2 must search message text only.
    """
    from src.rules import check_e2
    from src.schema import to_message, to_hazard
    m = to_message({"text": "Claim your payment now.",
                    "url": "https://vic-relief.example/claim"})
    hz = to_hazard({"hazard": {"hazard_type": "flood", "location": "VIC"}})
    r = check_e2(m, hz, CFG.rules)
    assert not r.did_fire, f"E2 matched a location inside a URL: {r.evidence}"


def test_suburb_level_match_is_hazard_specific():
    """A suburb match IS specific enough, and must still work."""
    feature = {
        "type": "Feature", "id": "b1",
        "geometry": {"type": "Point", "coordinates": [145.4, -38.1]},
        "properties": {"source": {"state": "vic"}, "title": "Ballarto Rd",
                       "eventType": "bushfire", "status": "active",
                       "location": {"state": "VIC", "address": "Ballarto Rd, Cardinia"},
                       "details": {}, "timestamps": {"reported": "2026-08-22T04:00:00Z"}}}
    m = msg("Bushfire relief for Cardinia residents. Claim your payment.",
            "https://x.example/claim", NOW)
    r = evaluate(m, feature, CFG)
    assert r.is_hazard_related is True, (
        f"Suburb-level match should establish correlation. Fired: {r.fired()}")


def test_generic_disaster_language_is_not_hazard_specific():
    """
    A scam using general disaster language without naming a specific event
    must not correlate with any particular hazard.

    Real example that exposed this: "verify your phone number to continue
    receiving life-saving emergency broadcasts". The word "emergency" fired E1
    via the generic term list, which satisfied the hazard-specificity
    requirement and made it correlate with every active hazard in the country.

    Generic terms match everything, so they tie content to nothing. This is
    still phishing, and the phishing head should flag it, but it is not
    related to any specific hazard.
    """
    generic = msg("Verify your phone number to continue receiving life-saving "
                  "emergency broadcasts.", "https://alerts-verify.example/confirm", NOW)
    r = evaluate(generic, VIC_FLOOD, CFG)
    assert r.is_hazard_related is False, (
        f"Generic disaster language established correlation. Fired: {r.fired()}. "
        "Only a specific hazard-type match should count as hazard-specific.")


def test_specific_hazard_type_still_correlates():
    """Counterpart to the above: naming the actual hazard type must still work."""
    specific = msg("Flood relief payment for Victoria residents. Claim now.",
                   "https://x.example/claim", NOW)
    r = evaluate(specific, VIC_FLOOD, CFG)
    assert r.is_hazard_related is True, (
        f"Naming the hazard type should establish correlation. Fired: {r.fired()}")


# ---------------------------------------------------------------------------
# Vetoes# ---------------------------------------------------------------------------
# Vetoes# ---------------------------------------------------------------------------
# Vetoes
# ---------------------------------------------------------------------------

def test_message_before_hazard_is_vetoed():
    """
    A message cannot exploit a hazard that has not happened yet. This overrides
    all evidence, however strong.
    """
    scam = msg("Victoria flood relief payment. Verify your account now.",
               "https://vic-flood-payment.example/login",
               datetime(2026, 5, 20, tzinfo=timezone.utc))   # 3 months early
    r = evaluate(scam, VIC_FLOOD, CFG)
    assert r.is_hazard_related is False
    assert any(n.startswith("VETO") for n in r.notes)
    # The score is still reported so a reviewer can see what was suppressed.
    assert r.correlation_probability > 0


def test_forecast_grace_window_allows_shortly_before():
    """
    Scammers act on forecasts, not only reported incidents. Content observed
    just before the hazard was REPORTED must not be vetoed.
    """
    scam = msg("Victoria flood relief payment. Verify your account now.",
               "https://vic-flood-payment.example/login",
               datetime(2026, 8, 21, 12, tzinfo=timezone.utc))  # ~16h early
    r = evaluate(scam, VIC_FLOOD, CFG)
    assert not any(n.startswith("VETO") for n in r.notes)


# ---------------------------------------------------------------------------
# E7 domain age (currently disabled, logic still under test)
# ---------------------------------------------------------------------------

def test_e7_logic_when_enabled():
    """
    E7 is disabled by default pending K-0, but its logic must stay correct so
    it can be switched on without rework.
    """
    import copy
    from src.rules import check_e7
    from src.schema import to_hazard, to_message

    cfg = copy.deepcopy(CFG)
    cfg.rules["checks"]["E7"]["enabled"] = True
    hz = to_hazard(VIC_FLOOD)

    def run(registered):
        m = to_message({"text": "x", "url": "https://scam.example/c",
                        "domain": "scam.example", "domain_registered": registered})
        return check_e7(m, hz, cfg.rules)

    assert run("2026-08-24T00:00:00Z").did_fire, "registered after hazard should fire"
    assert run("2026-08-17T00:00:00Z").did_fire, "registered inside window should fire"
    assert not run("2021-08-22T00:00:00Z").did_fire, "5-year-old domain should not fire"
    assert run(None).status == "not_evaluated", "missing data must not silently pass"


def test_hazard_specificity_guard_is_enabled():
    """
    Guard: this is what prevents K-0 from returning. It replaced the threshold
    as the mechanism protecting against non-specific correlation, which is what
    allowed E7 to be enabled and the threshold lowered to 0.20.

    If disabled, agency impersonation or relief language alone can establish
    correlation again, and a relief-worded scam matches every active hazard.
    """
    spec = CFG.rules.get("require_hazard_specific_evidence", {})
    assert spec.get("enabled") is True, (
        "require_hazard_specific_evidence is off. K-0 will recur: relief "
        "language alone will correlate with every active hazard.")
    assert set(spec.get("require_one_of", [])) >= {"E1", "E2"}, (
        "The hazard-specific checks must include E1 and E2.")


# ---------------------------------------------------------------------------
# Candidate matching (find_related_hazards)
# ---------------------------------------------------------------------------

def test_find_related_hazards_no_hazard_id_required():
    """
    Realistic usage: a caller has content and a state, not a hazard_id. The
    component works out which active hazards it relates to.
    """
    from src.correlate import find_related_hazards
    hazards = [
        {"hazard": {"hazard_id": "vic-1", "hazard_type": "bushfire",
                    "location": "Cardinia", "status": "active",
                    "start_time": "2026-08-22T04:00:00Z"}},
        {"hazard": {"hazard_id": "vic-2", "hazard_type": "flood",
                    "location": "Shepparton", "status": "active",
                    "start_time": "2026-08-22T04:00:00Z"}},
    ]
    m = msg("Bushfire relief for Cardinia residents. Claim your payment.",
            "https://x.example/c", NOW)
    r = find_related_hazards(m, hazards, CFG)
    assert r["match_count"] == 1
    assert r["best_match"]["hazard_id"] == "vic-1"
    assert r["hazards_checked"] == 2


def test_find_related_hazards_handles_no_matches():
    from src.correlate import find_related_hazards
    hazards = [{"hazard": {"hazard_id": "vic-1", "hazard_type": "bushfire",
                           "location": "Cardinia", "status": "active",
                           "start_time": "2026-08-22T04:00:00Z"}}]
    m = msg("Your parcel is held. Pay the redelivery fee.", "http://bit.ly/x", NOW)
    r = find_related_hazards(m, hazards, CFG)
    assert r["match_count"] == 0
    assert r["best_match"] is None
    assert "note" in r


def test_find_related_hazards_empty_store():
    from src.correlate import find_related_hazards
    r = find_related_hazards(msg("anything", None, NOW), [], CFG)
    assert r["match_count"] == 0
    assert "could not be retrieved" in r["note"].lower() or "no active hazards" in r["note"].lower()


# ---------------------------------------------------------------------------
# Adapter robustness
# ---------------------------------------------------------------------------

def test_geojson_detected_without_type_field():
    """
    REGRESSION. A record missing "type": "Feature" previously fell through to
    the flat parser, produced an EMPTY hazard, and every check reported
    not_evaluated. The caller got a confident "not related" based on nothing.
    """
    feature_no_type = {
        "id": "vic-1",
        "properties": {"eventType": "bushfire", "status": "active",
                       "location": {"state": "VIC", "address": "Ballarto Rd, Cardinia"},
                       "details": {}, "timestamps": {"reported": "2026-08-22T04:00:00Z"}}}
    h = to_hazard(feature_no_type)
    assert h.hazard_type == "bushfire", "GeoJSON not detected without the type field"
    assert h.suburb == "Cardinia"
    assert h.start_time is not None


def test_empty_hazard_produces_warning_not_silent_false():
    """An unparseable hazard must say so, not quietly return 'not related'."""
    r = evaluate(msg("Flood relief for Victoria", None, NOW), {"nonsense": True}, CFG)
    assert r.is_hazard_related is False
    assert any("WARNING" in n and "missing data" in n for n in r.notes), (
        f"Empty hazard did not warn. Notes: {r.notes}")


# ---------------------------------------------------------------------------
# Robustness
# ---------------------------------------------------------------------------

def test_empty_input_does_not_crash():
    r = evaluate({}, {}, CFG)
    assert r.is_hazard_related is False
    assert r.correlation_probability >= 0.0


def test_missing_hazard_fields_do_not_crash():
    r = evaluate(msg("Flood warning"), {"hazard": {}}, CFG)
    assert isinstance(r.is_hazard_related, bool)


def test_output_shape_is_correlation_head_only():
    """The correlation head must not emit phishing or risk_level fields."""
    d = evaluate(msg("Flood relief"), VIC_FLOOD, CFG).to_dict()
    assert set(d.keys()) >= {"is_hazard_related", "correlation_probability",
                             "relationship_type", "hazard_id"}
    assert "is_phishing" not in d
    assert "risk_level" not in d


def test_evidence_trail_is_present():
    """Every decision must be explainable without reading code."""
    d = evaluate(msg("Flood relief payment Victoria"), VIC_FLOOD, CFG).to_dict()
    assert "evidence" in d
    assert "checks_fired" in d["evidence"]
    assert "rules_version" in d["evidence"]


# ---------------------------------------------------------------------------
# Runner (works without pytest)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    tests = [(n, f) for n, f in sorted(globals().items())
             if n.startswith("test_") and callable(f)]
    passed = failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  PASS  {name}")
            passed += 1
        except AssertionError as exc:
            print(f"  FAIL  {name}\n        {exc}")
            failed += 1
        except Exception as exc:                               # noqa: BLE001
            print(f"  ERROR {name}\n        {type(exc).__name__}: {exc}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed, {len(tests)} total")
    sys.exit(1 if failed else 0)
