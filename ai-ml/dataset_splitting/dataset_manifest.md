# PHOENIX Dataset Manifest

## Dataset Identification

**Dataset name:** Phoenix Combined Dataset Large  
**Dataset file:** `phoenix_combined_dataset_large.xlsx`  
**Manifest version:** v1   

---

## Source Dataset

**Source file:** `phoenix_combined_dataset_large.xlsx`

**Original row count:** 2,000

**Original column count:** 10

**Columns:**

- `url`
- `text`
- `timestamp`
- `hazard_type`
- `hazard_severity`
- `hazard_timestamp`
- `hazard_location`
- `hazard_status`
- `alert_level`
- `source`

The dataset currently does not contain the approved Sprint 2 phishing target.

In particular, it does not contain:

- `is_phishing`
- `phishing_probability`

The dataset is therefore being used to develop and validate the protected splitting process only. It should not be treated as the final Sprint 2 phishing-training dataset.

---

## Current Label Status

**Approved phishing target:** Not currently available in this dataset.

**Configured target column:** `None`

The current protected split is therefore not stratified using a target label.

The Sprint 2 report states that genuine phishing-labelled text and URL data is required before the phishing baseline can be completed.

`final_label` is not being used as a substitute for `is_phishing`.

---

## Protected Split Policy

The dataset contains 2,000 rows but only approximately 250 unique text values.

A standard row-level random split could therefore place duplicate copies of the same text into multiple partitions.

To prevent this, the protected split uses:

**Grouping column:** `text`

All rows containing the same text value are assigned to the same partition.

No fitted preprocessing, encoding, vectorisation or model selection is performed before the split.

---

## Split Configuration

**Training proportion:** 70%

**Validation proportion:** 15%

**Test proportion:** 15%

**Random seed:** 42

**Grouping method:** Unique `text` groups

**Target stratification:** Disabled because no approved target column is currently available.

---

## Generated Split Files

The following protected datasets were generated:

- `split_data/train.csv`
- `split_data/validation.csv`
- `split_data/test.csv`

---

## Split Results

| Partition | Rows | Unique text groups | Group share |
|---|---:|---:|---:|
| Train | 1,444 | 175 | 70.0% |
| Validation | 295 | 37 | 14.8% |
| Test | 261 | 38 | 15.2% |
| **Total** | **2,000** | **250** | **100%** |

The row percentages do not exactly match 70/15/15 because the split is performed on unique text groups rather than individual rows.

This is intentional because protecting duplicate text groups is more important than achieving exact row-level proportions.

---

## Split Integrity Checks

Integrity checks were performed using:

`split_integrity.py`

Results:

| Check | Result |
|---|---|
| Required columns present | PASS |
| Schema consistency | PASS |
| Train/validation text overlap | PASS - 0 overlapping groups |
| Train/test text overlap | PASS - 0 overlapping groups |
| Validation/test text overlap | PASS - 0 overlapping groups |
| Row-count reconciliation | PASS |
| Missing protected-group values | PASS |
| Exact duplicate rows | PASS |
| Target distribution | SKIPPED - no approved target configured |

**Overall integrity result:** PASS

---

## Data Quality Considerations

The current dataset has a high level of repeated content.

Although it contains 2,000 rows, there are only approximately:

- 250 unique text values
- 195 unique URL values

The effective sample size for text-based modelling is therefore much smaller than the raw row count suggests.

For this reason, unique text groups are protected across train, validation and test partitions.

---

## Feature and Leakage Considerations

The current dataset contains inherited fields that have previously been associated with leakage or unreliable modelling behaviour.

The current protected split process does not make a final decision about which fields will be used as model features.

Feature approval must be re-evaluated against the final approved phishing target when genuine phishing-labelled data becomes available.

No fitted feature transformation is applied by `prepare_splits.py`.

---

## Known Limitations

1. The dataset does not contain a genuine `is_phishing` target.
2. The current split is therefore not the final phishing-training dataset.
3. Target stratification cannot currently be performed.
4. Dataset provenance and formal version information are incomplete.
5. The dataset contains substantial repeated text and URL content.
6. Feature leakage findings from previous targets do not automatically transfer to the future phishing target.
7. The protected split will need to be regenerated when the approved phishing-labelled dataset becomes available.

---

## Reproduction

Protected splits can currently be regenerated with:

```powershell
python prepare_splits.py