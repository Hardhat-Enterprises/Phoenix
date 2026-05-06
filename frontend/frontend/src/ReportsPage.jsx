import "./ReportsPage.css";

// This page is for my assigned report task.
// My part is the Generated Verification Reports section with placeholder report data.

function ReportsPage() {
  const reports = [
    {
      title: "Emergency Donation Scam Report",
      description: "Fake disaster donation link verification summary",
      linkType: "Donation URL",
      risk: "High",
      status: "Escalated",
      date: "12 Apr 2026",
    },
    {
      title: "SMS Evacuation Link Review",
      description: "Phishy text message link linked to false emergency update",
      linkType: "SMS Link",
      risk: "Critical",
      status: "Flagged",
      date: "11 Apr 2026",
    },
    {
      title: "Social Media Update Verification",
      description: "Suspicious post linking to unverified bushfire update portal",
      linkType: "Social Media",
      risk: "Medium",
      status: "Monitored",
      date: "10 Apr 2026",
    },
    {
      title: "Flood Relief Portal Check",
      description: "Manual review of a flood-related support and login page",
      linkType: "Web Form",
      risk: "Low",
      status: "Verified Safe",
      date: "09 Apr 2026",
    },
  ];

  return (
    <main className="reports-content">
      <section className="generated-reports-card">
        <div className="generated-reports-header">
          <div>
            <h2>Generated Verification Reports</h2>
            <p>
              Previously reviewed suspicious links with downloadable verification report outputs
            </p>
          </div>
        </div>

        <div className="reports-table">
          <div className="reports-table-head">
            <span>Report</span>
            <span>Link Type</span>
            <span>Risk</span>
            <span>Status</span>
            <span>Date</span>
            <span>Action</span>
          </div>

          {reports.map((report) => (
            <div className="reports-row" key={report.title}>
              <div className="report-title-cell">
                <strong>{report.title}</strong>
                <small>{report.description}</small>
              </div>

              <span>{report.linkType}</span>

              <span className={`risk-badge ${report.risk.toLowerCase()}`}>
                {report.risk}
              </span>

              <span>{report.status}</span>
              <span>{report.date}</span>

              <button type="button" className="download-button">
                Download
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ReportsPage;