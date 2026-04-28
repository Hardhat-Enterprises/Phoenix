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


        {/* ── GOUTHAM'S SECTION: Who Uses This System + Footer ── */}

        {/* Who Uses This System */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Who Uses This System?</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "10px"
          }}>

            {/* Card 1 */}
            <div style={{
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid #e8edf5",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}>
              <div style={{
                background: "#1a1a2e",
                height: "110px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3rem"
              }}>🚨</div>
              <div style={{ padding: "12px" }}>
                <p style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", margin: "0 0 4px 0" }}>Emergency Managers</p>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#11264d", margin: "0 0 6px 0" }}>Responsible for...</p>
                <p style={{ fontSize: "0.8rem", color: "#4b5d7a", lineHeight: 1.5, margin: 0 }}>
                  Coordinate disaster response and resource allocation across affected regions.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div style={{
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid #e8edf5",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}>
              <div style={{
                background: "#0d1b2a",
                height: "110px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3rem"
              }}>🔐</div>
              <div style={{ padding: "12px" }}>
                <p style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", margin: "0 0 4px 0" }}>Cyber Analysts</p>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#11264d", margin: "0 0 6px 0" }}>Focus on identify...</p>
                <p style={{ fontSize: "0.8rem", color: "#4b5d7a", lineHeight: 1.5, margin: 0 }}>
                  Monitor and respond to cyber threats and suspicious digital communications.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div style={{
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid #e8edf5",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}>
              <div style={{
                background: "#1b2838",
                height: "110px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3rem"
              }}>🏛</div>
              <div style={{ padding: "12px" }}>
                <p style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", margin: "0 0 4px 0" }}>Stakeholders</p>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#11264d", margin: "0 0 6px 0" }}>Engaged parties...</p>
                <p style={{ fontSize: "0.8rem", color: "#4b5d7a", lineHeight: 1.5, margin: 0 }}>
                  Review insights and reports to support informed decision-making during events.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* How the System Supports Monitoring */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>How the System Supports Monitoring</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>🗄</div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "#11264d", margin: 0 }}>Data Collection</p>
                <p style={{ fontSize: "0.78rem", color: "#4b5d7a", margin: 0 }}>Disaster and cyber data received</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>⚙</div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "#11264d", margin: 0 }}>Data Processing</p>
                <p style={{ fontSize: "0.78rem", color: "#4b5d7a", margin: 0 }}>Risk and alert information processed</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>🔍</div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "#11264d", margin: 0 }}>Insights Display</p>
                <p style={{ fontSize: "0.78rem", color: "#4b5d7a", margin: 0 }}>Dashboard presents insights for stakeholder review</p>
              </div>
            </div>

          </div>
        </div>

        {/* Support / Contact Footer */}
        <div style={{
          ...styles.card,
          background: "#f0f2f8",
          border: "1px solid #d8dce8"
        }}>
          <h2 style={styles.cardTitle}>Support / Contact</h2>
          <p style={styles.bodyText}>
            For assistance, reach out to{" "}
            <a
              href="mailto:support@phoenixdashboard.com"
              style={{ color: "#3b5bdb", textDecoration: "none", fontWeight: 600 }}
            >
              support@phoenixdashboard.com
            </a>
          </p>
        </div>

      </div>
    </div>
  );}