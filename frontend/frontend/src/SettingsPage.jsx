import { useMemo, useState } from "react";
import "./SettingsPage.css";

const SETTINGS_STORAGE_KEY = "phoenixSettings";

const defaultSettings = {
  alertTypes: {
    flood: false,
    cyber: true,
    bushfire: false,
  },
  locationTracking: false,
  alertRadius: "20",
  location: null,
};

const readSettings = () => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!storedSettings) {
      return defaultSettings;
    }

    const parsedSettings = JSON.parse(storedSettings);

    return {
      ...defaultSettings,
      ...parsedSettings,
      alertTypes: {
        ...defaultSettings.alertTypes,
        ...parsedSettings.alertTypes,
      },
    };
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    return defaultSettings;
  }
};

const saveSettings = (settings) => {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

const formatSavedTime = (date) =>
  date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

function SettingsPage({ setPage, authSession, onLogout }) {
  const [settings, setSettings] = useState(readSettings);
  const [savedAt, setSavedAt] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");

  const commitSettings = (nextSettings) => {
    setSettings(nextSettings);
    saveSettings(nextSettings);
    setSavedAt(new Date());
  };

  const enabledAlertCount = useMemo(
    () => Object.values(settings.alertTypes).filter(Boolean).length,
    [settings.alertTypes],
  );

  const updateAlertType = (key) => (event) => {
    commitSettings({
      ...settings,
      alertTypes: {
        ...settings.alertTypes,
        [key]: event.target.checked,
      },
    });
  };

  const updateRadius = (event) => {
    commitSettings({
      ...settings,
      alertRadius: event.target.value,
    });
  };

  const updateLocationTracking = (event) => {
    const enabled = event.target.checked;

    if (!enabled) {
      setLocationMessage("");
      commitSettings({
        ...settings,
        locationTracking: false,
        location: null,
      });
      return;
    }

    if (!navigator.geolocation) {
      setLocationMessage("Location is not available in this browser.");
      return;
    }

    setLocationMessage("Requesting location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: Number(position.coords.latitude.toFixed(4)),
          longitude: Number(position.coords.longitude.toFixed(4)),
        };

        commitSettings({
          ...settings,
          locationTracking: true,
          location,
        });
        setLocationMessage(
          `Location saved: ${location.latitude}, ${location.longitude}`,
        );
      },
      () => {
        setLocationMessage("Location permission was not granted.");
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
      },
    );
  };

  const resetSettings = () => {
    commitSettings(defaultSettings);
    setLocationMessage("");
  };

  const handleChangeUser = async () => {
    await onLogout?.("login");
  };

  const handleLogout = async () => {
    await onLogout?.("dashboard");
  };

  const isLoggedIn = Boolean(authSession?.accessToken);

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <div className="settings-header">
          <div>
            <h1>Settings</h1>
            <p>Manage dashboard preferences and account actions</p>
          </div>

          <div className="settings-save-status">
            {savedAt ? `Saved ${formatSavedTime(savedAt)}` : "Ready"}
          </div>
        </div>

        <div className="settings-grid">
          <section className="settings-card">
            <div className="settings-card-heading">
              <div>
                <h2>Alert Filters</h2>
                <p className="settings-subtext">
                  Configure the types of alerts and preferences shown in the dashboard.
                </p>
              </div>

              <button
                type="button"
                className="settings-reset-btn"
                onClick={resetSettings}
              >
                Reset
              </button>
            </div>

            <div className="settings-section">
              <div className="settings-section-heading">
                <h3>Threat Alert Type</h3>
                <span>{enabledAlertCount} selected</span>
              </div>

              <div className="settings-options-column">
                <label className="settings-option">
                  <input
                    type="checkbox"
                    checked={settings.alertTypes.flood}
                    onChange={updateAlertType("flood")}
                  />
                  <span>Flood Warning Alerts</span>
                </label>

                <label className="settings-option">
                  <input
                    type="checkbox"
                    checked={settings.alertTypes.cyber}
                    onChange={updateAlertType("cyber")}
                  />
                  <span>Cyber Threat Alerts</span>
                </label>

                <label className="settings-option">
                  <input
                    type="checkbox"
                    checked={settings.alertTypes.bushfire}
                    onChange={updateAlertType("bushfire")}
                  />
                  <span>Bushfire Threat Alerts</span>
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h3>Location Settings</h3>

              <label className="settings-option">
                <input
                  type="checkbox"
                  checked={settings.locationTracking}
                  onChange={updateLocationTracking}
                />
                <span>Allow Location Tracking</span>
              </label>

              {locationMessage && (
                <p className="settings-inline-status">{locationMessage}</p>
              )}

              <div className="settings-dropdown-group">
                <label htmlFor="range">Alert Radius</label>
                <select
                  id="range"
                  value={settings.alertRadius}
                  onChange={updateRadius}
                >
                  <option value="20">Within 20km of current location</option>
                  <option value="50">Within 50km of current location</option>
                  <option value="100">Within 100km of current location</option>
                </select>
              </div>
            </div>
          </section>

          <aside className="settings-card account-card">
            <h2>Account</h2>
            <p className="settings-subtext">
              Manage account-related actions for the PHOENIX dashboard.
            </p>

            <div className="account-summary">
              <span>Current user</span>
              <strong>{authSession?.user?.username || "Not signed in"}</strong>
              <small>{authSession?.user?.role || "No active role"}</small>
            </div>

            <div className="account-actions">
              {isLoggedIn ? (
                <>
                  <button
                    className="settings-action-btn secondary-btn"
                    type="button"
                    onClick={handleChangeUser}
                  >
                    Change User
                  </button>

                  <button
                    className="settings-action-btn danger-btn"
                    type="button"
                    onClick={handleLogout}
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <button
                  className="settings-action-btn secondary-btn"
                  type="button"
                  onClick={() => setPage("login")}
                >
                  Sign In
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
