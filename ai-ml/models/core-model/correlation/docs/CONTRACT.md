# Contract

The input and output shapes for the correlation component. This is the
authoritative reference for backend and frontend integration.

---

## What this component answers

**One question:** is this content connected to a specific active hazard?

It does **not** answer whether the content is malicious, and it does **not**
produce an overall risk level. Those come from the phishing component and the
combination step.

---

## Input

```python
from correlation.src.api import analyse

result = analyse(
    text="Bushfire relief for Cardinia residents. Claim your payment.",
    url="https://vic-relief-claims.example/apply",
    observed_time="2026-09-04T03:00:00Z",
    state="vic",
)
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | one of text/url | Message body |
| `url` | string | one of text/url | Link in the message |
| `observed_time` | ISO 8601 string | no | When the content was seen. Defaults to now |
| `state` | string | no | e.g. `"vic"`. Narrows which hazards are checked |
| `include_all_matches` | bool | no | Default true. Return every match, not just the best |
| `include_evidence` | bool | no | Default true. Return which checks fired |

**On `state`:** supply it when known. It reduces the hazards checked and
reflects that a scam usually targets one jurisdiction. Without it, all active
hazards nationally are checked.

**No hazard is supplied by the caller.** The component fetches active hazards
itself. See "Where hazard data comes from" below.

---

## Output

### Related

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
  "status_detail": null,
  "model_version": "correlation-1.0.0",
  "evaluated_at": "2026-09-04T03:00:12.481922+00:00",
  "hazards_checked": 190,
  "evidence": {
    "checks_fired": ["E1", "E2", "E3", "E5"],
    "detail": [ ... one entry per check ... ],
    "notes": [ ... ],
    "rules_version": "1.0.0",
    "threshold_used": 0.2
  }
}
```

### Not related

```json
{
  "is_hazard_related": false,
  "correlation_probability": 0.0,
  "relationship_type": "unrelated",
  "hazard": null,
  "match_count": 0,
  "status": "ok",
  "status_detail": "Content did not relate to any active hazard. This says nothing about whether it is malicious: that is the phishing component's determination.",
  "model_version": "correlation-1.0.0",
  "evaluated_at": "2026-09-04T03:00:12.481922+00:00",
  "hazards_checked": 190
}
```

---

## Field reference

| Field | Type | Always present | Meaning |
|---|---|---|---|
| `is_hazard_related` | bool | yes | The headline answer |
| `correlation_probability` | float 0–1 | yes | **Rule score, not a calibrated probability.** See below |
| `relationship_type` | string | yes | How it relates. See values below |
| `hazard` | object or null | yes | Which hazard matched. Null when nothing matched |
| `match_count` | int | yes | How many hazards matched |
| `other_matches` | array | only if >1 match | Additional matches, best first |
| `status` | string | yes | `ok`, `no_hazards_available`, `invalid_input` |
| `status_detail` | string or null | yes | Human-readable explanation |
| `model_version` | string | yes | For logging and reproducibility |
| `evaluated_at` | ISO 8601 | yes | When this was evaluated |
| `hazards_checked` | int | yes | How many hazards were considered |
| `evidence` | object | if requested | Which checks fired and why |

### `relationship_type` values

| Value | Meaning |
|---|---|
| `fake_relief_or_donation` | Solicits money or credentials framed around relief |
| `impersonates_response_agency` | Imitates an emergency or relief authority |
| `fake_emergency_update` | False operational information presented as official |
| `exploits_hazard` | Uses the hazard as pretext |
| `mentions_hazard` | References the hazard without exploiting it. Often legitimate |
| `unrelated` | No hazard-specific evidence |

### `status` values

| Value | Meaning | Suggested handling |
|---|---|---|
| `ok` | Evaluated normally | Use the result |
| `no_hazards_available` | No hazards could be retrieved | Treat as inconclusive, not as "not related". Check `status_detail` |
| `invalid_input` | Neither text nor url supplied | Return a 400 to the caller |

---

## Two things the caller must handle correctly

### 1. `correlation_probability` is a rule score

It is a weighted sum divided by evaluable weight. It is **not** a calibrated
probability and must not be shown to users as model confidence.

Acceptable: "matched 4 of 6 indicators". Not acceptable: "75% confident".

### 2. `relationship_type` is provisional and should be refined

This component does not know whether content is malicious. From evidence
alone, a legitimate flood bulletin naming a hazard and location looks
identical to a flood scam doing the same.

**The combination step has both signals and should refine this field:**

| `is_hazard_related` | `is_phishing` | Correct type |
|---|---|---|
| true | true | `exploits_hazard` / `fake_relief_or_donation` |
| true | false | `mentions_hazard` |
| false | true | not hazard-related, ordinary phishing |

Passing our `relationship_type` straight through to a user will sometimes
describe a legitimate emergency bulletin as a scam.

---

## Where hazard data comes from

Hazards are fetched from the live incident API on each call.

**This is an interim arrangement.** The backend already runs a data ingestion
service that receives hazard events and writes them to a `HazardEvent` table.
Its `DataSource` defaults to `source_type: "ai_model"`, so it was built
expecting something upstream to feed it and does not fetch externally itself.

Once we publish into that pipeline, `get_active_hazards_from_store()` in
`src/hazard_source.py` becomes the source. **Nothing in this contract
changes**: the function signature, the output shape and the calling code stay
identical.

**Live fetch has a hard limit.** The API allows 5,000 requests per month,
roughly 166 per day. That is workable during integration and is not sufficient
for production traffic. This is the main reason the ingestion pipeline matters.

---

## Second entry point: caller supplies the hazard

When the hazard is already known, for example once ingestion is connected:

```python
from correlation.src.api import analyse_against_hazard

result = analyse_against_hazard(
    text="...",
    url="...",
    hazard={"hazard": {
        "hazard_id": "vic-emv-1",
        "hazard_type": "bushfire",
        "location": "Cardinia",
        "status": "active",
        "start_time": "2026-09-04T02:00:00Z",
    }},
    observed_time="2026-09-04T03:00:00Z",
)
```

Makes **no network call for hazards**. Same output shape.

Accepts three hazard formats: the nested object above, a GeoJSON Feature from
the incident API, or legacy flat columns. Normalisation is internal.

**Note on location:** the incident API separates suburb and state cleanly. A
caller-supplied nested hazard with a single generic `location` value will have
it reported under `location.state`. Matching is unaffected: all location terms
are checked regardless of which field they occupy.

---

## Health check

```python
from correlation.src.api import health
```

```json
{
  "status": "ok",
  "model_version": "correlation-1.0.0",
  "rules_version": "1.0.0",
  "threshold": 0.2,
  "checks_enabled": ["E1", "E2", "E3", "E4", "E5", "E7"],
  "hazard_source": "live_api",
  "hazard_source_available": true
}
```

`hazard_source_available` is false when no API key is configured. The rules
still work through `analyse_against_hazard()`, but `analyse()` cannot find
hazards on its own.

---

## No model artifact

There is **no pickle, no joblib, no weights file, nothing to deserialise**.

The logic is rules, and the rules live in `config/*.yaml`. Consequences worth
knowing:

- Nothing to version alongside the code. The config *is* the model
- No pickle deserialisation risk
- Behaviour can be changed by editing YAML, no retraining
- Startup is instant, there is nothing to load
