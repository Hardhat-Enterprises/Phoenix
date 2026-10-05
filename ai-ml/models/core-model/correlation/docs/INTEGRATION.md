# Integration Guide

For the backend and frontend streams. What to call, what you get, and what you
still need from elsewhere.

---

## Where this sits

```
  User submits url + text
            |
            v
     BACKEND endpoint
            |
     +------+------+
     |             |
     v             v
 PHISHING      CORRELATION          <-- this component
  (not yet      is it linked to
   built)       a live hazard?
     |             |
     +------+------+
            |
            v
      COMBINE STEP
   risk_level from both
            |
            v
        FRONTEND
```

**This component is one of three.** It cannot produce `is_phishing` or
`risk_level` because it does not have the information required for either.

---

## Backend: how to call it

### Install

```
pip install -r correlation/requirements.txt
```

Only `pyyaml` and `requests`. No ML frameworks, no model files.

### Configure

The component needs an API key to retrieve hazards. Set it however your
deployment handles secrets:

```
DATAQUOLL_API_KEY=<key>
```

It reads from the environment first, then from a `.env` file if present. An
exported variable always wins, so deployment config overrides local files.

### Call it

```python
from correlation.src.api import analyse

result = analyse(
    text=request_body.get("text"),
    url=request_body.get("url"),
    observed_time=request_body.get("observed_time"),
    state=request_body.get("state"),
)
```

That is the whole integration. One import, one call, a dict back.

### Handle the three statuses

```python
if result["status"] == "invalid_input":
    return 400, {"error": result["status_detail"]}

if result["status"] == "no_hazards_available":
    # Inconclusive, NOT "not related". Hazards could not be retrieved,
    # so we do not know. Do not present this as a negative result.
    log.warning("correlation inconclusive: %s", result["status_detail"])

# status == "ok": use the result
```

Treating `no_hazards_available` as "not related" would report a confident
negative based on missing data. That distinction matters.

### Never raises

`analyse()` does not raise for missing data, a bad API key or an unreachable
API. It returns a result with a status explaining what happened. You do not
need a try/except around it, though one does no harm.

---

## Backend: what you still need to build

### 1. The combination step

The correlation output alone is not what the user sees. `risk_level` needs both
signals:

| `is_phishing` | `is_hazard_related` | `risk_level` |
|---|---|---|
| true | true | Critical, this is what Phoenix exists to catch |
| true | false | High or medium, ordinary phishing |
| false | true | Low, likely a legitimate warning |
| false | false | None |

The exact bands are specified by M1 in the Sprint 2 report. This is a
documented policy, not a learned score, and should stay that way so any result
can be explained.

### 2. Refine `relationship_type`

Do not pass ours straight through. We cannot tell a legitimate emergency
bulletin from a scam, because we do not know whether content is malicious:

```python
if result["is_hazard_related"]:
    if phishing_result["is_phishing"]:
        relationship = result["relationship_type"]      # exploits_hazard etc
    else:
        relationship = "mentions_hazard"                # legitimate bulletin
```

Without this, a real emergency warning can be described to a user as a scam.

### 3. Connect the ingestion pipeline

Currently hazards are fetched live per request. The API allows **5,000
requests per month, roughly 166 per day**, which is fine for integration and
insufficient for production.

Your data ingestion service already receives hazard events and writes them to
`HazardEvent`, with `DataSource` defaulting to `source_type: "ai_model"`. Two
pieces close this:

1. **Publish** — push fetched incidents into the ingestion queue
2. **Read** — implement `get_active_hazards_from_store()` in
   `src/hazard_source.py` to query active hazards

The function signature and output shape are unchanged, so nothing else in this
component or in your calling code changes.

---

## Frontend: what you get

Four fields matter for display:

| Field | Use |
|---|---|
| `is_hazard_related` | Whether to show the hazard connection at all |
| `hazard.hazard_type` | "bushfire", "flood", for the label |
| `hazard.location.suburb` / `.state` | Where the hazard is |
| `relationship_type` | How it relates, **after backend refines it** |

### Two rules for display

**Do not show `correlation_probability` as a confidence percentage.** It is a
rule score, not a calibrated probability. "Matched 4 of 6 indicators" is
honest; "75% confident" is not.

**Handle "phishing but not hazard-related".** A generic scam with no disaster
connection is still dangerous. The absence of a hazard link is not reassurance,
and the interface should not imply it is.

### What to show when nothing matched

`status_detail` explains it in plain language:

> "Content did not relate to any active hazard. This says nothing about whether
> it is malicious: that is the phishing component's determination."

---

## Verifying it works

```python
from correlation.src.api import health
print(health())
```

`hazard_source_available: true` means the API key is configured and hazards can
be retrieved.

Run the test suite, which needs no API key:

```
python tests/test_rules.py     # 46 passed, 0 failed
```

---

## What is not proven

Read `docs/LIMITATIONS.md` before quoting any figure.

The implementation is verified: 46 tests, run against real incident data.
**Accuracy is not.** There is no set of real message-and-hazard pairs with
known correct answers, so no accuracy claim is currently defensible.

Weights and the threshold are analyst judgement informed by published research,
not measured against our own data. They are marked provisional in
`config/rules.yaml`.
