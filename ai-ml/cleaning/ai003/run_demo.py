import pandas as pd
from logging_utils import log_rows_removed, log_nulls_found, log_other_transformations
from comparison import compare_before_after


def demo_clean(df: pd.DataFrame) -> pd.DataFrame:
    cleaned = df.copy()

    null_count = int(cleaned.isnull().sum().sum())
    print(log_nulls_found(null_count))

    duplicate_count = int(cleaned.duplicated().sum())
    cleaned = cleaned.drop_duplicates()
    print(log_rows_removed(duplicate_count))

    if "event_type" in cleaned.columns:
        cleaned["event_type"] = cleaned["event_type"].replace({
            "Phishing": "phishing",
            "phish": "phishing"
        })
        print(log_other_transformations("normalised event_type values"))

    return cleaned


def main():
    before_df = pd.read_csv("test_data.csv")
    after_df = demo_clean(before_df)

    result = compare_before_after(before_df, after_df)
    print("\nBefore vs After Summary")
    print(result)

    after_df.to_csv("cleaned_output.csv", index=False)
    print("\nSaved cleaned_output.csv")


if __name__ == "__main__":
    main()