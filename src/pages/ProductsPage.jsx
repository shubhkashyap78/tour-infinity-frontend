import { useState } from "react";
import { apiFetch } from "../api";

const MARKETS = [
  { key: "DE", label: "Germany",        currency: "EUR", flag: "🇩🇪" },
  { key: "UK", label: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
  { key: "FR", label: "France",         currency: "EUR", flag: "🇫🇷" },
  { key: "IN", label: "India",          currency: "INR", flag: "🇮🇳" },
];

const LOCALES = [
  { key: "de", label: "Deutsch 🇩🇪" },
  { key: "fr", label: "Français 🇫🇷" },
  { key: "hi", label: "Hindi 🇮🇳" },
];

const TOUR_CATEGORIES = [
  "Sea Activity", "Safari", "City Tour", "Adventure", "Cultural", "Wildlife", "Water Sports", "Hiking", "Other",
];

const TYPE_ICONS = { hotel: "🏨", tour: "🗺️", package: "📦", vehicle: "🚗" };

const blankForm = (type) => ({
  title: "", type, description: "", tags: "",
  basePrice: 0, baseCurrency: "USD", isActive: true,
  inventory: { quantity: 0, stopSales: false },
  media: [],
  markets: MARKETS.map((m) => ({ market: m.key, currency: m.currency, price: 0, offerLabel: "" })),
  localized: LOCALES.map((l) => ({ locale: l.key, title: "", description: "" })),
  // tour-specific
  tourCategory: "Sea Activity", duration: "", meetingPoint: "", includes: "",
  childPricing: { enabled: false, infant: 0, child: "half" },
  // vehicle-specific
  vehicleModel: "", vehicleCapacity: 4, hasAC: true, luggageCapacity: 2,
  transferPricing: { airportOneWay: 0, airportTwoWay: 0, hotelTransfer: 0, fullDay4hrs: 0, fullDay8hrs: 0 },
});

export default function ProductsPage({ token, type }) {
  const [products, setProducts] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm(type));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("basic");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [search, setSearch] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    const res = await apiFetch(`/api/products?type=${type}`, { headers });
    if (res.ok) setProducts(await res.json());
  };

  if (products === null) { load(); return <div className="dash-loading">⏳ Loading...</div>; }

  const filtered = products.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => {
    setForm(blankForm(type)); setEditing(null); setTab("basic"); setError(""); setShowForm(true);
  };

  const openEdit = (p) => {
    const markets = MARKETS.map((m) => p.markets?.find((x) => x.market === m.key) || { market: m.key, currency: m.currency, price: 0, offerLabel: "" });
    const localized = LOCALES.map((l) => p.localized?.find((x) => x.locale === l.key) || { locale: l.key, title: "", description: "" });
    const blank = blankForm(type);
    setForm({
      ...blank, ...p,
      tags: (p.tags || []).join(", "),
      includes: (p.includes || []).join(", "),
      markets, localized,
      inventory: p.inventory || { quantity: 0, stopSales: false },
      vehicleModel:     p.vehicleModel     ?? blank.vehicleModel,
      vehicleCapacity:  p.vehicleCapacity  ?? blank.vehicleCapacity,
      hasAC:            p.hasAC            ?? blank.hasAC,
      luggageCapacity:  p.luggageCapacity  ?? blank.luggageCapacity,
      transferPricing: {
        airportOneWay: p.transferPricing?.airportOneWay ?? 0,
        airportTwoWay: p.transferPricing?.airportTwoWay ?? 0,
        hotelTransfer: p.transferPricing?.hotelTransfer ?? 0,
        fullDay4hrs:   p.transferPricing?.fullDay4hrs   ?? 0,
        fullDay8hrs:   p.transferPricing?.fullDay8hrs   ?? 0,
      },
    });
    setEditing(p._id); setTab("basic"); setError(""); setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const fullPrice = Number(form.basePrice) || 0;
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        includes: form.includes ? form.includes.split(",").map((t) => t.trim()).filter(Boolean) : [],
        basePrice: fullPrice,
        inventory: { quantity: Number(form.inventory.quantity), stopSales: form.inventory.stopSales },
        markets: form.markets.map((m) => ({ ...m, price: Number(m.price) })),
        ...(type === "tour" && {
          childPricing: {
            enabled: true,
            infantPrice: 0,
            childPrice: Math.round(fullPrice / 2),
            adultPrice: fullPrice,
          },
        }),
        ...(type === "vehicle" && {
          vehicleCapacity: Number(form.vehicleCapacity) || 4,
          luggageCapacity: Number(form.luggageCapacity) || 2,
          transferPricing: {
            airportOneWay:  Number(form.transferPricing?.airportOneWay)  || 0,
            airportTwoWay:  Number(form.transferPricing?.airportTwoWay)  || 0,
            hotelTransfer:  Number(form.transferPricing?.hotelTransfer)  || 0,
            fullDay4hrs:    Number(form.transferPricing?.fullDay4hrs)    || 0,
            fullDay8hrs:    Number(form.transferPricing?.fullDay8hrs)    || 0,
          },
        }),
      };
      const res = await apiFetch(editing ? `/api/products/${editing}` : "/api/products", {
        method: editing ? "PUT" : "POST", headers, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowForm(false); setProducts(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await apiFetch(`/api/products/${id}`, { method: "DELETE", headers });
    setProducts(null);
  };

  const handleDuplicate = async (id) => {
    await apiFetch(`/api/products/${id}/duplicate`, { method: "POST", headers });
    setProducts(null);
  };

  const toggleStopSales = async (p) => {
    await apiFetch(`/api/products/${p._id}/inventory`, {
      method: "PATCH", headers,
      body: JSON.stringify({ stopSales: !p.inventory?.stopSales }),
    });
    setProducts(null);
  };

  const addMedia = () => {
    if (!mediaUrl.trim()) return;
    setForm((f) => ({ ...f, media: [...f.media, { type: mediaType, url: mediaUrl.trim(), caption: "" }] }));
    setMediaUrl("");
  };

  const removeMedia = (i) => setForm((f) => ({ ...f, media: f.media.filter((_, idx) => idx !== i) }));

  const setMarket = (i, field, val) => setForm((f) => {
    const markets = [...f.markets]; markets[i] = { ...markets[i], [field]: val }; return { ...f, markets };
  });

  const setLocalized = (i, field, val) => setForm((f) => {
    const localized = [...f.localized]; localized[i] = { ...localized[i], [field]: val }; return { ...f, localized };
  });

  // Vehicle basic tab
  const renderVehicleBasic = () => {
    const tp = form.transferPricing || {};
    const setTP = (key, val) => setForm((f) => ({ ...f, transferPricing: { ...f.transferPricing, [key]: val } }));
    return (
      <div className="form-grid">
        <label className="form-label" style={{ gridColumn: "1/-1" }}>Vehicle Name *
          <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Toyota Etios Sedan" />
        </label>
        <label className="form-label">Vehicle Model
          <input className="form-input" value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} placeholder="e.g. Toyota Etios" />
        </label>
        <label className="form-label">Seating Capacity
          <input className="form-input" type="number" min={1} value={form.vehicleCapacity} onChange={(e) => setForm({ ...form, vehicleCapacity: e.target.value })} />
        </label>
        <label className="form-label">Luggage Bags
          <input className="form-input" type="number" min={0} value={form.luggageCapacity} onChange={(e) => setForm({ ...form, luggageCapacity: e.target.value })} />
        </label>
        <label className="form-label">Base Currency
          <select className="form-input" value={form.baseCurrency} onChange={(e) => setForm({ ...form, baseCurrency: e.target.value })}>
            {["USD", "EUR", "GBP", "INR"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="form-label" style={{ gridColumn: "1/-1" }}>Description
          <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
        </label>
        <label className="form-label">Tags
          <input className="form-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="sedan, ac, luxury" />
        </label>
        <label className="form-label form-check" style={{ alignSelf: "flex-end", paddingBottom: 8 }}>
          <input type="checkbox" checked={form.hasAC} onChange={(e) => setForm({ ...form, hasAC: e.target.checked })} />
          AC Available
        </label>
        <div style={{ gridColumn: "1/-1", background: "#f9f4ef", borderRadius: 10, padding: 16, border: "1px solid #e8d9c8" }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>💰 Transfer Pricing ({form.baseCurrency})</div>
          <div className="form-grid">
            <label className="form-label">✈️ Airport — One Way
              <input className="form-input" type="number" min={0} value={tp.airportOneWay || 0} onChange={(e) => setTP("airportOneWay", e.target.value)} />
            </label>
            <label className="form-label">✈️ Airport — Two Way
              <input className="form-input" type="number" min={0} value={tp.airportTwoWay || 0} onChange={(e) => setTP("airportTwoWay", e.target.value)} />
            </label>
            <label className="form-label">🏨 Hotel Transfer
              <input className="form-input" type="number" min={0} value={tp.hotelTransfer || 0} onChange={(e) => setTP("hotelTransfer", e.target.value)} />
            </label>
            <div />
            <label className="form-label">🗺️ Full Day — 4 Hours
              <input className="form-input" type="number" min={0} value={tp.fullDay4hrs || 0} onChange={(e) => setTP("fullDay4hrs", e.target.value)} />
            </label>
            <label className="form-label">🗺️ Full Day — 8 Hours
              <input className="form-input" type="number" min={0} value={tp.fullDay8hrs || 0} onChange={(e) => setTP("fullDay8hrs", e.target.value)} />
            </label>
          </div>
        </div>
        <label className="form-label form-check" style={{ gridColumn: "1/-1" }}>
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Active (visible to customers)
        </label>
      </div>
    );
  };

  const label = type.charAt(0).toUpperCase() + type.slice(1);

  // Tour basic tab — simplified form
  const renderTourBasic = () => {
    const fullPrice = Number(form.basePrice) || 0;
    const halfPrice = Math.round(fullPrice / 2);
    return (
      <div className="form-grid">
        <label className="form-label" style={{ gridColumn: "1/-1" }}>Tour Title *
          <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sunset Sea Kayaking" />
        </label>

        <label className="form-label">Category
          <select className="form-input" value={form.tourCategory} onChange={(e) => setForm({ ...form, tourCategory: e.target.value })}>
            {TOUR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>

        <label className="form-label">Duration
          <input className="form-input" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 3 hours, Full Day" />
        </label>

        <label className="form-label" style={{ gridColumn: "1/-1" }}>Description
          <textarea className="form-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What will guests experience?" />
        </label>

        <label className="form-label">Meeting Point
          <input className="form-input" value={form.meetingPoint} onChange={(e) => setForm({ ...form, meetingPoint: e.target.value })} placeholder="e.g. Main Beach Jetty" />
        </label>

        <label className="form-label">Includes (comma separated)
          <input className="form-input" value={form.includes} onChange={(e) => setForm({ ...form, includes: e.target.value })} placeholder="e.g. Equipment, Guide, Snacks" />
        </label>

        <label className="form-label">Tags
          <input className="form-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="beach, family, adventure" />
        </label>

        <label className="form-label">Base Currency
          <select className="form-input" value={form.baseCurrency} onChange={(e) => setForm({ ...form, baseCurrency: e.target.value })}>
            {["USD", "EUR", "GBP", "INR"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>

        {/* Pricing Section */}
        <div style={{ gridColumn: "1/-1", background: "#f9f4ef", borderRadius: 10, padding: 16, border: "1px solid #e8d9c8" }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>💰 Pricing per Person</div>
          <div className="form-grid">
            <label className="form-label">Adult Price ({form.baseCurrency}) — 11+ yrs *
              <input className="form-input" type="number" min={0} value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end", paddingBottom: 4 }}>
              <div style={{ fontSize: 13, color: "#6b5b4a", background: "#fff", border: "1px solid #e8d9c8", borderRadius: 6, padding: "6px 10px" }}>
                👶 Infant (0–5 yrs): <strong>FREE</strong>
              </div>
              <div style={{ fontSize: 13, color: "#6b5b4a", background: "#fff", border: "1px solid #e8d9c8", borderRadius: 6, padding: "6px 10px" }}>
                🧒 Child (5–11 yrs): <strong>{form.baseCurrency} {halfPrice.toLocaleString()}</strong> (half price)
              </div>
            </div>
          </div>
        </div>

        <label className="form-label form-check" style={{ gridColumn: "1/-1" }}>
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Active (visible to customers)
        </label>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>{TYPE_ICONS[type]} {label}s <span className="page-count">({products.length})</span></h2>
        <div style={{ display: "flex", gap: 10 }}>
          <input className="form-input search-input" placeholder={`🔍 Search ${label}s...`} value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-primary" onClick={openAdd}>+ Add {label}</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">{search ? "No results found." : `No ${label}s yet. Click "Add ${label}" to create one.`}</p>
      ) : (
        <div className="product-grid">
          {filtered.map((p) => (
            <div className="product-card" key={p._id}>
              <div className="product-media">
                {p.media?.[0] ? (
                  p.media[0].type === "video"
                    ? <video src={p.media[0].url} className="product-thumb" muted />
                    : <img src={p.media[0].url} alt={p.title} className="product-thumb" onError={(e) => { e.target.style.display = "none"; }} />
                ) : (
                  <div className="product-thumb-placeholder">{TYPE_ICONS[p.type]}</div>
                )}
                {p.media?.length > 1 && <span className="media-count">+{p.media.length - 1} more</span>}
                {p.inventory?.stopSales && <span className="stop-sales-badge">🚫 Sales Stopped</span>}
                {!p.isActive && <span className="inactive-badge">Inactive</span>}
              </div>

              <div className="product-info">
                <div className="product-title">{p.title}</div>
                <div className="product-meta">
                  <span className={`badge badge-${p.type}`}>{p.type}</span>
                  <span className="product-price">
                    {p.type === "vehicle" && p.transferPricing
                      ? (() => {
                          const tp = p.transferPricing;
                          const first = tp.airportOneWay || tp.airportTwoWay || tp.hotelTransfer || tp.fullDay4hrs || tp.fullDay8hrs || 0;
                          return first > 0 ? `${p.baseCurrency} ${Number(first).toLocaleString()} from` : `${p.baseCurrency} 0`;
                        })()
                      : `${p.baseCurrency} ${p.basePrice?.toLocaleString()}`}
                  </span>
                </div>
                {p.type === "vehicle" && (
                  <div style={{ fontSize: 12, color: "#6b5b4a", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {p.vehicleCapacity && <span>👥 {p.vehicleCapacity} seats</span>}
                    {p.hasAC && <span>❄️ AC</span>}
                    {p.luggageCapacity > 0 && <span>🧳 {p.luggageCapacity} bags</span>}
                  </div>
                )}
                {p.description && <p className="product-desc">{p.description.slice(0, 80)}{p.description.length > 80 ? "…" : ""}</p>}
                {p.tags?.length > 0 && (
                  <div className="tag-list">{p.tags.map((t) => <span key={t} className="tag-chip">{t}</span>)}</div>
                )}
                <div className="product-inventory">
                  Stock: <strong>{p.inventory?.quantity ?? 0}</strong>&nbsp;·&nbsp;
                  <button className={`btn-stopsales ${p.inventory?.stopSales ? "active" : ""}`} onClick={() => toggleStopSales(p)}>
                    {p.inventory?.stopSales ? "▶ Resume Sales" : "⏸ Stop Sales"}
                  </button>
                </div>
                {p.markets?.some((m) => m.price > 0) && (
                  <div className="market-flags">
                    {MARKETS.filter((m) => p.markets.find((x) => x.market === m.key && x.price > 0)).map((m) => (
                      <span key={m.key} title={`${m.label}: ${m.currency} ${p.markets.find((x) => x.market === m.key)?.price}`}>{m.flag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="product-actions">
                <button className="btn-icon" title="Edit" onClick={() => openEdit(p)}>✏️ Edit</button>
                <button className="btn-icon" title="Duplicate" onClick={() => handleDuplicate(p._id)}>📋 Copy</button>
                <button className="btn-icon btn-danger" title="Delete" onClick={() => handleDelete(p._id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? "Edit" : "Add"} {label}</h3>
              <button className="btn-close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div className="modal-tabs">
              {["basic", "media", "inventory", "markets", "localize"].map((t) => (
                <button key={t} className={`modal-tab ${tab === t ? "modal-tab-active" : ""}`} onClick={() => setTab(t)}>
                  {{ basic: "📝 Basic", media: "🖼️ Media", inventory: "📦 Inventory", markets: "🌍 Markets", localize: "🌐 Languages" }[t]}
                </button>
              ))}
            </div>

            <div className="modal-body">
              {tab === "basic" && (
                type === "tour" ? renderTourBasic() :
                type === "vehicle" ? renderVehicleBasic() : (
                <div className="form-grid">
                  <label className="form-label">Title *
                    <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Product title" />
                  </label>
                  <label className="form-label">Type
                    <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      {["hotel", "tour", "package", "vehicle"].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="form-label" style={{ gridColumn: "1/-1" }}>Description
                    <textarea className="form-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe this product..." />
                  </label>
                  <label className="form-label">Base Price
                    <input className="form-input" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
                  </label>
                  <label className="form-label">Base Currency
                    <select className="form-input" value={form.baseCurrency} onChange={(e) => setForm({ ...form, baseCurrency: e.target.value })}>
                      {["USD", "EUR", "GBP", "INR"].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="form-label" style={{ gridColumn: "1/-1" }}>Tags (comma separated)
                    <input className="form-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="beach, luxury, family" />
                  </label>
                  <label className="form-label form-check">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                    Active (visible to customers)
                  </label>
                </div>
                )
              )}

              {tab === "media" && (
                <div>
                  <div className="media-add-row">
                    <select className="form-input" style={{ width: 110 }} value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                      <option value="image">🖼️ Image</option>
                      <option value="video">🎬 Video</option>
                    </select>
                    <input className="form-input" style={{ flex: 1 }} value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="Paste image or video URL..." />
                    <button className="btn-primary" onClick={addMedia}>Add</button>
                  </div>
                  <p className="form-hint">Paste direct URLs for images (jpg, png, webp) or videos (mp4, YouTube, etc.)</p>
                  <div className="media-grid">
                    {form.media.length === 0 && <p className="empty">No media added yet.</p>}
                    {form.media.map((m, i) => (
                      <div className="media-item" key={i}>
                        {m.type === "video"
                          ? <video src={m.url} className="media-preview" muted controls />
                          : <img src={m.url} alt="" className="media-preview" onError={(e) => { e.target.alt = "Invalid URL"; }} />
                        }
                        <div className="media-item-footer">
                          <span className="media-type-tag">{m.type}</span>
                          <button className="btn-icon btn-danger" onClick={() => removeMedia(i)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "inventory" && (
                <div className="form-grid">
                  <label className="form-label">Stock Quantity
                    <input className="form-input" type="number" value={form.inventory.quantity}
                      onChange={(e) => setForm({ ...form, inventory: { ...form.inventory, quantity: e.target.value } })} />
                  </label>
                  <div />
                  <label className="form-label form-check" style={{ gridColumn: "1/-1" }}>
                    <input type="checkbox" checked={form.inventory.stopSales}
                      onChange={(e) => setForm({ ...form, inventory: { ...form.inventory, stopSales: e.target.checked } })} />
                    🚫 Stop Sales — prevent new bookings for this product
                  </label>
                </div>
              )}

              {tab === "markets" && (
                <div>
                  <p className="form-hint">Set market-specific prices and offer labels for each target market.</p>
                  {MARKETS.map((m, i) => (
                    <div className="market-row" key={m.key}>
                      <div className="market-flag-label">{m.flag} {m.label} <span className="market-currency">({form.markets[i]?.currency})</span></div>
                      <label className="form-label">Price ({form.markets[i]?.currency})
                        <input className="form-input" type="number" value={form.markets[i]?.price || 0} onChange={(e) => setMarket(i, "price", e.target.value)} />
                      </label>
                      <label className="form-label">Offer Label
                        <input className="form-input" value={form.markets[i]?.offerLabel || ""} onChange={(e) => setMarket(i, "offerLabel", e.target.value)} placeholder="e.g. Early Bird 10% off" />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {tab === "localize" && (
                <div>
                  <p className="form-hint">Provide translated title and description for each language.</p>
                  {LOCALES.map((l, i) => (
                    <div className="locale-row" key={l.key}>
                      <div className="locale-label">{l.label}</div>
                      <label className="form-label">Title
                        <input className="form-input" value={form.localized[i]?.title || ""} onChange={(e) => setLocalized(i, "title", e.target.value)} placeholder={`Title in ${l.label}`} />
                      </label>
                      <label className="form-label">Description
                        <textarea className="form-input" rows={2} value={form.localized[i]?.description || ""} onChange={(e) => setLocalized(i, "description", e.target.value)} placeholder={`Description in ${l.label}`} />
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="modal-error">{error}</div>}
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
