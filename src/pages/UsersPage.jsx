import { useState, useEffect } from "react";
import { apiFetch } from "../api";

const ROLES = ["staff", "partner", "customer"];

const ROLE_PERMISSIONS = {
  staff:    "Can add/edit Hotels, Tours, Packages, Vehicles",
  partner:  "Limited access — partner view only",
  customer: "Customer access only",
};

export default function UsersPage({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });

  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    const res = await apiFetch("/api/auth/users", { headers });
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await apiFetch("/api/auth/users", {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(`✅ User "${form.name}" created! Email: ${form.email} | Password: ${form.password}`);
      setForm({ name: "", email: "", password: "", role: "staff" });
      setShowForm(false);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";
    const pwd = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm((f) => ({ ...f, password: pwd }));
  };

  if (loading) return <div className="dash-loading">⏳ Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>👥 Team Members</h2>
        <button className="btn-primary" onClick={() => { setShowForm(true); setError(""); setSuccess(""); }}>
          + Add Employee
        </button>
      </div>

      {success && (
        <div className="user-success-box">
          <div>{success}</div>
          <div className="user-success-note">⚠️ Share these credentials with the employee. Password won't be shown again.</div>
        </div>
      )}

      {/* Users Table */}
      {users.length === 0 ? (
        <p className="empty">No team members yet. Add your first employee.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th></tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u._id || u.id}>
                <td style={{ color: "#9b8b7a" }}>{i + 1}</td>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                <td>
                  <span className={`status-badge ${u.isActive !== false ? "status-confirmed" : "status-cancelled"}`}>
                    {u.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Role Permissions Info */}
      <div className="role-info-grid">
        {ROLES.map((r) => (
          <div className="role-info-card" key={r}>
            <div className={`role-badge role-${r}`}>{r}</div>
            <div className="role-info-desc">{ROLE_PERMISSIONS[r]}</div>
          </div>
        ))}
      </div>

      {/* Add Employee Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Add Employee</h3>
              <button className="btn-close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <label className="form-label" style={{ gridColumn: "1/-1" }}>Full Name *
                  <input className="form-input" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. John Smith" />
                </label>

                <label className="form-label" style={{ gridColumn: "1/-1" }}>Email *
                  <input className="form-input" type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="employee@example.com" />
                </label>

                <label className="form-label" style={{ gridColumn: "1/-1" }}>Password *
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="form-input" style={{ flex: 1 }} value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min 6 characters" />
                    <button className="btn-secondary" onClick={generatePassword} style={{ whiteSpace: "nowrap" }}>
                      🔀 Generate
                    </button>
                  </div>
                </label>

                <label className="form-label" style={{ gridColumn: "1/-1" }}>Role *
                  <select className="form-input" value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  <span className="form-hint" style={{ marginTop: 4 }}>{ROLE_PERMISSIONS[form.role]}</span>
                </label>
              </div>
            </div>

            {error && <div className="modal-error">{error}</div>}

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? "Creating…" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
