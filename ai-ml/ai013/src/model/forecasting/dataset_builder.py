import pandas as pd
import numpy as np
from pathlib import Path


def load_cleaned_data(filepath: str) -> pd.DataFrame:
    """Load cleaned data from the AI003 pipeline output."""
    df = pd.read_csv(filepath)
    return df


def prepare_time_series(df: pd.DataFrame) -> pd.DataFrame:
    """
    Parse timestamps and sort by time.
    Uses the timestamp column from cleaned_data.csv.
    """
    # Parse the timestamp column
    df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)

    # Sort by time
    df = df.sort_values('timestamp').reset_index(drop=True)

    # Encode risk_level as numeric
    risk_map = {
        'Unknown': 0,
        'Low': 1,
        'Medium': 2,
        'High': 3,
        'Severe': 4,
        'Critical': 5
    }
    df['risk_level_encoded'] = df['risk_level'].map(risk_map).fillna(0)

    # Fill missing severity scores with 0
    df['severity_score'] = pd.to_numeric(df['severity_score'], errors='coerce').fillna(0.0)

    return df


def select_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Select time-based features for forecasting.
    Target: severity_score
    Supporting: risk_level_encoded, hour, day_of_week, month
    """
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['month'] = df['timestamp'].dt.month

    feature_cols = [
        'timestamp',
        'severity_score',
        'risk_level_encoded',
        'hour',
        'day_of_week',
        'month'
    ]

    return df[feature_cols]


def build_dataset(filepath: str) -> pd.DataFrame:
    """Full pipeline: load → prepare → select features."""
    df = load_cleaned_data(filepath)
    df = prepare_time_series(df)
    df = select_features(df)
    print(f"Dataset built: {len(df)} records, columns: {list(df.columns)}")
    return df


if __name__ == "__main__":
    # Default path relative to project root
    data_path = Path(__file__).resolve().parents[5] / "cleaning" / "data" / "output" / "cleaned_data.csv"
    df = build_dataset(str(data_path))
    print(df.head())
