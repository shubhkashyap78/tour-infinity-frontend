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
  const [selectedProductType, setSelectedProductType] = useState("hotel");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const previewRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('Creating quotation from lead:', leadId);
      
      // Create quotation from lead
      const quotRes = await apiFetch(`/api/quotations/from-lead/${leadId}`, {
        method: "POST",
        headers
      });
      
      if (quotRes.ok) {
        const quotData = await quotRes.json();
        console.log('Quotation created:', quotData);
        setQuotation(quotData);
      } else {
        const errorData = await quotRes.json();
        console.error('Failed to create quotation:', errorData);
        alert(`Failed to create quotation: ${errorData.message}`);
      }

      // Load products
      const prodRes = await apiFetch("/api/products", { headers });
      if (prodRes.ok) {
        const productsData = await prodRes.json();
        console.log('Products loaded:', productsData.length, 'products');
        setProducts(productsData);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      alert(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  const addProductToQuotation = async (product) => {
    try {
      // Get the correct price from different possible fields
      const basePrice = product.pricing?.base || product.basePrice || 0;
      const productName = product.name || product.title || 'Unnamed Product';
      
      // Get values from input fields based on product type
      let nights = 1, rooms = 1, persons = quotation.groupSize.adults + quotation.groupSize.children, quantity = 1;
      let checkIn = null, checkOut = null, serviceDate = null;
      
      if (product.type === 'hotel') {
        nights = parseInt(document.getElementById(`nights-${product._id}`)?.value) || 2;
        rooms = parseInt(document.getElementById(`rooms-${product._id}`)?.value) || 1;
        
        // Get check-in and check-out dates
        const checkInValue = document.getElementById(`checkin-${product._id}`)?.value;
        const checkOutValue = document.getElementById(`checkout-${product._id}`)?.value;
        if (checkInValue) checkIn = new Date(checkInValue);
        if (checkOutValue) checkOut = new Date(checkOutValue);
        
      } else if (product.type === 'tour' || product.type === 'package') {
        persons = parseInt(document.getElementById(`persons-${product._id}`)?.value) || (quotation.groupSize.adults + quotation.groupSize.children);
        
        // Get service date
        const serviceDateValue = document.getElementById(`servicedate-${product._id}`)?.value;
        if (serviceDateValue) serviceDate = new Date(serviceDateValue);
        
      } else if (product.type === 'vehicle') {
        quantity = parseInt(document.getElementById(`quantity-${product._id}`)?.value) || 1;
      }
      
      const itemData = {
        type: product.type,
        productId: product._id,
        name: productName,
        description: product.description || '',
        basePrice: basePrice,
        quantity: quantity,
        nights: nights,
        rooms: rooms,
        pax: persons,
        checkIn: checkIn,
        checkOut: checkOut,
        serviceDate: serviceDate,
        inclusions: product.inclusions || [],
        exclusions: product.exclusions || []
      };

      console.log('Adding product:', productName, 'Type:', product.type);
      console.log('Values - Nights:', nights, 'Rooms:', rooms, 'Persons:', persons, 'Quantity:', quantity);
      console.log('Dates - CheckIn:', checkIn, 'CheckOut:', checkOut, 'ServiceDate:', serviceDate);
      console.log('Item data:', itemData);

      const res = await apiFetch(`/api/quotations/${quotation._id}/items`, {
        method: "POST",
        headers,
        body: JSON.stringify(itemData)
      });

      if (res.ok) {
        const updatedQuotation = await res.json();
        console.log('Updated quotation:', updatedQuotation);
        setQuotation(updatedQuotation);
        setShowProductModal(false);
      } else {
        const errorData = await res.json();
        console.error('Failed to add product - Response:', errorData);
        alert(`Failed to add product: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Failed to add product:", error);
      alert(`Error adding product: ${error.message}`);
    }
  };

  const removeItem = async (itemId) => {
    try {
      const res = await apiFetch(`/api/quotations/${quotation._id}/items/${itemId}`, {
        method: "DELETE",
        headers
      });

      if (res.ok) {
        const updatedQuotation = await res.json();
        setQuotation(updatedQuotation);
      }
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  const updatePricing = async (pricingData) => {
    try {
      const res = await apiFetch(`/api/quotations/${quotation._id}/pricing`, {
        method: "PUT",
        headers,
        body: JSON.stringify(pricingData)
      });

      if (res.ok) {
        const updatedQuotation = await res.json();
        setQuotation(updatedQuotation);
      }
    } catch (error) {
      console.error("Failed to update pricing:", error);
    }
  };

  const sendQuotation = async () => {
    try {
      const res = await apiFetch(`/api/quotations/${quotation._id}/send`, {
        method: "POST",
        headers
      });

      if (res.ok) {
        alert("Quotation sent successfully!");
        const updatedQuotation = await res.json();
        setQuotation(updatedQuotation.quotation);
      }
    } catch (error) {
      console.error("Failed to send quotation:", error);
    }
  };

  const downloadPDF = async () => {
    const element = previewRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Handle multi-page
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yOffset = 0;
      while (yOffset < pdfHeight) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yOffset, pdfWidth, pdfHeight);
        yOffset += pageHeight;
      }

      pdf.save(`Quotation-${quotation.quotationRef}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const convertToBooking = async () => {
    if (!confirm("Convert this quotation to booking?")) return;
    
    try {
      const res = await apiFetch(`/api/quotations/${quotation._id}/convert-to-booking`, {
        method: "POST",
        headers
      });

      if (res.ok) {
        const data = await res.json();
        alert("Quotation converted to booking successfully!");
        setQuotation(data.quotation);
        onClose();
      }
    } catch (error) {
      console.error("Failed to convert to booking:", error);
      alert("Failed to convert to booking");
    }
  };

  const filteredProducts = products.filter(p => p.type === selectedProductType && p.isActive);

  // Real-time calculation functions
  const updateHotelCalculation = (product) => {
    const nights = parseInt(document.getElementById(`nights-${product._id}`)?.value) || 1;
    const rooms = parseInt(document.getElementById(`rooms-${product._id}`)?.value) || 1;
    const basePrice = product.pricing?.base || product.basePrice || 0;
    const total = basePrice * nights * rooms;
    
    const totalElement = document.getElementById(`total-${product._id}`);
    if (totalElement) {
      totalElement.textContent = `= ₹${total.toLocaleString()}`;
    }
  };

  const updateTourCalculation = (product) => {
    const persons = parseInt(document.getElementById(`persons-${product._id}`)?.value) || 1;
    const basePrice = product.pricing?.base || product.basePrice || 0;
    const total = basePrice * persons;
    
    const totalElement = document.getElementById(`total-${product._id}`);
    if (totalElement) {
      totalElement.textContent = `= ₹${total.toLocaleString()}`;
    }
  };

  const updateVehicleCalculation = (product) => {
    const quantity = parseInt(document.getElementById(`quantity-${product._id}`)?.value) || 1;
    const basePrice = product.pricing?.base || product.basePrice || 0;
    const total = basePrice * quantity;
    
    const totalElement = document.getElementById(`total-${product._id}`);
    if (totalElement) {
      totalElement.textContent = `= ₹${total.toLocaleString()}`;
    }
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
          <button 
            className={`quotation-tab ${activeTab === "items" ? "active" : ""}`}
            onClick={() => setActiveTab("items")}
          >
            📦 Items ({quotation.items.length})
          </button>
          <button 
            className={`quotation-tab ${activeTab === "pricing" ? "active" : ""}`}
            onClick={() => setActiveTab("pricing")}
          >
            💰 Pricing
          </button>
          <button 
            className={`quotation-tab ${activeTab === "preview" ? "active" : ""}`}
            onClick={() => setActiveTab("preview")}
          >
            👁️ Preview
          </button>
        </div>

        <div className="quotation-body">
          {/* Items Tab */}
          {activeTab === "items" && (
            <div className="items-tab">
              <div className="items-header">
                <h3>Trip Components</h3>
                <button className="btn-primary" onClick={() => setShowProductModal(true)}>
                  ➕ Add Service
                </button>
              </div>

              {quotation.items.length === 0 ? (
                <div className="empty-items">
                  <p>No services added yet. Start building your quotation by adding hotels, tours, or packages.</p>
                </div>
              ) : (
                <div className="quotation-items">
                  {quotation.items.map((item, index) => (
                    <div key={item._id} className="quotation-item">
                      <div className="item-header">
                        <div className="item-info">
                          <span className={`item-type badge-${item.type}`}>{item.type}</span>
                          <h4>{item.name}</h4>
                          <p>{item.description}</p>
                        </div>
                        <div className="item-actions">
                          <span className="item-price">₹{item.subtotal.toLocaleString()}</span>
                          <button className="btn-xs btn-cancel" onClick={() => removeItem(item._id)}>
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="item-details">
                        <div className="item-pricing">
                          {item.type === 'hotel' ? (
                            <span>Rate: ₹{item.basePrice} × {item.nights} nights × {item.rooms} rooms</span>
                          ) : item.type === 'vehicle' ? (
                            <span>Rate: ₹{item.basePrice} × {item.quantity} vehicles</span>
                          ) : (
                            <span>Rate: ₹{item.basePrice} × {item.pax} persons</span>
                          )}
                        </div>
                        
                        {/* Show dates */}
                        <div className="item-dates">
                          {item.type === 'hotel' && item.checkIn && item.checkOut && (
                            <span style={{fontSize: "12px", color: "#666"}}>
                              📅 {new Date(item.checkIn).toLocaleDateString()} - {new Date(item.checkOut).toLocaleDateString()}
                            </span>
                          )}
                          {(item.type === 'tour' || item.type === 'package') && item.serviceDate && (
                            <span style={{fontSize: "12px", color: "#666"}}>
                              📅 {new Date(item.serviceDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        {item.inclusions?.length > 0 && (
                          <div className="item-inclusions">
                            <strong>Inclusions:</strong>
                            <ul>
                              {item.inclusions.map((inc, i) => (
                                <li key={i}>{inc}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pricing Tab */}
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
                    <label>
                      Markup %:
                      <input 
                        type="number" 
                        className="form-input"
                        value={quotation.pricing.agentMarkupPercent}
                        onChange={(e) => updatePricing({ agentMarkupPercent: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </label>
                    <span>OR</span>
                    <label>
                      Fixed Amount:
                      <input 
                        type="number" 
                        className="form-input"
                        value={quotation.pricing.agentMarkup}
                        onChange={(e) => updatePricing({ agentMarkup: parseFloat(e.target.value) || 0 })}
                        min="0"
                      />
                    </label>
                  </div>
                </div>

                <div className="pricing-section">
                  <h4>Discount</h4>
                  <div className="pricing-controls">
                    <label>
                      Discount %:
                      <input 
                        type="number" 
                        className="form-input"
                        value={quotation.pricing.discountPercent}
                        onChange={(e) => updatePricing({ discountPercent: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </label>
                    <span>OR</span>
                    <label>
                      Fixed Amount:
                      <input 
                        type="number" 
                        className="form-input"
                        value={quotation.pricing.discount}
                        onChange={(e) => updatePricing({ discount: parseFloat(e.target.value) || 0 })}
                        min="0"
                      />
                    </label>
                  </div>
                </div>

                <div className="pricing-section">
                  <h4>Taxes</h4>
                  <div className="pricing-controls">
                    <label>
                      GST %:
                      <input 
                        type="number" 
                        className="form-input"
                        value={quotation.pricing.taxPercent}
                        onChange={(e) => updatePricing({ taxPercent: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="30"
                        step="0.1"
                      />
                    </label>
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

          {/* Preview Tab */}
          {activeTab === "preview" && (
            <div className="preview-tab">
              <div className="quotation-preview">
                <div className="preview-header">
                  <h3>Quotation Preview</h3>
                  <div className="preview-actions">
                    <button className="btn-secondary" onClick={downloadPDF}>📄 Download PDF</button>
                    <button className="btn-primary" onClick={sendQuotation}>
                      📧 Send to Customer
                    </button>
                    {quotation.status === "Sent" && (
                      <button className="btn-primary" onClick={convertToBooking} style={{background: "var(--success)"}}>
                        ✅ Convert to Booking
                      </button>
                    )}
                  </div>
                </div>

                <div ref={previewRef} style={{
                  background: "#fff", padding: "32px", fontFamily: "Arial, sans-serif",
                  color: "#1a1a1a", fontSize: "13px", lineHeight: "1.6"
                }}>

                  {/* ── HEADER ── */}
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px"}}>
                    <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
                      <img src="/assests/logo.png" alt="logo" style={{height:"64px", objectFit:"contain"}} />
                      <div>
                        <div style={{fontSize:"20px", fontWeight:"800", color:"#1d4ed8", letterSpacing:"0.5px"}}>Andaman Tour Infinity</div>
                        <div style={{fontSize:"11px", color:"#6b7280", marginTop:"2px"}}>Your Trusted Andaman Travel Partner</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right", fontSize:"11px", color:"#4b5563", lineHeight:"1.9"}}>
                      <div>📍 Dollygunj, Port Blair, Andaman – 744103</div>
                      <div>📞 +91 94760 44578</div>
                      <div>✉️ booking@andamantourinfinity.com</div>
                      <div>🌐 www.andamantourinfinity.com</div>
                    </div>
                  </div>
                  <div style={{height:"3px", background:"linear-gradient(90deg,#1d4ed8,#60a5fa)", borderRadius:"2px", marginBottom:"20px"}} />

                  {/* ── QUOTATION META ── */}
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"stretch", gap:"16px", marginBottom:"20px"}}>
                    {/* To */}
                    <div style={{flex:1, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"14px 16px"}}>
                      <div style={{fontSize:"10px", fontWeight:"700", color:"#6b7280", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px"}}>Prepared For</div>
                      <div style={{fontSize:"15px", fontWeight:"700", color:"#111827"}}>{quotation.customerName}</div>
                      <div style={{color:"#4b5563", marginTop:"4px"}}>{quotation.email}</div>
                      <div style={{color:"#4b5563"}}>{quotation.phone}</div>
                    </div>
                    {/* Trip Info */}
                    <div style={{flex:1, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"14px 16px"}}>
                      <div style={{fontSize:"10px", fontWeight:"700", color:"#6b7280", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px"}}>Trip Details</div>
                      <div><span style={{color:"#6b7280"}}>Destination:</span> <strong>{quotation.destination}</strong></div>
                      <div><span style={{color:"#6b7280"}}>Duration:</span> <strong>{quotation.duration}</strong></div>
                      <div><span style={{color:"#6b7280"}}>Travellers:</span> <strong>{quotation.groupSize.adults} Adults{quotation.groupSize.children > 0 ? `, ${quotation.groupSize.children} Children` : ""}</strong></div>
                    </div>
                    {/* Ref */}
                    <div style={{flex:1, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:"8px", padding:"14px 16px"}}>
                      <div style={{fontSize:"10px", fontWeight:"700", color:"#6b7280", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"6px"}}>Quotation Info</div>
                      <div><span style={{color:"#6b7280"}}>Ref No:</span> <strong style={{color:"#1d4ed8"}}>{quotation.quotationRef}</strong></div>
                      <div><span style={{color:"#6b7280"}}>Date:</span> <strong>{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</strong></div>
                      <div><span style={{color:"#6b7280"}}>Status:</span> <strong>{quotation.status}</strong></div>
                    </div>
                  </div>

                  {/* ── ITINERARY TABLE ── */}
                  {quotation.items.length > 0 && (
                    <div style={{marginBottom:"20px"}}>
                      <div style={{fontSize:"12px", fontWeight:"700", color:"#1d4ed8", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"8px", borderBottom:"2px solid #bfdbfe", paddingBottom:"4px"}}>
                        Trip Itinerary
                      </div>
                      <table style={{width:"100%", borderCollapse:"collapse", fontSize:"12px"}}>
                        <thead>
                          <tr style={{background:"#1d4ed8", color:"#fff"}}>
                            <th style={{padding:"8px 10px", textAlign:"left", borderRadius:"4px 0 0 0", width:"30px"}}>#</th>
                            <th style={{padding:"8px 10px", textAlign:"left"}}>Service</th>
                            <th style={{padding:"8px 10px", textAlign:"left"}}>Type</th>
                            <th style={{padding:"8px 10px", textAlign:"left"}}>Details</th>
                            <th style={{padding:"8px 10px", textAlign:"right", borderRadius:"0 4px 0 0"}}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotation.items.map((item, i) => (
                            <tr key={item._id} style={{background: i % 2 === 0 ? "#f8fafc" : "#fff", borderBottom:"1px solid #e2e8f0"}}>
                              <td style={{padding:"9px 10px", color:"#6b7280", fontWeight:"600"}}>{i+1}</td>
                              <td style={{padding:"9px 10px"}}>
                                <div style={{fontWeight:"600", color:"#111827"}}>{item.name}</div>
                                {item.description && <div style={{color:"#6b7280", fontSize:"11px", marginTop:"2px"}}>{item.description}</div>}
                                {item.type === "hotel" && item.checkIn && item.checkOut && (
                                  <div style={{color:"#6b7280", fontSize:"11px"}}>📅 {new Date(item.checkIn).toLocaleDateString("en-IN")} → {new Date(item.checkOut).toLocaleDateString("en-IN")}</div>
                                )}
                                {(item.type === "tour" || item.type === "package") && item.serviceDate && (
                                  <div style={{color:"#6b7280", fontSize:"11px"}}>📅 {new Date(item.serviceDate).toLocaleDateString("en-IN")}</div>
                                )}
                              </td>
                              <td style={{padding:"9px 10px"}}>
                                <span style={{background:"#dbeafe", color:"#1d4ed8", padding:"2px 8px", borderRadius:"12px", fontSize:"10px", fontWeight:"600", textTransform:"capitalize"}}>{item.type}</span>
                              </td>
                              <td style={{padding:"9px 10px", color:"#4b5563", fontSize:"11px"}}>
                                {item.type === "hotel" && `₹${item.basePrice.toLocaleString()} × ${item.nights}N × ${item.rooms} room${item.rooms>1?"s":""}`}
                                {item.type === "vehicle" && `₹${item.basePrice.toLocaleString()} × ${item.quantity} vehicle${item.quantity>1?"s":""}`}
                                {(item.type === "tour" || item.type === "package") && `₹${item.basePrice.toLocaleString()} × ${item.pax} pax`}
                              </td>
                              <td style={{padding:"9px 10px", textAlign:"right", fontWeight:"700", color:"#111827"}}>₹{item.subtotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* ── PRICING SUMMARY ── */}
                  <div style={{display:"flex", justifyContent:"flex-end", marginBottom:"24px"}}>
                    <div style={{width:"280px", border:"1px solid #e2e8f0", borderRadius:"8px", overflow:"hidden"}}>
                      <div style={{background:"#1d4ed8", color:"#fff", padding:"8px 14px", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px"}}>Price Summary</div>
                      <div style={{padding:"0 14px"}}>
                        <div style={{display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{color:"#6b7280"}}>Package Cost</span>
                          <span>₹{quotation.pricing.subtotal.toLocaleString()}</span>
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
                          <span>Total Amount</span>
                          <span>₹{quotation.pricing.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── FOOTER ── */}
                  <div style={{borderTop:"2px solid #e2e8f0", paddingTop:"14px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <div style={{fontSize:"11px", color:"#9ca3af"}}>
                      <div style={{fontWeight:"600", color:"#6b7280", marginBottom:"2px"}}>Terms & Conditions</div>
                      <div>• This quotation is valid for 7 days from the date of issue.</div>
                      <div>• Prices are subject to availability at the time of booking.</div>
                      <div>• 50% advance required to confirm the booking.</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:"11px", color:"#9ca3af", marginBottom:"24px"}}>Authorised Signature</div>
                      <div style={{borderTop:"1px solid #d1d5db", paddingTop:"4px", fontSize:"11px", color:"#6b7280", width:"140px"}}>Andaman Tour Infinity</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>

        {/* Product Selection Modal */}
        {showProductModal && (
          <div className="product-modal-overlay" onClick={() => setShowProductModal(false)}>
            <div className="product-modal" onClick={(e) => e.stopPropagation()}>
              <div className="product-modal-header">
                <h3>Add Service</h3>
                <button className="btn-close" onClick={() => setShowProductModal(false)}>×</button>
              </div>

              <div className="product-type-tabs">
                {["hotel", "tour", "package", "vehicle"].map(type => (
                  <button 
                    key={type}
                    className={`product-type-tab ${selectedProductType === type ? "active" : ""}`}
                    onClick={() => setSelectedProductType(type)}
                  >
                    {type === "hotel" && "🏨"} 
                    {type === "tour" && "🗺️"} 
                    {type === "package" && "📦"} 
                    {type === "vehicle" && "🚗"} 
                    {type.charAt(0).toUpperCase() + type.slice(1)}s
                  </button>
                ))}
              </div>

              <div className="product-list">
                {filteredProducts.length === 0 ? (
                  <div className="empty">No {selectedProductType}s available</div>
                ) : (
                  filteredProducts.map(product => (
                    <div key={product._id} className="product-item">
                      <div className="product-item-info">
                        <h4>{product.name || product.title}</h4>
                        <p>{product.description}</p>
                        <div className="product-price">
                          ₹{(product.pricing?.base || product.basePrice || 0).toLocaleString()}
                          {product.location && <span style={{fontSize: "12px", color: "#666", marginLeft: "8px"}}>• {product.location}</span>}
                        </div>
                        
                        {/* Hotel-specific inputs */}
                        {product.type === 'hotel' && (
                          <div style={{marginTop: "8px"}}>
                            <div style={{display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px"}}>
                              <label style={{fontSize: "12px", color: "#666"}}>
                                Check-in:
                                <input 
                                  type="date" 
                                  style={{marginLeft: "4px", padding: "2px 4px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "11px"}}
                                  id={`checkin-${product._id}`}
                                  defaultValue={quotation.travelDates?.startDate ? new Date(quotation.travelDates.startDate).toISOString().split('T')[0] : ''}
                                />
                              </label>
                              <label style={{fontSize: "12px", color: "#666"}}>
                                Check-out:
                                <input 
                                  type="date" 
                                  style={{marginLeft: "4px", padding: "2px 4px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "11px"}}
                                  id={`checkout-${product._id}`}
                                  defaultValue={quotation.travelDates?.endDate ? new Date(quotation.travelDates.endDate).toISOString().split('T')[0] : ''}
                                />
                              </label>
                            </div>
                            <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                              <label style={{fontSize: "12px", color: "#666"}}>
                                Nights:
                                <input 
                                  type="number" 
                                  min="1" 
                                  defaultValue="2"
                                  style={{width: "50px", marginLeft: "4px", padding: "2px 4px", border: "1px solid #ddd", borderRadius: "4px"}}
                                  id={`nights-${product._id}`}
                                  onChange={() => updateHotelCalculation(product)}
                                />
                              </label>
                              <label style={{fontSize: "12px", color: "#666"}}>
                                Rooms:
                                <input 
                                  type="number" 
                                  min="1" 
                                  defaultValue={Math.ceil((quotation.groupSize.adults + quotation.groupSize.children) / 2)}
                                  style={{width: "50px", marginLeft: "4px", padding: "2px 4px", border: "1px solid #ddd", borderRadius: "4px"}}
                                  id={`rooms-${product._id}`}
                                  onChange={() => updateHotelCalculation(product)}
                                />
                              </label>
                              <div style={{fontSize: "12px", color: "#2563eb", fontWeight: "600"}} id={`total-${product._id}`}>
                                = ₹{((product.pricing?.base || product.basePrice || 0) * 2 * Math.ceil((quotation.groupSize.adults + quotation.groupSize.children) / 2)).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Tour/Package-specific inputs */}
                        {(product.type === 'tour' || product.type === 'package') && (
                          <div style={{marginTop: "8px"}}>
                            <div style={{display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px"}}>
                              <label style={{fontSize: "12px", color: "#666"}}>
                                Service Date:
                                <input 
                                  type="date" 
                                  style={{marginLeft: "4px", padding: "2px 4px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "11px"}}
                                  id={`servicedate-${product._id}`}
                                  defaultValue={quotation.travelDates?.startDate ? new Date(quotation.travelDates.startDate).toISOString().split('T')[0] : ''}
                                />
                              </label>
                            </div>
                            <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                              <label style={{fontSize: "12px", color: "#666"}}>
                                Persons:
                                <input 
                                  type="number" 
                                  min="1" 
                                  defaultValue={quotation.groupSize.adults + quotation.groupSize.children}
                                  style={{width: "50px", marginLeft: "4px", padding: "2px 4px", border: "1px solid #ddd", borderRadius: "4px"}}
                                  id={`persons-${product._id}`}
                                  onChange={() => updateTourCalculation(product)}
                                />
                              </label>
                              <div style={{fontSize: "12px", color: "#2563eb", fontWeight: "600"}} id={`total-${product._id}`}>
                                = ₹{((product.pricing?.base || product.basePrice || 0) * (quotation.groupSize.adults + quotation.groupSize.children)).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Vehicle-specific inputs */}
                        {product.type === 'vehicle' && (
                          <div style={{marginTop: "8px", display: "flex", gap: "8px", alignItems: "center"}}>
                            <label style={{fontSize: "12px", color: "#666"}}>
                              Quantity:
                              <input 
                                type="number" 
                                min="1" 
                                defaultValue="1"
                                style={{width: "50px", marginLeft: "4px", padding: "2px 4px", border: "1px solid #ddd", borderRadius: "4px"}}
                                id={`quantity-${product._id}`}
                                onChange={() => updateVehicleCalculation(product)}
                              />
                            </label>
                            <div style={{fontSize: "12px", color: "#2563eb", fontWeight: "600"}} id={`total-${product._id}`}>
                              = ₹{(product.pricing?.base || product.basePrice || 0).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                      <button 
                        className="btn-primary btn-xs"
                        onClick={() => addProductToQuotation(product)}
                      >
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}