import React from "react";

export default function LoginForm() {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Alert Information</h1>

      <div style={styles.card}>
        <p><strong>Alert Type:</strong> Phishing Attempt</p>
        <p><strong>Severity:</strong> High</p>
        <p><strong>Status:</strong> Active</p>
        <p><strong>Detected:</strong> 12 May 2026 - 10:30 AM</p>
        <p><strong>Source:</strong> Suspicious Email Link</p>

        <h2 style={styles.descriptionTitle}>Description</h2>

        <p style={styles.description}>
          This alert provides detailed information about a detected cyber threat.
          Placeholder data is being used for now until backend integration is added.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f4f4f4",
    padding: "20px",
  },
  heading: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "20px",
    color: "#000",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  descriptionTitle: {
    fontSize: "20px",
    marginTop: "20px",
  },
  description: {
    fontSize: "16px",
    lineHeight: "24px",
    color: "#555",
  },
};