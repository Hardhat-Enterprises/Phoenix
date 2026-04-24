# AI009 P6 - Validation and Evaluation Report

## Objective
This phase focuses on validating the baseline model and evaluating its performance using structured metrics and saved outputs.

## Work Completed
- Created a script-based evaluation workflow for the AI009 baseline model
- Loaded configuration from the shared config file
- Loaded cleaned data from the P2 output
- Defined features and target using the baseline config
- Added validation and test split logic
- Added metric computation for validation and test datasets
- Added prediction export for validation and test sets
- Added confusion matrix generation for the test set

## Outputs
- metrics_val.json
- metrics_test.json
- predictions_val.csv
- predictions_test.csv
- conf_matrix_test.png

## Notes
This evaluation workflow depends on the saved baseline model from P5. If the model file is not yet available, the script stops with a clear error so the dependency can be resolved before final evaluation.