import React from "react";

const styles = {
  page: {
    padding: "24px",
    width: "100%",
    boxSizing: "border-box",
  },

  heading: {
    margin: "0 0 8px 0",
    fontSize: "28px",
    fontWeight: "800",
    color: "#10264d",
  },

  subtitle: {
    margin: "0 0 18px 0",
    fontSize: "14px",
    color: "#6b7c93",
    lineHeight: "1.5",
  },

  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },

  overviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    padding: "16px 18px",
    border: "1px solid #dbe6f3",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    minHeight: "120px",
    textAlign: "left",
  },

  overviewLabel: {
    margin: "0 0 8px 0",
    fontSize: "13px",
    fontWeight: "700",
    color: "#4c5f7a",
  },

  overviewValue: {
    margin: "0 0 8px 0",
    fontSize: "24px",
    fontWeight: "800",
    color: "#10264d",
  },

  overviewText: {
    margin: 0,
    fontSize: "12px",
    lineHeight: "1.5",
    color: "#6b7c93",
  },

  statusBadge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    backgroundColor: "#fff1c7",
    color: "#8a5a00",
    fontSize: "12px",
    fontWeight: "700",
    marginBottom: "10px",
  },
};

const overviewCards = [
  {
    label: "Links Checked Today",
    value: "38",
    description: "Reviewed through analyst and automated verification flow",
  },
  {
    label: "Flagged as Malicious",
    value: "11",
    description:
      "Containing phishing, fake donations, or misleading emergency content",
  },
  {
    label: "Current Verification Status",
    value: "Review In Progress",
    description: "Latest input waiting for stakeholder export",
    isStatus: true,
  },
  {
    label: "Reports Generated",
    value: "14",
    description: "Available for download and audit reference",
  },
];

export default function Reports() {
  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Reports</h1>

      <p style={styles.subtitle}>
        Verify suspicious links, assess cyber risk indicators, and generate a
        stakeholder-ready report for disaster-related communications.
      </p>

      <div style={styles.overviewGrid}>
        {overviewCards.map((card) => (
          <div key={card.label} style={styles.overviewCard}>
            <p style={styles.overviewLabel}>{card.label}</p>

            {card.isStatus ? (
              <span style={styles.statusBadge}>{card.value}</span>
            ) : (
              <h2 style={styles.overviewValue}>{card.value}</h2>
            )}

            <p style={styles.overviewText}>{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}