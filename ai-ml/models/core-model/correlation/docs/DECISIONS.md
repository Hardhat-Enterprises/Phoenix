# Decisions Log

Every judgement call made while building the correlation baseline, what it rests
on, and what would change it. Anything marked **PROVISIONAL** has not been
validated against real data and needs sign-off before it is treated as settled.

---

## D-001 — Rule-based, not learned

**Status:** Settled for Sprint 2
**Decision:** The correlation head is a transparent rule, not a trained model.

**Why:** No correlation-labelled data exists, and none is expected within this
sprint. A rule requires no labels, so the correlation branch can proceed while
data collection happens in parallel. It also gives a documented baseline that
any future learned model must beat before it can replace this.

**What would change it:** Sufficient labelled pairs covering all four
phishing / hazard-relatedness combinations, produced independently of this rule,
AND a learned model that measurably outperforms this baseline on held-out data
split so the same hazard event never appears in both train and test.

---

## D-002 — Threshold set to 0.25 — **PROVISIONAL**

**Status:** PROVISIONAL. Requires M1 / Product Owner sign-off.

**Original proposal:** 0.50
**Current value:** 0.25

**Why it changed — this was a real bug, found by the test suite.**

Total evaluable weight is 1.20, so a single high-weight check normalises to
0.208–0.250. At a threshold of 0.50, **four of the six relationship types were
unreachable**. They were dead branches in the taxonomy:

| Evidence | Score | At threshold 0.50 |
|---|---|---|
| E1 only → `mentions_hazard` | 0.250 | unreachable |
| E4 only → `impersonates_response_agency` | 0.250 | unreachable |
| E1+E2 → `exploits_hazard` | 0.458 | unreachable |
| E5+E1 → `fake_relief_or_donation` | 0.458 | unreachable |
| E5+E1+E3 | 0.542 | reachable |

**Why 0.25 specifically**, and not simply a value that makes tests pass:

| Evidence | Score | Verdict at 0.25 | Is that correct? |
|---|---|---|---|
| E1 alone — names this hazard type | 0.250 | related | Yes. Content genuinely references the hazard. |
| E4 alone — impersonates an agency | 0.250 | related | Yes. Impersonating emergency services during an event is hazard-related by definition. |
| E5 alone — solicitation, no hazard reference | 0.208 | **not** related | Yes. That is ordinary phishing, which is the phishing head's job, not ours. |

The line falls in a defensible place. `require_high_weight_evidence` is what
stops the lower threshold from admitting coincidence.

**Guarded by:** `test_every_relationship_type_is_reachable`, which fails if
threshold and weights drift out of step again.

**What would change it:** Real labelled examples. This value is analyst
judgement, not an empirical result, and should be revisited as soon as even 30
hand-labelled pairs exist.

---

## D-003 — Weights are judgement, not evidence — **PROVISIONAL**

**Status:** PROVISIONAL.

E1 and E4 carry 0.30; E2 and E5 carry 0.25; E3 and E6 carry 0.10.

The ordering reflects a view that naming the hazard, or impersonating an
agency, is stronger evidence of a link than location alone. Nothing has been
measured. These are starting values chosen to be legible, not optimal.

**What would change it:** Labelled data, and ideally an ablation showing which
checks actually carry signal.

---

## D-004 — E3 and E6 are supporting evidence only

**Status:** Settled. Do not change without explicit discussion.

Temporal coincidence, and submission volume, can raise a score but can never
produce a positive correlation alone.

**Why:** A phishing message that merely arrives during a flood is not
hazard-related. Treating it as such would reintroduce exactly the spurious
association that made the original dataset unusable, where hazard fields were
assigned independently of content and then treated as truth.

**Guarded by:** `test_time_alone_cannot_establish_correlation`.

---

## D-005 — E6 disabled, and it is not an API cost problem

**Status:** Disabled, interface ready.

E6 needs submission history. The current inference path is stateless and does
not query it.

