import unittest
import pandas as pd
from pathlib import Path
import sys

CURRENT_DIR = Path(__file__).resolve().parent
FEATURES_DIR = CURRENT_DIR.parent
sys.path.append(str(FEATURES_DIR))

from feature_engineer import FeatureEngineer


class TestFeatureEngineer(unittest.TestCase):
    def setUp(self):
        self.sample_df = pd.DataFrame({
            "severity": [2, 4, 6, 8],
            "cyber_incidents": [5, 10, 15, 20],
            "timestamp": pd.to_datetime([
                "2025-01-01 10:00:00",
                "2025-01-02 11:00:00",
                "2025-01-03 12:00:00",
                "2025-01-04 13:00:00"
            ]),
            "location": ["Melbourne", "Sydney", "Brisbane", "Perth"],
            "duration_hours": [6, 8, 10, 12]
        })
        self.engineer = FeatureEngineer(self.sample_df.copy())

    def test_hazard_features_created(self):
        self.engineer.create_hazard_features()
        expected_columns = [
            "disaster_severity_score",
            "event_intensity_index",
            "hazard_normalized"
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

    def test_cyber_features_created(self):
        self.engineer.create_cyber_features()
        expected_columns = [
            "cyber_intensity_score",
            "scam_spike_rate"
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

    def test_temporal_features_created(self):
        self.engineer.create_temporal_features()
        expected_columns = [
            "hour_of_day",
            "day_of_week",
            "rolling_cyber_mean",
            "lag_1",
            "lag_2"
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

    def test_geo_features_created(self):
        self.engineer.create_geo_features()
        expected_columns = [
            "geo_risk_zone_score",
            "location_frequency"
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

    def test_risk_features_created(self):
        self.engineer.create_hazard_features()
        self.engineer.create_cyber_features()
        self.engineer.create_risk_features()
        expected_columns = [
            "combined_risk_index",
            "adaptive_risk_index"
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

    def test_anomaly_features_created(self):
        self.engineer.create_cyber_features()
        self.engineer.create_anomaly_features()
        expected_columns = [
            "z_score",
            "outlier_flag"
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

    def test_validate_passes_for_valid_data(self):
        self.engineer.run_full_pipeline()
        result = self.engineer.validate()
        self.assertTrue(result)

    def test_validate_fails_for_negative_severity(self):
        bad_df = self.sample_df.copy()
        bad_df.loc[0, "severity"] = -1
        engineer = FeatureEngineer(bad_df)
        engineer.run_full_pipeline()
        with self.assertRaises(ValueError):
            engineer.validate()

    def test_validate_fails_for_missing_required_column(self):
        bad_df = self.sample_df.drop(columns=["location"])
        engineer = FeatureEngineer(bad_df)
        with self.assertRaises(ValueError):
            engineer.validate()


if __name__ == "__main__":
    unittest.main()