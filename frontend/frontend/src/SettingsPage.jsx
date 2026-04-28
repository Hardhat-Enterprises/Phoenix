import "./SettingsPage.css";

function SettingsPage({ setPage }) {
  return (
    <div className="settings-page">
      <div className="settings-shell">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Manage dashboard preferences and account actions</p>
        </div>

        <div className="settings-grid">
          <section className="settings-card">
            <h2>Alert Filters</h2>
            <p className="settings-subtext">
              Configure the types of alerts and preferences shown in the dashboard.
            </p>

            <div className="settings-section">
              <h3>Threat Alert Type</h3>
              <div className="settings-options-column">
                <label className="settings-option">
                  <input type="checkbox" />
                  <span>Flood Warning Alerts</span>
                </label>

                <label className="settings-option">
                  <input type="checkbox" defaultChecked />
                  <span>Cyber Threat Alerts</span>
                </label>

                <label className="settings-option">
                  <input type="checkbox" />
                  <span>Bushfire Threat Alerts</span>
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h3>Notification Preferences</h3>
              <div className="settings-options-column">
                <label className="settings-option">
                  <input type="checkbox" />
                  <span>Email Alerts</span>
                </label>

                <label className="settings-option">
                  <input type="checkbox" />
                  <span>SMS Alerts</span>
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h3>Location Settings</h3>

              <label className="settings-option">
                <input type="checkbox" />
                <span>Allow Location Tracking</span>
              </label>

              <div className="settings-dropdown-group">
                <label htmlFor="range">Alert Radius</label>
                <select id="range">
                  <option>Within 20km of current location</option>
                  <option>Within 50km of current location</option>
                  <option>Within 100km of current location</option>
                </select>
              </div>
            </div>
          </section>

          <aside className="settings-card account-card">
            <h2>Account</h2>
            <p className="settings-subtext">
              Manage account-related actions for the PHOENIX dashboard.
            </p>

            <div className="account-actions">
              <button className="settings-action-btn secondary-btn">
                Change User
              </button>

              <button className="settings-action-btn danger-btn"
                onClick={() => setPage("dashboard")}>
               Log Out
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;