**Correcting an earlier assumption:** this was initially thought to require a
paid DataQuoll tier. It does not. E6 needs **Phoenix's own** submission
history, not DataQuoll's historical archive. Phoenix already stores every
prediction in its `IntegrationLog` table, which is what `GET
/api/users/integration` reads from. The data exists.

**To enable:** set `enabled: true` in `rules.yaml` and pass a
`history_provider`. See `docs/EXTENDING.md`.

---

## D-006 — Correlation outputs only

**Status:** Settled. Architectural.

This module emits `is_hazard_related`, `correlation_probability`,
`relationship_type` and `hazard_id`. It deliberately does **not** emit
`is_phishing` or `risk_level`.

**Why:** Those belong to the phishing head and the combine step. Keeping the
boundary clean is what allows each component to be replaced independently,
which is the entire point of the Option 3 architecture. A module that emitted
everything would couple the two heads together.

**Guarded by:** `test_output_shape_is_correlation_head_only`.

---

## D-007 — Score normalised by evaluable weight

**Status:** Settled.

The score divides by the weight that could actually be assessed, not by total
possible weight.

**Why:** A hazard record missing `start_time` makes E3 unevaluable. Dividing by
total weight would penalise that record for a gap in the feed, making
incomplete data look like weak correlation. Normalising by what was evaluable
separates "no evidence" from "could not check".

When less than 60% of weight was evaluable, a note is added to the result.

---

## D-008 — Keyword matching, not semantic similarity

**Status:** Accepted limitation for Sprint 2.

E1, E2 and E5 use word-boundary keyword matching.

**Why:** A keyword list in YAML can be reviewed and corrected by someone who is
not a developer. At this stage that matters more than accuracy, because nobody
has yet validated what correct looks like.

**Known weakness:** paraphrasing defeats it. "Waters have risen across the
region" will not match `flood`.

**Recommended next:** semantic similarity and domain/organisation mismatch, both
specified in the Unified Core Model proposal. See `docs/EXTENDING.md`.

---

## D-009 — Legacy dataset produces mechanically valid but meaningless results

**Status:** Important caveat.

The rule runs against the legacy flat dataset without error. **The results have
no ground truth.** Hazard fields in that dataset were found to be assigned
independently of message content, so a location or type match may be pure
coincidence.

Use the legacy dataset to verify the code executes. Do **not** use it to claim
the rule is accurate, and do not use its output as labels.

---

## D-010 — `relationship_type` cannot fully distinguish intent alone

**Status:** Known limitation. Surfaced while running the demo, not a bug.

A legitimate VicEmergency bulletin about a Victorian flood fires E1 + E2, and
is currently typed `exploits_hazard`. Semantically that is wrong; a real
bulletin does not exploit anything.

**Why it happens, and why the module is still correct:** the correlation head
does not know whether content is malicious. That is deliberate, it is the
phishing head's job (D-006). From evidence alone, legitimate content that names
the hazard and its location is indistinguishable from malicious content that
does the same.

**Where it should be resolved:** the combine step (4d), which has both signals:

| is_hazard_related | is_phishing | Correct type |
|---|---|---|
| true | true | `exploits_hazard` / `fake_relief_or_donation` |
| true | false | `mentions_hazard` |

**Recommendation for M8 / whoever builds 4d:** treat `relationship_type` from
this module as provisional, and refine it using the phishing signal. The
alternative, passing `is_phishing` into the correlation head, would couple the
two heads together and break the independence the architecture depends on.

---

## Open questions for M1 / Product Owner

1. **Threshold 0.25** — accept provisionally, or wait for labelled data? (D-002)
2. **Tail window** — currently 7 days after hazard start. Is that the right
   period for disaster scam activity? (`rules.yaml`, E3 `tail_hours`)
3. **Agency list** — is `agencies.yaml` complete for the states in scope?
4. **`uncertain` type** — the proposal lists it; nothing currently produces it.
   Should low-confidence positives be routed there instead of to a specific
   type?
