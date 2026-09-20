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
            "duration_hours": [6, 8, 10, 12],
            "url": [
                "https://www.google.com/search?q=test",
                "http://paypal-secure-login.verify-account.co.uk/login.php?id=8834",
                "not_available",
                "https://bit.ly/3xF9kLp",
            ]
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
            "cyber_incident_count",
            "cyber_intensity_score",
            "scam_spike_rate"
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

    def test_temporal_features_created(self):
        self.engineer.create_temporal_features()
        expected_columns = [
            "rolling_cyber_mean",
            "time_since_last_event",
            "ema",
            "lag_1",
            "lag_2",
            "time_decay_factor"
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

    def test_geo_features_created(self):
        self.engineer.create_geo_features()
        expected_columns = [
            "geo_risk_zone_score",
            "location_encoded",
            "regional_event_count"
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

    def test_risk_features_created(self):
        self.engineer.create_temporal_features()
        self.engineer.create_risk_features()
        expected_columns = [
            "combined_risk_index",
            "adaptive_risk_index"
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

    def test_anomaly_features_created(self):
        self.engineer.create_anomaly_features()
        expected_columns = [
            "z_score",
            "outlier_flag"
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

    def test_url_features_created(self):
        self.engineer.create_url_features()
        expected_columns = [
            "url_is_missing",
            "url_length",
            "hostname_length",
            "path_length",
            "num_dots",
            "num_hyphens",
            "num_at_symbols",
            "num_digits",
        ]
        for col in expected_columns:
            self.assertIn(col, self.engineer.df.columns)

        # Row 2 ("not_available") should be flagged missing, with every
        # numeric URL feature set to -1, not 0 or NaN
        result = self.engineer.df
        self.assertEqual(result.loc[2, "url_is_missing"], 1)
        self.assertEqual(result.loc[2, "url_length"], -1)
        self.assertEqual(result.loc[2, "hostname_length"], -1)
        self.assertEqual(result.loc[2, "num_dots"], -1)
        self.assertEqual(result.loc[2, "num_at_symbols"], -1)
        self.assertEqual(result.loc[2, "num_digits"], -1)

        # A real URL (row 0) should not be flagged missing and should have feature values
        self.assertEqual(result.loc[0, "url_is_missing"], 0)
        self.assertGreater(result.loc[0, "url_length"], 0)
        self.assertEqual(result.loc[0, "num_dots"], 2)  # www.google.com
        self.assertEqual(result.loc[0, "num_at_symbols"], 0)
        self.assertEqual(result.loc[0, "num_digits"], 0)

        # Row 1 has a numeric query param (id=8834), 4 digits, no '@'
        self.assertEqual(result.loc[1, "num_digits"], 4)
        self.assertEqual(result.loc[1, "num_at_symbols"], 0)

    def test_validate_passes_for_valid_data(self):
        self.engineer.handle_missing_values()
        self.engineer.validate()

    def test_validate_fails_for_negative_severity(self):
        bad_df = self.sample_df.copy()
        bad_df.loc[0, "severity"] = -1
        engineer = FeatureEngineer(bad_df)
        engineer.handle_missing_values()
        with self.assertRaises(AssertionError):
            engineer.validate()

    def test_validate_fails_for_missing_required_column(self):
        bad_df = self.sample_df.drop(columns=["location"])
        engineer = FeatureEngineer(bad_df)
        with self.assertRaises(ValueError):
            engineer.validate()


if __name__ == "__main__":
    unittest.main()