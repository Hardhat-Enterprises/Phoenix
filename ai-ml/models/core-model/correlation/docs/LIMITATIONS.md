# Limitations

What this component does not do, and what has not been proven. Read before
quoting any figure from it.

---

## Not proven: accuracy

The implementation is verified. 46 tests confirm the logic behaves as
specified, and it has been run against real incidents from a live emergency
API.

**Accuracy has not been established.** That requires a set of real
message-and-hazard pairs where the correct answer is already known. No such
set exists. Real hazards give us half of it; real disaster-scam messages
remain a manual collection task that has not been done.

**Consequence:** no accuracy claim about this component is currently
defensible. Say "tested" and "behaves as specified", not "accurate".

---

## Provisional: weights and threshold

The threshold (0.20) and all seven weights are analyst judgement, informed by
published research on disaster fraud and phishing domain lifespan, but not
measured against our own data.

They are marked provisional in `config/rules.yaml` and should be revisited
once labelled examples exist.

---

## correlation_probability is a rule score

It is a weighted sum divided by evaluable weight. It is **not** a calibrated
probability and must not be presented to users as model confidence.

---

## relationship_type is provisional

This component does not know whether content is malicious. From evidence
alone, a legitimate flood bulletin naming a hazard and its location looks
identical to a flood scam doing the same.

Only the combination step has both signals:

| is_hazard_related | is_phishing | Correct type |
|---|---|---|
| true | true | exploits_hazard / fake_relief_or_donation |
| true | false | mentions_hazard |

**The combination step should refine this field, not pass it through.**

---

## Type-level matching is not event-specific

A message naming a hazard type but no location relates to **every active
hazard of that type**, not one.

```
"Flood relief payment. Verify your account."   (names no place)

  vs flood in Lismore       -> related
  vs flood in Shepparton    -> related
  vs flood in Rockhampton   -> related
```

Whether that is correct behaviour is a product decision, not a bug. A scam
with no location genuinely could target any active flood. If the product needs
one answer, take the highest-scoring match.

---

## Keyword matching has known blind spots

- **Morphology.** "flooded" does not match "flood". Word forms must be listed
  explicitly in `config/keywords.yaml`.
- **Obfuscation.** "fl00d" and deliberate misspelling defeat it.
- **Paraphrase.** "waters have risen" does not match "flood".

Semantic matching was considered and ruled out: roughly nineteen in twenty
real hazard records have descriptions that are just street names or the words
"VIC Incident", so there is not enough text to compare against.

---

## E6 is disabled

Campaign burst detection needs submission history across requests, which the
current stateless path does not retain.

This is **not** an API cost issue. The backend already stores every prediction
in its IntegrationLog table. Enabling E6 is a wiring task, and the interface is
ready for a history provider.

---

## Live hazard fetch is a testing-stage choice

Free tier allows 5,000 requests per month, roughly 166 a day. One API call per
prediction is comfortable during testing and becomes a hard ceiling under real
traffic. Every prediction also waits on an external round trip, and a slow or
unavailable API takes predictions down with it.

The production path is the backend ingestion pipeline. See
`src/hazard_source.py`.

---

## No historical hazard data

The free tier provides current incidents only. Historical lookback starts at
the paid Starter tier (1 year) and full archive access requires Pro.

This limits building a validation set from past disaster scams: the scam text
may be findable in news coverage, but the matching hazard record from that
period is not available through the API. Hazard details for well-documented
historical events can be compiled from public record instead, clearly labelled
as such.
