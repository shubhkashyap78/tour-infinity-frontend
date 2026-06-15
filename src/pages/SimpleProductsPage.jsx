import { useState } from "react";
import { apiFetch } from "../api";

const TYPE_ICONS  = { hotel: "🏨", tour: "🗺️", package: "📦", vehicle: "🚌" };
const TYPE_LABELS = { hotel: "Hotel", tour: "Tour", package: "Package", vehicle: "Transport & Activities" };

// ── Day-wise itinerary helpers ──────────────────────────────
const emptyTransport = () => ({ from: "", to: "", description: "", vehicle: "" });
const emptyActivity  = () => ({ activityName: "", adults: 1, children: 0, remarks: "" });
const emptyDay = (n) => ({ day: n, transportation: [emptyTransport()], activities: [emptyActivity()] });

function DayItineraryForm({ days = [], setDays }) {
  const addDay = () => setDays([...days, emptyDay(days.length + 1)]);
  const removeDay = (di) => setDays(days.filter((_, i) => i !== di).map((x, i) => ({ ...x, day: i + 1 })));

  const updT = (di, ti, f, v) => setDays(days.map((day, i) => i !== di ? day : {
    ...day, transportation: day.transportation.map((t, j) => j !== ti ? t : { ...t, [f]: v })
  }));
  const addT = (di) => setDays(days.map((day, i) => i !== di ? day : { ...day, transportation: [...day.transportation, emptyTransport()] }));
  const rmT  = (di, ti) => setDays(days.map((day, i) => i !== di ? day : { ...day, transportation: day.transportation.filter((_, j) => j !== ti) }));

  const updA = (di, ai, f, v) => setDays(days.map((day, i) => i !== di ? day : {
    ...day, activities: day.activities.map((a, j) => j !== ai ? a : { ...a, [f]: v })
  }));
  const addA = (di) => setDays(days.map((day, i) => i !== di ? day : { ...day, activities: [...day.activities, emptyActivity()] }));
  const rmA  = (di, ai) => setDays(days.map((day, i) => i !== di ? day : { ...day, activities: day.activities.filter((_, j) => j !== ai) }));

  return (
    <div>
      {days.map((day, di) => (
        <div key={di} className="ta-day-card">
          <div className="ta-day-header">
            <span className="ta-day-title">📅 Day {day.day}</span>
            {days.length > 1 && (
              <button type="button" className="btn-xs btn-cancel" onClick={() => removeDay(di)}>✕ Remove Day</button>
            )}
          </div>

          {/* Transportation */}
          <div className="ta-section">
            <div className="ta-section-title">🚗 Transportation</div>
            {day.transportation.map((t, ti) => (
              <div key={ti} className="ta-row-card">
                <div className="ta-row-header">
                  <span>Transfer {ti + 1}</span>
                  {day.transportation.length > 1 && (
                    <button type="button" className="ta-remove-sm" onClick={() => rmT(di, ti)}>✕</button>
                  )}
                </div>
                <div className="form-grid">
                  <label className="form-label">From
                    <input className="form-input" value={t.from} onChange={e => updT(di, ti, "from", e.target.value)} placeholder="e.g. Port Blair Airport" />
                  </label>
                  <label className="form-label">To
                    <input className="form-input" value={t.to} onChange={e => updT(di, ti, "to", e.target.value)} placeholder="e.g. Hotel Sea Shell" />
                  </label>
                  <label className="form-label">Vehicle
                    <input className="form-input" value={t.vehicle} onChange={e => updT(di, ti, "vehicle", e.target.value)} placeholder="e.g. Innova / Tempo Traveller" />
                  </label>
                  <label className="form-label">Description
                    <input className="form-input" value={t.description} onChange={e => updT(di, ti, "description", e.target.value)} placeholder="e.g. AC vehicle, airport pickup" />
                  </label>
                </div>
              </div>
            ))}
            <button type="button" className="ta-add-row-btn" onClick={() => addT(di)}>+ Add Transfer</button>
          </div>

          {/* Activities */}
          <div className="ta-section">
            <div className="ta-section-title">🏄 Activities</div>
            {day.activities.map((a, ai) => (
              <div key={ai} className="ta-row-card">
                <div className="ta-row-header">
                  <span>Activity {ai + 1}</span>
                  {day.activities.length > 1 && (
                    <button type="button" className="ta-remove-sm" onClick={() => rmA(di, ai)}>✕</button>
                  )}
                </div>
                <div className="form-grid">
                  <label className="form-label" style={{ gridColumn: "1/-1" }}>Activity Name
                    <input className="form-input" value={a.activityName} onChange={e => updA(di, ai, "activityName", e.target.value)} placeholder="e.g. Scuba Diving at North Bay" />
                  </label>
                  <label className="form-label">Adults
                    <input className="form-input" type="number" min={0} value={a.adults} onChange={e => updA(di, ai, "adults", Number(e.target.value))} />
                  </label>
                  <label className="form-label">Children
                    <input className="form-input" type="number" min={0} value={a.children} onChange={e => updA(di, ai, "children", Number(e.target.value))} />
                  </label>
                  <label className="form-label" style={{ gridColumn: "1/-1" }}>Remarks
                    <input className="form-input" value={a.remarks} onChange={e => updA(di, ai, "remarks", e.target.value)} placeholder="e.g. Life jacket included" />
                  </label>
                </div>
              </div>
            ))}
            <button type="button" className="ta-add-row-btn" onClick={() => addA(di)}>+ Add Activity</button>
          </div>
        </div>
      ))}
      <button type="button" className="ta-add-day-btn" onClick={addDay}>+ Add Day</button>
    </div>
  );
}

