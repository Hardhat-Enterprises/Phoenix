import React, { useState, useEffect } from "react";
import "./AlertSidebar.css";

const API_BASE = "http://localhost:3001";

const AlertSidebar = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications`);
        const data = await res.json();
        if (data.data) setNotifications(data.data);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const fallbackItems = [
    { color: "#f59e0b", text: "Hazard alert and cyber risk shown together" },
    { color: "#ef4444", text: "Scam activity linked to disaster vulnerability" },
    { color: "#3b82f6", text: "Supports misinformation and suspicious link review" },
    { color: "#16a34a", text: "Helps stakeholders decide on warnings and response" },
  ];

  const displayItems = notifications.length > 0
    ? notifications.map((n) => ({ color: "#3b82f6", text: n.message || n.title || n }))
    : fallbackItems;

  return (
    <div className="sidebar-container">
      <div className="card">
        <h3 className="card-title">How This Alert Fits PHOENIX</h3>
        {loading
          ? <p style={{ fontSize: "13px", color: "#888" }}>Loading...</p>
          : displayItems.map((item, i) => (
              <Item key={i} color={item.color} text={item.text} />
            ))
        }
      </div>
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