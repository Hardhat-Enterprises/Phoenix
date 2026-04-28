import Sidebar from "./components/Sidebar";
import "./Dashboard.css";

// This dashboard page is used for my assigned task.
// My focus here is only on the Item List section, so I kept the page simple
// and made the list area the main dashboard component.

function Dashboard({ setPage }) {
  const itemRows = [
    {
      id: 1,
      name: "Item 1",
      vulnerability: "Safe",
      status: "Safe",
      className: "safe",
    },
    {
      id: 2,
      name: "Item 2",
      vulnerability: "Unverified",
      status: "Unverified",
      className: "unverified",
    },
    {
      id: 3,
      name: "Item 3",
      vulnerability: "Unsafe",
      status: "Unsafe",
      className: "unsafe",
    },
  ];

  return (
    <div className="dashboard-page">
      <Sidebar setPage={setPage} />

      <main className="dashboard-content">
        <div className="dashboard-main-area">
          <section className="item-list-card">
            <div className="item-list-header">
              <h2>Item List</h2>
              <button type="button" className="view-all-button">
                View All
              </button>
            </div>

            <div className="item-list-table">
              <div className="item-list-table-head">
                <span>Item</span>
                <span>Vulnerability</span>
                <span>Status</span>
              </div>

              {itemRows.map((item) => (
                <div className="item-list-row" key={item.id}>
                  <div className="item-name-cell">
                    <span className="item-check-box">✓</span>
                    <span>{item.name}</span>
                  </div>

                  <div className={`status-pill ${item.className}`}>
                    {item.vulnerability}
                  </div>

                  <div className="status-right-cell">
                    <div className={`status-pill ${item.className}`}>
                      {item.status}
                    </div>
                    <span className="row-arrow">›</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;