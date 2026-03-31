import argparse
from pathlib import Path

if __package__ is None or __package__ == "":
    import sys

    script_dir = Path(__file__).resolve().parent
    project_root = Path(__file__).resolve().parent.parent
    if str(script_dir) in sys.path:
        sys.path.remove(str(script_dir))
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    from src.pipeline import run_pipeline
else:
    from .pipeline import run_pipeline


def main():
    parser = argparse.ArgumentParser(description="Run unified cleaning pipeline")
    parser.add_argument(
        "--config",
        default=str(Path(__file__).resolve().parent.parent / "config" / "pipeline_config.json"),
        help="Path to pipeline config JSON",
    )
    args = parser.parse_args()

    summary = run_pipeline(args.config)
    print("Pipeline complete")
    print(f"Rows: {summary['input_rows']} -> {summary['output_rows']}")
    print(f"Validation: {summary['status']} ({summary['issues_found']} issues)")
    print(f"Cleaned CSV: {summary['outputs']['cleaned_csv']}")
    print(f"Validation report: {summary['outputs']['validation_report']}")
    print(f"Comparison report: {summary['outputs']['comparison_report']}")
    print(f"Pipeline log: {summary['outputs']['pipeline_log']}")


if __name__ == "__main__":
    main()
