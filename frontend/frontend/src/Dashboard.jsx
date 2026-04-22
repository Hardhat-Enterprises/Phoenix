import React from "react";

const styles = {
  page: {
    padding: "24px",
    display: "flex",
    gap: "20px",
    width: "100%",
    boxSizing: "border-box",
  },

  leftColumn: {
    flex: 2,
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  rightColumn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "18px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    border: "1px solid #e8edf5",
  },

  title: {
    margin: "0 0 10px 0",
    fontSize: "16px",
    fontWeight: "700",
    color: "#11264d",
    textAlign: "left",
  },

  placeholder: {
    height: "180px",
    backgroundColor: "#eef3fb",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#5a6b85",
    fontSize: "16px",
    textAlign: "center",
  },

  addAlertCard: {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
    border: "1px solid #e6ecf5",
    display: "flex",
    flexDirection: "column",
    minHeight: "250px",
  },

  addAlertContent: {
    textAlign: "left",
  },

  addAlertTitle: {
    margin: "0 0 14px 0",
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f2a55",
    textAlign: "left",
    lineHeight: "1.4",
  },

  addAlertList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#4a5f7a",
    fontSize: "14px",
    lineHeight: "1.7",
    textAlign: "left",
  },

  addAlertListItem: {
    marginBottom: "10px",
  },

  addAlertButtonWrap: {
    marginTop: "auto",
    display: "flex",
    justifyContent: "flex-end",
    paddingTop: "18px",
  },

  addAlertButton: {
    backgroundColor: "#1f8fff",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 18px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },
};

export default function Dashboard() {
  return (
    <div style={styles.page}>
      <div style={styles.leftColumn}>
        <div style={styles.card}>
          <h3 style={styles.title}>Risk Trend</h3>
          <div style={styles.placeholder}>Chart Placeholder</div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.title}>Item List</h3>
          <div style={styles.placeholder}>Table Placeholder</div>
        </div>
      </div>

      <div style={styles.rightColumn}>
        <div style={styles.card}>
          <h3 style={styles.title}>Risk by Location</h3>
          <div style={styles.placeholder}>Map Placeholder</div>
        </div>

        <div style={styles.addAlertCard}>
          <div style={styles.addAlertContent}>
            <h3 style={styles.addAlertTitle}>Add Threat and Alert Source</h3>

            <ul style={styles.addAlertList}>
              <li style={styles.addAlertListItem}>
                Allow users to submit threat sources
              </li>
              <li style={styles.addAlertListItem}>
                Support both URL and file upload
              </li>
              <li style={styles.addAlertListItem}>
                Includes metadata for risk classification
              </li>
            </ul>
          </div>

          <div style={styles.addAlertButtonWrap}>
            <button
              style={styles.addAlertButton}
              onClick={() => {}}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#1677e6")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#1f8fff")
              }
            >
              Add Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}