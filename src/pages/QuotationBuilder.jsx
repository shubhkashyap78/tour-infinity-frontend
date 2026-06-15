import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function QuotationBuilder({ leadId, onClose, token }) {
  const [quotation, setQuotation] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("items");
  const [showProductModal, setShowProductModal] = useState(false);
  const [incExcItems, setIncExcItems] = useState([]);
  const [selInclusions, setSelInclusions] = useState([]);
  const [selExclusions, setSelExclusions] = useState([]);
  const [selectedProductType, setSelectedProductType] = useState("hotel");
  const [tourDays, setTourDays] = useState({});
  const [itemImages, setItemImages] = useState({});

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const previewRef = useRef(null);

  useEffect(() => { loadData(); }, [leadId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const quotRes = await apiFetch(`/api/quotations/from-lead/${leadId}`, { method: "POST", headers });
      if (quotRes.ok) {
        setQuotation(await quotRes.json());
      } else {
        const e = await quotRes.json();
        alert(`Failed to create quotation: ${e.message}`);
      }
      const prodRes = await apiFetch("/api/products", { headers });
      if (prodRes.ok) setProducts(await prodRes.json());
      const ieRes = await apiFetch("/api/inclusions-exclusions", { headers });
      if (ieRes.ok) setIncExcItems(await ieRes.json());
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  const handleImageUpload = (productId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setItemImages(prev => ({ ...prev, [productId]: e.target.result }));
    reader.readAsDataURL(file);
  };

  const addProductToQuotation = async (product) => {
    try {
      const basePrice = product.pricing?.base || product.basePrice || 0;
      const productName = product.name || product.title || "Unnamed Product";
      let nights = 1, rooms = 1, persons = quotation.groupSize.adults + quotation.groupSize.children, quantity = 1;
      let checkIn = null, checkOut = null, serviceDate = null;
      let mealPlan = "", roomType = "", vehicleType = "", route = "";

      if (product.type === "hotel") {
        nights = parseInt(document.getElementById(`nights-${product._id}`)?.value) || 1;
        rooms = parseInt(document.getElementById(`rooms-${product._id}`)?.value) || 1;
        mealPlan = document.getElementById(`mealplan-${product._id}`)?.value || "Dinner + Breakfast";
        roomType = document.getElementById(`roomtype-${product._id}`)?.value || "";
        const ci = document.getElementById(`checkin-${product._id}`)?.value;
        const co = document.getElementById(`checkout-${product._id}`)?.value;
        if (ci) checkIn = new Date(ci);
        if (co) checkOut = new Date(co);
      } else if (product.type === "tour" || product.type === "package") {
        persons = parseInt(document.getElementById(`persons-${product._id}`)?.value) || persons;
        const sd = document.getElementById(`servicedate-${product._id}`)?.value;
        if (sd) serviceDate = new Date(sd);
      } else if (product.type === "vehicle") {
        quantity = parseInt(document.getElementById(`quantity-${product._id}`)?.value) || 1;
        vehicleType = document.getElementById(`vehicletype-${product._id}`)?.value || "";
        route = document.getElementById(`route-${product._id}`)?.value || "";
      }

      const itemData = {
        type: product.type, productId: product._id, name: productName,
        description: product.description || "", basePrice, quantity, nights, rooms,
        pax: persons, checkIn, checkOut, serviceDate,
        mealPlan, roomType, vehicleType, route,
        image: itemImages[product._id] || null,
        inclusions: product.inclusions || [], exclusions: product.exclusions || [],
        days: (product.type === "tour" || product.type === "package")
          ? (tourDays[product._id] || []).slice().sort((a,b) => a.day - b.day)
          : (product.days || [])
      };

      const res = await apiFetch(`/api/quotations/${quotation._id}/items`, {
        method: "POST", headers, body: JSON.stringify(itemData)
      });

      if (res.ok) {
        setQuotation(await res.json());
        if (product.type !== "tour" && product.type !== "package") setShowProductModal(false);
        setItemImages(prev => { const n = { ...prev }; delete n[product._id]; return n; });
        if (product.type === "tour" || product.type === "package") {
          setTourDays(prev => { const n = {...prev}; delete n[product._id]; return n; });
          alert(`${productName} added! You can add more services or close the modal.`);
        }
      } else {
        const e = await res.json();
        alert(`Failed to add product: ${e.message}`);
      }
    } catch (error) {
      alert(`Error adding product: ${error.message}`);
    }
  };

  const removeItem = async (itemId) => {
    try {
      const res = await apiFetch(`/api/quotations/${quotation._id}/items/${itemId}`, { method: "DELETE", headers });
      if (res.ok) setQuotation(await res.json());
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  const updatePricing = async (pricingData) => {
    try {
      const res = await apiFetch(`/api/quotations/${quotation._id}/pricing`, {
        method: "PUT", headers, body: JSON.stringify(pricingData)
      });
      if (res.ok) setQuotation(await res.json());
    } catch (error) {
      console.error("Failed to update pricing:", error);
    }
  };

  const sendQuotation = async () => {
    try {
      const res = await apiFetch(`/api/quotations/${quotation._id}/send`, { method: "POST", headers });
      if (res.ok) {
        alert("Quotation sent successfully!");
        const d = await res.json();
        setQuotation(d.quotation);
      }
    } catch (error) {
      console.error("Failed to send quotation:", error);
    }
  };

  const generateStructuredPDF = async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margins = { left: 12, right: 12, top: 12, bottom: 12 };

      if (previewRef.current) {
        const canvas = await html2canvas(previewRef.current, { scale: 1.4, useCORS: true, backgroundColor: "#ffffff" });
        const imgWidth = pageWidth - margins.left - margins.right;
        const pxPerMm = canvas.width / imgWidth;
        const pageHeightPx = (pageHeight - margins.top - margins.bottom) * pxPerMm;
        const pageCount = Math.ceil(canvas.height / pageHeightPx);

        for (let page = 0; page < pageCount; page++) {
          const canvasPage = document.createElement("canvas");
          canvasPage.width = canvas.width;
          const sliceHeightPx = Math.min(pageHeightPx, canvas.height - page * pageHeightPx);
          canvasPage.height = sliceHeightPx;
          const ctx = canvasPage.getContext("2d");
          ctx.drawImage(canvas, 0, page * pageHeightPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
          const pageData = canvasPage.toDataURL("image/jpeg", 0.7);
          const pageHeightMm = sliceHeightPx / pxPerMm;
          pdf.addImage(pageData, "JPEG", margins.left, margins.top, imgWidth, pageHeightMm, undefined, "FAST");
          if (page < pageCount - 1) pdf.addPage();
        }
        pdf.save(`Quotation-${quotation.quotationRef}.pdf`);
        return;
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const downloadPDF = generateStructuredPDF;

  const convertToBooking = async () => {
    if (!confirm("Convert this quotation to booking?")) return;
    try {
      const res = await apiFetch(`/api/quotations/${quotation._id}/convert-to-booking`, { method: "POST", headers });
      if (res.ok) {
        const data = await res.json();
        alert("Quotation converted to booking successfully!");
        setQuotation(data.quotation);
        onClose();
      }
    } catch (error) {
      alert("Failed to convert to booking");
    }
  };

  const filteredProducts = products.filter(p => p.type === selectedProductType && p.isActive);

  const updateHotelCalculation = (product) => {
    const nights = parseInt(document.getElementById(`nights-${product._id}`)?.value) || 1;
    const rooms = parseInt(document.getElementById(`rooms-${product._id}`)?.value) || 1;
    const basePrice = product.pricing?.base || product.basePrice || 0;
    const el = document.getElementById(`total-${product._id}`);
    if (el) el.textContent = `= ₹${(basePrice * nights * rooms).toLocaleString()}`;
  };

  const updateTourCalculation = (product) => {
    const persons = parseInt(document.getElementById(`persons-${product._id}`)?.value) || 1;
    const basePrice = product.pricing?.base || product.basePrice || 0;
    const el = document.getElementById(`total-${product._id}`);
    if (el) el.textContent = `= ₹${(basePrice * persons).toLocaleString()}`;
  };

  const updateVehicleCalculation = (product) => {
    const quantity = parseInt(document.getElementById(`quantity-${product._id}`)?.value) || 1;
    const basePrice = product.pricing?.base || product.basePrice || 0;
    const el = document.getElementById(`total-${product._id}`);
    if (el) el.textContent = `= ₹${(basePrice * quantity).toLocaleString()}`;
  };

  if (loading) return <div className="dash-loading">⏳ Creating quotation...</div>;
  if (!quotation) return <div className="empty">Failed to create quotation</div>;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quotation-builder" onClick={(e) => e.stopPropagation()}>
        <div className="quotation-header">
          <div>
            <h2>📋 Quotation Builder</h2>
            <div className="quotation-meta">
              <span className="quotation-ref">{quotation.quotationRef}</span>
              <span className="quotation-customer">{quotation.customerName}</span>
              <span className="quotation-status">{quotation.status}</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="quotation-tabs">
          <button className={`quotation-tab ${activeTab === "items" ? "active" : ""}`} onClick={() => setActiveTab("items")}>
            📦 Items ({quotation.items.length})
          </button>
          <button className={`quotation-tab ${activeTab === "pricing" ? "active" : ""}`} onClick={() => setActiveTab("pricing")}>
            💰 Pricing
          </button>
          <button className={`quotation-tab ${activeTab === "preview" ? "active" : ""}`} onClick={() => setActiveTab("preview")}>
            👁️ Preview
          </button>
        </div>

        <div className="quotation-body">
          {activeTab === "items" && (
            <div className="items-tab">
              <div className="items-header">
                <h3>Trip Components</h3>
                <button className="btn-primary" onClick={() => setShowProductModal(true)}>➕ Add Service</button>
              </div>

              {quotation.items.length === 0 ? (
                <div className="empty-items">
                  <p>No services added yet. Start building your quotation by adding hotels, tours, or packages.</p>
                </div>
              ) : (
                <div className="quotation-items">
                  {quotation.items.map((item) => (
                    <div key={item._id} className="quotation-item">
                      <div className="item-header">
                        <div className="item-info">
                          <span className={`item-type badge-${item.type}`}>{item.type}</span>
                          <h4>{item.name}</h4>
                          <p>{item.description}</p>
                        </div>
                        <div className="item-actions">
                          <span className="item-price">₹{item.subtotal.toLocaleString()}</span>
                          <button className="btn-xs btn-cancel" onClick={() => removeItem(item._id)}>✖</button>
                        </div>
                      </div>
                      <div className="item-details">
                        <div className="item-pricing">
                          {item.type === "hotel" ? (
                            <span>Rate: ₹{item.basePrice} × {item.nights} nights × {item.rooms} rooms</span>
                          ) : item.type === "vehicle" ? (
                            <span>Rate: ₹{item.basePrice} × {item.quantity} vehicles</span>
                          ) : (
                            <span>Rate: ₹{item.basePrice} × {item.pax} persons</span>
                          )}
                        </div>
                        <div className="item-dates">
                          {item.type === "hotel" && item.checkIn && item.checkOut && (
                            <span style={{fontSize:"12px",color:"#666"}}>📅 {new Date(item.checkIn).toLocaleDateString()} - {new Date(item.checkOut).toLocaleDateString()}</span>
                          )}
                          {(item.type === "tour" || item.type === "package") && item.serviceDate && (
                            <span style={{fontSize:"12px",color:"#666"}}>📅 {new Date(item.serviceDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="pricing-tab">
              <h3>Pricing & Margins</h3>
              <div className="pricing-grid">
                <div className="pricing-section">
                  <h4>Base Calculation</h4>
                  <div className="pricing-row">
                    <span>Subtotal:</span>
                    <span>₹{quotation.pricing.subtotal.toLocaleString()}</span>
                  </div>
                </div>
                <div className="pricing-section">
                  <h4>Agent Markup</h4>
                  <div className="pricing-controls">
                    <label>Markup %:<input type="number" className="form-input" value={quotation.pricing.agentMarkupPercent} onChange={(e) => updatePricing({ agentMarkupPercent: parseFloat(e.target.value) || 0 })} min="0" max="100" step="0.1" /></label>
                    <span>OR</span>
                    <label>Fixed Amount:<input type="number" className="form-input" value={quotation.pricing.agentMarkup} onChange={(e) => updatePricing({ agentMarkup: parseFloat(e.target.value) || 0 })} min="0" /></label>
                  </div>
                </div>
                <div className="pricing-section">
                  <h4>Discount</h4>
                  <div className="pricing-controls">
                    <label>Discount %:<input type="number" className="form-input" value={quotation.pricing.discountPercent} onChange={(e) => updatePricing({ discountPercent: parseFloat(e.target.value) || 0 })} min="0" max="100" step="0.1" /></label>
                    <span>OR</span>
                    <label>Fixed Amount:<input type="number" className="form-input" value={quotation.pricing.discount} onChange={(e) => updatePricing({ discount: parseFloat(e.target.value) || 0 })} min="0" /></label>
                  </div>
                </div>
                <div className="pricing-section">
                  <h4>Taxes</h4>
                  <div className="pricing-controls">
                    <label>GST %:<input type="number" className="form-input" value={quotation.pricing.taxPercent} onChange={(e) => updatePricing({ taxPercent: parseFloat(e.target.value) || 0 })} min="0" max="30" step="0.1" /></label>
                  </div>
                  <div className="pricing-row">
                    <span>Tax Amount:</span>
                    <span>₹{quotation.pricing.taxes.toLocaleString()}</span>
                  </div>
                </div>
                <div className="pricing-total">
                  <div className="total-row">
                    <span>Final Total:</span>
                    <span>₹{quotation.pricing.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="preview-tab">
              <div className="quotation-preview">
                <div className="preview-header">
                  <h3>Quotation Preview</h3>
                  <div className="preview-actions">
                    <button className="btn-secondary" onClick={downloadPDF}>⬇️ Download PDF</button>
                    <button className="btn-primary" onClick={sendQuotation}>✉️ Send to Customer</button>
                    {quotation.status === "Sent" && (
                      <button className="btn-primary" onClick={convertToBooking} style={{background:"var(--success)"}}>✔ Convert to Booking</button>
                    )}
                  </div>
                </div>

                <div ref={previewRef} style={{background:"#fff",fontFamily:"Arial, sans-serif",color:"#1a1a1a",fontSize:"15px",lineHeight:"1.7",position:"relative"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,overflow:"hidden",pointerEvents:"none",zIndex:0,opacity:0.05,fontSize:"10px",color:"#1d4ed8",wordBreak:"break-all",padding:"8px",lineHeight:"2"}}>
                    {Array(60).fill(`Andaman Tour Infinity • ${quotation.quotationRef} • `).join("")}
                  </div>
                  <div style={{position:"relative",zIndex:1,padding:"28px"}}>
                    <div style={{marginBottom:"16px"}}>
                      <img src="/assests/header_on_pdf.png" alt="header" style={{width:"100%",display:"block",objectFit:"contain"}} />
                    </div>

                    <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"8px",padding:"12px 16px",marginBottom:"16px",fontSize:"12px"}}>
                      <div style={{fontWeight:"700",marginBottom:"4px"}}>Dear {quotation.customerName},</div>
                      <div style={{fontSize:"13px"}}>Greetings from Andaman Tour Infinity. Our sales team has put up this Trip Quote regarding your upcoming trip. Please go through it and let us know if you would like any changes. Contact details are provided at the end.</div>
                    </div>

                    <div style={{marginBottom:"16px"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>Customer Details</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 20px",fontSize:"12px"}}>
                        {[["Name",quotation.customerName],["Phone",quotation.lead?.phone||quotation.phone||"—"],["Email",quotation.lead?.email||quotation.email||"—"],["Source",quotation.lead?.source||"—"]].map(([l,v],i) => (
                          <div key={i} style={{display:"flex",gap:"6px"}}>
                            <span style={{color:"#6b7280",minWidth:"55px"}}>{l}:</span>
                            <span style={{fontWeight:"600",color:"#111827"}}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{border:"2px solid #1d4ed8",borderRadius:"8px",overflow:"hidden",marginBottom:"16px"}}>
                      <div style={{background:"#1d4ed8",color:"#fff",padding:"8px 16px",display:"flex",justifyContent:"space-between",fontWeight:"700",fontSize:"13px"}}>
                        <span>Quote Price</span><span>Trip ID: {quotation.quotationRef}</span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:"none"}}>
                        {[
                          {l:"DESTINATION",v:quotation.destination||"—"},
                          {l:"START DATE",v:quotation.travelDates?.startDate?new Date(quotation.travelDates.startDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}):"—"},
                          {l:"DURATION",v:quotation.duration||"—"},
                          {l:"PAX",v:`${quotation.groupSize.adults} Adults${quotation.groupSize.children>0?", "+quotation.groupSize.children+" Children":""}`},
                          {l:"TOTAL (INR)",v:`₹${quotation.pricing.total.toLocaleString()} (excl. GST)`},
                          {l:"STATUS",v:quotation.status}
                        ].map((r,i) => (
                          <div key={i} style={{padding:"10px 14px",borderTop:"1px solid #e2e8f0",borderRight:i%3!==2?"1px solid #e2e8f0":"none"}}>
                            <div style={{fontSize:"9px",fontWeight:"700",color:"#6b7280",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"3px"}}>{r.l}</div>
                            <div style={{fontWeight:"600",color:"#111827",fontSize:"12px"}}>{r.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"20px"}}>
                      <div style={{width:"300px",border:"1px solid #e2e8f0",borderRadius:"8px",overflow:"hidden"}}>
                        <div style={{background:"#1d4ed8",color:"#fff",padding:"8px 14px",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>Price Summary</div>
                        <div style={{padding:"0 14px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}>
                            <span style={{color:"#6b7280"}}>Package Cost</span>
                            <span>₹{quotation.pricing.subtotal.toLocaleString()}</span>
                          </div>
                          {quotation.pricing.agentMarkupPercent > 0 && (
                            <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}>
                              <span style={{color:"#6b7280"}}>Service Charges ({quotation.pricing.agentMarkupPercent}%)</span>
                              <span>₹{(quotation.pricing.subtotal*quotation.pricing.agentMarkupPercent/100).toLocaleString()}</span>
                            </div>
                          )}
                          {quotation.pricing.discountPercent > 0 && (
                            <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}>
                              <span style={{color:"#16a34a"}}>Discount ({quotation.pricing.discountPercent}%)</span>
                              <span style={{color:"#16a34a"}}>-₹{(quotation.pricing.subtotal*quotation.pricing.discountPercent/100).toLocaleString()}</span>
                            </div>
                          )}
                          {quotation.pricing.taxPercent > 0 && (
                            <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}>
                              <span style={{color:"#6b7280"}}>GST ({quotation.pricing.taxPercent}%)</span>
                              <span>₹{quotation.pricing.taxes.toLocaleString()}</span>
                            </div>
                          )}
                          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",fontWeight:"800",fontSize:"15px",color:"#1d4ed8"}}>
                            <span>Total Amount</span>
                            <span>₹{quotation.pricing.total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {quotation.items.filter(i => i.type === "hotel").length > 0 && (
                      <div style={{marginBottom:"16px"}}>
                        <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>🏨 Hotels & Accommodation</div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                          <thead>
                            <tr style={{background:"#1d4ed8",color:"#fff"}}>
                              <th style={{padding:"7px 10px",textAlign:"left",width:"26px"}}>#</th>
                              <th style={{padding:"7px 10px",textAlign:"left"}}>Hotel</th>
                              <th style={{padding:"7px 10px",textAlign:"left"}}>Check-in</th>
                              <th style={{padding:"7px 10px",textAlign:"left"}}>Nights / Rooms</th>
                              <th style={{padding:"7px 10px",textAlign:"left"}}>Meal Plan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotation.items.filter(i => i.type === "hotel").map((item, i) => (
                              <tr key={item._id} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                                <td style={{padding:"8px 10px",color:"#6b7280",fontWeight:"600",verticalAlign:"top"}}>{i+1}</td>
                                <td style={{padding:"8px 10px"}}>
                                  {item.image && (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      crossOrigin="anonymous"
                                      style={{width:"100%",maxWidth:"200px",height:"120px",objectFit:"cover",borderRadius:"6px",marginBottom:"6px",display:"block"}}
                                    />
                                  )}
                                  <div style={{fontWeight:"600",color:"#111827"}}>{item.name}</div>
                                  {item.roomType && <div style={{color:"#6b7280",fontSize:"11px"}}>{item.roomType}</div>}
                                  {(() => {
                                    const range = 1000;
                                    const similar = products.filter(p =>
                                      p.type === "hotel" &&
                                      p.isActive &&
                                      p._id !== item.productId?.toString() &&
                                      p._id !== (item.productId?._id || item.productId)?.toString() &&
                                      Math.abs((p.pricing?.base || p.basePrice || 0) - item.basePrice) <= range
                                    );
                                    return similar.length > 0 ? (
                                      <div style={{fontSize:"10px",color:"#f59e0b",marginTop:"4px",fontStyle:"italic"}}>
                                        ✦ Similar options: {similar.map(p => p.name || p.title).join(" / ")}
                                      </div>
                                    ) : null;
                                  })()}
                                </td>
                                <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563",verticalAlign:"top"}}>{item.checkIn?new Date(item.checkIn).toLocaleDateString("en-IN"):"—"}</td>
                                <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563",verticalAlign:"top"}}>{item.nights}N / {item.rooms} room{item.rooms>1?"s":""}</td>
                                <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563",verticalAlign:"top"}}>{item.mealPlan||"—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {quotation.items.filter(i => i.type === "package").length > 0 && (
                      <div style={{marginBottom:"16px"}}>
                        <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>📦 Packages</div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                          <thead>
                            <tr style={{background:"#1d4ed8",color:"#fff"}}>
                              <th style={{padding:"7px 10px",textAlign:"left",width:"26px"}}>#</th>
                              <th style={{padding:"7px 10px",textAlign:"left"}}>Package</th>
                              <th style={{padding:"7px 10px",textAlign:"left"}}>Date</th>
                              <th style={{padding:"7px 10px",textAlign:"left"}}>Pax</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotation.items.filter(i => i.type === "package").map((item, i) => (
                              <tr key={item._id} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                                <td style={{padding:"8px 10px",color:"#6b7280",fontWeight:"600"}}>{i+1}</td>
                                <td style={{padding:"8px 10px"}}>
                                  <div style={{fontWeight:"600",color:"#111827"}}>{item.name}</div>
                                  {item.description && <div style={{color:"#6b7280",fontSize:"11px"}}>{item.description}</div>}
                                </td>
                                <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.serviceDate?new Date(item.serviceDate).toLocaleDateString("en-IN"):"—"}</td>
                                <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.pax} pax</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {quotation.items.filter(i => i.type === "tour").length > 0 && (
                      <div style={{marginBottom:"16px"}}>
                        <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>🗺️ Tours & Activities</div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                          <thead>
                            <tr style={{background:"#1d4ed8",color:"#fff"}}>
                              <th style={{padding:"7px 10px",textAlign:"left",width:"26px"}}>#</th>
                              <th style={{padding:"7px 10px",textAlign:"left"}}>Tour</th>
                              <th style={{padding:"7px 10px",textAlign:"left"}}>Date</th>
                              <th style={{padding:"7px 10px",textAlign:"left"}}>Pax</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotation.items.filter(i => i.type === "tour").map((item, i) => (
                              <tr key={item._id} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                                <td style={{padding:"8px 10px",color:"#6b7280",fontWeight:"600",verticalAlign:"top"}}>{i+1}</td>
                                <td style={{padding:"8px 10px"}}>
                                  <div style={{fontWeight:"600",color:"#111827"}}>{item.name}</div>
                                  {item.description && <div style={{color:"#6b7280",fontSize:"11px"}}>{item.description}</div>}
                                  {item.days && item.days.length > 0 && (
                                    <div style={{marginTop:"6px"}}>
                                      {[...item.days].sort((a,b)=>a.day-b.day).map((d,di) => (
                                        <div key={di} style={{marginBottom:"4px",padding:"4px 6px",background:"#f0f9ff",borderRadius:"4px",fontSize:"11px"}}>
                                          <span style={{fontWeight:"700",color:"#1d4ed8"}}>Day {d.day}{d.title ? ` — ${d.title}` : ""}</span>
                                          {d.description && <div style={{color:"#4b5563",marginTop:"2px"}}>{d.description}</div>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563",verticalAlign:"top"}}>{item.serviceDate?new Date(item.serviceDate).toLocaleDateString("en-IN"):"—"}</td>
                                <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563",verticalAlign:"top"}}>{item.pax} pax</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {quotation.items.filter(i => i.type === "vehicle").length > 0 && (
                      <div style={{marginBottom:"20px"}}>
                        <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>🚌 Transportation & Activities</div>
                        {quotation.items.filter(i => i.type === "vehicle").map((item, idx) => (
                          <div key={item._id} style={{marginBottom:"16px"}}>
                            <div style={{fontWeight:"600",color:"#111827",fontSize:"13px",marginBottom:"8px",padding:"6px 10px",background:"#f1f5f9",borderRadius:"6px"}}>
                              {idx+1}. {item.name} {item.route?"— "+item.route:""}
                            </div>
                            {item.days && item.days.length > 0 ? (
                              item.days.map((day, di) => (
                                <div key={di} style={{marginBottom:"12px",paddingLeft:"10px"}}>
                                  <div style={{fontWeight:"700",color:"#1d4ed8",fontSize:"12px",marginBottom:"6px"}}>📅 Day {day.day}</div>
                                  {day.transportation && day.transportation.filter(t => t.from||t.to).length > 0 && (
                                    <div style={{marginBottom:"8px"}}>
                                      <div style={{fontSize:"11px",fontWeight:"600",color:"#6b7280",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.5px"}}>🚗 Transportation</div>
                                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
                                        <thead>
                                          <tr style={{background:"#e0f2fe"}}>
                                            <th style={{padding:"5px 8px",textAlign:"left",color:"#0369a1"}}>From</th>
                                            <th style={{padding:"5px 8px",textAlign:"left",color:"#0369a1"}}>To</th>
                                            <th style={{padding:"5px 8px",textAlign:"left",color:"#0369a1"}}>Vehicle</th>
                                            <th style={{padding:"5px 8px",textAlign:"left",color:"#0369a1"}}>Description</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {day.transportation.map((t, ti) => (
                                            <tr key={ti} style={{borderBottom:"1px solid #e2e8f0",background:ti%2===0?"#f8fafc":"#fff"}}>
                                              <td style={{padding:"5px 8px",color:"#374151"}}>{t.from||"—"}</td>
                                              <td style={{padding:"5px 8px",color:"#374151"}}>{t.to||"—"}</td>
                                              <td style={{padding:"5px 8px",color:"#374151"}}>{t.vehicle||"—"}</td>
                                              <td style={{padding:"5px 8px",color:"#374151"}}>{t.description||"—"}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                  {day.activities && day.activities.filter(a => a.activityName).length > 0 && (
                                    <div>
                                      <div style={{fontSize:"11px",fontWeight:"600",color:"#6b7280",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.5px"}}>🏄 Activities</div>
                                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
                                        <thead>
                                          <tr style={{background:"#dcfce7"}}>
                                            <th style={{padding:"5px 8px",textAlign:"left",color:"#166534"}}>Activity</th>
                                            <th style={{padding:"5px 8px",textAlign:"center",color:"#166534"}}>Adults</th>
                                            <th style={{padding:"5px 8px",textAlign:"center",color:"#166534"}}>Children</th>
                                            <th style={{padding:"5px 8px",textAlign:"left",color:"#166534"}}>Remarks</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {day.activities.filter(a => a.activityName).map((a, ai) => (
                                            <tr key={ai} style={{borderBottom:"1px solid #e2e8f0",background:ai%2===0?"#f0fdf4":"#fff"}}>
                                              <td style={{padding:"5px 8px",color:"#374151",fontWeight:"500"}}>{a.activityName}</td>
                                              <td style={{padding:"5px 8px",color:"#374151",textAlign:"center"}}>{a.adults||0}</td>
                                              <td style={{padding:"5px 8px",color:"#374151",textAlign:"center"}}>{a.children||0}</td>
                                              <td style={{padding:"5px 8px",color:"#374151"}}>{a.remarks||"—"}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div style={{fontSize:"12px",color:"#6b7280",paddingLeft:"10px"}}>
                                {item.vehicleType && <span>Type: {item.vehicleType} | </span>}
                                {item.route && <span>Route: {item.route} | </span>}
                                Qty: {item.quantity}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {quotation.selectedInclusions && quotation.selectedInclusions.length > 0 && (
                      <div style={{marginBottom:"20px"}}>
                        <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>✔ Inclusions</div>
                        <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                          {quotation.selectedInclusions.map((inc, i) => (
                            <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                              <span style={{color:"#16a34a",fontWeight:"700",flexShrink:0}}>✔</span>
                              <span>{inc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {quotation.selectedExclusions && quotation.selectedExclusions.length > 0 && (
                      <div style={{marginBottom:"20px"}}>
                        <div style={{fontSize:"12px",fontWeight:"700",color:"#ef4444",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #fecaca",paddingBottom:"4px"}}>✖ Exclusions</div>
                        <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                          {quotation.selectedExclusions.map((exc, i) => (
                            <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                              <span style={{color:"#dc2626",fontWeight:"700",flexShrink:0}}>✖</span>
                              <span>{exc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* WATER ACTIVITIES - HARDCODED */}
                    <div style={{marginBottom:"20px"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#0369a1",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"10px",borderBottom:"2px solid #bae6fd",paddingBottom:"4px"}}>🌊 Water Activities (Optional – Not Included in Package)</div>

                      {/* Top list */}
                      <div style={{fontWeight:"700",fontSize:"11px",color:"#0c4a6e",marginBottom:"6px",padding:"4px 8px",background:"#e0f2fe",borderRadius:"4px"}}>🏆 Top Water Sports in Andaman Islands (Best Places & Prices)</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px",marginBottom:"14px"}}>
                        {[
                          ["Shore Diving","₹3,500"],
                          ["Sea Walk","₹3,500"],
                          ["Parasailing","₹3,500"],
                          ["Snorkeling","₹1,000"],
                          ["Glass Bottom Boat Ride","₹1,200"],
                          ["Coral Trip by Semi Submarine","₹3,000"],
                          ["Dolphin Glass Boat Ride","₹3,000"],
                          ["Kayaking (Half Hour)","₹1,000"],
                          ["Kayaking (45 Minutes)","₹1,500"],
                          ["Jet Ski Ride (1 Km)","₹600"],
                          ["Jet Ski Ride (2 Km)","₹1,000"],
                          ["Jet Ski Ride (3 Km)","₹1,500"],
                        ].map(([name, price], i) => (
                          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",borderRadius:"4px",background:i%2===0?"#f0f9ff":"#fff",fontSize:"11px",border:"1px solid #e0f2fe"}}>
                            <span style={{color:"#374151"}}>{name}</span>
                            <span style={{fontWeight:"700",color:"#0369a1",whiteSpace:"nowrap",marginLeft:"8px"}}>{price}/-</span>
                          </div>
                        ))}
                      </div>

                      {/* Havelock + Neil stacked */}
                      <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                        <div>
                          <div style={{fontWeight:"700",fontSize:"11px",color:"#0c4a6e",marginBottom:"6px",padding:"4px 8px",background:"#e0f2fe",borderRadius:"4px"}}>📍 Havelock Water Activities</div>
                          {[
                            ["Scuba Diving – Photo (20 Clicks) + 1 Video","₹3,500"],
                            ["Boat Scuba Diving – Photo (20 Clicks) + 1 Video","₹5,500"],
                            ["Sea Walk – With Photo (10 Clicks) + 1 Video","₹3,800"],
                            ["Dolphin Glass Boat Ride (Half Hour)","₹3,500"],
                            ["Submarine Boat Ride (Half Hour)","₹3,500"],
                            ["Banana Ride","₹600"],
                            ["Snorkeling","₹1,600"],
                            ["Bioluminescence Night Kayaking","₹3,500"],
                          ].map(([name, price], i) => (
                            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 6px",borderBottom:"1px solid #e0f2fe",fontSize:"11px"}}>
                              <span style={{color:"#374151"}}>{name}</span>
                              <span style={{fontWeight:"700",color:"#0369a1",whiteSpace:"nowrap",marginLeft:"6px"}}>{price}/-</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{fontWeight:"700",fontSize:"11px",color:"#0c4a6e",marginBottom:"6px",padding:"4px 8px",background:"#e0f2fe",borderRadius:"4px"}}>📍 Neil Island Water Activities</div>
                          {[
                            ["Boat Scuba Diving – Photo (20 Clicks) + 1 Video","₹4,500"],
                            ["Snorkeling by Boat","₹1,600"],
                            ["Glass Boat Ride at Bharatpur Beach (30 Min)","₹800"],
                            ["Sofa Ride at Bharatpur Beach","₹600"],
                            ["Jet Ski Ride at Bharatpur Beach","₹600"],
                          ].map(([name, price], i) => (
                            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 6px",borderBottom:"1px solid #e0f2fe",fontSize:"11px"}}>
                              <span style={{color:"#374151"}}>{name}</span>
                              <span style={{fontWeight:"700",color:"#0369a1",whiteSpace:"nowrap",marginLeft:"6px"}}>{price}/-</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{borderTop:"2px solid #e2e8f0",paddingTop:"16px",marginTop:"8px"}}>
                      <div style={{fontSize:"11px",color:"#6b7280",marginBottom:"12px"}}>
                        <div style={{fontWeight:"600",marginBottom:"6px",fontSize:"12px"}}>Terms & Conditions</div>
                        {[
                          "Hotels confirmed as per availability; similar category may be provided if unavailable.",
                          "Children below 5 years complimentary in parent room without extra bed.",
                          "Cancellation by email. From booking to 30 days: Rs.2000/person or 5%+GST (whichever lower).",
                          "30-15 days: 35% of cost. 14-07 days: 50%. 07-03 days: 75%. No show: 100%.",
                          "50% payment at booking, balance 5 days before check-in. Peak season (15 Dec-15 Jan): NIL refund."
                        ].map((t, i) => <div key={i}>• {t}</div>)}
                      </div>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px",marginTop:"8px",border:"1px solid #e2e8f0",borderRadius:"8px",overflow:"hidden"}}>
                        <thead>
                          <tr style={{background:"#1d4ed8",color:"#fff"}}>
                            <th colSpan={2} style={{padding:"8px 14px",textAlign:"left",fontWeight:"700",fontSize:"13px",letterSpacing:"0.5px"}}>Andaman Tour Infinity — Contact Us</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ["📍 Address","Dollygunj, Port Blair, Andaman - 744103"],
                            ["📧 Email","booking@andamantourinfinity.com"],
                            ["📞 Phone","+91 9476044578, 7063961694"],
                            ["🕐 Hours","Mon - Sat (9:00 AM - 06:00 PM)"],
                          ].map(([label, value], i) => (
                            <tr key={i} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                              <td style={{padding:"7px 14px",fontWeight:"600",color:"#374151",whiteSpace:"nowrap",width:"140px"}}>{label}</td>
                              <td style={{padding:"7px 14px",color:"#111827"}}>{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{display:"flex",justifyContent:"flex-end",marginTop:"16px"}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:"11px",color:"#9ca3af",marginBottom:"24px"}}>Authorised Signature</div>
                          <div style={{borderTop:"1px solid #d1d5db",paddingTop:"4px",fontSize:"11px",color:"#6b7280",width:"140px"}}>Andaman Tour Infinity</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {showProductModal && (
          <div className="product-modal-overlay" onClick={() => setShowProductModal(false)}>
            <div className="product-modal" onClick={(e) => e.stopPropagation()}>
              <div className="product-modal-header">
                <h3>Add Service</h3>
                <button className="btn-close" onClick={() => setShowProductModal(false)}>×</button>
              </div>

              <div className="product-type-tabs">
                {[
                  { key: "hotel", icon: "🏨", label: "Hotels" },
                  { key: "tour", icon: "🗺️", label: "Tours" },
                  { key: "package", icon: "📦", label: "Packages" },
                  { key: "vehicle", icon: "🚌", label: "Transport & Activities" },
                  { key: "inclusions", icon: "📋", label: "Inclusions & Exclusions" },
                ].map(({ key, icon, label }) => (
                  <button
                    key={key}
                    className={`product-type-tab ${selectedProductType === key ? "active" : ""}`}
                    onClick={() => setSelectedProductType(key)}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>

              <div className="product-list">
                {selectedProductType === "inclusions" ? (
                  <div style={{padding:"16px"}}>
                    <div style={{marginBottom:"20px"}}>
                      <div style={{fontWeight:"600",fontSize:"13px",color:"#16a34a",marginBottom:"10px"}}>✔ Select Inclusions</div>
                      <div style={{display:"flex",flexDirection:"column",gap:"6px",maxHeight:"200px",overflowY:"auto"}}>
                        {incExcItems.filter(i => i.type === "inclusion").map(item => (
                          <label key={item._id} style={{display:"flex",gap:"8px",alignItems:"center",cursor:"pointer",padding:"6px 8px",borderRadius:"6px",background:selInclusions.includes(item.text)?"#dcfce7":"#f8fafc",border:"1px solid",borderColor:selInclusions.includes(item.text)?"#16a34a":"#e2e8f0"}}>
                            <input type="checkbox" checked={selInclusions.includes(item.text)} onChange={e => setSelInclusions(prev => e.target.checked ? [...prev, item.text] : prev.filter(x => x !== item.text))} />
                            <span style={{fontSize:"13px"}}>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div style={{marginBottom:"20px"}}>
                      <div style={{fontWeight:"600",fontSize:"13px",color:"#dc2626",marginBottom:"10px"}}>✖ Select Exclusions</div>
                      <div style={{display:"flex",flexDirection:"column",gap:"6px",maxHeight:"200px",overflowY:"auto"}}>
                        {incExcItems.filter(i => i.type === "exclusion").map(item => (
                          <label key={item._id} style={{display:"flex",gap:"8px",alignItems:"center",cursor:"pointer",padding:"6px 8px",borderRadius:"6px",background:selExclusions.includes(item.text)?"#fee2e2":"#f8fafc",border:"1px solid",borderColor:selExclusions.includes(item.text)?"#dc2626":"#e2e8f0"}}>
                            <input type="checkbox" checked={selExclusions.includes(item.text)} onChange={e => setSelExclusions(prev => e.target.checked ? [...prev, item.text] : prev.filter(x => x !== item.text))} />
                            <span style={{fontSize:"13px"}}>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button className="btn-primary" style={{width:"auto"}} onClick={async () => {
                      const res = await apiFetch(`/api/quotations/${quotation._id}`, { method:"PUT", headers, body: JSON.stringify({ inclusions: selInclusions, exclusions: selExclusions }) });
                      if (res.ok) { setQuotation(q => ({...q, selectedInclusions: selInclusions, selectedExclusions: selExclusions})); setShowProductModal(false); }
                    }}>Save to Quotation</button>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="empty">No {selectedProductType}s available</div>
                ) : (
                  filteredProducts.map(product => {
                    const basePrice = product.pricing?.base || product.basePrice || 0;
                    const s = {fontSize:"12px",color:"#555",display:"flex",flexDirection:"column",gap:"4px",marginTop:"10px"};
                    const inp = {padding:"4px 8px",border:"1px solid #ddd",borderRadius:"4px",fontSize:"12px",width:"100%"};
                    const row = {display:"flex",gap:"8px",alignItems:"center"};
                    const lbl = {fontSize:"11px",color:"#6b7280",display:"flex",flexDirection:"column",gap:"2px",flex:1};
                    return (
                      <div key={product._id} className="product-item">
                        <div className="product-item-info" style={{flex:1}}>
                          <h4 style={{margin:"0 0 2px"}}>{product.name || product.title}</h4>
                          <p style={{margin:"0 0 4px",fontSize:"11px",color:"#6b7280"}}>{product.description}</p>
                          <div style={{fontWeight:"700",color:"#1d4ed8",fontSize:"13px"}}>
                            ₹{basePrice.toLocaleString()}
                            {product.location && <span style={{fontSize:"11px",color:"#6b7280",marginLeft:"8px",fontWeight:"400"}}>📍 {product.location}</span>}
                          </div>

                          {product.type === "hotel" && (
                            <div style={s}>
                              <div style={row}>
                                <label style={lbl}>Check-in<input type="date" id={`checkin-${product._id}`} style={inp} defaultValue={quotation.travelDates?.startDate ? new Date(quotation.travelDates.startDate).toISOString().split("T")[0] : ""} /></label>
                                <label style={lbl}>Check-out<input type="date" id={`checkout-${product._id}`} style={inp} defaultValue={quotation.travelDates?.endDate ? new Date(quotation.travelDates.endDate).toISOString().split("T")[0] : ""} /></label>
                              </div>
                              <div style={row}>
                                <label style={lbl}>Nights<input type="number" min="1" defaultValue="1" id={`nights-${product._id}`} style={{...inp,width:"60px"}} onChange={() => updateHotelCalculation(product)} /></label>
                                <label style={lbl}>Rooms<input type="number" min="1" defaultValue="1" id={`rooms-${product._id}`} style={{...inp,width:"60px"}} onChange={() => updateHotelCalculation(product)} /></label>
                                <label style={lbl}>Room Type<input type="text" id={`roomtype-${product._id}`} style={inp} placeholder="e.g. Deluxe" /></label>
                              </div>
                              <label style={lbl}>Meal Plan
                                <select id={`mealplan-${product._id}`} style={inp}>
                                  <option>Dinner + Breakfast</option>
                                  <option>Breakfast Only</option>
                                  <option>All Meals</option>
                                  <option>Room Only</option>
                                </select>
                              </label>
                              <label style={lbl}>Hotel Photo (optional)
                                <input type="file" accept="image/*" style={{fontSize:"11px"}} onChange={(e) => handleImageUpload(product._id, e.target.files[0])} />
                              </label>
                              {itemImages[product._id] && <img src={itemImages[product._id]} alt="preview" style={{width:"100%",height:"80px",objectFit:"cover",borderRadius:"4px",marginTop:"4px"}} />}
                              <div style={{fontWeight:"700",color:"#1d4ed8"}} id={`total-${product._id}`}>= ₹{basePrice.toLocaleString()}</div>
                            </div>
                          )}

                          {(product.type === "tour" || product.type === "package") && (
                            <div style={s}>
                              <div style={row}>
                                <label style={lbl}>Service Date<input type="date" id={`servicedate-${product._id}`} style={inp} defaultValue={quotation.travelDates?.startDate ? new Date(quotation.travelDates.startDate).toISOString().split("T")[0] : ""} /></label>
                                <label style={lbl}>No. of Persons<input type="number" min="1" defaultValue={quotation.groupSize.adults + quotation.groupSize.children} id={`persons-${product._id}`} style={{...inp,width:"70px"}} onChange={() => updateTourCalculation(product)} /></label>
                              </div>
                              {/* Day-wise itinerary */}
                              <div style={{marginTop:"8px"}}>
                                <div style={{fontWeight:"600",fontSize:"11px",color:"#1d4ed8",marginBottom:"6px"}}>📅 Day-wise Itinerary</div>
                                {(tourDays[product._id] || []).sort((a,b) => a.day - b.day).map((d, di) => (
                                  <div key={di} style={{background:"#f8fafc",borderRadius:"6px",padding:"8px",marginBottom:"6px",border:"1px solid #e2e8f0"}}>
                                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                                      <span style={{fontWeight:"700",color:"#1d4ed8",fontSize:"11px"}}>Day {d.day}</span>
                                      <button style={{fontSize:"10px",color:"#ef4444",background:"none",border:"none",cursor:"pointer"}} onClick={() => setTourDays(prev => ({...prev,[product._id]:prev[product._id].filter((_,i)=>i!==di)}))}>✖ Remove</button>
                                    </div>
                                    <input type="text" placeholder="Day title (e.g. Port Blair Arrival)" style={{...inp,marginBottom:"4px"}} value={d.title||""} onChange={e => setTourDays(prev => ({...prev,[product._id]:prev[product._id].map((x,i)=>i===di?{...x,title:e.target.value}:x)}))}/>
                                    <textarea placeholder="Description / activities for this day" style={{...inp,resize:"vertical",minHeight:"50px"}} value={d.description||""} onChange={e => setTourDays(prev => ({...prev,[product._id]:prev[product._id].map((x,i)=>i===di?{...x,description:e.target.value}:x)}))} />
                                  </div>
                                ))}
                                <button style={{fontSize:"11px",padding:"4px 10px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"4px",cursor:"pointer",color:"#1d4ed8"}} onClick={() => {
                                  const existing = tourDays[product._id] || [];
                                  const nextDay = existing.length > 0 ? Math.max(...existing.map(d=>d.day)) + 1 : 1;
                                  setTourDays(prev => ({...prev,[product._id]:[...existing,{day:nextDay,title:"",description:""}]}));
                                }}>+ Add Day</button>
                              </div>
                              <label style={lbl}>Tour Photo (optional)
                                <input type="file" accept="image/*" style={{fontSize:"11px"}} onChange={(e) => handleImageUpload(product._id, e.target.files[0])} />
                              </label>
                              {itemImages[product._id] && <img src={itemImages[product._id]} alt="preview" style={{width:"100%",height:"80px",objectFit:"cover",borderRadius:"4px",marginTop:"4px"}} />}
                              <div style={{fontWeight:"700",color:"#1d4ed8"}} id={`total-${product._id}`}>= ₹{(basePrice*(quotation.groupSize.adults+quotation.groupSize.children)).toLocaleString()}</div>
                            </div>
                          )}

                          {product.type === "vehicle" && (
                            <div style={s}>
                              {(product.days && product.days.length > 0) ? (
                                <div>
                                  {product.days.map((day, di) => (
                                    <div key={di} style={{marginBottom:"10px",background:"#f8fafc",borderRadius:"6px",padding:"10px",border:"1px solid #e2e8f0"}}>
                                      <div style={{fontWeight:"700",color:"#1d4ed8",marginBottom:"6px"}}>📅 Day {day.day}</div>
                                      {day.transportation?.map((t, ti) => (
                                        <div key={ti} style={{fontSize:"11px",paddingLeft:"8px",marginBottom:"2px",color:"#374151"}}>
                                          🚗 {t.from}{t.to?` → ${t.to}`:""}{t.vehicle?` (${t.vehicle})`:""}{t.description?` — ${t.description}`:""}
                                        </div>
                                      ))}
                                      {day.activities?.map((a, ai) => (
                                        <div key={ai} style={{fontSize:"11px",paddingLeft:"8px",color:"#374151"}}>
                                          🏄 {a.activityName}{a.adults?` — ${a.adults} adults`:""}{a.children?`, ${a.children} children`:""}{a.remarks?` (${a.remarks})`:""}
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={row}>
                                  <label style={lbl}>Vehicle Type<input type="text" id={`vehicletype-${product._id}`} style={inp} placeholder="e.g. Scorpio / Ertiga" /></label>
                                  <label style={lbl}>Quantity<input type="number" min="1" defaultValue="1" id={`quantity-${product._id}`} style={{...inp,width:"70px"}} onChange={() => updateVehicleCalculation(product)} /></label>
                                </div>
                              )}
                              <label style={lbl}>Notes<input type="text" id={`route-${product._id}`} style={inp} placeholder="e.g. Airport pickup" /></label>
                              <div style={{fontWeight:"700",color:"#1d4ed8"}} id={`total-${product._id}`}>= ₹{basePrice.toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                        <button className="btn-primary btn-xs" style={{marginTop:"10px",alignSelf:"flex-end"}} onClick={() => addProductToQuotation(product)}>Add</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