const blankForm = (type) => ({
  name: "",
  type,
  description: "",
  pricing: { base: 0, currency: "INR" },
  location: "",
  tags: "",
  inclusions: "",
  exclusions: "",
  isActive: true,
  media: [],
  days: [emptyDay(1)]
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
      pricing: { base: p.pricing?.base || p.basePrice || 0, currency: p.pricing?.currency || "INR" },
      location: p.location || "",
      tags: (p.tags || []).join(", "),
      inclusions: (p.inclusions || []).join(", "),
      exclusions: (p.exclusions || []).join(", "),
      isActive: p.isActive !== false,
      media: p.media || [],
      days: p.days?.length ? p.days : [emptyDay(1)]
    });
    setEditing(p._id); setError(""); setShowForm(true);
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
        title: form.name.trim(),
        type: form.type,
        description: form.description.trim(),
        pricing: { base: Number(form.pricing.base) || 0, currency: form.pricing.currency },
        basePrice: Number(form.pricing.base) || 0,
        baseCurrency: form.pricing.currency,
        location: form.location.trim(),
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        inclusions: form.inclusions ? form.inclusions.split(",").map(t => t.trim()).filter(Boolean) : [],
        exclusions: form.exclusions ? form.exclusions.split(",").map(t => t.trim()).filter(Boolean) : [],
        isActive: form.isActive,
        media: form.media,
        ...(form.type === "vehicle" && { days: form.days })
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
              {/* Common fields */}
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ gridColumn: "1/-1" }}>
                  Name *
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={`Enter name`} />
                </label>
                <label className="form-label">
                  Price (₹)
                  <input className="form-input" type="number" min="0" value={form.pricing.base} onChange={(e) => setForm({ ...form, pricing: { ...form.pricing, base: e.target.value } })} placeholder="0" />
                </label>
                <label className="form-label">
                  Location
                  <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Port Blair" />
                </label>
                <label className="form-label" style={{ gridColumn: "1/-1" }}>
                  Description
                  <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." />
                </label>
                <label className="form-label form-check" style={{ gridColumn: "1/-1" }}>
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  Active (visible in quotations)
                </label>
              </div>

              {/* Vehicle: Day-wise itinerary */}
              {type === "vehicle" ? (
                <DayItineraryForm
                  days={Array.isArray(form.days) ? form.days : [emptyDay(1)]}
                  setDays={(days) => setForm(f => ({ ...f, days }))}
                />
              ) : (
                <div className="form-grid">
                  <label className="form-label">
                    Tags (comma separated)
                    <input className="form-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="luxury, beachfront" />
                  </label>
                  <label className="form-label">
                    Category
                    <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="hotel">Hotel</option>
                      <option value="tour">Tour</option>
                      <option value="package">Package</option>
                    </select>
                  </label>
                  <label className="form-label" style={{ gridColumn: "1/-1" }}>
                    Inclusions (comma separated)
                    <input className="form-input" value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} placeholder="breakfast, wifi" />
                  </label>
                  <label className="form-label" style={{ gridColumn: "1/-1" }}>
                    Exclusions (comma separated)
                    <input className="form-input" value={form.exclusions} onChange={(e) => setForm({ ...form, exclusions: e.target.value })} placeholder="lunch, dinner" />
                  </label>
                </div>
              )}
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