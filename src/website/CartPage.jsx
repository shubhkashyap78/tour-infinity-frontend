import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "./CartContext";
import { apiFetch } from "../api";

const EMPTY_FORM = { name: "", email: "", phone: "", tourDate: "", checkIn: "", checkOut: "", notes: "" };

export default function CartPage() {
  const { items, updateTourGuests, removeItem, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const hasTour = items.some((i) => i.type === "tour");
  const hasNonTour = items.some((i) => i.type !== "tour");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const results = await Promise.all(
        items.map((item) =>
          apiFetch("/api/bookings/enquiry", {
            method: "POST",
            body: JSON.stringify({
              product: item._id,
              productType: item.type,
              customerName: form.name,
              customerEmail: form.email,
              customerPhone: form.phone,
              guests: typeof item.guests === "object"
                ? (item.guests.adults || 0) + (item.guests.children || 0) + (item.guests.infants || 0)
                : item.guests,
              guestBreakdown: typeof item.guests === "object" ? item.guests : undefined,
              checkIn: item.type === "tour" ? (form.tourDate || undefined) : (form.checkIn || undefined),
              checkOut: item.type === "tour" ? undefined : (form.checkOut || undefined),
              totalAmount: item.lineTotal ?? item.basePrice * item.guests,
              currency: item.baseCurrency,
              notes: form.notes,
              status: "pending",
              paymentStatus: "unpaid",
            }),
          }).then((r) => r.json())
        )
      );
      const failed = results.find((r) => r.message && !r._id);
      if (failed) throw new Error(failed.message);
      clearCart();
      setSuccess(`✅ Enquiry submitted! Our team will contact you at ${form.email} shortly.`);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="ws-cart-success">
        <div className="ws-success-icon">🎉</div>
        <h2>Booking Enquiry Sent!</h2>
        <p>{success}</p>
        <button className="ws-add-btn-lg" onClick={() => navigate("/")}>Continue Browsing</button>
      </div>
    );
  }

  const grandTotal = items.reduce((acc, item) => {
    const cur = item.baseCurrency || "USD";
    acc[cur] = (acc[cur] || 0) + (item.lineTotal ?? item.basePrice * (item.guests || 1));
    return acc;
  }, {});

  return (
    <div className="ws-cart-page">
      <h2 className="ws-cart-title">🛒 Your Cart</h2>

      {items.length === 0 ? (
        <div className="ws-empty">Your cart is empty. <Link to="/">Browse products →</Link></div>
      ) : (
        <div className="ws-cart-layout">
          {/* Cart Items */}
          <div className="ws-cart-items">
            {items.map((item) => {
              const isTour = item.type === "tour";
              const g = item.guests;
              return (
                <div className="ws-cart-row" key={item._id} style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                  {/* Top row: image + title + price + remove */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div className="ws-cart-img">
                      {item.image
                        ? <img src={item.image} alt={item.title} />
                        : <div className="ws-cart-img-placeholder">📦</div>}
                    </div>
                    <div className="ws-cart-info">
                      <div className="ws-cart-item-title">{item.title}</div>
                      <span className="ws-card-type">{item.type}</span>
                    </div>
                    <div className="ws-cart-item-price">
                      {item.baseCurrency} {(item.lineTotal ?? item.basePrice * (g || 1)).toLocaleString()}
                    </div>
                    <button className="ws-cart-remove" onClick={() => removeItem(item._id)}>✕</button>
                  </div>

                  {/* Tour: age-based guest counters */}
                  {isTour && typeof g === "object" && (
                    <div className="ws-cart-tour-guests">
                      {[
                        { key: "adults",   label: "Adults (11+ yrs)",   price: item.basePrice,  emoji: "👨" },
                        { key: "children", label: "Children (5–11 yrs)", price: item.childPrice, emoji: "🧒" },
                        { key: "infants",  label: "Infants (0–5 yrs)",   price: 0,               emoji: "👶" },
                      ].map(({ key, label, price, emoji }) => (
                        <div className="ws-cart-guest-row" key={key}>
                          <span className="ws-cart-guest-label">{emoji} {label}</span>
                          <div className="ws-qty">
                            <button onClick={() => updateTourGuests(item._id, key, -1)}>−</button>
                            <span>{g[key]}</span>
                            <button onClick={() => updateTourGuests(item._id, key, 1)}>+</button>
                          </div>
                          <span className="ws-cart-guest-price">
                            {price === 0 ? "Free" : `${item.baseCurrency} ${(price * g[key]).toLocaleString()}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Non-tour: simple guest count */}
                  {!isTour && item.type !== "vehicle" && (
                    <div style={{ fontSize: 13, color: "#6b5b4a", paddingLeft: 4 }}>
                      {g} guest{g > 1 ? "s" : ""}
                    </div>
                  )}

                  {/* Vehicle: booking details */}
                  {item.type === "vehicle" && item.bookingDetails && (() => {
                    const bd = item.bookingDetails;
                    const sLabel = { airport: "✈️ Airport Transfer", hotel: "🏨 Hotel Transfer", fullday: "🗺️ Full Day Excursion" }[bd.serviceType] || "Transfer";
                    return (
                      <div style={{ fontSize: 12, color: "#6b5b4a", marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>{sLabel}{bd.tripType === "twoWay" ? " · Two Way" : bd.tripType === "oneWay" ? " · One Way" : ""}</span>
                        {bd.pickup && <span>📍 From: {bd.pickup}</span>}
                        {bd.drop && <span>📍 To: {bd.drop}</span>}
                        {bd.date && <span>📅 {bd.date}{bd.time ? ` · ${bd.time}` : ""}</span>}
                        {bd.passengers > 1 && <span>👥 {bd.passengers} passengers</span>}
                        {bd.flightNo && <span>✈️ Flight: {bd.flightNo}</span>}
                        {bd.destination && <span>🗺️ {bd.destination}</span>}
                      </div>
                    );
                  })()}
                </div>
              );
            })}

            {/* Total */}
            <div className="ws-cart-total-row">
              <span>Total</span>
              <span className="ws-cart-total-amount">
                {Object.entries(grandTotal).map(([cur, amt]) => `${cur} ${amt.toLocaleString()}`).join(" + ")}
              </span>
            </div>
            <button className="ws-clear-btn" onClick={clearCart}>Clear Cart</button>
          </div>

          {/* Enquiry Form */}
          <form className="ws-enquiry-form" onSubmit={handleSubmit}>
            <h3>Booking Enquiry</h3>
            <p className="ws-enquiry-note">Fill in your details and our team will confirm availability and payment.</p>

            <label className="ws-form-label">Full Name *
              <input className="ws-form-input" required value={form.name}
                onChange={(e) => set("name", e.target.value)} placeholder="Your full name" />
            </label>

            <label className="ws-form-label">Email *
              <input className="ws-form-input" type="email" required value={form.email}
                onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
            </label>

            <label className="ws-form-label">Phone
              <input className="ws-form-input" value={form.phone}
                onChange={(e) => set("phone", e.target.value)} placeholder="+27 000 000 0000" />
            </label>

            {hasTour && (
              <label className="ws-form-label">🗺️ Tour Date *
                <input className="ws-form-input" type="date" required={!hasNonTour}
                  value={form.tourDate} onChange={(e) => set("tourDate", e.target.value)} />
              </label>
            )}

            {hasNonTour && (
              <div className="ws-form-row">
                <label className="ws-form-label">Check-in
                  <input className="ws-form-input" type="date" value={form.checkIn}
                    onChange={(e) => set("checkIn", e.target.value)} />
                </label>
                <label className="ws-form-label">Check-out
                  <input className="ws-form-input" type="date" value={form.checkOut}
                    onChange={(e) => set("checkOut", e.target.value)} />
                </label>
              </div>
            )}

            <label className="ws-form-label">Notes / Special Requests
              <textarea className="ws-form-input" rows={3} value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any special requirements..." />
            </label>

            {error && <div className="ws-form-error">{error}</div>}

            <button className="ws-add-btn-lg" type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Enquiry →"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
