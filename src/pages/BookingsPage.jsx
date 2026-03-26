import { useState } from "react";
import { apiFetch } from "../api";
import InvoicePage from "./InvoicePage";

export default function BookingsPage({ bookings, token, onRefresh }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceBookingId, setInvoiceBookingId] = useState(null);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const openInvoice = (id) => { setInvoiceBookingId(id); setInvoiceOpen(true); };
  const closeInvoice = () => { setInvoiceOpen(false); setInvoiceBookingId(null); };

  const updateStatus = async (id, status) => {
    await apiFetch(`/api/bookings/${id}`, { method: "PUT", headers, body: JSON.stringify({ status }) });
    onRefresh();
  };

  const updatePayment = async (id, paymentStatus) => {
    await apiFetch(`/api/bookings/${id}`, { method: "PUT", headers, body: JSON.stringify({ paymentStatus }) });
    onRefresh();
  };

  const filtered = bookings
    .filter((b) => filter === "all" || b.status === filter)
    .filter((b) => !search || b.customerName.toLowerCase().includes(search.toLowerCase()) || b.bookingRef?.toLowerCase().includes(search.toLowerCase()));

  const counts = (s) => s === "all" ? bookings.length : bookings.filter((b) => b.status === s).length;

  return (
    <>
      <div className="page-header">
        <h2>📋 Bookings</h2>
        <input className="form-input search-input" placeholder="🔍 Search by name or ref..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="filter-tabs" style={{ marginBottom: 20 }}>
        {["all", "pending", "confirmed", "completed", "cancelled"].map((s) => (
          <button key={s} className={`filter-tab ${filter === s ? "filter-tab-active" : ""}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="filter-count">{counts(s)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty">No bookings found.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Ref</th><th>Customer</th><th>Type</th>
                <th>Check In</th><th>Check Out</th>
                <th>Amount</th><th>Status</th><th>Payment</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bk) => (
                <tr key={bk._id}>
                  <td><code>{bk.bookingRef}</code></td>
                  <td>
                    <div className="bk-name">{bk.customerName}</div>
                    <div className="bk-email">{bk.customerEmail}</div>
                    {bk.customerPhone && <div className="bk-email">{bk.customerPhone}</div>}
                  </td>
                  <td><span className={`badge badge-${bk.productType}`}>{bk.productType}</span></td>
                  <td>{new Date(bk.checkIn).toLocaleDateString()}</td>
                  <td>{new Date(bk.checkOut).toLocaleDateString()}</td>
                  <td><strong>{bk.currency} {bk.totalAmount?.toLocaleString()}</strong></td>
                  <td><span className={`status-badge status-${bk.status}`}>{bk.status}</span></td>
                  <td>
                    <select className="pay-select"
                      value={bk.paymentStatus}
                      onChange={(e) => updatePayment(bk._id, e.target.value)}>
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-xs btn-secondary" onClick={() => openInvoice(bk._id)}>Invoice</button>
                      {bk.status === "pending" && (
                        <button className="btn-xs btn-confirm" onClick={() => updateStatus(bk._id, "confirmed")}>Confirm</button>
                      )}
                      {bk.status === "confirmed" && (
                        <button className="btn-xs btn-complete" onClick={() => updateStatus(bk._id, "completed")}>Complete</button>
                      )}
                      {!["cancelled", "completed"].includes(bk.status) && (
                        <button className="btn-xs btn-cancel" onClick={() => updateStatus(bk._id, "cancelled")}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invoiceOpen && invoiceBookingId && (
        <InvoicePage bookingId={invoiceBookingId} token={token} onClose={closeInvoice} />
      )}
    </>
  );
}
