import React from "react";
import AlertSidebar from "./components/AlertSidebar";

const Alerts = () => {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        padding: "20px",
        gap: "24px",
        alignItems: "flex-start",
      }}
    >
      {/* LEFT CONTENT */}
      <div
        style={{
          flex: 1,
          minHeight: "100vh",
        }}
      >
        <h2
          style={{
            color: "#64748b",
            fontWeight: "500",
          }}
        >
          Main alerts content here...
        </h2>
      </div>

      {/* RIGHT SIDEBAR */}
      <div
        style={{
          width: "360px",
          marginTop: "300px",
         
        }}
      >
        <AlertSidebar />
      </div>
    </div>
  );
};

export default Alerts;