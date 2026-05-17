import { useState } from "react";
import "./notifier.css";

export default function NotificationPanel({ onAlert }) {
  const [selected, setSelected] = useState(null);

  const items = [
    { title: "Phishing Attempt", description: "Donation Link phishing attack at www.example.com." },
    { title: "Fraudulent Donation Link", description: "www.example.com contains fraudulent activity" },
    { title: "Misinformation Alert", description: "Misinformation is spreading about a fire in 'x' city" },
    { title: "AI Generated Footage", description: "Manipulated footage of a fictional house fire, accompanied by a spam donation link" }
  ];

  return (
    <div className="notif-panel">
      <ul className="notif-list">
        {items.map((item, idx) => (
          <li
            key={idx}
            className={`notif-item ${selected === idx ? "selected" : ""}`}
            onClick={() => setSelected(idx)}
          >
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </li>
        ))}
      </ul>

      <button
        className="notif-alert-btn"
        disabled={selected === null}
        onClick={() => {
          console.log("SEND CLICKED:", items[selected]);
          onAlert(items[selected]);
        }}  
      >
        Alert Users
      </button>
    </div>
  );
}
