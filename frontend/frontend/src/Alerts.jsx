import React, { useState } from "react";
import AlertSidebar from "./components/AlertSidebar";

const Alerts = () => {
  const [filters, setFilters] = useState({
    threatType: "All Threats",
    disasterContext: "All Events",
    region: "All Regions",
    status: "All Statuses",
  });

  const setFilter = (field) => (e) => {
    setFilters((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleApplyFilters = () => {
    console.log("Selected alert filters:", filters);
  };

  return (
    <div className="alerts-page-layout">
      <div className="alerts-main-content">
        <h2>Alert Notifications</h2>

        <div className="alert-filter-panel">
          <div className="alert-filter-field">
            <label>Threat Type</label>
            <select value={filters.threatType} onChange={setFilter("threatType")}>
              <option>All Threats</option>
              <option>Scam Risk</option>
              <option>Cyber Attack</option>
              <option>Misinformation</option>
            </select>
          </div>

          <div className="alert-filter-field">
            <label>Disaster Context</label>
            <select
              value={filters.disasterContext}
              onChange={setFilter("disasterContext")}
            >
              <option>All Events</option>
              <option>Flood Event</option>
              <option>Bushfire Event</option>
              <option>Storm Warning</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: "20px" }}>

            <div className="alert-filter-field">
              <label>Region</label>
              <select value={filters.region} onChange={setFilter("region")}>
                <option>All Regions</option>
                <option>Melbourne / Victoria East / Sector</option>
                <option>Sydney</option>
                <option>Geelong</option>
              </select>
            </div>

            <div className="alert-filter-field">
              <label>Status</label>
              <select value={filters.status} onChange={setFilter("status")}>
                <option>All Statuses</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>

            <button className="alert-filter-button" onClick={handleApplyFilters}>
              Apply
            </button>
          </div>
        </div>
      </div>
      {/* LEFT MAIN CONTENT */}
      <div style={{ flex: 1 }}>
        <h2>Alert Notifications</h2>

        <div className="alerts-placeholder-content">
          {/* simulate content height */}
          <div style={{ height: "800px" }}>
            <p>Main alerts content here...</p>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ width: "360px", marginTop: "120px" }}>
          <AlertSidebar />
        </div>
      </div>
    </div>
  );
};

export default Alerts;