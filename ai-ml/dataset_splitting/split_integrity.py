from pathlib import Path

import pandas as pd


# =============== Configuration ===============

SPLIT_DIR = Path("split_data")

TRAIN_PATH = SPLIT_DIR / "train.csv"
VAL_PATH = SPLIT_DIR / "validation.csv"
TEST_PATH = SPLIT_DIR / "test.csv"

GROUP_COLUMN = "text"

# Current dataset does not contain the real Sprint 2
# phishing target, so keep this as None for now.
TARGET_COLUMN = None

EXPECTED_TOTAL_ROWS = 2000


# =============== Loading ===============

def load_split(path: Path, name: str) -> pd.DataFrame:
    """
    Load one protected split and perform basic validation.
    """

    if not path.exists():
        raise FileNotFoundError(
            f"{name} split not found: {path.resolve()}"
        )

    df = pd.read_csv(path)

    if df.empty:
        raise ValueError(
            f"{name} split is empty."
        )

    print(
        f"{name:<10}: "
        f"{len(df):>5} rows | "
        f"{len(df.columns):>2} columns"
    )

    return df


# =============== Required Column Checks ===============

def check_required_columns(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> bool:
    """
    Confirm that required columns exist in every split.
    """

    print("\n1. Required column checks")
    print("-------------------------")

    required_columns = {GROUP_COLUMN}

    if TARGET_COLUMN is not None:
        required_columns.add(TARGET_COLUMN)

    passed = True

    for name, df in [
        ("Train", train_df),
        ("Validation", val_df),
        ("Test", test_df),
    ]:
        missing = required_columns - set(df.columns)

        if missing:
            print(
                f"{name}: FAIL - missing columns: "
                f"{sorted(missing)}"
            )
            passed = False
        else:
            print(f"{name}: PASS")

    return passed


# =============== Schema Consistency ===============

def check_schema_consistency(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> bool:
    """
    Confirm all splits have the same columns in the same order.
    """

    print("\n2. Schema consistency")
    print("---------------------")

    train_columns = list(train_df.columns)
    val_columns = list(val_df.columns)
    test_columns = list(test_df.columns)

    passed = (
        train_columns == val_columns == test_columns
    )

    if passed:
        print(
            f"PASS - all splits contain "
            f"{len(train_columns)} matching columns."
        )
    else:
        print("FAIL - split schemas do not match.")

        print("\nTrain columns:")
        print(train_columns)

        print("\nValidation columns:")
        print(val_columns)

        print("\nTest columns:")
        print(test_columns)

    return passed


# =============== Group Overlap Checks ===============

def check_group_overlap(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> bool:
    """
    Confirm that the same unique text/group does not occur
    in more than one partition.
    """

    print("\n3. Protected group overlap")
    print("--------------------------")

    train_groups = set(
        train_df[GROUP_COLUMN].dropna()
    )
    val_groups = set(
        val_df[GROUP_COLUMN].dropna()
    )
    test_groups = set(
        test_df[GROUP_COLUMN].dropna()
    )

    train_val = train_groups & val_groups
    train_test = train_groups & test_groups
    val_test = val_groups & test_groups

    print(
        f"Train/Validation overlap: "
        f"{len(train_val)}"
    )
    print(
        f"Train/Test overlap:       "
        f"{len(train_test)}"
    )
    print(
        f"Validation/Test overlap:  "
        f"{len(val_test)}"
    )

    passed = not (
        train_val
        or train_test
        or val_test
    )

    if passed:
        print(
            "PASS - no protected groups cross "
            "split boundaries."
        )
    else:
        print(
            "FAIL - duplicate groups appear "
            "across splits."
        )

    return passed


# =============== Row Reconciliation ===============

def check_row_counts(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> bool:
    """
    Confirm that the split row counts reconcile.
    """

    print("\n4. Row-count reconciliation")
    print("---------------------------")

    train_rows = len(train_df)
    val_rows = len(val_df)
    test_rows = len(test_df)

    total_rows = (
        train_rows
        + val_rows
        + test_rows
    )

    print(f"Train rows:      {train_rows}")
    print(f"Validation rows: {val_rows}")
    print(f"Test rows:       {test_rows}")
    print(f"Combined rows:   {total_rows}")

    if EXPECTED_TOTAL_ROWS is None:
        print(
            "PASS - no expected total row count "
            "was configured."
        )
        return True

    passed = total_rows == EXPECTED_TOTAL_ROWS

    if passed:
        print(
            f"PASS - combined rows match expected "
            f"total ({EXPECTED_TOTAL_ROWS})."
        )
    else:
        print(
            f"FAIL - expected {EXPECTED_TOTAL_ROWS} "
            f"rows but found {total_rows}."
        )

    return passed


# =============== Missing Values ===============

def check_missing_group_values(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> bool:
    """
    Check whether the protected grouping field contains
    missing values.
    """

    print("\n5. Missing protected-group values")
    print("--------------------------------")

    passed = True

    for name, df in [
        ("Train", train_df),
        ("Validation", val_df),
        ("Test", test_df),
    ]:
        missing = df[GROUP_COLUMN].isna().sum()

        print(
            f"{name:<10}: "
            f"{missing} missing "
            f"{GROUP_COLUMN} values"
        )

        if missing > 0:
            passed = False

    if passed:
        print(
            "PASS - no missing protected-group "
            "values."
        )
    else:
        print(
            "FAIL - missing protected-group values "
            "were found."
        )

    return passed


# =============== Exact Duplicate Rows ===============

def check_exact_duplicates(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> bool:
    """
    Report exact duplicate rows within each split.

    Duplicates inside a single split are not necessarily
    cross-split leakage, so this is reported separately.
    """

    print("\n6. Exact duplicate rows within splits")
    print("------------------------------------")

    total_duplicates = 0

    for name, df in [
        ("Train", train_df),
        ("Validation", val_df),
        ("Test", test_df),
    ]:
        duplicate_count = df.duplicated().sum()

        total_duplicates += duplicate_count

        print(
            f"{name:<10}: "
            f"{duplicate_count} exact duplicate rows"
        )

    if total_duplicates == 0:
        print(
            "PASS - no exact duplicate rows found."
        )
        return True

    print(
        "REVIEW - exact duplicates exist within "
        "individual splits, but this does not "
        "automatically mean cross-split leakage."
    )

    return True


# =============== Unique Group Summary ===============

def print_group_summary(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> None:
    """
    Display unique protected-group counts and proportions.
    """

    print("\n7. Protected-group distribution")
    print("------------------------------")

    counts = {
        "Train": train_df[GROUP_COLUMN].nunique(),
        "Validation": val_df[GROUP_COLUMN].nunique(),
        "Test": test_df[GROUP_COLUMN].nunique(),
    }

    total_groups = sum(counts.values())

    for name, count in counts.items():
        percentage = (
            count / total_groups * 100
            if total_groups > 0
            else 0
        )

        print(
            f"{name:<10}: "
            f"{count:>4} groups "
            f"({percentage:>5.1f}%)"
        )

    print(
        f"Total unique protected groups: "
        f"{total_groups}"
    )


# =============== Optional Target/Class Checks ===============

def check_target_distribution(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> bool:
    """
    Report target/class distribution when a real target
    becomes available.
    """

    print("\n8. Target distribution")
    print("----------------------")

    if TARGET_COLUMN is None:
        print(
            "SKIPPED - no approved target column "
            "is configured."
        )
        return True

    passed = True

    all_classes = set()

    for df in [
        train_df,
        val_df,
        test_df,
    ]:
        all_classes.update(
            df[TARGET_COLUMN]
            .dropna()
            .unique()
            .tolist()
        )

    for name, df in [
        ("Train", train_df),
        ("Validation", val_df),
        ("Test", test_df),
    ]:
        print(f"\n{name}")

        counts = (
            df[TARGET_COLUMN]
            .value_counts(dropna=False)
            .sort_index()
        )

        proportions = (
            df[TARGET_COLUMN]
            .value_counts(
                normalize=True,
                dropna=False,
            )
            .sort_index()
        )

        result = pd.DataFrame(
            {
                "count": counts,
                "share": proportions,
            }
        )

        print(result)

        split_classes = set(
            df[TARGET_COLUMN]
            .dropna()
            .unique()
            .tolist()
        )

        missing_classes = (
            all_classes - split_classes
        )

        if missing_classes:
            print(
                f"WARNING - missing classes: "
                f"{sorted(missing_classes)}"
            )
            passed = False

    return passed


# =============== Overall Result ===============

def print_final_result(results: dict[str, bool]) -> None:
    """
    Print an overall integrity PASS/FAIL summary.
    """

    print("\nIntegrity check summary")
    print("=======================")

    for check_name, passed in results.items():
        status = "PASS" if passed else "FAIL"

        print(
            f"{check_name:<30} {status}"
        )

    overall_pass = all(results.values())

    print()

    if overall_pass:
        print(
            "OVERALL RESULT: PASS"
        )
        print(
            "The protected dataset splits passed "
            "all configured integrity checks."
        )
    else:
        print(
            "OVERALL RESULT: FAIL"
        )
        print(
            "One or more integrity checks failed. "
            "The splits should not be used for "
            "training until the issue is resolved."
        )


# =============== Main ===============

def main() -> None:
    print("PHOENIX Split Integrity Check")
    print("=============================\n")

    train_df = load_split(
        TRAIN_PATH,
        "Train",
    )

    val_df = load_split(
        VAL_PATH,
        "Validation",
    )

    test_df = load_split(
        TEST_PATH,
        "Test",
    )

    results = {
        "Required columns":
            check_required_columns(
                train_df,
                val_df,
                test_df,
            ),

        "Schema consistency":
            check_schema_consistency(
                train_df,
                val_df,
                test_df,
            ),

        "Protected group overlap":
            check_group_overlap(
                train_df,
                val_df,
                test_df,
            ),

        "Row reconciliation":
            check_row_counts(
                train_df,
                val_df,
                test_df,
            ),

        "Missing group values":
            check_missing_group_values(
                train_df,
                val_df,
                test_df,
            ),

        "Exact duplicate review":
            check_exact_duplicates(
                train_df,
                val_df,
                test_df,
            ),
    }

    print_group_summary(
        train_df,
        val_df,
        test_df,
    )

    results["Target distribution"] = check_target_distribution(
        train_df,
        val_df,
        test_df,
    )

    print_final_result(results)


if __name__ == "__main__":
    main()