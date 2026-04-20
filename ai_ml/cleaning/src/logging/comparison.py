import pandas as pd


def dataset_summary(df: pd.DataFrame) -> dict:
    return {
        "rows": len(df),
        "columns": len(df.columns),
        "missing_values": int(df.isnull().sum().sum()),
        "duplicate_rows": int(df.duplicated().sum()),
    }


def compare_before_after(before_df: pd.DataFrame, after_df: pd.DataFrame) -> dict:
    return {
        "before": dataset_summary(before_df),
        "after": dataset_summary(after_df),
    }