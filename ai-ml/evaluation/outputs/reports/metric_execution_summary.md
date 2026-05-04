# AI014 Metric Execution Summary - Asad Ullah

## Scope
This work covers the AI014 checklist item: **Implement metric execution**.

## Input used
- Source file: `predictions_val.csv`
- Actual column: `actual_label`
- Predicted column: `predicted_label`
- Probability column: `predicted_probability`

## Metrics generated
- Accuracy: 1.0
- Precision: 1.0
- Recall: 1.0
- F1 score: 1.0
- ROC AUC: 1.0
- False positive rate: 0.0
- False negative rate: 0.0
- Confusion matrix: [[1, 0], [0, 1]]

## Output generated
- `evaluation/outputs/metrics/evaluation_metrics.json`

## Notes
The implementation is reusable. It can run on any CSV file with actual and predicted label columns.
If a probability column is available, ROC AUC is also calculated.
