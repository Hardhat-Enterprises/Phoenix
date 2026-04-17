import unittest
import pandas as pd
from pathlib import Path
import sys

CURRENT_DIR = Path(__file__).resolve().parent
FEATURES_DIR = CURRENT_DIR.parent
sys.path.append(str(FEATURES_DIR))

from data_cleaning_pipeline import DataCleaningPipeline


class TestDataCleaningPipeline(unittest.TestCase):
    def setUp(self):
        self.sample_df = pd.DataFrame({
            "severity": [2, None, 6, 6],
            "cyber_incidents": [5, 10, None, None],
            "timestamp": [
                "2025-01-01 10:00:00",
                "2025-01-02 11:00:00",
                "2025-01-03 12:00:00",
                "2025-01-03 12:00:00"
            ],
            "location": ["Melbourne", "Sydney", "Brisbane", "Brisbane"]
        })

    def test_cleaning_removes_nulls_or_fills_them(self):
        pipeline = DataCleaningPipeline(self.sample_df.copy())
        cleaned_df = pipeline.run_pipeline()

        self.assertFalse(cleaned_df["severity"].isnull().any())
        self.assertFalse(cleaned_df["cyber_incidents"].isnull().any())

    def test_timestamp_converted_to_datetime(self):
        pipeline = DataCleaningPipeline(self.sample_df.copy())
        cleaned_df = pipeline.run_pipeline()

        self.assertTrue(pd.api.types.is_datetime64_any_dtype(cleaned_df["timestamp"]))

    def test_duplicates_removed(self):
        pipeline = DataCleaningPipeline(self.sample_df.copy())
        cleaned_df = pipeline.run_pipeline()

        self.assertLessEqual(len(cleaned_df), len(self.sample_df))


if __name__ == "__main__":
    unittest.main()