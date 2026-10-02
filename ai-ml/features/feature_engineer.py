import pandas as pd
import numpy as np
import json
import logging
import math
import ipaddress
from urllib.parse import urlparse
from pathlib import Path

try:
    import yaml  # type: ignore
except ModuleNotFoundError:
    yaml = None

try:
    import tldextract  # type: ignore
    # suffix_list_urls=() skips the network fetch of the public suffix list
    # Extraction is offline (no HTTP call per row).
    _tld_extract = tldextract.TLDExtract(suffix_list_urls=())
except ModuleNotFoundError:
    tldextract = None
    _tld_extract = None

from data_cleaning_pipeline import run_cleaning_pipeline

class FeatureEngineer:

    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()

        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(levelname)s - %(message)s"
        )

   
    # 1. DATA QUALITY LAYER
    
    def handle_missing_values(self):

        logging.info("Handling missing values...")

        num_cols = self.df.select_dtypes(include=[np.number]).columns
        self.df[num_cols] = self.df[num_cols].fillna(self.df[num_cols].median())

        cat_cols = self.df.select_dtypes(include=['object']).columns
        for col in cat_cols:
            self.df[col] = self.df[col].fillna(self.df[col].mode()[0])

        if "timestamp" in self.df.columns:
            self.df["timestamp"] = pd.to_datetime(self.df["timestamp"], errors="coerce")
            self.df["timestamp"] = self.df["timestamp"].ffill()

        return self.df

    def data_quality_score(self):

        missing_ratio = self.df.isnull().sum().sum() / (self.df.shape[0] * self.df.shape[1])

        score = 100 - (missing_ratio * 50)

        if (self.df.select_dtypes(include=[np.number]) < 0).any().any():
            score -= 10

        return max(score, 0)

   
    # 2. FEATURE ENGINEERING

    # URL Parser
    # Runs once per URL
    @staticmethod
    def _parse_url(url):
        if url is None or not isinstance(url, str) or url.strip() == "" \
                or url.strip().lower() in {"not_available", "nan", "none", "n/a"}:
            return None  # caller fills in default/missing feature values

        url = url.strip()
        parsed = urlparse(url if "://" in url else "http://" + url)
        host = (parsed.netloc.split(":")[0] if parsed.netloc else "") or ""

        if _tld_extract is not None:
            ext = _tld_extract(url)
            subdomain, domain, suffix = ext.subdomain, ext.domain, ext.suffix
        else:
            # Gets simple domains right but mis-splits two-part suffixes
            # like .co.uk / .com.au (would read "co" as the domain).
            labels = host.split(".")
            if len(labels) >= 3:
                subdomain, domain, suffix = labels[0], labels[-2], labels[-1]
            elif len(labels) == 2:
                subdomain, domain, suffix = "", labels[0], labels[1]
            else:
                subdomain, domain, suffix = "", host, ""

        try:
            is_ip = bool(host) and bool(ipaddress.ip_address(host))
        except ValueError:
            is_ip = False

        return {
            "scheme": parsed.scheme,
            "host": host,
            "subdomain": subdomain,
            "domain": domain,
            "suffix": suffix,
            "path": parsed.path or "",
            "query": parsed.query or "",
            "is_ip": is_ip,
            "has_port": parsed.port is not None if parsed.netloc else False,
        }

    # For missing/unparseable URLs. -1 is used instead of 0
    # This is because we can't use real NaN here
    # because validate() asserts no nulls anywhere in the dataframe.
    _MISSING = -1

    def create_url_features(self):
        # Parse each URL once; 
        parsed = self.df["url"].apply(self._parse_url)

        # Missing/placeholder URLs (None from _parse_url) get flagged here
        self.df["url_is_missing"] = parsed.isna().astype(int)

        # Length-based features
        self.df["url_length"] = np.where(
            self.df["url_is_missing"] == 1,
            self._MISSING,
            self.df["url"].fillna("").astype(str).str.len(),
        )
        self.df["hostname_length"] = parsed.apply(
            lambda p: len(p["host"]) if p else self._MISSING
        )
        self.df["path_length"] = parsed.apply(
            lambda p: len(p["path"]) if p else self._MISSING
        )

        # Character counts
        self.df["num_dots"] = np.where(
            self.df["url_is_missing"] == 1,
            self._MISSING,
            self.df["url"].fillna("").astype(str).str.count(r"\."),
        )
        self.df["num_hyphens"] = np.where(
            self.df["url_is_missing"] == 1,
            self._MISSING,
            self.df["url"].fillna("").astype(str).str.count("-"),
        )
        self.df["num_at_symbols"] = np.where(
            self.df["url_is_missing"] == 1,
            self._MISSING,
            self.df["url"].fillna("").astype(str).str.count("@"),
        )

        self.df["num_digits"] = np.where(
            self.df["url_is_missing"] == 1,
            self._MISSING,
            self.df["url"].fillna("").astype(str).str.count(r"\d"),
        )

        return self.df

    def create_hazard_features(self):
        self.df["disaster_severity_score"] = self.df["severity"] * 1.5
        self.df["event_intensity_index"] = self.df["severity"] * self.df["duration_hours"]
        self.df["hazard_normalized"] = self.df["severity"] / (self.df["severity"].max() + 1e-6)

        self.df["severity_change_rate"] = self.df["severity"].diff().fillna(0)
        self.df["hazard_trend_index"] = self.df["severity"].rolling(3, min_periods=1).mean()

        self.df["severity_volatility"] = self.df["severity"].rolling(3, min_periods=1).std().fillna(0)
        self.df["multi_event_overlap_flag"] = (self.df["severity"] > 7).astype(int)

        return self.df

    def create_cyber_features(self):

        self.df["cyber_incident_count"] = self.df["cyber_incidents"]

        max_val = self.df["cyber_incidents"].max() + 1e-6
        self.df["cyber_intensity_score"] = self.df["cyber_incidents"] / max_val

        self.df["scam_spike_rate"] = self.df["cyber_incidents"].diff().fillna(0)
        self.df["cyber_attack_frequency"] = self.df["cyber_incidents"].rolling(3, min_periods=1).count()

        self.df["cyber_growth_rate"] = self.df["cyber_incidents"].pct_change().fillna(0)

        self.df["cyber_volatility"] = self.df["cyber_incidents"].rolling(3, min_periods=1).std().fillna(0)

        self.df["incident_peak_flag"] = (
            self.df["cyber_incidents"] > self.df["cyber_incidents"].mean()
        ).astype(int)

        return self.df

    def create_temporal_features(self):

        self.df["timestamp"] = pd.to_datetime(self.df["timestamp"], errors="coerce")
        self.df = self.df.sort_values("timestamp")

        self.df["rolling_cyber_mean"] = self.df["cyber_incidents"].rolling(3, min_periods=1).mean()

        self.df["time_since_last_event"] = (
            self.df["timestamp"].diff().dt.total_seconds().fillna(0)
        )

        self.df["ema"] = self.df["cyber_incidents"].ewm(span=3, adjust=False).mean()

        self.df["lag_1"] = self.df["cyber_incidents"].shift(1).fillna(0)
        self.df["lag_2"] = self.df["cyber_incidents"].shift(2).fillna(0)

        self.df["time_decay_factor"] = np.exp(-0.1 * np.arange(len(self.df)))

        return self.df

    def create_geo_features(self):

        self.df["geo_risk_zone_score"] = np.where(
            self.df["severity"] > 7, 1,
            np.where(self.df["severity"] > 4, 0.5, 0.2)
        )

        self.df["location_encoded"] = self.df["location"].astype("category").cat.codes

        self.df["regional_event_count"] = self.df.groupby("location")["severity"].transform("count")

        return self.df

    def create_risk_features(self):

        self.df["combined_risk_index"] = (
            self.df["severity"] * self.df["cyber_incidents"]
        )

        self.df["adaptive_risk_index"] = (
            self.df["combined_risk_index"] /
            (self.df["rolling_cyber_mean"] + 1)
        )

        return self.df

    def create_anomaly_features(self):

        mean = self.df["cyber_incidents"].mean()
        std = self.df["cyber_incidents"].std() + 1e-6

        self.df["z_score"] = (self.df["cyber_incidents"] - mean) / std
        self.df["outlier_flag"] = (abs(self.df["z_score"]) > 2).astype(int)

        return self.df


    # 3. FEATURE MAPPING 
   
    def feature_mapping(self):

        return {
            "hazard_features": [c for c in self.df.columns if "severity" in c or "hazard" in c],
            "cyber_features": [c for c in self.df.columns if "cyber" in c or "incident" in c],
            "temporal_features": [
                "rolling_cyber_mean", "time_since_last_event",
                "ema", "lag_1", "lag_2", "time_decay_factor"
            ],
            "geo_features": [c for c in self.df.columns if "geo" in c or "location" in c],
            "risk_features": [c for c in self.df.columns if "risk" in c],
            "anomaly_features": [c for c in self.df.columns if "z_score" in c or "outlier" in c]
        }

 
    # 4. SCALABLE PROCESSING 
   
    def process_in_chunks(self, chunk_size=1000):

        chunks = []

        for i in range(0, len(self.df), chunk_size):
            chunk = self.df.iloc[i:i+chunk_size].copy()
            temp = FeatureEngineer(chunk).run()
            chunks.append(temp)

        self.df = pd.concat(chunks, ignore_index=True)

        return self.df

 
    # 5. VALIDATION ENGINE 

    def validate(self):

        logging.info("Running validation checks...")

        required_cols = ["severity", "cyber_incidents", "timestamp", "location"]

        missing = [c for c in required_cols if c not in self.df.columns]
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        quality = self.data_quality_score()
        print(f"\nData Quality Score: {quality:.2f}/100")

        assert not self.df.isnull().any().any(), "Null values detected"
        assert (self.df["severity"] >= 0).all(), "Negative severity detected"
        assert (self.df["cyber_incidents"] >= 0).all(), "Negative cyber incidents detected"
        if "hazard_normalized" in self.df.columns:
            assert ((self.df["hazard_normalized"] >= 0) & (self.df["hazard_normalized"] <= 1)).all(), \
                "hazard_normalized must be between 0 and 1"

        if "cyber_intensity_score" in self.df.columns:
            assert (self.df["cyber_intensity_score"] >= 0).all(), \
                "cyber_intensity_score must be non-negative"

        if "timestamp" in self.df.columns:
            assert not self.df["timestamp"].isnull().any(), \
                "timestamp contains null values after processing"

        

        logging.info(f"Validation passed. Shape: {self.df.shape}")

   
    # 6. SAVE OUTPUTS
   
    def save_outputs(self, mapping):
        base_dir = Path(__file__).resolve().parent
        self.df.to_csv(base_dir / "ai004_features_output.csv", index=False)
        with open(base_dir / "feature_mapping.json", "w", encoding="utf-8") as f:
            json.dump(mapping, f, indent=4)

  
    # 7. PIPELINE RUNNER
  
    def run(self):
        # 1. LOAD CONFIG
        config = {}
        config_path = Path(__file__).resolve().parent / "config.yaml"
        if yaml is not None and config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config = yaml.safe_load(f) or {}

          # 2. AI003 CLEANING STEP (MANDATORY)
        self.df, events = run_cleaning_pipeline(self.df, config)

          # 3. FEATURE ENGINEERING
        self.df = self.create_hazard_features()
        self.df = self.create_cyber_features()
        self.df = self.create_temporal_features()
        self.df = self.create_geo_features()
        self.df = self.create_risk_features()
        self.df = self.create_anomaly_features()
        self.df = self.create_url_features()

          # 4. VALIDATION
        self.validate()

          # 5. MAPPING
        mapping = self.feature_mapping()

         # 6. SAVE OUTPUTS
        self.save_outputs(mapping)

        print("\n PIPELINE COMPLETED SUCCESSFULLY")
        print({k: len(v) for k, v in mapping.items()})

        return self.df


# MAIN

if __name__ == "__main__":

    df = pd.DataFrame({
        "timestamp": ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"],
        "location": ["VIC", "VIC", "NSW", "VIC"],
        "severity": [3, 5, 8, 6],
        "duration_hours": [2, 4, 6, 3],
        "cyber_incidents": [10, 15, 30, 20],
        "url": [
            "https://www.google.com/search?q=test",
            "http://paypal-secure-login.verify-account.co.uk/login.php?id=8834",
            "https://bit.ly/3xF9kLp",
            "not_available",
        ],
    })

    fe = FeatureEngineer(df)
    result = fe.run()

    print(result.head())
