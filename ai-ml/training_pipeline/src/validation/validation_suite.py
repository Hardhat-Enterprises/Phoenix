from pathlib import Path
import json


class ValidationSuite:

    def validate_dataset(self, df):
        required_columns = ["text", "choose_one"]

        for col in required_columns:
            assert col in df.columns, f"Missing required column: {col}"

        assert len(df) > 0, "Dataset is empty"
        assert df["text"].notna().sum() > 0, "Text column has no valid values"

        print("Dataset validation passed")

    def validate_filtered_dataset(self, df):
        assert len(df) > 0, "Filtered dataset is empty"
        assert df["choose_one"].isin(["Relevant", "Not Relevant"]).all(), "Unexpected labels found"

        print("Filtered dataset validation passed")

    def validate_predictions(self, preds):
        assert len(preds) > 0, "Predictions are empty"
        assert set(preds).issubset({0, 1}), "Predictions contain invalid values"

        print("Prediction validation passed")

    def validate_metrics(self, accuracy, f1):
        assert 0 <= accuracy <= 1, "Accuracy out of range"
        assert 0 <= f1 <= 1, "F1 score out of range"

        print("Metric validation passed")

    def validate_tracker_output(self, run_dir):
        metadata_file = Path(run_dir) / "metadata.json"

        assert metadata_file.exists(), "metadata.json was not created"

        with open(metadata_file, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        required_keys = [
            "run_id",
            "experiment_name",
            "model_name",
            "model_version",
            "dataset_name",
            "dataset_version",
            "parameters",
            "metrics",
            "artifacts",
            "status"
        ]

        for key in required_keys:
            assert key in metadata, f"Missing metadata key: {key}"

        assert metadata["status"] == "completed", "Run status is not completed"

        print("Tracker output validation passed")
        return metadata