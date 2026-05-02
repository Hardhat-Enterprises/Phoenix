import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler



# 1. DATA LOADER MODULE


class DataLoader:
    def load(self, path: str) -> pd.DataFrame:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Dataset not found: {path}")

        df = pd.read_csv(path, low_memory=False)

        if df.empty:
            raise ValueError("Dataset is empty.")

        return df


# 2. DATA CLEANER MODULE


class DataCleaner:
    def clean(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        if "time_window" in df.columns:
            df["time_window"] = pd.to_datetime(df["time_window"], errors="coerce")

        numeric_cols = df.select_dtypes(include=[np.number]).columns

        for col in numeric_cols:
            df[col] = df[col].fillna(df[col].median())

        return df



# 3. FEATURE ENGINEERING MODULE


class FeatureEngineer:

    def build_cyber_features(self, df):
        cyber_cols = [
            "urlhaus_event_count",
            "urlhaus_unique_url_count",
            "urlhaus_online_count",
            "urlhaus_offline_count"
        ]

        available = [c for c in cyber_cols if c in df.columns]

        df["cyber_intensity_score"] = df[available].sum(axis=1)
        return df

    def build_hazard_features(self, df):

        required = [
            "firms_avg_frp",
            "firms_avg_brightness",
            "firms_avg_confidence",
            "firms_event_count"
        ]

        if not all(c in df.columns for c in required):
            raise ValueError("Missing required FIRMS columns.")

        df["hazard_severity_index"] = (
            df["firms_avg_frp"] * 0.35 +
            df["firms_avg_brightness"] * 0.30 +
            df["firms_avg_confidence"] * 0.20 +
            df["firms_event_count"] * 0.15
        )

        return df

    def build_temporal_features(self, df):
        if "time_window" not in df.columns:
            return df

        df = df.sort_values("time_window")

        df["rolling_6h_event_avg"] = df["firms_event_count"].rolling(6, 1).mean()
        df["lag_1_event_count"] = df["firms_event_count"].shift(1).fillna(0)
        df["event_spike_ratio"] = df["firms_event_count"] / (df["rolling_6h_event_avg"] + 1)

        return df

    def build_geo_features(self, df):
        if not all(c in df.columns for c in ["region_lat_bin", "region_lon_bin", "firms_event_count"]):
            return df

        df["geo_density_score"] = (
            (df["region_lat_bin"].abs() + df["region_lon_bin"].abs())
            * df["firms_event_count"]
        )

        return df

    def build_zscores(self, df):
        targets = [
            "firms_event_count",
            "cyber_intensity_score",
            "hazard_severity_index"
        ]

        for col in targets:
            if col not in df.columns:
                continue

            std = df[col].std()

            df[f"zscore_{col}"] = 0 if std == 0 or pd.isna(std) else (df[col] - df[col].mean()) / std

        return df

    def transform(self, df):
        df = self.build_cyber_features(df)
        df = self.build_hazard_features(df)
        df = self.build_temporal_features(df)
        df = self.build_geo_features(df)
        df = self.build_zscores(df)
        return df


# 4. FEATURE SELECTOR MODULE


class FeatureSelector:

    def select(self, df):
        context = ["time_window", "region_id", "region_lat_bin", "region_lon_bin"]

        features = [
            "cyber_intensity_score",
            "hazard_severity_index",
            "rolling_6h_event_avg",
            "lag_1_event_count",
            "event_spike_ratio",
            "geo_density_score",
            "zscore_firms_event_count",
            "zscore_cyber_intensity_score",
            "zscore_hazard_severity_index"
        ]

        cols = [c for c in context + features if c in df.columns]

        return df[cols].copy()



# 5. SCALER MODULE


class FeatureScaler:

    def __init__(self):
        self.scaler = StandardScaler()

    def scale(self, df):
        context = ["time_window", "region_id", "region_lat_bin", "region_lon_bin"]

        feature_cols = [c for c in df.columns if c not in context]

        scaled = self.scaler.fit_transform(df[feature_cols])

        scaled_df = pd.DataFrame(scaled, columns=feature_cols)

        return pd.concat([df[context].reset_index(drop=True),
                          scaled_df.reset_index(drop=True)], axis=1)



# 6. PIPELINE ORCHESTRATOR (MAIN SYSTEM)


class AnomalyFeaturePipeline:

    def __init__(self):
        self.loader = DataLoader()
        self.cleaner = DataCleaner()
        self.engineer = FeatureEngineer()
        self.selector = FeatureSelector()
        self.scaler = FeatureScaler()

    def run(self, input_path, output_path):

        print("\n=== AI012 MODULAR FEATURE PIPELINE ===\n")

        # Load
        df = self.loader.load(input_path)
        print("Loaded:", df.shape)

        # Clean
        df = self.cleaner.clean(df)

        # Feature engineering
        df = self.engineer.transform(df)

        # Select features
        df = self.selector.select(df)

        print("Selected features:", df.columns.tolist())

        # Scale
        df = self.scaler.scale(df)

        # Save
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)

        print("\nSaved to:", output_path)
        print("Final shape:", df.shape)

        return df



# MAIN EXECUTION


if __name__ == "__main__":

    BASE_DIR = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..")
    )

    INPUT_PATH = os.path.join(
        BASE_DIR,
        "data",
        "raw",
        "anomaly_detection_hourly_2020_2024.csv"
    )

    OUTPUT_PATH = os.path.join(
        BASE_DIR,
        "data",
        "processed",
        "features_output.csv"
    )

    pipeline = AnomalyFeaturePipeline()
    pipeline.run(INPUT_PATH, OUTPUT_PATH)