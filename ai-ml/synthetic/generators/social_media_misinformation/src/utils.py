from __future__ import annotations

import csv
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_json(path: Path, records: list[dict]) -> None:
    with path.open('w', encoding='utf-8') as f:
        json.dump(records, f, indent=2)


def save_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    with path.open('w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def iso_z(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def random_time(rng, start_year: int = 2026) -> datetime:
    base = datetime(start_year, 1, 1, tzinfo=timezone.utc)
    return base + timedelta(days=rng.randint(0, 180), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
