"""Command-line entry point for the M7 Week 2 acceptance run."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from m7_pipeline import run_training_and_verification


def main() -> None:
    parser = argparse.ArgumentParser(description="Train, package, reload and verify the M7 baseline")
    parser.add_argument("--repo-root", required=True, help="Absolute PHOENIX repository path")
    parser.add_argument("--config", default=str(Path(__file__).with_name("config.json")))
    parser.add_argument("--bundle-path")
    parser.add_argument("--report-path")
    args = parser.parse_args()

    report = run_training_and_verification(
        repo_root=args.repo_root,
        config_path=args.config,
        bundle_path=args.bundle_path,
        report_path=args.report_path,
    )
    summary = {
        "status": report["status"],
        "model_version": report["model_version"],
        "split_rows": report["split_rows"],
        "group_overlap_counts": report["leakage_controls"]["group_overlap_counts"],
        "validation_accuracy": report["metrics"]["validation"]["accuracy"],
        "test_accuracy": report["metrics"]["test"]["accuracy"],
        "round_trip_passed": report["round_trip_verification"]["passed"],
        "package_sha256": report["package"]["sha256"],
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
