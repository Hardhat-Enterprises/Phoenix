# Core Model Behaviour and Error Testing

## Objective
## Test Results

| Test | Change Made | Risk Score | Predicted Class | Risk Level | Observation |
|---|---|---:|---:|---|---|
| T01 | Baseline - alert level emergency | 0.0008 | 0 | Low | Baseline prediction |
| T02 | Alert level changed to low | 0.6666 | 2 | High | Prediction changed significantly |
| T03 | Hazard type changed from flood to fire | 0.6666 | 2 | High | No prediction change |
| T04 | Hazard location changed from VIC to NSW | 0.6666 | 2 | High | No prediction change |
| T05 | Message text changed to severe fire warning | 0.6666 | 2 | High | No prediction change |
| T06 | Hazard location left empty | N/A | N/A | N/A | Input correctly rejected with missing required field error |
## Findings

The testing showed that changing the `alert_level` had a significant effect on the Core Model prediction. When the alert level was changed from `emergency` to `low`, the predicted risk changed from Low to High.

In comparison, changing `hazard_type`, `hazard_location`, and the message `text` did not change the prediction during these controlled tests.

The missing-field test also confirmed that the integration script correctly validates required inputs. When `hazard_location` was left empty, the prediction was stopped and a validation error was returned.

These results suggest that the current model behaviour is strongly influenced by the alert-level feature in the tested scenarios. Further testing is required before determining whether this behaviour comes from the training data, feature encoding, preprocessing, or the trained model itself.
The purpose of this testing is to evaluate how the PHOENIX Core XGBoost model responds when selected input fields are changed and when invalid input is provided. The testing focuses on model behaviour, prediction variation, and input validation.