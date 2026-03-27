import json
import os

from validation import run_validation


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    data_path = os.path.join(base_dir, "data", "dummy_input_bad.csv")
    rules_path = os.path.join(base_dir, "config", "validation_rules.json")
    output_path = os.path.join(base_dir, "output", "validation_report_bad.json")

    report = run_validation(data_path, rules_path)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(report, file, indent=4)

    print("Validation complete")
    print(f"Rows checked: {report['total_rows']}")
    print(f"Issues found: {report['total_issues']}")
    print(f"Status: {report['status']}")
    print(f"Report saved to: {output_path}")


if __name__ == "__main__":
    main()