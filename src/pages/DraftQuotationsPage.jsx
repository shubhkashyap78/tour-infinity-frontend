import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../api";
import toast from "react-hot-toast";
import QuotationBuilder from "./QuotationBuilder";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Shared PDF Modal
function QuotationPDFModal({ quotation, onClose, extraActions }) {
  const previewRef = useRef(null);

  const downloadPDF = async () => {
    const element = previewRef.current;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yOffset = 0;
      while (yOffset < pdfHeight) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yOffset, pdfWidth, pdfHeight);
        yOffset += pageHeight;
      }
      pdf.save(`Quotation-${quotation.quotationRef}.pdf`);
    } catch (err) {
      alert("Failed to generate PDF. Please try again.");
    }
  };

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
                  <button className="btn-secondary" onClick={downloadPDF}>📄 Download PDF</button>
                  {extraActions}
                </div>
              </div>
              <div ref={previewRef} style={{
                background:"#fff", padding:"32px", fontFamily:"Arial, sans-serif",
                color:"#1a1a1a", fontSize:"13px", lineHeight:"1.6"
              }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px"}}>
                  <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
                    <img src="/assests/logo.png" alt="logo" style={{height:"64px", objectFit:"contain"}} />
                    <div>
                      <div style={{fontSize:"20px", fontWeight:"800", color:"#1d4ed8", letterSpacing:"0.5px"}}>Andaman Destinations</div>
                      <div style={{fontSize:"11px", color:"#6b7280", marginTop:"2px"}}>Your Trusted Andaman Travel Partner</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right", fontSize:"11px", color:"#4b5563", lineHeight:"1.9"}}>
                    <div>📍 Dollygunj, Port Blair, Andaman – 744103</div>
                    <div>📞 +91 94760 44578</div>
                    <div>✉️ booking@andamandestinations.com</div>
                    <div>🌐 www.andamandestinations.com</div>
                  </div>
                </div>
                <div style={{height:"3px", background:"linear-gradient(90deg,#1d4ed8,#60a5fa)", borderRadius:"2px", marginBottom:"20px"}} />
                <div style={{display:"flex", gap:"16px", marginBottom:"20px"}}>
                  <div style={{flex:1, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"14px 16px"}}>
                    <div style={{fontSize:"10px", fontWeight:"700", color:"#6b7280", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px"}}>Prepared For</div>
                    <div style={{fontSize:"15px", fontWeight:"700", color:"#111827"}}>{quotation.customerName}</div>
                    <div style={{color:"#4b5563", marginTop:"4px"}}>{quotation.email}</div>
                    <div style={{color:"#4b5563"}}>{quotation.phone}</div>
                  </div>
                  <div style={{flex:1, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"14px 16px"}}>
                    <div style={{fontSize:"10px", fontWeight:"700", color:"#6b7280", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px"}}>Trip Details</div>
                    <div><span style={{color:"#6b7280"}}>Destination:</span> <strong>{quotation.destination}</strong></div>
                    <div><span style={{color:"#6b7280"}}>Duration:</span> <strong>{quotation.duration}</strong></div>
                    <div><span style={{color:"#6b7280"}}>Travellers:</span> <strong>{quotation.groupSize.adults} Adults{quotation.groupSize.children > 0 ? `, ${quotation.groupSize.children} Children` : ""}</strong></div>
                  </div>
                  <div style={{flex:1, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:"8px", padding:"14px 16px"}}>
                    <div style={{fontSize:"10px", fontWeight:"700", color:"#6b7280", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px"}}>Quotation Info</div>
                    <div><span style={{color:"#6b7280"}}>Ref No:</span> <strong style={{color:"#1d4ed8"}}>{quotation.quotationRef}</strong></div>
                    <div><span style={{color:"#6b7280"}}>Date:</span> <strong>{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</strong></div>
                    <div><span style={{color:"#6b7280"}}>Status:</span> <strong>{quotation.status}</strong></div>
                  </div>
                </div>
                {quotation.items.length > 0 && (
                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"12px", fontWeight:"700", color:"#1d4ed8", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"8px", borderBottom:"2px solid #bfdbfe", paddingBottom:"4px"}}>Trip Itinerary</div>
                    <table style={{width:"100%", borderCollapse:"collapse", fontSize:"12px"}}>
                      <thead>
                        <tr style={{background:"#1d4ed8", color:"#fff"}}>
                          <th style={{padding:"8px 10px", textAlign:"left", width:"30px"}}>#</th>
                          <th style={{padding:"8px 10px", textAlign:"left"}}>Service</th>
                          <th style={{padding:"8px 10px", textAlign:"left"}}>Type</th>
                          <th style={{padding:"8px 10px", textAlign:"left"}}>Details</th>
                          <th style={{padding:"8px 10px", textAlign:"right"}}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotation.items.map((item, i) => (
                          <tr key={item._id} style={{background:i%2===0?"#f8fafc":"#fff", borderBottom:"1px solid #e2e8f0"}}>
                            <td style={{padding:"9px 10px", color:"#6b7280", fontWeight:"600"}}>{i+1}</td>
                            <td style={{padding:"9px 10px"}}>
                              <div style={{fontWeight:"600", color:"#111827"}}>{item.name}</div>
                              {item.description && <div style={{color:"#6b7280", fontSize:"11px", marginTop:"2px"}}>{item.description}</div>}
                              {item.type==="hotel" && item.checkIn && item.checkOut && (
                                <div style={{color:"#6b7280", fontSize:"11px"}}>📅 {new Date(item.checkIn).toLocaleDateString("en-IN")} → {new Date(item.checkOut).toLocaleDateString("en-IN")}</div>
                              )}
                              {(item.type==="tour"||item.type==="package") && item.serviceDate && (
                                <div style={{color:"#6b7280", fontSize:"11px"}}>📅 {new Date(item.serviceDate).toLocaleDateString("en-IN")}</div>
                              )}
                            </td>
                            <td style={{padding:"9px 10px"}}>
                              <span style={{background:"#dbeafe", color:"#1d4ed8", padding:"2px 8px", borderRadius:"12px", fontSize:"10px", fontWeight:"600", textTransform:"capitalize"}}>{item.type}</span>
                            </td>
                            <td style={{padding:"9px 10px", color:"#4b5563", fontSize:"11px"}}>
                              {item.type==="hotel" && `₹${item.basePrice.toLocaleString()} × ${item.nights}N × ${item.rooms} room${item.rooms>1?"s":""}`}
                              {item.type==="vehicle" && `₹${item.basePrice.toLocaleString()} × ${item.quantity} vehicle${item.quantity>1?"s":""}`}
                              {(item.type==="tour"||item.type==="package") && `₹${item.basePrice.toLocaleString()} × ${item.pax} pax`}
                            </td>
                            <td style={{padding:"9px 10px", textAlign:"right", fontWeight:"700", color:"#111827"}}>₹{item.subtotal.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{display:"flex", justifyContent:"flex-end", marginBottom:"24px"}}>
                  <div style={{width:"280px", border:"1px solid #e2e8f0", borderRadius:"8px", overflow:"hidden"}}>
                    <div style={{background:"#1d4ed8", color:"#fff", padding:"8px 14px", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px"}}>Price Summary</div>
                    <div style={{padding:"0 14px"}}>
                      <div style={{display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #f1f5f9"}}>
                        <span style={{color:"#6b7280"}}>Package Cost</span><span>₹{quotation.pricing.subtotal.toLocaleString()}</span>
                      </div>
                      {quotation.pricing.agentMarkupPercent > 0 && (
                        <div style={{display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{color:"#6b7280"}}>Service Charges ({quotation.pricing.agentMarkupPercent}%)</span>
                          <span>₹{(quotation.pricing.subtotal * quotation.pricing.agentMarkupPercent / 100).toLocaleString()}</span>
                        </div>
                      )}
                      {quotation.pricing.discountPercent > 0 && (
                        <div style={{display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{color:"#16a34a"}}>Discount ({quotation.pricing.discountPercent}%)</span>
                          <span style={{color:"#16a34a"}}>-₹{(quotation.pricing.subtotal * quotation.pricing.discountPercent / 100).toLocaleString()}</span>
                        </div>
                      )}
                      {quotation.pricing.taxPercent > 0 && (
                        <div style={{display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{color:"#6b7280"}}>GST ({quotation.pricing.taxPercent}%)</span>
                          <span>₹{quotation.pricing.taxes.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{display:"flex", justifyContent:"space-between", padding:"10px 0", fontWeight:"800", fontSize:"15px", color:"#1d4ed8"}}>
                        <span>Total Amount</span><span>₹{quotation.pricing.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{borderTop:"2px solid #e2e8f0", paddingTop:"14px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <div style={{fontSize:"11px", color:"#9ca3af"}}>
                    <div style={{fontWeight:"600", color:"#6b7280", marginBottom:"2px"}}>Terms & Conditions</div>
                    <div>• This quotation is valid for 7 days from the date of issue.</div>
                    <div>• Prices are subject to availability at the time of booking.</div>
                    <div>• 50% advance required to confirm the booking.</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:"11px", color:"#9ca3af", marginBottom:"24px"}}>Authorised Signature</div>
                    <div style={{borderTop:"1px solid #d1d5db", paddingTop:"4px", fontSize:"11px", color:"#6b7280", width:"140px"}}>Andaman Destinations</div>
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

  return <QuotationPDFModal quotation={quotation} onClose={onClose} extraActions={
    <button className="btn-primary" onClick={() => alert("Use Send button from table")}>
      📧 Send to Customer
    </button>
  } />;
}