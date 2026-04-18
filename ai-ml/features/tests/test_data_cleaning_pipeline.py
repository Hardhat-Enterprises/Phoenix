import unittest
import pandas as pd
from pathlib import Path
import sys

CURRENT_DIR = Path(__file__).resolve().parent
FEATURES_DIR = CURRENT_DIR.parent
sys.path.append(str(FEATURES_DIR))

from data_cleaning_pipeline import (
    handle_type_conversion,
    handle_missing_values,
    handle_duplicates,
    handle_string_standardisation,
    run_cleaning_pipeline,
)


class TestDataCleaningPipeline(unittest.TestCase):
    def setUp(self):
        self.sample_df = pd.DataFrame({
            "severity": ["2", None, "6", "6"],
            "cyber_incidents": ["5", "10", None, None],
            "timestamp": [
                "2025-01-01 10:00:00",
                "2025-01-02 11:00:00",
                "2025-01-03 12:00:00",
                "2025-01-03 12:00:00"
            ],
            "location": [" melbourne ", "SYDNEY", "brisbane", "brisbane"]
        })

        self.config = {
            "type_conversion": {
                "int": ["severity", "cyber_incidents"],
                "datetime": ["timestamp"]
            },
            "missing_values": {
                "drop": [],
                "fill": {
                    "severity": 0,
                    "cyber_incidents": 0
                }
            },
            "duplicates": {
                "subset": ["timestamp", "location"]
            },
            "string_standardisation": {
                "columns": ["location"],
                "case": "title"
            }
        }

    def test_type_conversion(self):
        events = []
        cleaned = handle_type_conversion(
            self.sample_df.copy(),
            self.config["type_conversion"],
            events
        )
        self.assertTrue(pd.api.types.is_numeric_dtype(cleaned["severity"]))
        self.assertTrue(pd.api.types.is_numeric_dtype(cleaned["cyber_incidents"]))
        self.assertTrue(pd.api.types.is_datetime64_any_dtype(cleaned["timestamp"]))

    def test_missing_values_handled(self):
        events = []
        cleaned = handle_missing_values(
            self.sample_df.copy(),
            self.config["missing_values"],
            events
        )
        self.assertFalse(cleaned["severity"].isnull().any())
        self.assertFalse(cleaned["cyber_incidents"].isnull().any())

    def test_duplicates_removed(self):
        events = []
        converted = handle_type_conversion(
            self.sample_df.copy(),
            self.config["type_conversion"],
            events
        )
        cleaned = handle_duplicates(
            converted,
            self.config["duplicates"],
            events
        )
        self.assertLess(len(cleaned), len(converted))

    def test_string_standardisation(self):
        events = []
        cleaned = handle_string_standardisation(
            self.sample_df.copy(),
            self.config["string_standardisation"],
            events
        )
        self.assertIn("Melbourne", cleaned["location"].values)
        self.assertIn("Sydney", cleaned["location"].values)

    def test_run_cleaning_pipeline(self):
        cleaned, events = run_cleaning_pipeline(self.sample_df.copy(), self.config)
        self.assertIsInstance(cleaned, pd.DataFrame)
        self.assertIsInstance(events, list)
        self.assertTrue(pd.api.types.is_datetime64_any_dtype(cleaned["timestamp"]))
        self.assertFalse(cleaned["severity"].isnull().any())


if __name__ == "__main__":
    unittest.main()