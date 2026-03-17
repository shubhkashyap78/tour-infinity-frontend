import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "./CartContext";
import { apiFetch } from "../api";

const EMPTY_FORM = { name: "", email: "", phone: "", checkIn: "", checkOut: "", notes: "" };

export default function CartPage() {
  const { items, removeItem, clearCart, total } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    setError("");

    try {
      // Create one booking per cart item
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
              guests: item.guests,
              checkIn: form.checkIn || undefined,
              checkOut: form.checkOut || undefined,
              totalAmount: item.basePrice * item.guests,
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
        <button className="ws-add-btn-lg" onClick={() => navigate("/")}>
          Continue Browsing
        </button>
      </div>
    );
  }

  return (
    <div className="ws-cart-page">
      <h2 className="ws-cart-title">🛒 Your Cart</h2>

      {items.length === 0 ? (
        <div className="ws-empty">
          Your cart is empty. <Link to="/">Browse products →</Link>
        </div>
      ) : (
        <div className="ws-cart-layout">
          {/* ── Cart Items ── */}
          <div className="ws-cart-items">
            {items.map((item) => (
              <div className="ws-cart-row" key={item._id}>
                <div className="ws-cart-img">
                  {item.image
                    ? <img src={item.image} alt={item.title} />
                    : <div className="ws-cart-img-placeholder">📦</div>}
                </div>
                <div className="ws-cart-info">
                  <div className="ws-cart-item-title">{item.title}</div>
                  <div className="ws-cart-item-meta">
                    <span className="ws-card-type">{item.type}</span>
                    <span>{item.guests} guest{item.guests > 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="ws-cart-item-price">
                  {item.baseCurrency} {(item.basePrice * item.guests).toLocaleString()}
                </div>
                <button className="ws-cart-remove" onClick={() => removeItem(item._id)}>✕</button>
              </div>
            ))}

            {/* Total — grouped by currency */}
            <div className="ws-cart-total-row">
              <span>Total</span>
              <span className="ws-cart-total-amount">
                {Object.entries(
                  items.reduce((acc, item) => {
                    const cur = item.baseCurrency || "USD";
                    acc[cur] = (acc[cur] || 0) + item.basePrice * item.guests;
                    return acc;
                  }, {})
                ).map(([cur, amt]) => `${cur} ${amt.toLocaleString()}`).join(" + ")}
              </span>
            </div>

            <button className="ws-clear-btn" onClick={clearCart}>Clear Cart</button>
          </div>

          {/* ── Enquiry Form ── */}
          <form className="ws-enquiry-form" onSubmit={handleSubmit}>
            <h3>Booking Enquiry</h3>
            <p className="ws-enquiry-note">
              Fill in your details and our team will confirm availability and payment.
            </p>

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
