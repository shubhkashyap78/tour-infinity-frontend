import { useState, useEffect } from "react";
import { apiFetch } from "../api";
import toast from "react-hot-toast";
import QuotationBuilder from "./QuotationBuilder";

const STATUS_COLORS = {
  "Draft": "status-pending",
  "Sent": "status-confirmed", 
  "Viewed": "badge-tour",
  "Accepted": "status-completed",
  "Rejected": "status-cancelled",
  "Expired": "status-cancelled"
};

// Quotation View Modal Component
function QuotationViewModal({ quotationId, token, onClose, onConvertToBooking }) {
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    loadQuotation();
  }, [quotationId]);

  const loadQuotation = async () => {
    try {
      const res = await apiFetch(`/api/quotations/${quotationId}`, { headers });
      if (res.ok) {
        setQuotation(await res.json());
      }
    } catch (error) {
      console.error("Failed to load quotation:", error);
    }
    setLoading(false);
  };

  const convertToBooking = async () => {
    if (!confirm("Convert this quotation to booking?")) return;
    
    const loadingToast = toast.loading("Converting to booking...");
    
    try {
      const res = await apiFetch(`/api/quotations/${quotationId}/convert-to-booking`, {
        method: "POST",
        headers
      });

      if (res.ok) {
        const result = await res.json();
        toast.success("✅ Quotation converted to booking successfully!", { id: loadingToast });
        
        // Call parent callback if provided
        if (onConvertToBooking) {
          onConvertToBooking(result);
        }
        
        onClose();
      } else {
        toast.error("Failed to convert quotation", { id: loadingToast });
      }
    } catch (error) {
      console.error("Failed to convert to booking:", error);
      toast.error("Error converting to booking", { id: loadingToast });
    }
  };

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quotation-builder" onClick={(e) => e.stopPropagation()}>
        <div className="dash-loading">⏳ Loading quotation...</div>
      </div>
    </div>
  );

  if (!quotation) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quotation-builder" onClick={(e) => e.stopPropagation()}>
        <div className="quotation-header">
          <div>
            <h2>📋 Quotation Preview</h2>
            <div className="quotation-meta">
              <span className="quotation-ref">{quotation.quotationRef}</span>
              <span className="quotation-customer">{quotation.customerName}</span>
              <span className="quotation-status">{quotation.status}</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="quotation-body">
          <div className="preview-tab">
            <div className="quotation-preview">
              <div className="preview-header">
                <h3>Quotation Details</h3>
                <div className="preview-actions">
                  <button className="btn-secondary">📄 Download PDF</button>
                  {quotation.status === "Sent" && (
                    <button className="btn-primary" onClick={convertToBooking} style={{background: "var(--success)"}}>
                      ✅ Convert to Booking
                    </button>
                  )}
                </div>
              </div>

              <div className="preview-content">
                <div className="preview-customer">
                  <h4>{quotation.customerName}</h4>
                  <p>{quotation.email} | {quotation.phone}</p>
                  <p>{quotation.destination} | {quotation.duration}</p>
                  <p>{quotation.groupSize.adults} Adults, {quotation.groupSize.children} Children</p>
                </div>

                <div className="preview-items">
                  <h4>Trip Itinerary ({quotation.items.length} items)</h4>
                  {quotation.items.map((item, index) => (
                    <div key={item._id} className="preview-item">
                      <div className="preview-item-header">
                        <span className="preview-day">Day {index + 1}</span>
                        <span className="preview-type">{item.type}</span>
                      </div>
                      <h5>{item.name}</h5>
                      <p>{item.description}</p>
                      <div className="preview-price">₹{item.subtotal.toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <div className="preview-pricing">
                  <div className="preview-pricing-row">
                    <span>Package Cost:</span>
                    <span>₹{quotation.pricing.subtotal.toLocaleString()}</span>
                  </div>
                  {quotation.pricing.agentMarkupPercent > 0 && (
                    <div className="preview-pricing-row">
                      <span>Service Charges ({quotation.pricing.agentMarkupPercent}%):</span>
                      <span>₹{(quotation.pricing.subtotal * quotation.pricing.agentMarkupPercent / 100).toLocaleString()}</span>
                    </div>
                  )}
                  {quotation.pricing.discountPercent > 0 && (
                    <div className="preview-pricing-row discount">
                      <span>Discount ({quotation.pricing.discountPercent}%):</span>
                      <span>-₹{(quotation.pricing.subtotal * quotation.pricing.discountPercent / 100).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="preview-pricing-row">
                    <span>GST ({quotation.pricing.taxPercent}%):</span>
                    <span>₹{quotation.pricing.taxes.toLocaleString()}</span>
                  </div>
                  <div className="preview-pricing-total">
                    <span>Total Amount:</span>
                    <span>₹{quotation.pricing.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuotationsPage({ token, onNavigate, onRefresh }) {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showQuotationBuilder, setShowQuotationBuilder] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadQuotations = async () => {
    setLoading(true);
    try {
      // Only load non-draft quotations (sent, viewed, accepted, rejected)
      const res = await apiFetch("/api/quotations", { headers });
      if (res.ok) {
        const data = await res.json();
        const allQuotations = Array.isArray(data) ? data : (data.quotations || []);
        // Filter out draft quotations
        const nonDraftQuotations = allQuotations.filter(q => q.status !== "Draft");
        setQuotations(nonDraftQuotations);
      }
    } catch (err) {
      console.error("Failed to load quotations:", err);
      setQuotations([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadQuotations(); }, [token]);

  const convertToBooking = async (quotationId) => {
    if (!confirm("Convert this quotation to booking?")) return;
    
    const loadingToast = toast.loading("Converting to booking...");
    
    try {
      const res = await apiFetch(`/api/quotations/${quotationId}/convert-to-booking`, {
        method: "POST",
        headers
      });

      if (res.ok) {
        const result = await res.json();
        toast.success("✅ Quotation converted to booking successfully!", { id: loadingToast });
        
        // Handle redirect to bookings
        if (result.redirect === "bookings" && onNavigate) {
          onNavigate("bookings");
          if (onRefresh) onRefresh();
        }
        
        loadQuotations(); // Refresh list
      } else {
        toast.error("Failed to convert quotation", { id: loadingToast });
      }
    } catch (error) {
      console.error("Failed to convert to booking:", error);
      toast.error("Error converting to booking", { id: loadingToast });
    }
  };

  const deleteQuotation = async (quotationId) => {
    if (!confirm("Delete this quotation? This action cannot be undone.")) return;
    
    const loadingToast = toast.loading("Deleting quotation...");
    
    try {
      const res = await apiFetch(`/api/quotations/${quotationId}`, {
        method: "DELETE",
        headers
      });

      if (res.ok) {
        toast.success("✅ Quotation deleted successfully!", { id: loadingToast });
        loadQuotations(); // Refresh list
      } else {
        toast.error("Failed to delete quotation", { id: loadingToast });
      }
    } catch (error) {
      console.error("Failed to delete quotation:", error);
      toast.error("Error deleting quotation", { id: loadingToast });
    }
  };

  const filtered = (quotations || [])
    .filter(quot => filter === "all" || quot.status.toLowerCase() === filter.toLowerCase())
    .filter(quot => !search || 
      quot.customerName.toLowerCase().includes(search.toLowerCase()) ||
      quot.quotationRef.toLowerCase().includes(search.toLowerCase()) ||
      quot.email?.toLowerCase().includes(search.toLowerCase())
    );

  const counts = (s) => s === "all" ? (quotations || []).length : (quotations || []).filter(q => q.status.toLowerCase() === s.toLowerCase()).length;

  if (loading) return <div className="dash-loading">⏳ Loading quotations...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>📋 Sent Quotations</h2>
        <input 
          className="form-input search-input" 
          placeholder="🔍 Search sent quotations..."
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      {/* Filter Tabs - Remove draft */}
      <div className="filter-tabs">
        {["all", "sent", "viewed", "accepted", "rejected"].map((s) => (
          <button 
            key={s} 
            className={`filter-tab ${filter === s ? "filter-tab-active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All Sent" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="filter-count">{counts(s)}</span>
          </button>
        ))}
      </div>

      {/* Quotations Table */}
      {filtered.length === 0 ? (
        <div className="empty">No quotations found.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Customer</th>
                <th>Package</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((quot) => (
                <tr key={quot._id}>
                  <td>
                    <div className="bk-name">{quot.quotationRef}</div>
                    <div className="bk-email">v{quot.version} • Valid till {new Date(quot.validTill).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <div className="bk-name">{quot.customerName}</div>
                    <div className="bk-email">{quot.email}</div>
                    <div className="bk-email">{quot.phone}</div>
                  </td>
                  <td>
                    <span className="badge badge-package">{quot.packageType}</span>
                    <div className="bk-email">{quot.destination}</div>
                    <div className="bk-email">{quot.groupSize.adults}A + {quot.groupSize.children}C</div>
                  </td>
                  <td>
                    <div className="bk-name">₹{quot.pricing.total.toLocaleString()}</div>
                    <div className="bk-email">{quot.items.length} items</div>
                  </td>
                  <td>
                    <span className={`status-badge ${STATUS_COLORS[quot.status]}`}>
                      {quot.status}
                    </span>
                  </td>
                  <td>{new Date(quot.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btns">
                      <button 
                        className="btn-xs btn-confirm"
                        onClick={() => {
                          setSelectedQuotationId(quot._id);
                          setShowQuotationBuilder(true);
                        }}
                      >
                        👁️ View
                      </button>
                      {quot.status === "Sent" && (
                        <button 
                          className="btn-xs" 
                          style={{background: "var(--success)", color: "white"}}
                          onClick={() => convertToBooking(quot._id)}
                        >
                          ✅ Convert
                        </button>
                      )}
                      {/* Remove delete button - no drafts here */}
                      <a 
                        href={`https://wa.me/91${quot.phone?.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener" 
                        className="btn-xs" 
                        style={{background: "#25d366", color: "white", textDecoration: "none"}}
                      >
                        💬 WhatsApp
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quotation Builder Modal for Preview */}
      {showQuotationBuilder && selectedQuotationId && (
        <QuotationViewModal 
          quotationId={selectedQuotationId}
          token={token}
          onConvertToBooking={(result) => {
            // Handle redirect to bookings
            if (result.redirect === "bookings" && onNavigate) {
              onNavigate("bookings");
              if (onRefresh) onRefresh();
            }
          }}
          onClose={() => {
            setShowQuotationBuilder(false);
            setSelectedQuotationId(null);
            loadQuotations(); // Refresh in case of changes
          }}
        />
      )}
    </div>
  );
}