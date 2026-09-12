from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split


# =============== Configuration ===============

DATASET_PATH = Path("phoenix_combined_dataset_large.xlsx")

OUTPUT_DIR = Path("split_data")

GROUP_COLUMN = "text"

# The current Phoenix dataset does not contain the final
# Sprint 2 phishing label, so leave this as None for now.
TARGET_COLUMN = None

TRAIN_SIZE = 0.70
VAL_SIZE = 0.15
TEST_SIZE = 0.15

RANDOM_SEED = 42



# =============== Dataset loading ===============


def load_dataset(path: Path) -> pd.DataFrame:
    """
    Load a CSV or Excel dataset.
    """

    if not path.exists():
        raise FileNotFoundError(
            f"Dataset could not be found: {path.resolve()}"
        )

    suffix = path.suffix.lower()

    if suffix == ".csv":
        df = pd.read_csv(path)

    elif suffix in {".xlsx", ".xls"}:
        df = pd.read_excel(path)

    else:
        raise ValueError(
            f"Unsupported file type: {suffix}. "
            "Only CSV and Excel files are supported."
        )

    if df.empty:
        raise ValueError("The dataset is empty.")

    print(f"Loaded dataset: {path}")
    print(f"Rows: {len(df)}")
    print(f"Columns: {len(df.columns)}")

    return df



# =============== Validation ===============


def validate_configuration(df: pd.DataFrame) -> None:
    """
    Check that the split configuration is valid.
    """

    total = TRAIN_SIZE + VAL_SIZE + TEST_SIZE

    if abs(total - 1.0) > 1e-9:
        raise ValueError(
            "TRAIN_SIZE + VAL_SIZE + TEST_SIZE must equal 1.0."
        )

    if GROUP_COLUMN not in df.columns:
        raise KeyError(
            f"Group column '{GROUP_COLUMN}' was not found."
        )

    if TARGET_COLUMN is not None and TARGET_COLUMN not in df.columns:
        raise KeyError(
            f"Target column '{TARGET_COLUMN}' was not found."
        )

    if df[GROUP_COLUMN].isna().any():
        raise ValueError(
            f"'{GROUP_COLUMN}' contains missing values. "
            "These must be reviewed before creating protected splits."
        )


# =============== Group preparation ===============

