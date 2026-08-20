import random
from datetime import datetime, timedelta
import json
import csv
import os


def random_timestamp(start_date: datetime, days: int) -> datetime:
    """
    Generate a random timestamp within the given number of days from start_date.
    """
    delta_minutes = random.randint(0, days * 24 * 60)
    return start_date + timedelta(minutes=delta_minutes)


def ensure_parent_dir(path: str) -> None:
    """
    Create parent directories if they do not exist.
    """
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def export_to_csv(records: list, path: str) -> None:
    """
    Export records to a CSV file.
    """
    ensure_parent_dir(path)

    if not records:
        return

    with open(path, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)


def export_to_json(records: list, path: str) -> None:
    """
    Export records to a JSON file.
    """
    ensure_parent_dir(path)

    with open(path, mode="w", encoding="utf-8") as file:
        json.dump(records, file, indent=2)