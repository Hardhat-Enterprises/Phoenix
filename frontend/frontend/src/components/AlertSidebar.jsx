import React from "react";
import "./AlertSidebar.css";

const AlertSidebar = () => {
  return (
    <div className="sidebar-container">

      {/* Card 1 */}
      <div className="card">
        <h3 className="card-title">How This Alert Fits PHOENIX</h3>

        <Item color="#f59e0b" text="Hazard alert and cyber risk shown together" />
        <Item color="#ef4444" text="Scam activity linked to disaster vulnerability" />
        <Item color="#3b82f6" text="Supports misinformation and suspicious link review" />
        <Item color="#16a34a" text="Helps stakeholders decide on warnings and response" />
      </div>

      {/* Card 2 */}
      <div className="card">
        <h3 className="card-title">Quick Actions</h3>

        <Action text="Assign Analyst" />
        <Action text="Escalate Alert" />
        <Action text="Issue Verified Warning" />
        <Action text="Open Related Communications" />
      </div>

    </div>
  );
};

const Item = ({ color, text }) => (
  <div className="item">
    <span className="dot" style={{ backgroundColor: color }}></span>
    <p className="item-text">{text}</p>
  </div>
);

const Action = ({ text }) => (
  <button className="action-btn">
    {text}
    <span className="arrow">→</span>
  </button>
);

export default AlertSidebar;