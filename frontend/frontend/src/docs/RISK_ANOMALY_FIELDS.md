# Risk & Anomaly — Future Model Output Fields

**Status:** Not implemented. This document exists so the frontend has a
reviewed target shape to build against once the backend/model team ships
these fields — it is not a description of anything currently returned by
any endpoint.

## Context

Sprint 2 ("Risk and Anomaly Feature Control", Varun): the backend supplied
for this environment does not expose the risk-assessment or anomaly
endpoints. Rather than guess at a shape and build UI against it silently,
this document records the fields the frontend expects to eventually
receive, so:

- reviewers can confirm the shape before any code depends on it, and
- when the backend does add these fields, the frontend change is a
  normalization update in `riskAssessmentApi.js` / the anomaly adapter,
  not a redesign.

None of these fields should be treated as available, validated, or safe to
display as fact until a backend endpoint actually returns them and that's
been confirmed against a real response.

## Future fields

| Field | Type | Meaning |
|---|---|---|
| `phishing_probability` | number (0–1) | Model-estimated probability the linked threat is a phishing attempt. **Not a confirmed classification** — a probability, to be labelled as such in the UI. |
| `hazard_correlation_probability` | number (0–1) | Model-estimated probability the hazard and threat are genuinely correlated (as opposed to coincidental timing/location overlap). |
| `relationship_type` | string (enum, TBD) | The kind of relationship the model believes exists between the hazard and threat (e.g. `infrastructure_targeting`, `misinformation_exploitation`, `opportunistic`). Enum values to be confirmed with the backend/model team before use. |
| `evidence` | array of strings/objects (TBD) | Supporting signals the model used to reach its output (e.g. shared IP ranges, timing overlap, keyword matches). Structure not yet confirmed. |
| `priority` | string (enum, TBD) | A suggested triage priority for analysts, distinct from raw model confidence. |
| `model_version` | string | Identifier for which model version produced the output, for auditability and to explain why output may change between requests. |

## Display requirements once these fields exist

- Every one of these fields must be presented as **model output**, not as
  a validated fact. Language like "detected phishing" or "confirmed
  hazard correlation" must not be used — use "model-estimated" /
  "unvalidated" framing instead, consistent with the disclaimer already
  shown in the Anomaly Detection card (see `Dashboard.jsx`).
- `evidence` should be shown as supporting context, not as proof.
- A record built entirely from these fields still counts as an
  "integration log" / model-output record, not a risk assessment, unless
  a human has reviewed and confirmed it — the distinction the Sprint 2
  brief requires ("Integration logs are never labelled risk assessments")
  applies here too.
