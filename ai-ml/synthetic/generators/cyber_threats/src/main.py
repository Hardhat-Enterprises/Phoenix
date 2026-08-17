from src.generator import generate_cyber_events
from src.utils import export_to_csv, export_to_json


def main() -> None:
    total_events = 800
    days = 7

    records = generate_cyber_events(
        total_events=total_events,
        days=days,
    )

    export_to_csv(records, "data/sample_output.csv")
    export_to_json(records, "data/sample_output.json")

    print(f"Generated {len(records)} synthetic cyber threat events.")
    print("Files saved to data/sample_output.csv and data/sample_output.json")


if __name__ == "__main__":
    main()