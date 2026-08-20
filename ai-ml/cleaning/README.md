# Data Cleaning Pipeline (`ai-ml/cleaning`)

This module provides a configurable CSV cleaning + validation pipeline.

It is designed to:

- clean raw tabular data (missing values, duplicates, type conversion, string normalization)
- validate cleaned data against rules (required fields, allowed values, ranges, types, date formats)
- generate output artifacts (cleaned CSV, validation report, comparison report, pipeline log)

## Folder Structure

- `config/pipeline_config.json` - all pipeline configuration
- `data/input/` - raw CSV input files
- `data/output/` - cleaned CSV output
- `data/reports/` - JSON reports (validation + before/after comparison)
- `data/logs/` - pipeline event log
- `src/` - pipeline implementation

## What The Pipeline Does

For each run, the pipeline:

1. reads input CSV from `paths.input_csv`
2. selects cleaning/validation rules:

- dataset-specific rules under `datasets.<name>` when columns match
- otherwise falls back to top-level `cleaning` + `validation` (`generic`)

1. applies cleaning steps
2. runs validation checks
3. writes outputs to configured paths

## Run The Pipeline

From repo root:

```powershell
python ai-ml/cleaning/src/main.py
```

With a custom config:

```powershell
python ai-ml/cleaning/src/main.py --config ai-ml/cleaning/config/pipeline_config.json
```

## Use In Other Python Scripts

Example integration:

```python
from pathlib import Path
import sys

cleaning_root = Path("ai-ml/cleaning").resolve()
if str(cleaning_root) not in sys.path:
    sys.path.insert(0, str(cleaning_root))

from src.pipeline import run_pipeline

summary = run_pipeline(cleaning_root / "config" / "pipeline_config.json")
print(summary)
```

## How To Modify `pipeline_config.json`

### 1. Set input/output paths

Update `paths`:

- `input_csv`
- `cleaned_csv`
- `validation_report`
- `comparison_report`
- `pipeline_log`

### 2. Configure generic fallback rules

Top-level `cleaning` and `validation` are used when no dataset-specific schema matches.

### 3. Add or edit dataset-specific rules

Under `datasets`, each dataset entry should contain:

- `cleaning`
- `validation.required_columns`
- `validation.column_rules`

Minimal pattern:

```json
"datasets": {
  "my_dataset": {
    "cleaning": {
      "missing_values": { "drop": [], "fill": {} },
      "duplicates": { "subset": [] },
      "type_conversion": { "int": [], "float": [], "datetime": [] },
      "string_standardisation": ["col_a", "col_b"]
    },
    "validation": {
      "required_columns": ["id"],
      "column_rules": {
        "id": { "required": true, "type": "int", "unique": true }
      }
    }
  }
}
```

## Validation Rules Supported

Per column (`validation.column_rules.<column>`):

- `required: true|false`
- `type: "int" | "float" | "str" | "date"`
- `unique: true|false`
- `allowed_values: [...]`
- `min` / `max` (numeric)
- `format` (for `type: "date"`)

## Cleaning Rules Supported

- `missing_values.drop`: drop rows where these columns are null
- `missing_values.fill`: fill nulls with provided values
- `duplicates.subset`: drop duplicate rows by subset
- `type_conversion.int|float|datetime`: coercive conversion
- `string_standardisation`: trim + normalize configured text columns

## Notes

- Input is expected to be CSV.
- Validation `FAIL` means rule violations were found; pipeline still completes and writes reports.
- If a new dataset is not being picked, verify its `required_columns` match the CSV column names exactly.
