# Correlation Rule Baseline — Specification

**Component:** Correlation head (4c) of the PHOENIX core model
**Slot:** M6 Week 2 implementation of the M7 Week 1 specification
**Status:** Rule baseline. Provisional calibration, see `DECISIONS.md`.

---

## What this answers

> Given this message and this hazard, are they connected?

Nothing else. Specifically **not** whether the content is malicious, that is the
phishing head's question, and the two must stay independent.

A message can be:

| | Hazard-related | Not hazard-related |
|---|---|---|
| **Phishing** | what PHOENIX exists to catch | ordinary phishing |
| **Legitimate** | a real emergency bulletin | ordinary content |

Collapsing these into one score is what made the original dataset unusable.

---

## Inputs

**Message:** `text`, `url`, `observed_time`

**Hazard:** accepted in three shapes, normalised by `src/schema.py`:

1. Nested `hazard{}` object — the Unified Core Model input contract
2. DataQuoll `/incidents` GeoJSON Feature
3. Legacy flat columns — runs, but see D-009 before trusting results

---

## Outputs

```json
{
  "is_hazard_related": true,
  "correlation_probability": 0.65,
  "relationship_type": "fake_relief_or_donation",
  "hazard_id": "vic-ses-1001",
  "evidence": {
    "checks_fired": ["E1", "E2", "E5"],
    "detail": [ ... per-check status, evidence and reason ... ],
    "rules_version": "1.0.0",
    "threshold_used": 0.25,
    "notes": [ ... ]
  }
}
```

`correlation_probability` is a **rule score, not model confidence.** It must not
be presented as a calibrated probability.

---

## The seven checks

| ID | Name | Tier | Weight | What it observes |
|---|---|---|---|---|
| E1 | Explicit disaster reference | high | 0.30 | Content names this hazard's type, or a disaster generally |
| E2 | Location match | high | 0.25 | Content names the hazard's suburb, LGA or state |
| E3 | Time window | supporting | 0.10 | Observed during the hazard, or within the tail period |
| E4 | Agency impersonation | high | 0.30 | Names an emergency agency, without linking to its real domain |
| E5 | Relief or donation framing | high | 0.25 | Solicits payment, claims or credentials in a relief frame |
| E6 | Campaign burst | supporting | 0.10 | Similar submissions clustered near onset. **Disabled** |
| E7 | Domain registered for this event | high | 0.25 | Domain created near the hazard. Enrichment is offline |

Each check returns one of: `fired`, `not_fired`, `not_evaluated`, `disabled`.
`not_evaluated` always carries a reason, so missing data is visible rather than
silently treated as absence of evidence.

---

## Scoring

```
score = (weight of checks that fired) / (weight of checks that could be evaluated)
```

Normalising by **evaluable** weight, not total weight, means a hazard missing
its `start_time` is not penalised for E3 being unavailable. See D-007.

### The structural constraint

**At least one high-weight check (E1, E2, E4, E5) must fire before correlation
can be positive.**

Supporting checks can raise a score. They can never produce a positive result
alone.

This is the single most important behaviour in the system. Without it, a
phishing message that merely arrives during a flood would be classified as
hazard-related, which is exactly the spurious association that made the
original dataset unusable.

Guarded by `test_time_alone_cannot_establish_correlation`.

---

## Relationship types

Evaluated in config order; first match wins, so more specific types are listed
first.

| Type | Requires | Meaning |
|---|---|---|
| `fake_relief_or_donation` | E5 + (E1 or E2) | Solicits money or credentials framed around relief |
| `impersonates_response_agency` | E4 | Imitates an emergency or relief authority |
| `fake_emergency_update` | E1 + E4 | False operational information presented as official |
| `exploits_hazard` | E1 + E2 | Uses the hazard as pretext, without impersonation or solicitation |
| `mentions_hazard` | E1 | References the hazard without exploiting it. Usually legitimate |
| `unrelated` | none | No high-weight evidence fired |

`uncertain` exists in the proposal's taxonomy but nothing currently produces it.
See the open questions in `DECISIONS.md`.

---

## What this deliberately does not do

- **No network calls.** The hazard arrives in the request. The engine is
  offline, fast and testable.
- **No phishing judgement.** Separate head.
- **No risk_level.** That is the combine step (4d), which needs both heads.
- **No training.** It is a rule. It learns nothing.

---

## Known limitations

1. **Keyword matching, not semantic.** Paraphrasing defeats it (D-008).
2. **Calibration is judgement, not evidence.** Weights and threshold are
   unvalidated (D-002, D-003).
3. **E6 disabled.** Needs `IntegrationLog` wiring (D-005).
4. **One hazard per evaluation.** The proposal's pair structure, scoring one
   message against several candidate hazards, is not implemented. Use
   `evaluate_pairs()` for the cross-product.
5. **Legacy dataset results are meaningless.** Mechanically valid, no ground
   truth (D-009).

---

## Verifying it works

```bash
python3 tests/test_rules.py
```

46 tests. The two that matter most:

- `test_time_alone_cannot_establish_correlation` — the structural constraint
- `test_same_message_different_hazard_flips_result` — the same message must
  correlate with the right hazard and **not** with an unrelated one. Keyword
  matching alone cannot pass this, because the message does not change
