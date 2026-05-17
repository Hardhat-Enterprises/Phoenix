"""
dataset_builder.py
Loads and prepares the wildfire time series dataset for AI013 forecasting.
Filters to Australia, aggregates daily, returns a clean DataFrame.
"""

import os
import pandas as pd
import numpy as np


FEATURE_COLS = [
    'temp_max_c',
    'wind_max_kmh',
    'precip_mm',
    'humidity_pct',
    'brightness_k',
    'event_count'
]
TARGET_COL = 'frp_mw'
DATE_COL   = 'acq_date'


def load_wildfire_data(csv_path: str, region: str = 'Australia') -> pd.DataFrame:
    """
    Load raw wildfire CSV, filter by region, and return sorted DataFrame.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"Dataset not found at: {csv_path}\n"
            "Place wildfire_multi_region_dataset.csv in the data/ folder."
        )

    df = pd.read_csv(csv_path)
    df = df[df['region'] == region].copy()
    df[DATE_COL] = pd.to_datetime(df[DATE_COL])
    df = df.sort_values(DATE_COL).reset_index(drop=True)
    return df


def aggregate_daily(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate satellite fire detections to daily level.
    Each row = one day, features = mean of that day's readings.
    """
    daily = df.groupby(DATE_COL).agg(
        frp_mw       = ('frp_mw',       'mean'),
        temp_max_c   = ('temp_max_c',   'mean'),
        wind_max_kmh = ('wind_max_kmh', 'mean'),
        precip_mm    = ('precip_mm',    'mean'),
        humidity_pct = ('humidity_pct', 'mean'),
        brightness_k = ('brightness_k', 'mean'),
        event_count  = ('frp_mw',       'count')
    ).reset_index()

    daily = daily.sort_values(DATE_COL).reset_index(drop=True)
    daily[FEATURE_COLS + [TARGET_COL]] = daily[FEATURE_COLS + [TARGET_COL]].fillna(
        daily[FEATURE_COLS + [TARGET_COL]].median()
    )
    return daily


def build_dataset(csv_path: str, region: str = 'Australia') -> pd.DataFrame:
    """
    Full pipeline: load → filter → aggregate → return clean daily DataFrame.
    """
    raw   = load_wildfire_data(csv_path, region)
    daily = aggregate_daily(raw)
    print(f"dataset: {len(daily)} daily records | "
          f"{daily[DATE_COL].min().date()} to {daily[DATE_COL].max().date()}")
    print(f"nulls: {daily[FEATURE_COLS + [TARGET_COL]].isnull().sum().sum()}")
    return daily


if __name__ == '__main__':
    BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    df   = build_dataset(os.path.join(BASE, 'data', 'wildfire_multi_region_dataset.csv'))
    print(df.head())
