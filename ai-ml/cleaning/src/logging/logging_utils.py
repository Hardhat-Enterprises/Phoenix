from datetime import datetime
from pathlib import Path
from typing import Iterable


def log_message(step: str, details: str) -> str:
    timestamp = datetime.now().isoformat()
    return f"[{timestamp}] {step}: {details}"


def log_rows_removed(count: int) -> str:
    return log_message("remove_duplicates", f"rows_removed={count}")


def log_nulls_found(count: int) -> str:
    return log_message("missing_values", f"null_values_found={count}")


def log_other_transformations(details: str) -> str:
    return log_message("transformation", details)


def format_events(events: Iterable[dict]) -> list[str]:
    lines = []
    for event in events:
        lines.append(log_message(event["step"], event["details"]))
    return lines


def write_log_file(events: Iterable[dict], output_path: str) -> None:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = format_events(events)
    path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
