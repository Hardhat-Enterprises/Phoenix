import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "./PreferencesContext";
import { getDefaultPreferences } from "./preferences";
import "./SettingsPage.css";

const formatSavedTime = (date) =>
  date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

const getSaveErrorMessage = (reason) =>
  reason === "unsupported-version"
    ? "Settings were not saved because this browser contains preferences from a newer version."
    : "Settings could not be saved on this device.";

function SettingsPage({
  setPage,
  authSession,
  onLogout,
  onUnsavedChanges,
}) {
  const { preferences, updateUserPreferences } = usePreferences();
  const [themeDraft, setThemeDraft] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [saveError, setSaveError] = useState("");

  const recordSaveResult = (result) => {
    if (result.ok) {
      setSaveError("");
      setSavedAt(new Date());
      return true;
    }

    setSaveError(getSaveErrorMessage(result.reason));
    return false;
  };

  const enabledAlertCount = useMemo(
    () => Object.values(preferences.alertTypes).filter(Boolean).length,
    [preferences.alertTypes],
  );

  const updateAlertType = (key) => (event) => {
    const checked = event.target.checked;
    const result = updateUserPreferences((currentPreferences) => ({
      alertTypes: {
        ...currentPreferences.alertTypes,
        [key]: checked,
      },
    }));
    recordSaveResult(result);
  };

  const updateReducedMotion = (event) => {
    const result = updateUserPreferences({
      reducedMotion: event.target.checked,
    });
    recordSaveResult(result);
  };

  const updateBooleanPreference = (key) => (event) => {
    const result = updateUserPreferences({
      [key]: event.target.checked,
    });
    recordSaveResult(result);
  };

  const updateDensity = (event) => {
    const result = updateUserPreferences({ density: event.target.value });
    recordSaveResult(result);
  };

  const updateDateFormat = (event) => {
    const result = updateUserPreferences({ dateFormat: event.target.value });
    recordSaveResult(result);
  };

  const resetAlertSettings = () => {
    if (!window.confirm("Reset alert filters to their default selections?")) {
      return;
    }

    const defaults = getDefaultPreferences();
    const result = updateUserPreferences({
      alertTypes: defaults.alertTypes,
    });
    recordSaveResult(result);
  };

  const restoreDefaultPreferences = () => {
    if (
      !window.confirm(
        "Restore all preferences to their defaults? This cannot be undone.",
      )
    ) {
      return;
    }

    const result = updateUserPreferences(getDefaultPreferences());
    if (recordSaveResult(result)) setThemeDraft(null);
  };

  const saveTheme = () => {
    const result = updateUserPreferences({ theme: selectedTheme });
    if (recordSaveResult(result)) setThemeDraft(null);
  };

  const cancelThemeChange = () => {
    setThemeDraft(null);
  };

  const handleChangeUser = async () => {
    await onLogout?.("login");
  };

  const handleLogout = async () => {
    await onLogout?.("dashboard");
  };

  const isLoggedIn = Boolean(authSession?.accessToken);
  const selectedTheme = themeDraft ?? preferences.theme;
  const hasUnsavedTheme = selectedTheme !== preferences.theme;

  useEffect(() => {
    onUnsavedChanges?.(hasUnsavedTheme);
  }, [hasUnsavedTheme, onUnsavedChanges]);

  useEffect(
    () => () => onUnsavedChanges?.(false),
    [onUnsavedChanges],
  );

  useEffect(() => {
    if (!hasUnsavedTheme) return undefined;

    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedTheme]);

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <div className="settings-header">
          <div>
            <h1>Settings</h1>
            <p>Manage dashboard preferences and account actions</p>
          </div>

          <div
            className={`settings-save-status${saveError ? " is-error" : hasUnsavedTheme ? " is-unsaved" : ""}`}
            role={saveError ? "alert" : "status"}
          >
            {saveError
              || (hasUnsavedTheme
                ? "Unsaved theme changes"
                : savedAt
                  ? `Saved ${formatSavedTime(savedAt)}`
                  : "Ready")}
          </div>
        </div>

        <p className="settings-device-notice">
          Preferences are stored in this browser on this device and are not synced to an account.
        </p>

        <div className="settings-grid">
          <section className="settings-card settings-appearance-card">
            <h2>Appearance</h2>
            <p className="settings-subtext" id="settings-theme-description">
              Choose a light or dark appearance, or follow this device&apos;s system setting.
            </p>

            <fieldset
              className="settings-theme-fieldset"
              aria-describedby="settings-theme-description"
            >
              <legend>Theme</legend>
              <div className="settings-theme-options">
                {[
                  ["light", "Light"],
                  ["dark", "Dark"],
                  ["system", "System"],
                ].map(([value, label]) => (
                  <label
                    className={`settings-theme-option${selectedTheme === value ? " is-selected" : ""}`}
                    key={value}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={value}
                      checked={selectedTheme === value}
                      onChange={(event) => setThemeDraft(event.target.value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="settings-theme-actions">
              <button
                type="button"
                className="settings-reset-btn"
                onClick={cancelThemeChange}
                disabled={!hasUnsavedTheme}
                aria-describedby="settings-theme-description"
              >
                Cancel
              </button>
              <button
                type="button"
                className="settings-theme-save-btn"
                onClick={saveTheme}
                disabled={!hasUnsavedTheme}
                aria-describedby="settings-theme-description"
              >
                Save theme
              </button>
            </div>

            <div className="settings-preference-section">
              <fieldset
                className="settings-choice-fieldset"
                aria-describedby="settings-density-description"
              >
                <legend>Content density</legend>
                <p
                  id="settings-density-description"
                  className="settings-option-description"
                >
                  Choose standard spacing or a modestly tighter layout.
                </p>
                <div className="settings-choice-options settings-density-options">
                  {[
                    ["comfortable", "Comfortable"],
                    ["compact", "Compact"],
                  ].map(([value, label]) => (
                    <label
                      className={`settings-choice-option${preferences.density === value ? " is-selected" : ""}`}
                      key={value}
                    >
                      <input
                        type="radio"
                        name="density"
                        value={value}
                        checked={preferences.density === value}
                        onChange={updateDensity}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="settings-card settings-accessibility-card">
            <h2>Accessibility</h2>
            <p className="settings-subtext">
              Adjust motion and readability across the dashboard.
            </p>

            <div className="settings-options-column">
              <div className="settings-option">
                <input
                  id="settings-reduced-motion"
                  type="checkbox"
                  checked={preferences.reducedMotion}
                  onChange={updateReducedMotion}
                  aria-describedby="settings-reduced-motion-description"
                />
                <div className="settings-option-copy">
                  <label htmlFor="settings-reduced-motion">Reduce motion</label>
                  <p
                    id="settings-reduced-motion-description"
                    className="settings-option-description"
                  >
                    Minimise cosmetic animations and smooth scrolling.
                  </p>
                </div>
              </div>

              <div className="settings-option">
                <input
                  id="settings-larger-text"
                  type="checkbox"
                  checked={preferences.largerText}
                  onChange={updateBooleanPreference("largerText")}
                  aria-describedby="settings-larger-text-description"
                />
                <div className="settings-option-copy">
                  <label htmlFor="settings-larger-text">Larger text</label>
                  <p
                    id="settings-larger-text-description"
                    className="settings-option-description"
                  >
                    Make text larger and easier to read.
                  </p>
                </div>
              </div>

              <div className="settings-option">
                <input
                  id="settings-high-contrast"
                  type="checkbox"
                  checked={preferences.highContrast}
                  onChange={updateBooleanPreference("highContrast")}
                  aria-describedby="settings-high-contrast-description"
                />
                <div className="settings-option-copy">
                  <label htmlFor="settings-high-contrast">High contrast</label>
                  <p
                    id="settings-high-contrast-description"
                    className="settings-option-description"
                  >
                    Strengthen text, borders, surfaces and keyboard focus.
                  </p>
                </div>
              </div>
            </div>

            <div className="settings-preference-section settings-restore-section">
              <div>
                <h3>Restore Defaults</h3>
                <p
                  id="settings-restore-defaults-description"
                  className="settings-option-description"
                >
                  Reset all preferences on this device to their original values.
                </p>
              </div>
              <button
                type="button"
                className="settings-reset-btn"
                onClick={restoreDefaultPreferences}
                aria-describedby="settings-restore-defaults-description"
              >
                Restore Defaults
              </button>
            </div>
          </section>

          <section className="settings-card settings-interface-card">
            <h2>Interface and regional preferences</h2>
            <p className="settings-subtext">
              Configure date display, desktop navigation and safety prompts.
            </p>

            <div className="settings-preference-section is-first">
              <fieldset
                className="settings-choice-fieldset"
                aria-describedby="settings-date-format-description"
              >
                <legend>Date display format</legend>
                <p
                  id="settings-date-format-description"
                  className="settings-option-description"
                >
                  Choose how user-facing dates are ordered. Existing times remain visible.
                </p>
                <div className="settings-choice-options settings-date-options">
                  {[
                    ["system", "System default"],
                    ["day-month-year", "Day/Month/Year"],
                    ["month-day-year", "Month/Day/Year"],
                    ["year-month-day", "Year/Month/Day"],
                  ].map(([value, label]) => (
                    <label
                      className={`settings-choice-option${preferences.dateFormat === value ? " is-selected" : ""}`}
                      key={value}
                    >
                      <input
                        type="radio"
                        name="date-format"
                        value={value}
                        checked={preferences.dateFormat === value}
                        onChange={updateDateFormat}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="settings-options-column settings-preference-section">
              <div className="settings-option">
                <input
                  id="settings-sidebar-collapsed"
                  type="checkbox"
                  checked={preferences.sidebarCollapsed}
                  onChange={updateBooleanPreference("sidebarCollapsed")}
                  aria-describedby="settings-sidebar-collapsed-description"
                />
                <div className="settings-option-copy">
                  <label htmlFor="settings-sidebar-collapsed">
                    Collapse desktop Sidebar
                  </label>
                  <p
                    id="settings-sidebar-collapsed-description"
                    className="settings-option-description"
                  >
                    Show a narrower icon navigation on wide screens only.
                  </p>
                </div>
              </div>

              <div className="settings-option">
                <input
                  id="settings-confirm-important-actions"
                  type="checkbox"
                  checked={preferences.confirmImportantActions}
                  onChange={updateBooleanPreference("confirmImportantActions")}
                  aria-describedby="settings-confirm-important-actions-description"
                />
                <div className="settings-option-copy">
                  <label htmlFor="settings-confirm-important-actions">
                    Confirm important actions
                  </label>
                  <p
                    id="settings-confirm-important-actions-description"
                    className="settings-option-description"
                  >
                    Ask before clearing saved data or ending the current session.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-heading">
              <div>
                <h2>Alert Filters</h2>
                <p
                  id="settings-alert-filter-description"
                  className="settings-subtext"
                >
                  Choose which threat alert types are shown in the dashboard.
                </p>
              </div>

              <button
                type="button"
                className="settings-reset-btn"
                onClick={resetAlertSettings}
                aria-describedby="settings-alert-filter-description"
              >
                Reset alerts
              </button>
            </div>

            <div className="settings-section">
              <div className="settings-section-heading">
                <h3>Threat Alert Type</h3>
                <span>{enabledAlertCount} selected</span>
              </div>

              <div className="settings-options-column">
                <div className="settings-option">
                  <input
                    id="settings-alert-flood"
                    type="checkbox"
                    checked={preferences.alertTypes.flood}
                    onChange={updateAlertType("flood")}
                    aria-describedby="settings-alert-flood-description"
                  />
                  <div className="settings-option-copy">
                    <label htmlFor="settings-alert-flood">
                      Flood Warning Alerts
                    </label>
                    <p
                      id="settings-alert-flood-description"
                      className="settings-option-description"
                    >
                      Show alerts for flood warnings.
                    </p>
                  </div>
                </div>

                <div className="settings-option">
                  <input
                    id="settings-alert-cyber"
                    type="checkbox"
                    checked={preferences.alertTypes.cyber}
                    onChange={updateAlertType("cyber")}
                    aria-describedby="settings-alert-cyber-description"
                  />
                  <div className="settings-option-copy">
                    <label htmlFor="settings-alert-cyber">
                      Cyber Threat Alerts
                    </label>
                    <p
                      id="settings-alert-cyber-description"
                      className="settings-option-description"
                    >
                      Show alerts for cyber threats.
                    </p>
                  </div>
                </div>

                <div className="settings-option">
                  <input
                    id="settings-alert-bushfire"
                    type="checkbox"
                    checked={preferences.alertTypes.bushfire}
                    onChange={updateAlertType("bushfire")}
                    aria-describedby="settings-alert-bushfire-description"
                  />
                  <div className="settings-option-copy">
                    <label htmlFor="settings-alert-bushfire">
                      Bushfire Threat Alerts
                    </label>
                    <p
                      id="settings-alert-bushfire-description"
                      className="settings-option-description"
                    >
                      Show alerts for bushfire threats.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="settings-card account-card">
            <h2>Account</h2>
            <p id="settings-account-description" className="settings-subtext">
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
                    aria-describedby="settings-account-description"
                  >
                    Change User
                  </button>

                  <button
                    className="settings-action-btn danger-btn"
                    type="button"
                    onClick={handleLogout}
                    aria-describedby="settings-account-description"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-primary settings-action-btn"
                  type="button"
                  onClick={() => setPage("login")}
                  aria-describedby="settings-account-description"
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
