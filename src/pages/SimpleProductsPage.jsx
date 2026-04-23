import { useState } from "react";
import { apiFetch } from "../api";

const TYPE_ICONS = { hotel: "🏨", tour: "🗺️", package: "📦", vehicle: "🚗" };
const TYPE_LABELS = { hotel: "Hotel", tour: "Tour", package: "Package", vehicle: "Vehicle" };

const blankForm = (type) => ({
  name: "",
  type,
  description: "",
  pricing: {
    base: 0,
    currency: "INR"
  },
  location: "",
  tags: "",
  inclusions: "",
  exclusions: "",
  isActive: true,
  media: []
});

export default function ProductsPage({ token, type }) {
  const [products, setProducts] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm(type));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    const res = await apiFetch(`/api/products?type=${type}`, { headers });
    if (res.ok) setProducts(await res.json());
  };

  if (products === null) { 
    load(); 
    return <div className="dash-loading">⏳ Loading...</div>; 
  }

  const filtered = products.filter((p) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || 
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.location?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm(blankForm(type)); 
    setEditing(null); 
    setError(""); 
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      name: p.name || p.title || "",
      type: p.type,
      description: p.description || "",
      pricing: {
        base: p.pricing?.base || p.basePrice || 0,
        currency: p.pricing?.currency || "INR"
      },
      location: p.location || "",
      tags: (p.tags || []).join(", "),
      inclusions: (p.inclusions || []).join(", "),
      exclusions: (p.exclusions || []).join(", "),
      isActive: p.isActive !== false,
      media: p.media || []
    });
    setEditing(p._id); 
    setError(""); 
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true); 
    setError("");
    
    if (!form.name.trim()) {
      setError("Name is required");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        title: form.name.trim(), // For backward compatibility
        type: form.type,
        description: form.description.trim(),
        pricing: {
          base: Number(form.pricing.base) || 0,
          currency: form.pricing.currency
        },
        basePrice: Number(form.pricing.base) || 0, // For backward compatibility
        baseCurrency: form.pricing.currency, // For backward compatibility
        location: form.location.trim(),
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        inclusions: form.inclusions ? form.inclusions.split(",").map(t => t.trim()).filter(Boolean) : [],
        exclusions: form.exclusions ? form.exclusions.split(",").map(t => t.trim()).filter(Boolean) : [],
        isActive: form.isActive,
        media: form.media
      };

      const res = await apiFetch(editing ? `/api/products/${editing}` : "/api/products", {
        method: editing ? "PUT" : "POST", 
        headers, 
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setShowForm(false); 
      setProducts(null); // Reload
    } catch (e) { 
      setError(e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this item?")) return;
    await apiFetch(`/api/products/${id}`, { method: "DELETE", headers });
    setProducts(null);
  };

  const label = TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div>
      <div className="page-header">
        <h2>{TYPE_ICONS[type]} {label}s <span className="page-count">({products.length})</span></h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input 
            className="form-input search-input" 
            placeholder={`🔍 Search ${label}s...`} 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          <button className="btn-primary" onClick={openAdd}>
            ➕ Add {label}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          {search ? "No results found." : `No ${label}s yet. Click "Add ${label}" to create one.`}
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map((p) => (
            <div className="product-card" key={p._id}>
              <div className="product-media">
                {p.media?.[0] ? (
                  <img src={p.media[0].url} alt={p.name || p.title} className="product-thumb" />
                ) : (
                  <div className="product-thumb-placeholder">{TYPE_ICONS[p.type]}</div>
                )}
                {!p.isActive && <span className="inactive-badge">Inactive</span>}
              </div>

              <div className="product-info">
                <div className="product-title">{p.name || p.title}</div>
                <div className="product-meta">
                  <span className={`badge badge-${p.type}`}>{p.type}</span>
                  <span className="product-price">
                    ₹{(p.pricing?.base || p.basePrice || 0).toLocaleString()}
                  </span>
                </div>
                {p.location && (
                  <div className="product-location">📍 {p.location}</div>
                )}
                {p.description && (
                  <p className="product-desc">
                    {p.description.slice(0, 100)}{p.description.length > 100 ? "…" : ""}
                  </p>
                )}
                {p.tags?.length > 0 && (
                  <div className="tag-list">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="tag-chip">{t}</span>
                    ))}
                    {p.tags.length > 3 && <span className="tag-chip">+{p.tags.length - 3}</span>}
                  </div>
                )}
              </div>

              <div className="product-actions">
                <button className="btn-xs btn-confirm" onClick={() => openEdit(p)}>
                  ✏️ Edit
                </button>
                <button className="btn-xs btn-cancel" onClick={() => handleDelete(p._id)}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Simple Add/Edit Form */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? "Edit" : "Add"} {label}</h3>
              <button className="btn-close" onClick={() => setShowForm(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <label className="form-label" style={{ gridColumn: "1/-1" }}>
                  {label} Name *
                  <input 
                    className="form-input" 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                    placeholder={`Enter ${label.toLowerCase()} name`}
                  />
                </label>

                <label className="form-label">
                  Price (₹) *
                  <input 
                    className="form-input" 
                    type="number" 
                    min="0"
                    value={form.pricing.base} 
                    onChange={(e) => setForm({ 
                      ...form, 
                      pricing: { ...form.pricing, base: e.target.value }
                    })} 
                    placeholder="0"
                  />
                </label>

                <label className="form-label">
                  Location
                  <input 
                    className="form-input" 
                    value={form.location} 
                    onChange={(e) => setForm({ ...form, location: e.target.value })} 
                    placeholder="e.g., Port Blair, Havelock"
                  />
                </label>

                <label className="form-label" style={{ gridColumn: "1/-1" }}>
                  Description
                  <textarea 
                    className="form-input" 
                    rows={3}
                    value={form.description} 
                    onChange={(e) => setForm({ ...form, description: e.target.value })} 
                    placeholder={`Describe this ${label.toLowerCase()}...`}
                  />
                </label>

                <label className="form-label">
                  Tags (comma separated)
                  <input 
                    className="form-input" 
                    value={form.tags} 
                    onChange={(e) => setForm({ ...form, tags: e.target.value })} 
                    placeholder="luxury, beachfront, family"
                  />
                </label>

                <label className="form-label">
                  Category
                  <select 
                    className="form-input" 
                    value={form.type} 
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="hotel">Hotel</option>
                    <option value="tour">Tour</option>
                    <option value="package">Package</option>
                    <option value="vehicle">Vehicle</option>
                  </select>
                </label>

                <label className="form-label" style={{ gridColumn: "1/-1" }}>
                  Inclusions (comma separated)
                  <input 
                    className="form-input" 
                    value={form.inclusions} 
                    onChange={(e) => setForm({ ...form, inclusions: e.target.value })} 
                    placeholder="breakfast, wifi, pool access"
                  />
                </label>

                <label className="form-label" style={{ gridColumn: "1/-1" }}>
                  Exclusions (comma separated)
                  <input 
                    className="form-input" 
                    value={form.exclusions} 
                    onChange={(e) => setForm({ ...form, exclusions: e.target.value })} 
                    placeholder="lunch, dinner, transport"
                  />
                </label>

                <label className="form-label form-check" style={{ gridColumn: "1/-1" }}>
                  <input 
                    type="checkbox" 
                    checked={form.isActive} 
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })} 
                  />
                  Active (visible in quotations)
                </label>
              </div>
            </div>

            {error && <div className="modal-error">{error}</div>}
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : `Add ${label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}