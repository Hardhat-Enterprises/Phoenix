from pathlib import Path
import json

from datasets import (
    load_disaster_dataset,
    load_cyber_dataset,
    load_weather_dataset,
    load_geo_dataset,
    load_infrastructure_dataset,
    load_social_dataset,
)
from data_cleaning_pipeline import run_cleaning_pipeline
from feature_engineer import FeatureEngineer

BASE_DIR = Path(__file__).resolve().parent


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
    config_path = BASE_DIR / "config.yaml"
    try:
        import yaml  # type: ignore

        with open(config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except ModuleNotFoundError:
        # Minimal fallback: keep pipeline running with defaults if PyYAML
        # is unavailable in the execution environment.
        return {}
    except Exception:
        # If config can't be parsed, continue with defaults.
        return {}


def main():
    df = merge_datasets()

    config = load_config()

    # AI003 CLEANING STEP (NEW REQUIRED STEP)
    cleaned_df, events = run_cleaning_pipeline(df, config)

    fe = FeatureEngineer(cleaned_df)
    result = fe.run()

    print("\nFINAL OUTPUT:")
    print(result.head())

    output_path = BASE_DIR / "ai004_features_output.csv"
    mapping_path = BASE_DIR / "feature_mapping.json"
    result.to_csv(output_path, index=False)
    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(fe.feature_mapping(), f, indent=4)


if __name__ == "__main__":
    main()
