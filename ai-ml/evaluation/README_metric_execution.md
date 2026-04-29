# AI014 - Implement Metric Execution (Asad Ullah)

This folder contains my assigned AI014 work: **Implement metric execution**.

## Files to add to GitHub

```text
ai-ml/evaluation/src/metrics/generic_metrics.py
ai-ml/evaluation/src/metrics/metric_utils.py
ai-ml/evaluation/notebooks/evaluation_demo.ipynb
ai-ml/evaluation/outputs/metrics/evaluation_metrics.json
ai-ml/evaluation/outputs/reports/metric_execution_summary.md
```

## What the code does

- Loads prediction results from a CSV file.
- Checks that the required columns exist.
- Calculates accuracy, precision, recall, F1 score, ROC AUC, false positive rate, false negative rate, and confusion matrix.
- Saves the metric result as JSON.

## Suggested branch

```text
ai014/asad-ullah
```

## Suggested commit message

```text
AI014: implement metric execution
```

## Suggested PR description

```text
Implemented metric execution for AI014.

Files added:
- evaluation/src/metrics/generic_metrics.py
- evaluation/src/metrics/metric_utils.py
- evaluation/notebooks/evaluation_demo.ipynb
- evaluation/outputs/metrics/evaluation_metrics.json
- evaluation/outputs/reports/metric_execution_summary.md

The code calculates accuracy, precision, recall, F1 score, ROC AUC, false positive rate, false negative rate, and confusion matrix from prediction outputs.
```
