from __future__ import annotations

import copy
from pathlib import Path
import sys
import tempfile
import unittest

import pandas as pd


PACKAGE_PARENT = Path(__file__).resolve().parents[2]
if str(PACKAGE_PARENT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_PARENT))

from m7_pipeline.pipeline import (  # noqa: E402
    ConfigurationError,
    load_bundle,
    load_config,
    predict_one,
    run_training_and_verification,
    split_before_preprocessing,
    validate_config,
)


class M7PipelineTests(unittest.TestCase):
    def setUp(self):
        self.config = load_config(PACKAGE_PARENT / "m7_pipeline" / "config.json")

    def test_target_and_proxy_features_fail_closed(self):
        for forbidden in ("hazard_severity", "alert_level", "duration_hours"):
            with self.subTest(forbidden=forbidden):
                config = copy.deepcopy(self.config)
                config["feature_columns"].append(forbidden)
                with self.assertRaisesRegex(ConfigurationError, "prohibited"):
                    validate_config(config)

    def test_group_split_has_no_duplicate_selected_text_leakage(self):
        rows = []
        labels = ["low", "medium", "high", "critical"]
        for group_number in range(40):
            for label in labels:
                rows.append(
                    {
                        "text": f"message group {group_number}",
                        "url": f"https://example.test/shared-{group_number % 10}",
                        "hazard_type": "flood",
                        "hazard_location": "Victoria",
                        "hazard_status": "active",
                        "source": "test",
                        "hazard_severity": label,
                    }
                )
        frame = pd.DataFrame(rows)
        splits = split_before_preprocessing(frame, self.config)
        train = set(splits.train["text"])
        validation = set(splits.validation["text"])
        test = set(splits.test["text"])
        self.assertFalse(train & validation)
        self.assertFalse(train & test)
        self.assertFalse(validation & test)

        # URL is excluded because this dataset cannot provide URL-disjoint holdout sets.
        self.assertNotIn("url", self.config["feature_columns"])

    def test_package_round_trip_reproduces_prediction(self):
        rows = []
        labels = ["low", "medium", "high", "critical"]
        for group_number in range(48):
            for label in labels:
                rows.append(
                    {
                        "text": f"{label} test message group {group_number}",
                        "url": f"https://{label}.example/{group_number}",
                        "hazard_type": ["flood", "wildfire", "storm", "earthquake"][labels.index(label)],
                        "hazard_location": "Victoria",
                        "hazard_status": "active",
                        "source": "unit-test",
                        "hazard_severity": label,
                    }
                )

        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            dataset_path = temp / "dataset.csv"
            bundle_path = temp / "bundle.joblib"
            report_path = temp / "report.json"
            pd.DataFrame(rows).to_csv(dataset_path, index=False)

            config = copy.deepcopy(self.config)
            config["dataset_path"] = str(dataset_path)
            config["model"]["n_estimators"] = 8
            config["outputs"]["bundle_path"] = str(bundle_path)
            config["outputs"]["report_path"] = str(report_path)
            config_path = temp / "config.json"
            config_path.write_text(__import__("json").dumps(config), encoding="utf-8")

            report = run_training_and_verification(temp, config_path)
            self.assertTrue(report["round_trip_verification"]["passed"])
            self.assertEqual(report["leakage_controls"]["group_overlap_counts"], {
                "train_validation": 0,
                "train_test": 0,
                "validation_test": 0,
            })
            bundle = load_bundle(bundle_path)
            prediction = predict_one(bundle, report["round_trip_verification"]["sample_input"])
            self.assertIn(prediction["predicted_label"], labels)
            self.assertFalse(prediction["production_eligible"])


if __name__ == "__main__":
    unittest.main()
