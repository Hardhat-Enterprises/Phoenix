import pandas as pd
import numpy as np


class FeatureSelector:

    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()

    # -----------------------------
    # 1. MAIN FEATURE ENGINEERING
    # -----------------------------
    def create_features(self):

        df = self.df

        # -----------------------------
        # TEMPORAL FEATURE
        # -----------------------------
        if "time_window" in df.columns:
            df["time_window"] = pd.to_datetime(df["time_window"], errors="coerce")
            df = df.sort_values("time_window")

            df["hour"] = df["time_window"].dt.hour
            df["day"] = df["time_window"].dt.day

        # -----------------------------
        # GEO FEATURES (ALL INCLUDED)
        # -----------------------------
        df["geo_width"] = df["region_max_longitude"] - df["region_min_longitude"]
        df["geo_height"] = df["region_max_latitude"] - df["region_min_latitude"]
        df["geo_area_proxy"] = df["geo_width"] * df["geo_height"]

        df["geo_center_lat"] = (df["region_max_latitude"] + df["region_min_latitude"]) / 2
        df["geo_center_lon"] = (df["region_max_longitude"] + df["region_min_longitude"]) / 2

        # -----------------------------
        # FIRMS HAZARD FEATURES
        # -----------------------------
        df["firms_risk_index"] = df["firms_event_count"] * df["firms_avg_frp"]

        df["firms_intensity_score"] = (
            df["firms_avg_brightness"] * df["firms_avg_confidence"]
        )

        df["firms_geo_density"] = df["firms_event_count"] / (df["geo_area_proxy"] + 1e-6)

        df["firms_sensor_activity"] = (
            df["firms_sources"].astype(str).apply(lambda x: len(x.split("|")))
        )

        # -----------------------------
        # URLHAUS CYBER FEATURES
        # -----------------------------
        df["cyber_risk_index"] = (
            df["urlhaus_event_count"] * df["urlhaus_unique_url_count"]
        )

        df["cyber_activity_score"] = (
            df["urlhaus_online_count"] - df["urlhaus_offline_count"]
        )

        df["cyber_threat_density"] = df["urlhaus_event_count"] / (df["firms_event_count"] + 1)

        # -----------------------------
        # CROSS DOMAIN INTERACTION (VERY IMPORTANT HD FEATURE)
        # -----------------------------
        df["hazard_cyber_interaction"] = (
            df["firms_event_count"] * df["urlhaus_event_count"]
        )

        df["risk_amplification_index"] = (
            df["firms_risk_index"] * df["cyber_risk_index"]
        )

        # -----------------------------
        # CATEGORICAL FEATURE ENCODING
        # -----------------------------
        if "firms_instruments" in df.columns:
            df["firms_instruments_encoded"] = df["firms_instruments"].astype("category").cat.codes

        if "firms_satellites" in df.columns:
            df["firms_satellites_encoded"] = df["firms_satellites"].astype("category").cat.codes

        if "firms_types" in df.columns:
            df["firms_types_encoded"] = df["firms_types"].astype("category").cat.codes

        if "urlhaus_threats" in df.columns:
            df["urlhaus_threats_encoded"] = df["urlhaus_threats"].astype("category").cat.codes

        if "urlhaus_tags" in df.columns:
            df["urlhaus_tags_encoded"] = df["urlhaus_tags"].astype("category").cat.codes

        # -----------------------------
        # NORMALISATION FEATURES (ANOMALY READY)
        # -----------------------------
        df["firms_zscore"] = (
            df["firms_event_count"] - df["firms_event_count"].mean()
        ) / (df["firms_event_count"].std() + 1e-6)

        df["cyber_zscore"] = (
            df["urlhaus_event_count"] - df["urlhaus_event_count"].mean()
        ) / (df["urlhaus_event_count"].std() + 1e-6)

        # -----------------------------
        # FINAL CLEANING
        # -----------------------------
        df = df.replace([np.inf, -np.inf], np.nan).fillna(0)

        self.df = df
        return self.df

    # -----------------------------
    # 2. FEATURE LIST (FOR MODEL)
    # -----------------------------
    def get_feature_list(self):

        return [col for col in self.df.columns if col not in ["time_window"]]