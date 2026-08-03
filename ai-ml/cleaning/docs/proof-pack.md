# AI003 Proof Pack

## Test Dataset
A dummy CSV dataset was used with the following intentional issues:
- missing values
- duplicate rows
- inconsistent categorical values

## Execution Result
The pipeline was executed successfully using `run_demo.py`.

## Observed Output
Before cleaning:
- Rows: 6
- Columns: 6
- Missing values: 4
- Duplicate rows: 1

After cleaning:
- Rows: 5
- Columns: 6
- Missing values: 3
- Duplicate rows: 0

## Logged Transformations
- Missing values detected
- Duplicate row removed
- `event_type` values normalised

## Output File
- `cleaned_output.csv` generated successfully