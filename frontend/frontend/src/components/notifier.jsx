import { useState } from "react";
import "./notifier.css";

// ---------------------------------------------------------------------------
// Frontend demonstration data.
// The panel no longer depends on a hard-coded local notification server.
// When a backend notification endpoint exists, replace DEMO_NOTIFICATIONS
// with data fetched through services/phoenixApi.js.
// ---------------------------------------------------------------------------
const DEMO_NOTIFICATIONS = [
  {
    id: "demo-phishing-001",
    title: "Phishing Attempt",
    description: "Donation link phishing attack at www.example.com.",
    severity: "High",
    time: "10 minutes ago",
    read: false,
  },
  {
    id: "demo-donation-002",
    title: "Fraudulent Donation Link",
    description: "www.example.com contains fraudulent activity.",
    severity: "Critical",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "demo-misinfo-003",
    title: "Misinformation Alert",
    description: "Misinformation is spreading about a fire in 'x' city.",
    severity: "Medium",
    time: "3 hours ago",
    read: false,
  },
  {
    id: "demo-footage-004",
    title: "AI Generated Footage",
    description:
      "Manipulated footage of a fictional house fire, accompanied by a spam donation link.",
    severity: "Medium",
    time: "Yesterday",
    read: true,
  },
];

export default function NotificationPanel({ onClose }) {
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  const [selected, setSelected] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const unreadCount = notifications.filter((item) => !item.read).length;

  // Show a short-lived confirmation message.
  function showToast(message) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  }

  // Selecting a notification marks it as read and opens the confirmation modal.
  function handleSelect(notification) {
    setNotifications(
      notifications.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item
      )
    );
    setSelected(notification);
  }

  function handleDismiss(id) {
    setNotifications(notifications.filter((item) => item.id !== id));
    showToast("Notification dismissed");
  }

  function handleClearAll() {
    setNotifications([]);
    showToast("All notifications cleared");
  }

  // No alert is sent anywhere. This only prepares a demonstration alert.
  function handleConfirm() {
    setSelected(null);
    showToast("Demo alert prepared - no real alert was sent");
  }

  return (
    <div className="notif-panel" role="dialog" aria-label="Notifications">
      <div className="notif-header">
        <h3 className="notif-heading">
          Notifications
          {unreadCount > 0 && (
            <span className="notif-count">{unreadCount} unread</span>
          )}
        </h3>
        <div className="notif-header-actions">
          <span className="demo-badge">Demo data</span>
          {onClose && (
            <button
              className="notif-close"
              onClick={onClose}
              aria-label="Close notifications"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className="notif-empty">No notifications.</p>
      ) : (
        <ul className="notif-list">
          {notifications.map((item) => (
            <li
              key={item.id}
              className={`notif-item ${item.read ? "read" : "unread"} ${
                selected && selected.id === item.id ? "selected" : ""
              }`}
            >
              <button
                className="notif-item-main"
                onClick={() => handleSelect(item)}
              >
                <span className="notif-title">
                  {!item.read && <span className="notif-dot" aria-hidden="true" />}
                  {item.title}
                  <span className="demo-badge small">Demo</span>
                </span>
                <p className="notif-description">{item.description}</p>
                <span className="notif-meta">
                  {item.severity} &middot; {item.time}
                </span>
              </button>
              <button
                className="notif-dismiss"
                onClick={() => handleDismiss(item.id)}
                aria-label={`Dismiss ${item.title}`}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      {notifications.length > 0 && (
        <button className="notif-clear" onClick={handleClearAll}>
          Clear all
        </button>
      )}

      {selected && (
        <div className="notif-modal-backdrop">
          <div className="notif-modal" role="dialog" aria-modal="true">
            <h4 className="notif-modal-title">Prepare demo alert</h4>
            <p className="notif-modal-body">{selected.title}</p>
            <p className="notif-modal-note">
              This is demonstration data. No alert will be sent to any real
              recipient.
            </p>
            <div className="notif-modal-actions">
              <button
                className="notif-btn-secondary"
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button className="notif-btn-primary" onClick={handleConfirm}>
                Prepare demo alert
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="notif-toast" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}