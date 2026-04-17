from datasets import (
    load_disaster_dataset,
    load_cyber_dataset,
    load_weather_dataset,
    load_geo_dataset,
    load_infrastructure_dataset,
    load_social_dataset
)

from data_cleaning_pipeline import run_cleaning_pipeline
from feature_engineer import FeatureEngineer
import yaml
import pandas as pd


def merge_datasets():
    df1 = load_disaster_dataset()
    df2 = load_cyber_dataset()
    df3 = load_weather_dataset()
    df4 = load_geo_dataset()
    df5 = load_infrastructure_dataset()
    df6 = load_social_dataset()

    df = df1.merge(df2, on=["timestamp", "location"], how="outer")
    df = df.merge(df3, on=["timestamp", "location"], how="outer")
    df = df.merge(df4, on=["location"], how="left")
    df = df.merge(df5, on=["location"], how="left")
    df = df.merge(df6, on=["timestamp", "location"], how="outer")

    return df


def load_config():
    with open("config.yaml", "r") as f:
        return yaml.safe_load(f)


def main():
    df = merge_datasets()

    config = load_config()

    # AI003 CLEANING STEP (NEW REQUIRED STEP)
    cleaned_df, events = run_cleaning_pipeline(df, config)

    fe = FeatureEngineer(cleaned_df)
    result = fe.run()

    print("\nFINAL OUTPUT:")
    print(result.head())


if __name__ == "__main__":
    main()