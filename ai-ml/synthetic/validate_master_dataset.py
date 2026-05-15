"""
validate_master_dataset.py  —  AI005 Quick Validation

Re-validates master_ai005_dataset.csv after the fact.
Exits non-zero if any required fields are null, duplicates exist,
or cyber rows are missing their parent link.
"""

import sys
from pathlib import Path
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"

REQUIRED = ["hazard_event_id", "integration_id", "source_record_id",
            "source_dataset", "source_system", "threat_stream", "event_type"]


def main() -> None:
    path = DATA_DIR / "master_ai005_dataset.csv"
    if not path.exists():
        sys.exit(f"ERROR: {path} not found")

    df = pd.read_csv(path)

    errors = []

    for field in REQUIRED:
        n = df[field].isna().sum()
        if n:
            errors.append(f"'{field}' has {n} null(s)")

    dups = df.duplicated(subset=["hazard_event_id", "source_record_id"]).sum()
    if dups:
        errors.append(f"{dups} duplicate (hazard_event_id, source_record_id) pairs")

    cyber = df[df["threat_stream"] == "cyber"]
    missing_parent = cyber["parent_hazard_event_id"].isna().sum()
    if missing_parent:
        errors.append(f"{missing_parent} cyber rows missing parent_hazard_event_id")

    unexpected_streams = set(df["threat_stream"].dropna()) - {"cyber", "misinformation"}
    if unexpected_streams:
        errors.append(f"unexpected threat_stream values: {unexpected_streams}")

    print(f"Rows: {len(df)}  |  Streams: {df['threat_stream'].value_counts().to_dict()}")
    print(f"Nulls in required fields: {sum(df[f].isna().sum() for f in REQUIRED)}")

    if errors:
        print("\n[FAILED]")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    print("[PASSED]")


if __name__ == "__main__":
    main()
