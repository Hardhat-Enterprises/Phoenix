import React, { useEffect, useState } from "react";

import {
  getRisks,
  getLinkedEventTypes,
  getEventStatuses,
  getRiskById,
} from "../services/phoenixApi";

import "./RiskCorrelation.css";

const RiskCorrelation = () => {
  const [risks, setRisks] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);

  const [eventTypes, setEventTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const [selectedRisk, setSelectedRisk] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const risksResponse = await getRisks();
        const typesResponse = await getLinkedEventTypes();
        const statusesResponse = await getEventStatuses();

        const riskItems = risksResponse.items || [];

        setRisks(riskItems);
        setFilteredRisks(riskItems);

        setEventTypes(typesResponse || []);
        setStatuses(statusesResponse || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load risk correlation data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    let updated = [...risks];

    if (selectedStatus) {
      updated = updated.filter(
        (risk) => risk.event_status === selectedStatus
      );
    }

    if (selectedType) {
      updated = updated.filter(
        (risk) => risk.linked_event_type === selectedType
      );
    }

    setFilteredRisks(updated);
  }, [selectedStatus, selectedType, risks]);

  const handleSelectRisk = async (risk) => {
    try {
      const detail = await getRiskById(risk.id || risk.risk_id);

      setSelectedRisk(detail);
    } catch (err) {
      console.error(err);
      setSelectedRisk(risk);
    }
  };

  return (
    <div className="risk-page">
      <h1 className="risk-title">Risk Correlation</h1>

      {/* FILTERS */}
      <div className="risk-filters">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">All Statuses</option>

          {statuses.map((status, index) => (
            <option key={index} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="">All Event Types</option>

          {eventTypes.map((type, index) => (
            <option key={index} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="risk-message">
          Loading risk correlation data...
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="risk-message error">
          {error}
        </div>
      )}

      {/* EMPTY */}
      {!loading && !error && filteredRisks.length === 0 && (
        <div className="risk-message">
          No risk correlation records available.
        </div>
      )}

      {/* TABLE */}
      {!loading && filteredRisks.length > 0 && (
        <div className="risk-layout">

          <div className="risk-table-container">
            <table className="risk-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Risk Level</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Hazard Type</th>
                </tr>
              </thead>

              <tbody>
  {filteredRisks.map((risk, index) => (
    <tr
  key={index}
  className={
    selectedRisk?.integration_event_id === risk.integration_event_id
      ? "selected-row"
      : ""
  }
  onClick={() => handleSelectRisk(risk)}
>
      <td>{risk.integration_event_id}</td>

      <td>
        {risk.output?.risk_level || "N/A"}
      </td>

      <td>
        {risk.output?.confidence_score || "N/A"}
      </td>

      <td className={`status ${risk.status}`}>
  {risk.status}
</td>

      <td>
        {risk.input?.hazard_type || "N/A"}
      </td>
    </tr>
  ))}
</tbody>
            </table>
          </div>
 {/* DETAIL PANEL */}
      <div className="risk-detail">
        {selectedRisk ? (
          <>
            <h3>Risk Detail</h3>

            <p>
              <strong>Event ID:</strong>{" "}
              {selectedRisk.integration_event_id}
            </p>

            <p>
              <strong>Risk Level:</strong>{" "}
              {selectedRisk.output?.risk_level || "N/A"}
            </p>

            <p>
              <strong>Risk Score:</strong>{" "}
              {selectedRisk.output?.risk_score || "N/A"}
            </p>

            <p>
              <strong>Confidence Score:</strong>{" "}
              {selectedRisk.output?.confidence_score || "N/A"}
            </p>

            <p>
              <strong>Hazard Type:</strong>{" "}
              {selectedRisk.input?.hazard_type || "N/A"}
            </p>

            <p>
              <strong>Hazard Location:</strong>{" "}
              {selectedRisk.input?.hazard_location || "N/A"}
            </p>

            <p>
              <strong>Hazard Status:</strong>{" "}
              {selectedRisk.input?.hazard_status || "N/A"}
            </p>

            <p>
              <strong>Alert Level:</strong>{" "}
              {selectedRisk.input?.alert_level || "N/A"}
            </p>

            <p>
              <strong>Processing Status:</strong>{" "}
              {selectedRisk.status || "N/A"}
            </p>
          </>
        ) : (
          <div>Select a risk record to view details.</div>
        )}
      </div>

    </div>
  )}
</div>
);
};

export default RiskCorrelation;