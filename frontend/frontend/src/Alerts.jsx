import React from "react";
import AlertSidebar from "./components/AlertSidebar";

const Alerts = () => {
  return (
    <div style={{ display: "flex", gap: "20px" }}>

      {/* LEFT MAIN CONTENT */}
      <div style={{ flex: 1 }}>
        <h2>Alert Notifications</h2>

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
  );
};

export default Alerts;