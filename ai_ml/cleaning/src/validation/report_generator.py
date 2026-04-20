from collections import defaultdict


def generate_report(df, issues, dataset_name):
    issues_by_column = defaultdict(int)
    for issue in issues:
        issues_by_column[issue["column"]] += 1

    row_count = int(df.shape[0])
    report = {
        "dataset_name": dataset_name,
        "total_rows": row_count,
        "total_columns": int(df.shape[1]),
        "checks_run": 7,
        "total_issues": len(issues),
        "status": "PASS" if len(issues) == 0 else "FAIL",
        "issue_summary_by_column": dict(issues_by_column),
        "issues": issues,
        "error_rate": (len(issues) / row_count) if row_count else 0,
    }
    return report
