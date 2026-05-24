import { useState } from "react";
import "./AdminCreateUserPage.css";

function AdminCreateUserPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "Analyst",
    password: "",
    confirmPassword: "",
    adminPrivileges: false,
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    // Placeholder frontend-only submission
    console.log("Create user payload:", formData);
    setMessage("User form submitted successfully. Waiting for backend API integration.");
  };

  return (
    <div className="admin-user-page">
      <div className="admin-user-shell">
        <div className="admin-user-header">
          <h1>Create New User</h1>
          <p>Add a new stakeholder account for the PHOENIX dashboard</p>
        </div>

        <div className="admin-user-card">
          <form className="admin-user-form" onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="Analyst">Analyst</option>
                <option value="Admin">Admin</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>

            <div className="admin-form-group">
              <label htmlFor="password">Temporary Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter temporary password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <label className="admin-checkbox-row">
              <input
                type="checkbox"
                name="adminPrivileges"
                checked={formData.adminPrivileges}
                onChange={handleChange}
              />
              <span>Grant administration privileges</span>
            </label>

            <div className="admin-action-row">
              <button type="submit" className="admin-primary-btn">
                Create User
              </button>
              <button type="button" className="admin-secondary-btn">
                Cancel
              </button>
            </div>

            {message && <p className="admin-message">{message}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminCreateUserPage;