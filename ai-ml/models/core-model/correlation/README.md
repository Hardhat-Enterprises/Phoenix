# PHOENIX Correlation Component

Decides whether a cyber threat is connected to a specific active hazard.

One of three components in the Phoenix core model. It answers one question and
deliberately does not answer the others.

| Question | Answered here |
|---|---|
| Is this content connected to a live hazard? | **Yes** |
| Is this content malicious? | No, phishing component |
| What is the overall risk level? | No, combination step |

---

## Integration

```python
from correlation.src.api import analyse

result = analyse(
    text="Bushfire relief for Cardinia residents. Claim your payment.",
    url="https://vic-relief-claims.example/apply",
    observed_time="2026-09-04T03:00:00Z",
    state="vic",
)
```

```json
{
  "is_hazard_related": true,
  "correlation_probability": 0.75,
  "relationship_type": "fake_relief_or_donation",
  "hazard": {
    "hazard_id": "vic-emv-ESTA:260826873",
    "hazard_type": "bushfire",
    "location": { "suburb": "Cardinia", "state": "VIC" },
    "status": "active",
    "severity": "Moderate",
    "start_time": "2026-09-04T02:21:00+00:00"
  },
  "match_count": 1,
  "status": "ok",
  "model_version": "correlation-1.0.0",
  "hazards_checked": 190,
  "evidence": { "checks_fired": ["E1", "E2", "E3", "E5"], "...": "..." }
}
```

**Full specification: `docs/CONTRACT.md`.**
**How backend and frontend plug in: `docs/INTEGRATION.md`.**

---

## Setup

```bash
pip install -r requirements.txt
```

Dependencies are `pyyaml` and `requests`. Nothing else.

The component retrieves hazards from a live incident API and needs a key:

```
DATAQUOLL_API_KEY=<key>
```

Read from the environment first, then from a `.env` file if present. An
exported variable overrides the file, so deployment config wins.

`.env` is gitignored and must never be committed: a key committed to a
repository remains in the git history permanently.

---

## No model artifact

There is **no pickle, no joblib, no weights file**. The logic is rules, and the
rules live in `config/*.yaml`.

- Nothing to version alongside the code. The config *is* the model
- No pickle deserialisation risk
- Behaviour changes by editing YAML, not retraining
- Instant startup, nothing to load

---

## Where hazard data comes from

Fetched from the live incident API on each call, filtered to genuine disaster
incidents.

**This is interim.** The API allows 5,000 requests per month, roughly 166 per
day: workable for integration, insufficient for production.

The backend already runs an ingestion service that receives hazard events and
writes them to `HazardEvent`. Once we publish into it,
`get_active_hazards_from_store()` in `src/hazard_source.py` becomes the source.
**The contract does not change** when that happens.

---

## The rules

Seven evidence checks. Weights combine into a score; the score plus two
structural gates decide the outcome.

| ID | Check | Tier | Weight | State |
|---|---|---|---|---|
| E1 | Names this hazard's type | high | 0.30 | on |
| E2 | Names this hazard's suburb, street or LGA | high | 0.25 | on |
| E3 | Observed during or shortly after the hazard | supporting | 0.10 | on |
| E4 | Impersonates an emergency agency | high | 0.30 | on |
| E5 | Relief, donation or verification framing | high | 0.25 | on |
| E7 | Domain registered near the hazard | high | 0.25 | on |
| E6 | Campaign burst | supporting | 0.10 | **off** |

E6 needs submission history the current stateless path does not retain. The
data exists in the backend `IntegrationLog` table; enabling it is a wiring
task.

### Three gates

1. **High-tier required.** Timing alone never establishes correlation.
2. **Hazard-specific required.** E1 or E2 must fire. Agency impersonation and
   relief framing detect content patterns but verify nothing about *which*
   hazard, so they cannot correlate alone.
3. **Temporal veto.** Content observed before the hazard existed, beyond a 72
   hour forecast grace window, is suppressed regardless of other evidence.

Weights, threshold and keywords are in `config/rules.yaml` and
`config/keywords.yaml`. They can be changed without touching code.

---

## Layout

```
config/          rules, keywords, agencies      edit these, not the code
src/
  api.py         analyse(), analyse_against_hazard(), health()   <- entry point
  correlate.py   scoring, gates, relationship type
  rules.py       the seven checks
  schema.py      adapters for three hazard record formats
  dataquoll.py   incident API client
  domain_intel.py  domain registration lookup for E7
  hazard_source.py live fetch, plus the ingestion-pipeline stub
tests/           46 tests, no API key required
docs/            CONTRACT, INTEGRATION, SPECIFICATION, DECISIONS, LIMITATIONS
```

---

## Tests

```bash
python tests/test_rules.py
```

Expect `46 passed, 0 failed`. No API key needed: the tests supply hazards
directly and make no network calls.

---

## Before relying on the numbers

Read `docs/LIMITATIONS.md`. The essentials:

- The implementation is verified. **Accuracy is not.** There is no set of real
  message-and-hazard pairs with known correct answers, so no accuracy claim is
  currently defensible.
- Weights and the threshold are analyst judgement informed by published
  research, not measured against our own data.
- `correlation_probability` is a **rule score, not a calibrated probability**.
  It must not be shown to users as model confidence.
- `relationship_type` is **provisional**. This component cannot distinguish a
  legitimate emergency bulletin from a scam, because it does not know whether
  content is malicious. The combination step has both signals and must refine
  it.
