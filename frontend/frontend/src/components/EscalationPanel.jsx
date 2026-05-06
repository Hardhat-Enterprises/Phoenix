import { useState } from "react";
export default function EscalationPanel({ reportId = "RPT-001", reportTitle = "Hazard Alert #42" }) {
  const [status, setStatus] = useState(null);
  const [analyst, setAnalyst] = useState("");
  const [showAssignInput, setShowAssignInput] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const handleAssign = () => {
    if (!showAssignInput) { setShowAssignInput(true); return; }
    if (analyst.trim() === "") return;
    setStatus("assigned");
    setShowAssignInput(false);
  };

  const handleConfirm = () => {
    setStatus(confirmAction);
    setConfirmAction(null);
  };

  const handleReset = () => {
    setStatus(null);
    setAnalyst("");
    setShowAssignInput(false);
    setConfirmAction(null);
  };

  const statusConfig = {
    assigned: { bg: "#e8f4fd", border: "#3b82f6", icon: "👤", text: `Analyst "${analyst}" has been assigned to ${reportTitle}.`, color: "#1d4ed8" },
    escalated: { bg: "#fff1f2", border: "#ef4444", icon: "🚨", text: `${reportTitle} has been escalated for urgent review.`, color: "#b91c1c" },
    approved: { bg: "#f0fdf4", border: "#22c55e", icon: "✅", text: `${reportTitle} has been approved. No further action required.`, color: "#15803d" },
  };

  return (
    <div style={styles.wrapper}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.icon}>⚖</span>
          <div>
            <h3 style={styles.title}>Escalation Decision</h3>
            <p style={styles.subtitle}>Report: <strong>{reportTitle}</strong> · ID: {reportId}</p>
          </div>
        </div>
        <span style={{
          ...styles.badge,
          background: status ? statusConfig[status].bg : "#f1f5f9",
          color: status ? statusConfig[status].color : "#64748b",
          border: `1px solid ${status ? statusConfig[status].border : "#cbd5e1"}`,
        }}>
          {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending Review"}
        </span>
      </div>

      <div style={styles.divider} />

      {/* Description */}
      <p style={styles.description}>
        Review this report and choose an action below. You can assign an analyst
        for further investigation, escalate for urgent attention, or approve and close the report.
      </p>

      {/* Result Banner */}
      {status && (
        <div style={{ ...styles.resultBanner, background: statusConfig[status].bg, borderLeft: `4px solid ${statusConfig[status].border}` }}>
          <span style={{ fontSize: "1.2rem" }}>{statusConfig[status].icon}</span>
          <p style={{ ...styles.resultText, color: statusConfig[status].color }}>{statusConfig[status].text}</p>
          <button onClick={handleReset} style={styles.resetBtn}>Reset</button>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div style={{ ...styles.confirmBox, borderLeft: `4px solid ${confirmAction === "escalate" ? "#ef4444" : "#22c55e"}`, background: confirmAction === "escalate" ? "#fff1f2" : "#f0fdf4" }}>
          <p style={{ ...styles.confirmText, color: confirmAction === "escalate" ? "#b91c1c" : "#15803d" }}>
            {confirmAction === "escalate" ? `⚠ Are you sure you want to escalate "${reportTitle}"?` : `✅ Are you sure you want to approve "${reportTitle}"?`}
          </p>
          <div style={styles.confirmBtns}>
            <button onClick={handleConfirm} style={{ ...styles.confirmYes, background: confirmAction === "escalate" ? "#ef4444" : "#22c55e" }}>
              Yes, {confirmAction === "escalate" ? "Escalate" : "Approve"}
            </button>
            <button onClick={() => setConfirmAction(null)} style={styles.confirmNo}>Cancel</button>
          </div>
        </div>
      )}

      {/* Assign Input */}
      {showAssignInput && !status && (
        <div style={styles.assignBox}>
          <label style={styles.assignLabel}>Enter Analyst Name</label>
          <input
            type="text"
            value={analyst}
            onChange={(e) => setAnalyst(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAssign()}
            placeholder="e.g. Jane Smith"
            style={styles.assignInput}
            autoFocus
          />
        </div>
      )}

      {/* Action Buttons */}
      {!status && !confirmAction && (
        <div style={styles.buttonRow}>
          <button
            onClick={handleAssign}
            style={styles.btnAssign}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
          >
            👤 {showAssignInput ? "Confirm Assign" : "Assign Analyst"}
          </button>
          <button
            onClick={() => setConfirmAction("escalate")}
            style={styles.btnEscalate}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Escalate
          </button>
          <button
            onClick={() => setConfirmAction("approve")}
            style={styles.btnApprove}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#1d4ed8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#2563eb")}
          >
            Approve
          </button>
        </div>
      )}

    </div>
  );
}

const styles = {
  wrapper: { backgroundColor: "#ffffff", borderRadius: "16px", padding: "20px 24px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", border: "1px solid #e8edf5", maxWidth: "600px", fontFamily: "'Segoe UI', sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  icon: { fontSize: "1.6rem", background: "#eff6ff", borderRadius: "10px", padding: "8px", lineHeight: 1 },
  title: { margin: 0, fontSize: "1rem", fontWeight: 800, color: "#11264d" },
  subtitle: { margin: "2px 0 0 0", fontSize: "0.78rem", color: "#64748b" },
  badge: { fontSize: "0.75rem", fontWeight: 700, padding: "4px 12px", borderRadius: "999px", textTransform: "uppercase", letterSpacing: "0.05em" },
  divider: { height: "1px", background: "#e8edf5", margin: "14px 0" },
  description: { fontSize: "0.87rem", color: "#4b5d7a", lineHeight: 1.6, margin: "0 0 16px 0" },
  resultBanner: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px" },
  resultText: { flex: 1, margin: 0, fontSize: "0.88rem", fontWeight: 600 },
  resetBtn: { background: "none", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "4px 12px", fontSize: "0.78rem", color: "#64748b", cursor: "pointer" },
  confirmBox: { padding: "14px 16px", borderRadius: "10px", marginBottom: "16px" },
  confirmText: { margin: "0 0 10px 0", fontSize: "0.9rem", fontWeight: 600 },
  confirmBtns: { display: "flex", gap: "10px" },
  confirmYes: { color: "#fff", border: "none", borderRadius: "8px", padding: "8px 20px", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" },
  confirmNo: { background: "transparent", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 20px", fontWeight: 600, fontSize: "0.88rem", color: "#64748b", cursor: "pointer" },
  assignBox: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" },
  assignLabel: { fontSize: "0.82rem", fontWeight: 600, color: "#11264d" },
  assignInput: { border: "1px solid #cbd5e1", borderRadius: "8px", padding: "9px 14px", fontSize: "0.9rem", color: "#11264d", outline: "none", width: "100%", boxSizing: "border-box" },
  buttonRow: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  btnAssign: { background: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 22px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "background 0.15s" },
  btnEscalate: { background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "10px", padding: "9px 22px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "background 0.15s" },
  btnApprove: { background: "transparent", color: "#2563eb", border: "none", padding: "9px 10px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "color 0.15s" },
};