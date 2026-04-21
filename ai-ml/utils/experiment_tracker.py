from pathlib import Path
from datetime import datetime
import json
import uuid
import os
import csv


class ExperimentTracker:
    def __init__(self, base_dir="Sample Records/experiments"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.run_dir = None
        self.run_id = None
        self.metadata = {}

    def _get_git_commit_hash(self):
        try:
            import subprocess
            commit_hash = subprocess.check_output(
                ["git", "rev-parse", "--short", "HEAD"],
                stderr=subprocess.DEVNULL
            ).decode("utf-8").strip()
            return commit_hash
        except Exception:
            return "unknown"

    def start_run(self, experiment_name, model_name, dataset_name, parameters=None, version="v1"):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_suffix = str(uuid.uuid4())[:8]
        self.run_id = f"{experiment_name}_{timestamp}_{unique_suffix}"

        self.run_dir = self.base_dir / self.run_id
        self.run_dir.mkdir(parents=True, exist_ok=True)

        self.metadata = {
            "run_id": self.run_id,
            "experiment_name": experiment_name,
            "model_name": model_name,
            "dataset_name": dataset_name,
            "version": version,
            "timestamp": timestamp,
            "git_commit_hash": self._get_git_commit_hash(),
            "parameters": parameters or {},
            "metrics": {},
            "artifacts": [],
            "status": "started"
        }

        self._save_json("metadata.json", self.metadata)
        return self.run_id

    def log_parameters(self, parameters):
        self.metadata["parameters"] = parameters
        self._save_json("metadata.json", self.metadata)

    def log_metrics(self, metrics):
        self.metadata["metrics"] = metrics
        self._save_json("metadata.json", self.metadata)

    def log_artifact(self, artifact_path):
        self.metadata["artifacts"].append(str(artifact_path))
        self._save_json("metadata.json", self.metadata)

    def end_run(self, status="completed"):
        self.metadata["status"] = status
        self._save_json("metadata.json", self.metadata)
        self._update_summary_csv()

    def _save_json(self, filename, data):
        file_path = self.run_dir / filename
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)

    def _update_summary_csv(self):
        summary_file = self.base_dir / "experiment_summary.csv"
        file_exists = summary_file.exists()

        row = {
            "run_id": self.metadata.get("run_id"),
            "experiment_name": self.metadata.get("experiment_name"),
            "model_name": self.metadata.get("model_name"),
            "dataset_name": self.metadata.get("dataset_name"),
            "version": self.metadata.get("version"),
            "timestamp": self.metadata.get("timestamp"),
            "git_commit_hash": self.metadata.get("git_commit_hash"),
            "status": self.metadata.get("status"),
            "metrics": json.dumps(self.metadata.get("metrics", {})),
            "parameters": json.dumps(self.metadata.get("parameters", {}))
        }

        with open(summary_file, "a", newline="", encoding="utf-8") as csvfile:
            fieldnames = [
                "run_id",
                "experiment_name",
                "model_name",
                "dataset_name",
                "version",
                "timestamp",
                "git_commit_hash",
                "status",
                "metrics",
                "parameters"
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

            if not file_exists:
                writer.writeheader()

            writer.writerow(row)


if __name__ == "__main__":
    tracker = ExperimentTracker()

    run_id = tracker.start_run(
        experiment_name="disaster_tweet_classifier",
        model_name="logistic_regression",
        dataset_name="disasters_on_social_media",
        parameters={
            "max_iter": 200,
            "test_size": 0.2,
            "random_state": 42
        },
        version="v1"
    )

    tracker.log_metrics({
        "accuracy": 0.87,
        "f1_score": 0.85
    })

    tracker.log_artifact("models/disaster_model.pkl")
    tracker.end_run(status="completed")

    print(f"Experiment run saved successfully: {run_id}")