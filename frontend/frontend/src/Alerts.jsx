import { useState, useEffect } from "react";

const API_BASE = "http://localhost:3001";

const Alerts = () => {
  const [filters, setFilters] = useState({
    threatType: "All Threats",
    disasterContext: "All Events",
    region: "All Regions",
    status: "All Statuses",
  });

  const [eventStatuses, setEventStatuses] = useState([]);
  const [linkedEventTypes, setLinkedEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [statusRes, typeRes] = await Promise.all([
          fetch(`${API_BASE}/api/users/meta/event-statuses`),
          fetch(`${API_BASE}/api/users/meta/linked-event-types`),
        ]);
        const statusData = await statusRes.json();
        const typeData = await typeRes.json();
        if (statusData.data) setEventStatuses(statusData.data);
        if (typeData.data) setLinkedEventTypes(typeData.data);
      } catch (err) {
        console.error("Failed to fetch filter data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFilterData();
  }, []);

  const setFilter = (field) => (e) => {
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleApplyFilters = () => {
    console.log("Selected alert filters:", filters);
  };

  const fallbackStatuses = ["Critical", "High", "Medium", "Low"];
  const fallbackTypes = ["Scam Risk", "Cyber Attack", "Misinformation"];
  const fallbackEvents = ["Flood Event", "Bushfire Event", "Storm Warning"];

  const statusOptions = eventStatuses.length > 0 ? eventStatuses.map((s) => s.name || s) : fallbackStatuses;
  const typeOptions = linkedEventTypes.length > 0 ? linkedEventTypes.map((t) => t.name || t) : fallbackTypes;
  const eventOptions = linkedEventTypes.length > 0 ? linkedEventTypes.map((t) => t.name || t) : fallbackEvents;

  return (
    <div className="alerts-page-layout">
      <div className="alerts-main-content">
        <h2>Alert Notifications</h2>
        <div className="alert-filter-panel">
          <div className="alert-filter-field">
            <label>Threat Type</label>
            <select value={filters.threatType} onChange={setFilter("threatType")}>
              <option>All Threats</option>
              {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="alert-filter-field">
            <label>Disaster Context</label>
            <select value={filters.disasterContext} onChange={setFilter("disasterContext")}>
              <option>All Events</option>
              {eventOptions.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
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
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="alert-filter-button" onClick={handleApplyFilters}>
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
        <div className="alerts-placeholder-content">
          <p>Main alerts content here...</p>
        </div>
      </div>
    </div>
  );
};

export default Alerts;