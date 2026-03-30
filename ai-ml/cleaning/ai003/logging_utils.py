from datetime import datetime


def log_message(step: str, details: str) -> str:
    timestamp = datetime.now().isoformat()
    return f"[{timestamp}] {step}: {details}"


def log_rows_removed(count: int) -> str:
    return log_message("remove_duplicates", f"rows_removed={count}")


def log_nulls_found(count: int) -> str:
    return log_message("missing_values", f"null_values_found={count}")


def log_other_transformations(details: str) -> str:
    return log_message("transformation", details)