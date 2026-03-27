from collections import defaultdict


def generate_report(df, issues, dataset_name):
    issues_by_column = defaultdict(int)

    for issue in issues:
        issues_by_column[issue["column"]] += 1

    report = {
        "dataset_name": dataset_name,
        "total_rows": int(df.shape[0]),
        "total_columns": int(df.shape[1]),
        "checks_run": 6,
        "total_issues": len(issues),
        "status": "PASS" if len(issues) == 0 else "FAIL",
        "issue_summary_by_column": dict(issues_by_column),
        "issues": issues,
        "error_rate": len(issues) / df.shape[0]
    }

    return report