def create_group_table(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create one row per unique group.

    For the current Phoenix dataset, GROUP_COLUMN='text',
    meaning duplicate copies of the same text are always
    assigned to the same dataset partition.
    """

    if TARGET_COLUMN is None:
        groups = (
            df[[GROUP_COLUMN]]
            .drop_duplicates()
            .reset_index(drop=True)
        )

        return groups

    # Check whether every unique text/group has one consistent label.
    label_counts = (
        df.groupby(GROUP_COLUMN)[TARGET_COLUMN]
        .nunique(dropna=False)
    )

    conflicting_groups = label_counts[label_counts > 1]

    if not conflicting_groups.empty:
        raise ValueError(
            f"{len(conflicting_groups)} unique '{GROUP_COLUMN}' groups "
            f"contain conflicting '{TARGET_COLUMN}' labels. "
            "The dataset must be reviewed before splitting."
        )

    groups = (
        df[[GROUP_COLUMN, TARGET_COLUMN]]
        .drop_duplicates(subset=[GROUP_COLUMN])
        .reset_index(drop=True)
    )

    return groups



# =============== Protected splitting ===============


def protected_split(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split the dataset by unique groups rather than raw rows.

    This prevents duplicate content from appearing in multiple
    partitions.
    """

    groups = create_group_table(df)

    print(f"\nUnique {GROUP_COLUMN} groups: {len(groups)}")

    stratify_labels = None

    if TARGET_COLUMN is not None:
        stratify_labels = groups[TARGET_COLUMN]

    # ===============First split===============
    # Train vs temporary validation/test set
    # -----------------------------------------------------

    temp_size = VAL_SIZE + TEST_SIZE

    try:
        train_groups, temp_groups = train_test_split(
            groups,
            test_size=temp_size,
            random_state=RANDOM_SEED,
            stratify=stratify_labels,
        )

    except ValueError as error:
        print(
            "\nWarning: stratified group split could not be performed."
        )
        print(f"Reason: {error}")
        print("Falling back to seeded non-stratified group split.")

        train_groups, temp_groups = train_test_split(
            groups,
            test_size=temp_size,
            random_state=RANDOM_SEED,
            stratify=None,
        )


    # ===============Second split===============
    # Temporary set -> validation and test

    relative_test_size = TEST_SIZE / temp_size

    temp_stratify = None

    if TARGET_COLUMN is not None:
        temp_stratify = temp_groups[TARGET_COLUMN]

    try:
        val_groups, test_groups = train_test_split(
            temp_groups,
            test_size=relative_test_size,
            random_state=RANDOM_SEED,
            stratify=temp_stratify,
        )

    except ValueError as error:
        print(
            "\nWarning: validation/test stratification "
            "could not be performed."
        )
        print(f"Reason: {error}")
        print("Falling back to seeded non-stratified split.")

        val_groups, test_groups = train_test_split(
            temp_groups,
            test_size=relative_test_size,
            random_state=RANDOM_SEED,
            stratify=None,
        )

    
    # ===============Convert group assignments back to complete rows===============
    

    train_group_values = set(train_groups[GROUP_COLUMN])
    val_group_values = set(val_groups[GROUP_COLUMN])
    test_group_values = set(test_groups[GROUP_COLUMN])

    train_df = df[
        df[GROUP_COLUMN].isin(train_group_values)
    ].copy()

    val_df = df[
        df[GROUP_COLUMN].isin(val_group_values)
    ].copy()

    test_df = df[
        df[GROUP_COLUMN].isin(test_group_values)
    ].copy()

    return (
        train_df.reset_index(drop=True),
        val_df.reset_index(drop=True),
        test_df.reset_index(drop=True),
    )



# =============== Basic protection checks =============


def check_group_overlap(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> None:
    """
    Confirm that no unique group appears in more than one split.
    """

    train_groups = set(train_df[GROUP_COLUMN])
    val_groups = set(val_df[GROUP_COLUMN])
    test_groups = set(test_df[GROUP_COLUMN])

    train_val_overlap = train_groups & val_groups
    train_test_overlap = train_groups & test_groups
    val_test_overlap = val_groups & test_groups

    print("\nProtected split checks")
    print("----------------------")
    print(
        f"Train/Validation group overlap: "
        f"{len(train_val_overlap)}"
    )
    print(
        f"Train/Test group overlap: "
        f"{len(train_test_overlap)}"
    )
    print(
        f"Validation/Test group overlap: "
        f"{len(val_test_overlap)}"
    )

    if (
        train_val_overlap
        or train_test_overlap
        or val_test_overlap
    ):
        raise RuntimeError(
            "Protected split FAILED: group overlap was detected."
        )

    print("Group overlap check: PASS")



# =============== Save outputs ===============


def save_splits(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> None:
    """
    Save protected train, validation and test datasets.
    """

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    train_path = OUTPUT_DIR / "train.csv"
    val_path = OUTPUT_DIR / "validation.csv"
    test_path = OUTPUT_DIR / "test.csv"

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    print("\nSaved protected datasets")
    print("------------------------")
    print(f"Train:      {train_path}")
    print(f"Validation: {val_path}")
    print(f"Test:       {test_path}")



# =============== Summary ===============


def print_summary(
    original_df: pd.DataFrame,
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> None:
    """
    Display split sizes and unique-group counts.
    """

    print("\nSplit summary")
    print("-------------")

    print(
        f"Original:   {len(original_df):>5} rows | "
        f"{original_df[GROUP_COLUMN].nunique():>4} unique "
        f"{GROUP_COLUMN} groups"
    )

    print(
        f"Train:      {len(train_df):>5} rows | "
        f"{train_df[GROUP_COLUMN].nunique():>4} unique "
        f"{GROUP_COLUMN} groups"
    )

    print(
        f"Validation: {len(val_df):>5} rows | "
        f"{val_df[GROUP_COLUMN].nunique():>4} unique "
        f"{GROUP_COLUMN} groups"
    )

    print(
        f"Test:       {len(test_df):>5} rows | "
        f"{test_df[GROUP_COLUMN].nunique():>4} unique "
        f"{GROUP_COLUMN} groups"
    )

    total_rows = len(train_df) + len(val_df) + len(test_df)

    print(f"\nRows after splitting: {total_rows}")

    if total_rows != len(original_df):
        raise RuntimeError(
            "Split row counts do not match the original dataset."
        )

    print("Row count reconciliation: PASS")


# =============== Main =============== 


def main() -> None:
    print("PHOENIX Protected Dataset Split")
    print("===============================\n")

    df = load_dataset(DATASET_PATH)

    validate_configuration(df)

    train_df, val_df, test_df = protected_split(df)

    check_group_overlap(
        train_df,
        val_df,
        test_df,
    )

    print_summary(
        df,
        train_df,
        val_df,
        test_df,
    )

    save_splits(
        train_df,
        val_df,
        test_df,
    )

    print(
        "\nProtected splitting completed successfully."
    )


if __name__ == "__main__":
    main()