import { useState, useEffect } from "react";
import { apiFetch } from "../api";
import toast from "react-hot-toast";
import QuotationBuilder from "./QuotationBuilder";

export default function DraftQuotationsPage({ token }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showQuotationBuilder, setShowQuotationBuilder] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadDrafts = async () => {
    setLoading(true);
    try {
      console.log('Loading draft quotations...');
      const res = await apiFetch("/api/quotations?status=draft", { headers });
      if (res.ok) {
        const data = await res.json();
        console.log('Draft quotations response:', data);
        setDrafts(Array.isArray(data) ? data : (data.quotations || []));
      } else {
        console.error('Failed to load drafts:', res.status);
      }
    } catch (err) {
      console.error("Failed to load draft quotations:", err);
      setDrafts([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadDrafts(); }, [token]);

  const deleteDraft = async (quotationId) => {
    if (!confirm("Delete this draft quotation? This action cannot be undone.")) return;
    
    const loadingToast = toast.loading("Deleting draft...");
    
    try {
      const res = await apiFetch(`/api/quotations/${quotationId}`, {
        method: "DELETE",
        headers
      });

      if (res.ok) {
        toast.success("✅ Draft quotation deleted successfully!", { id: loadingToast });
        loadDrafts(); // Refresh list
      } else {
        toast.error("Failed to delete draft", { id: loadingToast });
      }
    } catch (error) {
      console.error("Failed to delete draft:", error);
      toast.error("Error deleting draft", { id: loadingToast });
    }
  };

  const sendQuotation = async (quotationId) => {
    if (!confirm("Send this quotation to customer?")) return;
    
    const loadingToast = toast.loading("Sending quotation...");
    
    try {
      const res = await apiFetch(`/api/quotations/${quotationId}/send`, {
        method: "POST",
        headers
      });

      if (res.ok) {
        const result = await res.json();
        toast.success("✅ Quotation sent to customer successfully!", { id: loadingToast });
        
        // Log quotation data that was sent
        if (result.quotationData) {
          console.log("Quotation data sent to customer:", result.quotationData);
          toast.success("📧 Customer data prepared for email/WhatsApp", { duration: 5000 });
        }
        
        loadDrafts(); // Refresh list
      } else {
        toast.error("Failed to send quotation", { id: loadingToast });
      }
    } catch (error) {
      console.error("Failed to send quotation:", error);
      toast.error("Error sending quotation", { id: loadingToast });
    }
  };

  const filtered = (drafts || [])
    .filter(draft => !search || 
      draft.customerName.toLowerCase().includes(search.toLowerCase()) ||
      draft.quotationRef.toLowerCase().includes(search.toLowerCase()) ||
      draft.email?.toLowerCase().includes(search.toLowerCase())
    );

  if (loading) return <div className="dash-loading">⏳ Loading draft quotations...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>📝 Draft Quotations</h2>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input 
            className="form-input search-input" 
            placeholder="🔍 Search drafts..."
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          <span className="page-count">{filtered.length} drafts</span>
        </div>
      </div>

      {/* Draft Quotations Table */}
      {filtered.length === 0 ? (
        <div className="empty">
          {search ? "No draft quotations found matching your search." : "No draft quotations yet. Create quotations from leads to get started."}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Customer</th>
                <th>Package</th>
                <th>Amount</th>
                <th>Items</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((draft) => (
                <tr key={draft._id}>
                  <td>
                    <div className="bk-name">{draft.quotationRef}</div>
                    <div className="bk-email">v{draft.version} • Draft</div>
                  </td>
                  <td>
                    <div className="bk-name">{draft.customerName}</div>
                    <div className="bk-email">{draft.email}</div>
                    <div className="bk-email">{draft.phone}</div>
                  </td>
                  <td>
                    <span className="badge badge-package">{draft.packageType}</span>
                    <div className="bk-email">{draft.destination}</div>
                    <div className="bk-email">{draft.groupSize.adults}A + {draft.groupSize.children}C</div>
                  </td>
                  <td>
                    <div className="bk-name">₹{draft.pricing.total.toLocaleString()}</div>
                    <div className="bk-email">
                      {draft.pricing.agentMarkupPercent > 0 && `+${draft.pricing.agentMarkupPercent}% markup`}
                      {draft.pricing.discountPercent > 0 && ` -${draft.pricing.discountPercent}% discount`}
                    </div>
                  </td>
                  <td>
                    <div className="bk-name">{draft.items.length} items</div>
                    <div className="bk-email">
                      {draft.items.map(item => item.type).join(", ")}
                    </div>
                  </td>
                  <td>{new Date(draft.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btns">
                      <button 
                        className="btn-xs btn-confirm"
                        onClick={() => {
                          setSelectedQuotationId(draft._id);
                          setShowQuotationBuilder(true);
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="btn-xs" 
                        style={{background: "var(--primary)", color: "white"}}
                        onClick={() => sendQuotation(draft._id)}
                      >
                        📧 Send
                      </button>
                      <button 
                        className="btn-xs btn-cancel"
                        onClick={() => deleteDraft(draft._id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quotation Builder Modal for Editing */}
      {showQuotationBuilder && selectedQuotationId && (
        <QuotationEditModal 
          quotationId={selectedQuotationId}
          token={token}
          onClose={() => {
            setShowQuotationBuilder(false);
            setSelectedQuotationId(null);
            loadDrafts(); // Refresh in case of changes
          }}
        />
      )}
    </div>
  );
}

// Quotation Edit Modal Component
function QuotationEditModal({ quotationId, token, onClose }) {
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

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quotation-builder" onClick={(e) => e.stopPropagation()}>
        <div className="dash-loading">⏳ Loading quotation...</div>
      </div>
    </div>
  );

  if (!quotation) return null;

  // Use existing QuotationBuilder but pass quotation data
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quotation-builder" onClick={(e) => e.stopPropagation()}>
        <div className="quotation-header">
          <div>
            <h2>✏️ Edit Draft Quotation</h2>
            <div className="quotation-meta">
              <span className="quotation-ref">{quotation.quotationRef}</span>
              <span className="quotation-customer">{quotation.customerName}</span>
              <span className="quotation-status">Draft</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        
        <div className="quotation-body">
          <div className="preview-tab">
            <div className="quotation-preview">
              <div className="preview-header">
                <h3>Draft Quotation</h3>
                <div className="preview-actions">
                  <button className="btn-secondary">📄 Download PDF</button>
                  <button className="btn-primary" onClick={() => {
                    // Send quotation logic here
                    alert("Feature coming soon - use Send button from table");
                  }}>
                    📧 Send to Customer
                  </button>
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
                  {quotation.items.length === 0 ? (
                    <p className="empty">No items added yet. Use the quotation builder to add services.</p>
                  ) : (
                    quotation.items.map((item, index) => (
                      <div key={item._id} className="preview-item">
                        <div className="preview-item-header">
                          <span className="preview-day">Day {index + 1}</span>
                          <span className="preview-type">{item.type}</span>
                        </div>
                        <h5>{item.name}</h5>
                        <p>{item.description}</p>
                        <div className="preview-price">₹{item.subtotal.toLocaleString()}</div>
                      </div>
                    ))
                  )}
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