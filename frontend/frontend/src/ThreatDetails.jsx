function ThreatDetails({ selectedThreat }) {
  if (!selectedThreat) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>No Threat Selected</h2>
      </div>
    );
  }

  const getRiskColor = () => {
    if (selectedThreat.vulnerability === "Critical") {
      return "#d93636";
    }

    if (selectedThreat.vulnerability === "High") {
      return "#e85d04";
    }

    if (selectedThreat.vulnerability === "Medium") {
      return "#d4a017";
    }

    return "#2b9348";
  };

  return (
    <main
      style={{
        flex: 1,
        padding: "40px",
        backgroundColor: "#eef3f8",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          padding: "40px",
          maxWidth: "950px",
          margin: "0 auto",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
          border: "1px solid #dbe4f0",
        }}
      >
        <div style={{ marginBottom: "30px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "56px",
              color: "#1f3a5f",
              fontWeight: "700",
            }}
          >
            Threat Details
          </h1>

          <p
            style={{
              marginTop: "10px",
              color: "#6b7f96",
              fontSize: "16px",
            }}
          >
            Detailed cybersecurity threat intelligence and incident overview
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#f8fbff",
            borderRadius: "16px",
            padding: "28px",
            border: "1px solid #e4edf7",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "22px",
              color: "#1f3a5f",
              fontSize: "34px",
            }}
          >
            {selectedThreat.name}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "18px",
            }}
          >
            <div>
              <strong style={{ color: "#52667a" }}>
                Threat Level
              </strong>

              <div
                style={{
                  marginTop: "8px",
                  display: "inline-block",
                  padding: "8px 16px",
                  borderRadius: "999px",
                  backgroundColor: "#f1f5f9",
                  color: getRiskColor(),
                  fontWeight: "700",
                }}
              >
                {selectedThreat.vulnerability}
              </div>
            </div>

            <div>
              <strong style={{ color: "#52667a" }}>
                Status
              </strong>

              <p style={{ marginTop: "8px", color: "#243b53" }}>
                {selectedThreat.status}
              </p>
            </div>

            <div>
              <strong style={{ color: "#52667a" }}>
                Source
              </strong>

              <p style={{ marginTop: "8px", color: "#243b53" }}>
                {selectedThreat.source}
              </p>
            </div>

            <div>
              <strong style={{ color: "#52667a" }}>
                Region
              </strong>

              <p style={{ marginTop: "8px", color: "#243b53" }}>
                {selectedThreat.region}
              </p>
            </div>
          </div>

          <div style={{ marginTop: "30px" }}>
            <strong style={{ color: "#52667a" }}>
              Threat Description
            </strong>

            <p
              style={{
                marginTop: "12px",
                lineHeight: "1.7",
                color: "#243b53",
              }}
            >
              {selectedThreat.description}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ThreatDetails;