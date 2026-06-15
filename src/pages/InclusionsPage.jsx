import { useState, useEffect } from "react";
import { apiFetch } from "../api";

const TABS = [
  { key: "inclusion", label: "✅ Inclusions" },
  { key: "exclusion", label: "❌ Exclusions" },
];

export default function InclusionsPage({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("inclusion");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/inclusions-exclusions", { headers });
      if (res.ok) setItems(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => i.type === tab);

  const openAdd = () => {
    setEditing(null); setText(""); setCategory(""); setError("");
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setText(item.text);
    setCategory(item.category || "");
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!text.trim()) { setError("Text is required"); return; }
    setSaving(true); setError("");
    try {
      const body = { type: tab, text: text.trim(), category: category.trim() };
      const res = await apiFetch(
        editing ? `/api/inclusions-exclusions/${editing._id}` : "/api/inclusions-exclusions",
        { method: editing ? "PUT" : "POST", headers, body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowForm(false);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this item?")) return;
    await apiFetch(`/api/inclusions-exclusions/${id}`, { method: "DELETE", headers });
    load();
  };

  // Group by category
  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <h2>📋 Inclusions & Exclusions</h2>
        <button className="btn-primary" onClick={openAdd}>
          ➕ Add {tab === "inclusion" ? "Inclusion" : "Exclusion"}
        </button>
      </div>

      {/* Tabs */}
      <div className="filter-tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`filter-tab ${tab === t.key ? "filter-tab-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className="filter-count">{items.filter(i => i.type === t.key).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="dash-loading">⏳ Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">No {tab}s yet. Click "Add" to create one.</div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <div className="ie-category-label">{cat}</div>
            <div className="ie-list">
              {catItems.map(item => (
                <div key={item._id} className="ie-item">
                  <span className="ie-icon">{tab === "inclusion" ? "✅" : "❌"}</span>
                  <span className="ie-text">{item.text}</span>
                  <div className="ie-actions">
                    <button className="btn-xs btn-confirm" onClick={() => openEdit(item)}>✏️</button>
                    <button className="btn-xs btn-cancel" onClick={() => handleDelete(item._id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{editing ? "Edit" : "Add"} {tab === "inclusion" ? "Inclusion" : "Exclusion"}</h3>
              <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <label className="form-label" style={{ gridColumn: "1/-1" }}>
                  Text *
                  <input
                    className="form-input"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={tab === "inclusion" ? "e.g. Breakfast included" : "e.g. Lunch not included"}
                    autoFocus
                  />
                </label>
                <label className="form-label" style={{ gridColumn: "1/-1" }}>
                  Category <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
                  <input
                    className="form-input"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="e.g. meals, transport, stay"
                  />
                </label>
              </div>
            </div>
            {error && <div className="modal-error">{error}</div>}
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
