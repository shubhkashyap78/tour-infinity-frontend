import { useState, useEffect } from "react";
import { apiFetch } from "../api";

export default function QuotationBuilder({ leadId, onClose, token }) {
  const [quotation, setQuotation] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("items");
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState("hotel");

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

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
                    <button className="btn-secondary">📄 Download PDF</button>
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

                <div className="preview-content">
                  <div className="preview-customer">
                    <h4>{quotation.customerName}</h4>
                    <p>{quotation.email} | {quotation.phone}</p>
                    <p>{quotation.destination} | {quotation.duration}</p>
                    <p>{quotation.groupSize.adults} Adults, {quotation.groupSize.children} Children</p>
                  </div>

                  <div className="preview-items">
                    <h4>Trip Itinerary</h4>
                    {quotation.items.map((item, index) => (
                      <div key={item._id} className="preview-item">
                        <div className="preview-item-header">
                          <span className="preview-day">Day {index + 1}</span>
                          <span className="preview-type">{item.type}</span>
                        </div>
                        <h5>{item.name}</h5>
                        <p>{item.description}</p>
                        
                        {/* Show dates in preview */}
                        {item.type === 'hotel' && item.checkIn && item.checkOut && (
                          <p style={{fontSize: "12px", color: "#666", margin: "4px 0"}}>
                            📅 Check-in: {new Date(item.checkIn).toLocaleDateString()} | Check-out: {new Date(item.checkOut).toLocaleDateString()}
                          </p>
                        )}
                        {(item.type === 'tour' || item.type === 'package') && item.serviceDate && (
                          <p style={{fontSize: "12px", color: "#666", margin: "4px 0"}}>
                            📅 Service Date: {new Date(item.serviceDate).toLocaleDateString()}
                          </p>
                        )}
                        
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