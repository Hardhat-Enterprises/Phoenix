# AI003 Workstream 2 - Data Validation and Rules

## Definition of Clean Data

Data is considered valid if:

- All required columns are present
- No required fields contain null values
- Values fall within defined ranges
- Categorical fields match allowed values
- Dates follow the expected format
- Unique fields contain no duplicates

## Integration Plan (AI001)

Once schema is available:

- Replace validation_rules.json with schema-driven rules
- Map schema fields to validation rules
- Ensure compatibility with cleaning pipeline outputs

## Purpose

This module validates raw input data against configurable quality rules.

It checks for:

- missing required columns
- missing required values
- duplicate values in unique fields
- invalid category values
- out-of-range numeric values
- invalid date formats
- basic type mismatches

## Structure

- `data/` -> dummy datasets
- `config/` -> validation rules
- `src/` -> validation scripts
- `output/` -> generated validation reports

## How to run

From the validation folder:

```bash
pip install -r requirements.txt
python src/main.py
