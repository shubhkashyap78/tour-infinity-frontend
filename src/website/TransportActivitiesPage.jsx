import { useState } from "react";

const emptyTransport = () => ({ from: "", to: "", description: "", vehicle: "" });
const emptyActivity = () => ({ activityName: "", adults: 1, children: 0, remarks: "" });
const emptyDay = (n) => ({ day: n, transportation: [emptyTransport()], activities: [emptyActivity()] });

export default function TransportActivitiesPage() {
  const [days, setDays] = useState([emptyDay(1)]);
  const [submitted, setSubmitted] = useState(false);

  // ── Day helpers ──────────────────────────────────────────────
  const addDay = () => setDays((d) => [...d, emptyDay(d.length + 1)]);
  const removeDay = (di) => setDays((d) => d.filter((_, i) => i !== di).map((day, i) => ({ ...day, day: i + 1 })));

  // ── Transportation helpers ───────────────────────────────────
  const updateTransport = (di, ti, field, val) =>
    setDays((d) => d.map((day, i) => i !== di ? day : {
      ...day,
      transportation: day.transportation.map((t, j) => j !== ti ? t : { ...t, [field]: val })
    }));

  const addTransport = (di) =>
    setDays((d) => d.map((day, i) => i !== di ? day : { ...day, transportation: [...day.transportation, emptyTransport()] }));

  const removeTransport = (di, ti) =>
    setDays((d) => d.map((day, i) => i !== di ? day : { ...day, transportation: day.transportation.filter((_, j) => j !== ti) }));

  // ── Activity helpers ─────────────────────────────────────────
  const updateActivity = (di, ai, field, val) =>
    setDays((d) => d.map((day, i) => i !== di ? day : {
      ...day,
      activities: day.activities.map((a, j) => j !== ai ? a : { ...a, [field]: val })
    }));

  const addActivity = (di) =>
    setDays((d) => d.map((day, i) => i !== di ? day : { ...day, activities: [...day.activities, emptyActivity()] }));

  const removeActivity = (di, ai) =>
    setDays((d) => d.map((day, i) => i !== di ? day : { ...day, activities: day.activities.filter((_, j) => j !== ai) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted:", JSON.stringify(days, null, 2));
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div>
      {/* Hero */}
      <section className="lp-hero" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1600&q=80)" }}>
        <div className="lp-hero-overlay" />
        <div className="lp-hero-content">
          <span className="lp-hero-icon">🚌</span>
          <h1>Transportation & Activities</h1>
          <p>Plan your day-wise transfers and activities across Andaman.</p>
        </div>
      </section>

      <div className="lp-body">
        <form onSubmit={handleSubmit}>
          {days.map((day, di) => (
            <div key={di} className="ta-day-card">
              {/* Day Header */}
              <div className="ta-day-header">
                <span className="ta-day-title">📅 Day {day.day}</span>
                {days.length > 1 && (
                  <button type="button" className="ta-remove-btn" onClick={() => removeDay(di)}>✕ Remove Day</button>
                )}
              </div>

              {/* Transportation Section */}
              <div className="ta-section">
                <div className="ta-section-title">🚗 Transportation</div>
                {day.transportation.map((t, ti) => (
                  <div key={ti} className="ta-row-card">
                    <div className="ta-row-header">
                      <span>Transfer {ti + 1}</span>
                      {day.transportation.length > 1 && (
                        <button type="button" className="ta-remove-sm" onClick={() => removeTransport(di, ti)}>✕</button>
                      )}
                    </div>
                    <div className="vw-fields-grid">
                      <label className="vw-field-label">From
                        <input className="ws-form-input" value={t.from} onChange={(e) => updateTransport(di, ti, "from", e.target.value)} placeholder="e.g. Port Blair Airport" />
                      </label>
                      <label className="vw-field-label">To
                        <input className="ws-form-input" value={t.to} onChange={(e) => updateTransport(di, ti, "to", e.target.value)} placeholder="e.g. Hotel Sea Shell" />
                      </label>
                      <label className="vw-field-label">Vehicle
                        <input className="ws-form-input" value={t.vehicle} onChange={(e) => updateTransport(di, ti, "vehicle", e.target.value)} placeholder="e.g. Innova / Tempo Traveller" />
                      </label>
                      <label className="vw-field-label" style={{ gridColumn: "1/-1" }}>Description
                        <input className="ws-form-input" value={t.description} onChange={(e) => updateTransport(di, ti, "description", e.target.value)} placeholder="e.g. Airport pickup, AC vehicle" />
                      </label>
                    </div>
                  </div>
                ))}
                <button type="button" className="ta-add-row-btn" onClick={() => addTransport(di)}>+ Add Transfer</button>
              </div>

              {/* Activities Section */}
              <div className="ta-section">
                <div className="ta-section-title">🏄 Activities</div>
                {day.activities.map((a, ai) => (
                  <div key={ai} className="ta-row-card">
                    <div className="ta-row-header">
                      <span>Activity {ai + 1}</span>
                      {day.activities.length > 1 && (
                        <button type="button" className="ta-remove-sm" onClick={() => removeActivity(di, ai)}>✕</button>
                      )}
                    </div>
                    <div className="vw-fields-grid">
                      <label className="vw-field-label" style={{ gridColumn: "1/-1" }}>Activity Name
                        <input className="ws-form-input" value={a.activityName} onChange={(e) => updateActivity(di, ai, "activityName", e.target.value)} placeholder="e.g. Scuba Diving at North Bay" />
                      </label>
                      <label className="vw-field-label">Adults
                        <input className="ws-form-input" type="number" min={0} value={a.adults} onChange={(e) => updateActivity(di, ai, "adults", Number(e.target.value))} />
                      </label>
                      <label className="vw-field-label">Children
                        <input className="ws-form-input" type="number" min={0} value={a.children} onChange={(e) => updateActivity(di, ai, "children", Number(e.target.value))} />
                      </label>
                      <label className="vw-field-label" style={{ gridColumn: "1/-1" }}>Remarks
                        <input className="ws-form-input" value={a.remarks} onChange={(e) => updateActivity(di, ai, "remarks", e.target.value)} placeholder="e.g. Life jacket included" />
                      </label>
                    </div>
                  </div>
                ))}
                <button type="button" className="ta-add-row-btn" onClick={() => addActivity(di)}>+ Add Activity</button>
              </div>
            </div>
          ))}

          <div className="ta-footer-actions">
            <button type="button" className="ta-add-day-btn" onClick={addDay}>+ Add Day</button>
            <button type="submit" className="ws-add-btn-lg">{submitted ? "✓ Submitted!" : "Submit Plan →"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
