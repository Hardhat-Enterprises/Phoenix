import React from "react";

const styles = {
  page: {
    width: "100%",
    boxSizing: "border-box",
  },

  contentArea: {
    padding: "24px",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    marginBottom: "22px",
    border: "1px solid #e8edf5",
  },

  cardTitle: {
    margin: "0 0 14px 0",
    textAlign: "left",
    fontSize: "18px",
    fontWeight: "800",
    color: "#11264d",
  },

  phoenixBanner: {
    width: "100%",
    height: "220px",
    borderRadius: "16px",
    objectFit: "cover",
    display: "block",
    marginBottom: "14px",
    backgroundColor: "#0d2e5c",
  },

  bodyText: {
    margin: 0,
    color: "#4b5d7a",
    fontSize: "14px",
    lineHeight: "1.7",
  },

  purposeRow: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
  },

  purposeIcon: {
    width: "120px",
    height: "90px",
    borderRadius: "14px",
    objectFit: "cover",
    backgroundColor: "#eef3fb",
    border: "1px solid #dde6f3",
    flexShrink: 0,
  },

  purposeContent: {
    flex: 1,
    minWidth: "250px",
  },

  purposeHeading: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    fontWeight: "800",
    color: "#11264d",
  },
};

export default function AboutUs() {
  return (
    <div style={styles.page}>
      <div style={styles.contentArea}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>What is PHOENIX?</h2>

          <img
            src="https://placehold.co/1200x320/0b2d5c/ffffff?text=PHOENIX+Banner+Placeholder"
            alt="Phoenix placeholder banner"
            style={styles.phoenixBanner}
          />

          <p style={styles.bodyText}>
            PHOENIX is a dashboard designed to support disaster management
            stakeholders by bringing together hazard monitoring, cyber threat
            visibility, and decision-support information in one place. It is
            intended to improve awareness, communication, and timely response
            during critical situations.
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>System Purpose</h2>

          <div style={styles.purposeRow}>
            <img
              src="https://placehold.co/240x180/f1f5fb/10254d?text=Purpose"
              alt="System purpose placeholder"
              style={styles.purposeIcon}
            />

            <div style={styles.purposeContent}>
              <h3 style={styles.purposeHeading}>Improving Awareness</h3>
              <p style={styles.bodyText}>
                The purpose of PHOENIX is to improve awareness of both physical
                and digital risks during disaster events. The system provides
                clear and accessible information that helps users monitor
                hazards, understand cyber-related threats, and support better
                response planning.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}