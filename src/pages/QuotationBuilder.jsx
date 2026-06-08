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
  const [itemImages, setItemImages] = useState({}); // productId -> base64 image

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

  const handleImageUpload = (productId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setItemImages(prev => ({ ...prev, [productId]: e.target.result }));
    reader.readAsDataURL(file);
  };

  const addProductToQuotation = async (product) => {
    try {
      const basePrice = product.pricing?.base || product.basePrice || 0;
      const productName = product.name || product.title || 'Unnamed Product';
      let nights = 1, rooms = 1, persons = quotation.groupSize.adults + quotation.groupSize.children, quantity = 1;
      let checkIn = null, checkOut = null, serviceDate = null;
      let mealPlan = '', roomType = '', vehicleType = '', route = '', ferryClass = '';

      if (product.type === 'hotel') {
        nights = parseInt(document.getElementById(`nights-${product._id}`)?.value) || 1;
        rooms = parseInt(document.getElementById(`rooms-${product._id}`)?.value) || 1;
        mealPlan = document.getElementById(`mealplan-${product._id}`)?.value || 'Dinner + Breakfast';
        roomType = document.getElementById(`roomtype-${product._id}`)?.value || '';
        const ci = document.getElementById(`checkin-${product._id}`)?.value;
        const co = document.getElementById(`checkout-${product._id}`)?.value;
        if (ci) checkIn = new Date(ci);
        if (co) checkOut = new Date(co);
      } else if (product.type === 'tour' || product.type === 'package') {
        persons = parseInt(document.getElementById(`persons-${product._id}`)?.value) || persons;
        const sd = document.getElementById(`servicedate-${product._id}`)?.value;
        if (sd) serviceDate = new Date(sd);
      } else if (product.type === 'vehicle') {
        quantity = parseInt(document.getElementById(`quantity-${product._id}`)?.value) || 1;
        vehicleType = document.getElementById(`vehicletype-${product._id}`)?.value || '';
        route = document.getElementById(`route-${product._id}`)?.value || '';
      }

      const itemData = {
        type: product.type, productId: product._id, name: productName,
        description: product.description || '', basePrice, quantity, nights, rooms,
        pax: persons, checkIn, checkOut, serviceDate,
        mealPlan, roomType, vehicleType, route,
        image: itemImages[product._id] || null,
        inclusions: product.inclusions || [], exclusions: product.exclusions || []
      };

      const res = await apiFetch(`/api/quotations/${quotation._id}/items`, {
        method: "POST", headers, body: JSON.stringify(itemData)
      });

      if (res.ok) {
        const updatedQuotation = await res.json();
        setQuotation(updatedQuotation);
        setShowProductModal(false);
        setItemImages(prev => { const n = {...prev}; delete n[product._id]; return n; });
      } else {
        const errorData = await res.json();
        alert(`Failed to add product: ${errorData.message}`);
      }
    } catch (error) {
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

  const generateStructuredPDF = async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margins = { left: 12, right: 12, top: 12, bottom: 12 };

      if (previewRef.current) {
        const canvas = await html2canvas(previewRef.current, {
          scale: 1.4,
          useCORS: true,
          backgroundColor: "#ffffff"
        });

        const imgWidth = pageWidth - margins.left - margins.right;
        const pxPerMm = canvas.width / imgWidth;
        const pageHeightPx = (pageHeight - margins.top - margins.bottom) * pxPerMm;
        let pageCount = Math.ceil(canvas.height / pageHeightPx);

        for (let page = 0; page < pageCount; page++) {
          const canvasPage = document.createElement("canvas");
          canvasPage.width = canvas.width;
          const sliceHeightPx = Math.min(pageHeightPx, canvas.height - page * pageHeightPx);
          canvasPage.height = sliceHeightPx;
          const ctx = canvasPage.getContext("2d");
          ctx.drawImage(
            canvas,
            0,
            page * pageHeightPx,
            canvas.width,
            sliceHeightPx,
            0,
            0,
            canvas.width,
            sliceHeightPx
          );

          const pageData = canvasPage.toDataURL("image/jpeg", 0.7);
          const pageHeightMm = sliceHeightPx / pxPerMm;
          pdf.addImage(pageData, "JPEG", margins.left, margins.top, imgWidth, pageHeightMm, undefined, "FAST");
          if (page < pageCount - 1) pdf.addPage();
        }

        pdf.save(`Quotation-${quotation.quotationRef}.pdf`);
        return;
      }

      let yPos = margins.top;

      // Helper functions
      const addText = (text, x, y, options = {}) => {
        const { fontSize = 10, fontStyle = "normal", maxWidth = pageWidth - margins.left - margins.right } = options;
        pdf.setFontSize(fontSize);
        pdf.setFont(undefined, fontStyle);
        pdf.text(text, x, y, { maxWidth });
      };

      const addWatermark = (yStart) => {
        const watermarkText = `Tour Infinity CRM • Quotation# ${quotation.quotationRef}`;
        pdf.setTextColor(200, 200, 200);
        pdf.setFontSize(8);
        for (let i = 0; i < 3; i++) {
          pdf.text(watermarkText.repeat(2), margins.left, yStart + (i * 10));
        }
        pdf.setTextColor(0, 0, 0);
      };

      const addSectionTitle = (title, x = margins.left) => {
        yPos += 4;
        pdf.setFontSize(12);
        pdf.setFont(undefined, "bold");
        pdf.text(title, x, yPos);
        pdf.setDrawColor(100, 100, 100);
        pdf.line(x, yPos + 1, pageWidth - margins.right, yPos + 1);
        yPos += 7;
      };

      const checkPageBreak = (additionalSpace = 20) => {
        if (yPos + additionalSpace > pageHeight - margins.bottom) {
          pdf.addPage();
          yPos = margins.top;
          addWatermark(yPos + 30);
        }
      };

      // Header - Greeting
      addText("Dear Sir/Madam,", margins.left, yPos);
      yPos += 6;
      addText(`Greetings from Tour Infinity CRM. Our team has put together this quote for your upcoming trip.`, 
        margins.left, yPos, { maxWidth: pageWidth - 2 * margins.left });
      yPos += 12;

      // Trip Summary Section
      addSectionTitle("TRIP SUMMARY");
      checkPageBreak(40);

      const leadData = quotation.lead || {};
      const summaryData = [
        ["DESTINATION", quotation.destination || "TBD"],
        ["START DATE", quotation.startDate ? new Date(quotation.startDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : "TBD"],
        ["DURATION", `${quotation.duration || 0} Days / ${quotation.nights || 0} Nights`],
        ["PAX", `${quotation.groupSize?.adults || 0} Adults, ${quotation.groupSize?.children || 0} Children`],
        ["QUOTATION ID", quotation.quotationRef]
      ];

      summaryData.forEach(([label, value]) => {
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        pdf.text(label, margins.left, yPos);
        pdf.setFont(undefined, "normal");
        pdf.text(String(value), margins.left + 50, yPos);
        yPos += 6;
      });
      yPos += 4;

      // Quote Price
      addSectionTitle("QUOTE PRICE");
      checkPageBreak(30);

      pdf.setFont(undefined, "bold");
      pdf.setFontSize(11);
      pdf.text(`Total (INR): ₹${(quotation.totalPrice || 0).toLocaleString()}`, margins.left, yPos);
      yPos += 6;
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(10);
      const perPaxPrice = quotation.totalPrice && quotation.groupSize?.adults 
        ? (quotation.totalPrice / (quotation.groupSize.adults + quotation.groupSize.children)).toLocaleString(undefined, {maximumFractionDigits: 0})
        : 0;
      pdf.text(`Per Person: ₹${perPaxPrice} (excluding GST)`, margins.left, yPos);
      yPos += 10;

      // Hotels/Accommodations Section
      if (quotation.items.filter(i => i.type === 'hotel').length > 0) {
        addSectionTitle("HOTELS & ACCOMMODATIONS");
        checkPageBreak(50);

        quotation.items.filter(i => i.type === 'hotel').forEach((hotel, idx) => {
          checkPageBreak(25);
          pdf.setFont(undefined, "bold");
          pdf.setFontSize(10);
          pdf.text(`Night ${idx + 1}: ${hotel.name}`, margins.left, yPos);
          yPos += 5;

          pdf.setFont(undefined, "normal");
          pdf.setFontSize(9);
          pdf.text(`Check-in: ${hotel.checkIn ? new Date(hotel.checkIn).toLocaleDateString('en-IN') : 'TBD'}`, margins.left + 5, yPos);
          yPos += 4;
          pdf.text(`${hotel.rooms} Room(s) | ${hotel.pax} Persons | ${hotel.nights} Night(s)`, margins.left + 5, yPos);
          yPos += 4;
          pdf.text(`Meal Plan: ${hotel.mealPlan || 'As per availability'}`, margins.left + 5, yPos);
          yPos += 5;
          pdf.text(`Rate: ₹${(hotel.basePrice || 0).toLocaleString()} × ${hotel.nights} nights × ${hotel.rooms} rooms`, margins.left + 5, yPos);
          yPos += 4;
          pdf.setFont(undefined, "bold");
          pdf.text(`Subtotal: ₹${(hotel.subtotal || 0).toLocaleString()}`, margins.left + 5, yPos);
          yPos += 8;
        });
      }

      // Activities & Transportation
      const activities = quotation.items.filter(i => i.type === 'tour' || i.type === 'activity');
      if (activities.length > 0) {
        addSectionTitle("ACTIVITIES & TRANSPORTATION");
        checkPageBreak(40);

        activities.forEach(activity => {
          checkPageBreak(15);
          pdf.setFont(undefined, "bold");
          pdf.setFontSize(10);
          pdf.text(`${activity.name}`, margins.left, yPos);
          yPos += 5;

          pdf.setFont(undefined, "normal");
          pdf.setFontSize(9);
          if (activity.serviceDate) {
            pdf.text(`Date: ${new Date(activity.serviceDate).toLocaleDateString('en-IN')}`, margins.left + 5, yPos);
            yPos += 4;
          }
          pdf.text(`${activity.pax} Person(s) | Rate: ₹${(activity.basePrice || 0).toLocaleString()}`, margins.left + 5, yPos);
          yPos += 4;
          pdf.setFont(undefined, "bold");
          pdf.text(`Subtotal: ₹${(activity.subtotal || 0).toLocaleString()}`, margins.left + 5, yPos);
          yPos += 8;
        });
      }

      // Vehicles
      const vehicles = quotation.items.filter(i => i.type === 'vehicle');
      if (vehicles.length > 0) {
        addSectionTitle("TRANSPORTATION");
        checkPageBreak(35);

        vehicles.forEach(vehicle => {
          checkPageBreak(15);
          pdf.setFont(undefined, "bold");
          pdf.setFontSize(10);
          pdf.text(`${vehicle.name}`, margins.left, yPos);
          yPos += 5;

          pdf.setFont(undefined, "normal");
          pdf.setFontSize(9);
          pdf.text(`${vehicle.quantity} Vehicle(s) | Rate: ₹${(vehicle.basePrice || 0).toLocaleString()} per day`, margins.left + 5, yPos);
          yPos += 4;
          pdf.setFont(undefined, "bold");
          pdf.text(`Subtotal: ₹${(vehicle.subtotal || 0).toLocaleString()}`, margins.left + 5, yPos);
          yPos += 8;
        });
      }

      // Inclusions
      if (quotation.inclusions && quotation.inclusions.length > 0) {
        checkPageBreak(30);
        addSectionTitle("INCLUSIONS");

        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);
        quotation.inclusions.forEach(inclusion => {
          checkPageBreak(5);
          pdf.text(`✔ ${inclusion}`, margins.left + 5, yPos);
          yPos += 5;
        });
        yPos += 4;
      }

      // Exclusions
      if (quotation.exclusions && quotation.exclusions.length > 0) {
        checkPageBreak(30);
        addSectionTitle("EXCLUSIONS");

        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);
        quotation.exclusions.forEach(exclusion => {
          checkPageBreak(5);
          pdf.text(`✖ ${exclusion}`, margins.left + 5, yPos);
          yPos += 5;
        });
        yPos += 4;
      }

      // Terms & Conditions
      checkPageBreak(30);
      addSectionTitle("TERMS & CONDITIONS");

      pdf.setFont(undefined, "normal");
      pdf.setFontSize(8);
      const tcText = `• Hotels confirmed as per room availability; similar category hotel may be offered if unavailable and itinerary may be rearranged as per hotel availability.\n• Extra Person Cost: Children below 5 years are complimentary in parent room without extra bed (may differ by hotel). Milk/food for infant or children below 5 years is chargeable and directly payable at hotel.\n• Children between 6-10 years & adults (above 10 yrs.) would cost extra according to company policies. If false age information is conveyed, the company may charge the fair amount without objection.\n• Payment & Cancellation Policy: Cancellation by email only. From booking to 30 days: communication charges Rs. 2,000 per person or 5% of total amount + 18% GST, whichever is lower.\n• 30-15 days prior departure: 35% of tour cost. 14-07 days prior departure: 50% of tour cost. 07-03 days prior departure: 75% of tour cost. 03 days/no-show: 100% of tour cost.\n• Payment Policy: 50% at booking, balance 5 days before check-in. Peak season 15 Dec-15 Jan: NIL refund.\n• If bad weather or ferry/helicopter/seaplane cancellation occurs, equivalent hotel will be provided at Port Blair with additional cost. No refund for unused room nights.\n• Management may change/alter the tour plan due to natural calamity or political disturbances; no claim will be entertained. Best effort will be made to minimize cancellation charges. No refund within 30 days of tour start in high season.`;
      pdf.text(tcText, margins.left, yPos, { maxWidth: pageWidth - 2 * margins.left });
      yPos += 15;

      // Footer
      checkPageBreak(20);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Tour Infinity CRM | Quotation System", margins.left, pageHeight - margins.bottom - 5);
      pdf.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margins.right - 50, pageHeight - margins.bottom - 5);

      pdf.save(`Quotation-${quotation.quotationRef}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const downloadPDF = generateStructuredPDF;

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
                            ✖
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
                    <button className="btn-secondary" onClick={downloadPDF}>⬇️ Download PDF</button>
                      <button className="btn-primary" onClick={sendQuotation}>
                      ✉️ Send to Customer
                    </button>
                    {quotation.status === "Sent" && (
                      <button className="btn-primary" onClick={convertToBooking} style={{background: "var(--success)"}}>
                        ✔ Convert to Booking
                      </button>
                    )}
                  </div>
                </div>

                <div ref={previewRef} style={{background:"#fff", fontFamily:"Arial, sans-serif", color:"#1a1a1a", fontSize:"13px", lineHeight:"1.6", position:"relative"}}>
                  {/* WATERMARK */}
                  <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,overflow:"hidden",pointerEvents:"none",zIndex:0,opacity:0.05,fontSize:"10px",color:"#1d4ed8",wordBreak:"break-all",padding:"8px",lineHeight:"2"}}>
                    {Array(60).fill(`Andaman Destinations • ${quotation.quotationRef} • `).join("")}
                  </div>
                  <div style={{position:"relative",zIndex:1,padding:"28px"}}>
                  {/* HEADER */}
                  <div style={{marginBottom:"16px"}}>
                    <img src="/assests/header_on_pdf.png" alt="header" style={{width:"100%",display:"block",objectFit:"contain"}} />
                  </div>

                  {/* GREETING */}
                  <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"8px",padding:"12px 16px",marginBottom:"16px",fontSize:"12px"}}>
                    <div style={{fontWeight:"700",marginBottom:"4px"}}>Dear {quotation.customerName},</div>
                    <div>Greetings from Andaman Destinations. Our sales team has put up this Quote regarding your upcoming trip. Please go through it and let us know if you would like any changes. Contact details are provided at the end.</div>
                  </div>

                  {/* CUSTOMER DETAILS */}
                  <div style={{marginBottom:"16px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>Customer Details</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 20px",fontSize:"12px"}}>
                      {[
                        ["Name", quotation.customerName],
                        ["Phone", quotation.lead?.phone || quotation.phone || "—"],
                        ["Email", quotation.lead?.email || quotation.email || "—"],
                        ["Source", quotation.lead?.source || "—"]
                      ].map(([l,v],i) => (
                        <div key={i} style={{display:"flex",gap:"6px"}}>
                          <span style={{color:"#6b7280",minWidth:"55px"}}>{l}:</span>
                          <span style={{fontWeight:"600",color:"#111827"}}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TRIP SUMMARY */}
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
                      ].map((r,i)=>(
                        <div key={i} style={{padding:"10px 14px",borderTop:"1px solid #e2e8f0",borderRight:i%3!==2?"1px solid #e2e8f0":"none"}}>
                          <div style={{fontSize:"9px",fontWeight:"700",color:"#6b7280",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"3px"}}>{r.l}</div>
                          <div style={{fontWeight:"600",color:"#111827",fontSize:"12px"}}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* â”€â”€ PRICE SUMMARY (before itinerary) â”€â”€ */}
                  <div style={{display:"flex", justifyContent:"flex-end", marginBottom:"20px"}}>
                    <div style={{width:"300px", border:"1px solid #e2e8f0", borderRadius:"8px", overflow:"hidden"}}>
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

                  {/* â”€â”€ ITINERARY â€“ Hotels â”€â”€ */}
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
                            <th style={{padding:"7px 10px",textAlign:"right"}}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotation.items.filter(i => i.type === "hotel").map((item, i) => (
                            <tr key={item._id} style={{background: i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                              <td style={{padding:"8px 10px",color:"#6b7280",fontWeight:"600"}}>{i+1}</td>
                              <td style={{padding:"8px 10px"}}>
                                {item.image && <img src={item.image} alt={item.name} style={{width:"100%",maxWidth:"160px",height:"auto",objectFit:"contain",borderRadius:"6px",marginBottom:"6px",display:"block"}} />}
                                <div style={{fontWeight:"600",color:"#111827"}}>{item.name}</div>
                                {item.roomType && <div style={{color:"#6b7280",fontSize:"11px"}}>{item.roomType}</div>}
                              </td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.checkIn ? new Date(item.checkIn).toLocaleDateString("en-IN") : "—"}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.nights}N / {item.rooms} room{item.rooms>1?"s":""}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.mealPlan || "—"}</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:"700",color:"#111827"}}>₹{item.subtotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* â”€â”€ ITINERARY â€“ Packages â”€â”€ */}
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
                            <th style={{padding:"7px 10px",textAlign:"right"}}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotation.items.filter(i => i.type === "package").map((item, i) => (
                            <tr key={item._id} style={{background: i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                              <td style={{padding:"8px 10px",color:"#6b7280",fontWeight:"600"}}>{i+1}</td>
                              <td style={{padding:"8px 10px"}}>
                                <div style={{fontWeight:"600",color:"#111827"}}>{item.name}</div>
                                {item.description && <div style={{color:"#6b7280",fontSize:"11px"}}>{item.description}</div>}
                              </td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.serviceDate ? new Date(item.serviceDate).toLocaleDateString("en-IN") : "—"}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.pax} pax</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:"700",color:"#111827"}}>₹{item.subtotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* â”€â”€ ITINERARY â€“ Tours â”€â”€ */}
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
                            <th style={{padding:"7px 10px",textAlign:"right"}}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotation.items.filter(i => i.type === "tour").map((item, i) => (
                            <tr key={item._id} style={{background: i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                              <td style={{padding:"8px 10px",color:"#6b7280",fontWeight:"600"}}>{i+1}</td>
                              <td style={{padding:"8px 10px"}}>
                                <div style={{fontWeight:"600",color:"#111827"}}>{item.name}</div>
                                {item.description && <div style={{color:"#6b7280",fontSize:"11px"}}>{item.description}</div>}
                              </td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.serviceDate ? new Date(item.serviceDate).toLocaleDateString("en-IN") : "—"}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.pax} pax</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:"700",color:"#111827"}}>₹{item.subtotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* â”€â”€ ITINERARY â€“ Vehicles â”€â”€ */}
                  {quotation.items.filter(i => i.type === "vehicle").length > 0 && (
                    <div style={{marginBottom:"20px"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>🚗 Vehicles & Transfers</div>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                        <thead>
                          <tr style={{background:"#1d4ed8",color:"#fff"}}>
                            <th style={{padding:"7px 10px",textAlign:"left",width:"26px"}}>#</th>
                            <th style={{padding:"7px 10px",textAlign:"left"}}>Vehicle</th>
                            <th style={{padding:"7px 10px",textAlign:"left"}}>Type</th>
                            <th style={{padding:"7px 10px",textAlign:"left"}}>Route</th>
                            <th style={{padding:"7px 10px",textAlign:"left"}}>Qty</th>
                            <th style={{padding:"7px 10px",textAlign:"right"}}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotation.items.filter(i => i.type === "vehicle").map((item, i) => (
                            <tr key={item._id} style={{background: i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                              <td style={{padding:"8px 10px",color:"#6b7280",fontWeight:"600"}}>{i+1}</td>
                              <td style={{padding:"8px 10px",fontWeight:"600",color:"#111827"}}>{item.name}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.vehicleType || "—"}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.route || "—"}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.quantity}</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:"700",color:"#111827"}}>₹{item.subtotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* â”€â”€ INCLUSIONS â”€â”€ */}
                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>✔ Inclusions</div>
                    <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                      {[
                        "Accommodation as specified above.",
                        "All Accommodations - (Deluxe Hotels / Resorts)",
                        "Note: Check-in and check-out times at hotels would be as per hotel policies.",
                        "All entry tickets (as mentioned in the quotation)",
                        "All Sightseeing and Transfers by AC Personal Cab",
                        "Port Blair Airport Pick-up and Drop",
                        "Meals MAP (Daily Breakfast - Dinner)",
                        "All the boats and cruise are on sharing basis",
                        "All entry, Monuments, Parking and Permits charges as per itinerary.",
                        "Elephanta Boat Tickets Sharing Basis (Complementary Snorkeling 4 to 6 mins)",
                        "3-way Private Cruise charges",
                        "24 hours on-call assistance during your stay.",
                        "The Vehicle Will be used strictly as per your tour itinerary",
                        "Extra Fuel Surcharges will be applicable in this Package."
                      ].map((inc, i) => (
                        <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                          <span style={{color:"#16a34a",fontWeight:"700",flexShrink:0}}>✔</span>
                          <span>{inc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#ef4444",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #fecaca",paddingBottom:"4px"}}>✖ Exclusions</div>
                    <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                      {[
                        "Airfare to and from Port Blair.",
                        "The services of vehicles are not included on leisure days & after finishing the sightseeing tour as per the itinerary.",
                        "Any kind of personal expenses or optional tours or extra meals / beverages ordered at hotel.",
                        "Any kind of drinks (Alcohol, Mineral, Aerated, Bed Tea) or any other snack on tour or while waiting at airport or waiting for ferry at jetty.",
                        "Extra cost incidental to any change in the itinerary / stay on account of flight cancellation, ill health, and/or any factors beyond control.",
                        "Extra usage of vehicle for Evening Dinner / Shopping / Etc. is payable as extra. Vehicle will only be provided for tours as mentioned above.",
                        "Any Water Sports Activities / Adventurous Activity that is not mentioned in the Package Inclusions List.",
                        "Peak Season Surcharges of Hotels / Resorts (Applicable from 15th December to 20th January).",
                        "Additional Supplement Charge for Christmas Eve (24th December) and New Year Eve (31st December) at Hotels / Resorts.",
                        "Anything that is not mentioned in the Package Inclusions.",
                        "Ross & Smith Island Boat Tickets – Diglipur Party Own Payment.",
                        "5% GST.",
                        "Personal Expenses Like Lunch at Hotels, Room Service, Telephone Calls, Laundry, Any Portage at Airports and Hotels, Tips, Insurance, Wine, Mineral Water, Telephone Charges, Camera Tickets at Various Sightseeing/Tour, Guide Charges, Boating Charges and all other personal expenses.",
                        "Honeymoon Kit (Candle Light Dinner, Beach & Pool Side Setup, Flower Bed, Honeymoon Cake) at Havelock Island – Per Couple: Rs. 9,999/-.",
                        "Candle Light Dinner at Beach or Pool Side at Havelock Island – Per Couple: Rs. 5,500/-.",
                        "For disposal vehicles, an additional charge will apply for usage.",
                        "Anything not mentioned in the inclusions is excluded."
                      ].map((exc, i) => (
                        <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                          <span style={{color:"#dc2626",fontWeight:"700",flexShrink:0}}>✖</span>
                          <span>{exc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>Top List of Water Sports in Andaman Islands (Best Places & Prices)</div>
                    <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                      {[
                        "Port Blair Water Activities",
                        "1. Shore Diving – Rs. 3,500/-",
                        "2. Sea Walk – Rs. 3,500/-",
                        "3. Parasailing – Rs. 3,500/-",
                        "4. Snorkeling – Rs. 1,000/-",
                        "5. Glass Bottom Boat Ride – Rs. 1,200/-",
                        "6. Coral Trip by Semi Submarine – Rs. 3,000/-",
                        "7. Dolphin Glass Boat Ride – Rs. 3,000/-",
                        "8. Kayaking (Half Hour) – Rs. 1,000/-",
                        "9. Kayaking (45 Minutes) – Rs. 1,500/-",
                        "10. Jet Ski Ride (1 Km) – Rs. 600/-",
                        "11. Jet Ski Ride (2 Km) – Rs. 1,000/-",
                        "12. Jet Ski Ride (3 Km) – Rs. 1,500/-"
                      ].map((item, i) => (
                        <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                          <span style={{color:"#1d4ed8",fontWeight:"700",flexShrink:0}}>{i === 0 ? "•" : "–"}</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>Havelock Water Activities</div>
                    <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                      {[
                        "1. Scuba Diving – Photo (20 Clicks) + 1 Video – Rs. 3,500/-",
                        "2. Boat Scuba Diving – Photo (20 Clicks) + 1 Video – Rs. 5,500/-",
                        "3. Sea Walk – With Photo (10 Clicks) + 1 Video – Rs. 3,800/-",
                        "4. Dolphin Glass Boat Ride (Half Hour Ride) – Rs. 3,500/-",
                        "5. Submarine Boat Ride (Half Hour Ride) – Rs. 3,500/-",
                        "6. Banana Ride – Rs. 600/-",
                        "7. Snorkeling – Rs. 1,600/-",
                        "8. Bioluminescence Night Kayaking – Rs. 3,500/-"
                      ].map((item, i) => (
                        <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                          <span style={{color:"#1d4ed8",fontWeight:"700",flexShrink:0}}>{"–"}</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>Neil Island Water Activities</div>
                    <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                      {[
                        "- Boat Scuba Diving – Photo (20 Clicks) + 1 Video – Rs. 4,500/-",
                        "- Snorkeling by Boat – Rs. 1,600/-",
                        "- Glass Boat Ride at Bharatpur Beach (30 Minutes) – Rs. 800/-",
                        "- Sofa Ride at Bharatpur Beach – Rs. 600/-",
                        "- Jet Ski Ride at Bharatpur Beach – Rs. 600/-"
                      ].map((item, i) => (
                        <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                          <span style={{color:"#1d4ed8",fontWeight:"700",flexShrink:0}}>{"–"}</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* â”€â”€ FOOTER â”€â”€ */}
                  <div style={{borderTop:"2px solid #e2e8f0", paddingTop:"14px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <div style={{fontSize:"11px", color:"#9ca3af"}}>
                      <div style={{fontWeight:"600", color:"#6b7280", marginBottom:"4px"}}>Terms & Conditions</div>
                      {[
                        "The above mentioned hotels will be confirmed as per the room availability. Otherwise we will confirm a similar category hotel & itinerary might be re-arranged as per hotel availability at the time of booking.",
                        "Extra Person Cost: Children below 5 years are complimentary (this may differ for different hotels) in parent room without extra bed. Milk/food for infant or children below 5 years is chargeable and directly payable at hotel.",
                        "Children between 6-10 years & adults (above 10 yrs.) would cost extra according to the company policies.",
                        "In case false information like fake age is conveyed to the company by the customers, the company possesses full right to extract the fair amount from the customers without any objection from external authorities.",
                        "Hotels are very strict with the child policy. Please carry age proof so that it can be produced when asked.",
                        "Payment & Cancellation Policy: Cancellation has to be sent to us by email only.",
                        "From date of booking to 30 days only communication charges of Rs. 2000 per person or 5% of total amount + 18% GST, whichever is lower.",
                        "30-15 days prior to departure: 35% of tour cost.",
                        "14-07 days prior to departure: 50% of tour cost.",
                        "07-03 days prior to departure: 75% of tour cost.",
                        "03 days/no show: 100% of tour cost.",
                        "Payment Policy: 50% of the package amount at the time of booking. Balance amount 5 days before check-in.",
                        "Any booking for peak season (15 Dec to 15 Jan): NIL refund.",
                        "In case of unexpected bad weather condition or due to cancellation of ferry/helicopter/seaplane to Havelock or any other island, an equivalent hotel will be provided at Port Blair with additional cost. No refund will be made for unused room night.",
                        "The management may change / alter the tour plan due to natural calamity or political disturbances; no claim on such change or alteration will be entertained.",
                        "Above are the cancellation rules but we will put our best possible effort to minimize the cancellation charges.",
                        "In high season, no refund will be applicable within 30 days of the tour start date. (Normal cancellation policy will not be applicable on those dates.)"
                      ].map((item, i) => (
                        <div key={i}>• {item}</div>
                      ))}
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
                  filteredProducts.map(product => {
                    const basePrice = product.pricing?.base || product.basePrice || 0;
                    const s = {fontSize:"12px", color:"#555", display:"flex", flexDirection:"column", gap:"4px", marginTop:"10px"};
                    const inp = {padding:"4px 8px", border:"1px solid #ddd", borderRadius:"4px", fontSize:"12px", width:"100%"};
                    const row = {display:"flex", gap:"8px", alignItems:"center"};
                    const lbl = {fontSize:"11px", color:"#6b7280", display:"flex", flexDirection:"column", gap:"2px", flex:1};
                    return (
                      <div key={product._id} className="product-item">
                        <div className="product-item-info" style={{flex:1}}>
                          <h4 style={{margin:"0 0 2px"}}>{product.name || product.title}</h4>
                          <p style={{margin:"0 0 4px", fontSize:"11px", color:"#6b7280"}}>{product.description}</p>
                          <div style={{fontWeight:"700", color:"#1d4ed8", fontSize:"13px"}}>
                            ₹{basePrice.toLocaleString()}
                            {product.location && <span style={{fontSize:"11px", color:"#6b7280", marginLeft:"8px", fontWeight:"400"}}>📍 {product.location}</span>}
                          </div>

                          {/* â”€â”€ HOTEL FORM â”€â”€ */}
                          {product.type === 'hotel' && (
                            <div style={s}>
                              <div style={row}>
                                <label style={lbl}>Check-in<input type="date" id={`checkin-${product._id}`} style={inp} defaultValue={quotation.travelDates?.startDate ? new Date(quotation.travelDates.startDate).toISOString().split('T')[0] : ''} /></label>
                                <label style={lbl}>Check-out<input type="date" id={`checkout-${product._id}`} style={inp} defaultValue={quotation.travelDates?.endDate ? new Date(quotation.travelDates.endDate).toISOString().split('T')[0] : ''} /></label>
                              </div>
                              <div style={row}>
                                <label style={lbl}>Nights<input type="number" min="1" defaultValue="1" id={`nights-${product._id}`} style={{...inp, width:"60px"}} onChange={() => updateHotelCalculation(product)} /></label>
                                <label style={lbl}>Rooms<input type="number" min="1" defaultValue="1" id={`rooms-${product._id}`} style={{...inp, width:"60px"}} onChange={() => updateHotelCalculation(product)} /></label>
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
                              {itemImages[product._id] && <img src={itemImages[product._id]} alt="preview" style={{width:"100%", height:"80px", objectFit:"cover", borderRadius:"4px", marginTop:"4px"}} />}
                              <div style={{fontWeight:"700", color:"#1d4ed8"}} id={`total-${product._id}`}>= ₹{basePrice.toLocaleString()}</div>
                            </div>
                          )}

                          {/* â”€â”€ TOUR / PACKAGE FORM â”€â”€ */}
                          {(product.type === 'tour' || product.type === 'package') && (
                            <div style={s}>
                              <div style={row}>
                                <label style={lbl}>Service Date<input type="date" id={`servicedate-${product._id}`} style={inp} defaultValue={quotation.travelDates?.startDate ? new Date(quotation.travelDates.startDate).toISOString().split('T')[0] : ''} /></label>
                                <label style={lbl}>No. of Persons<input type="number" min="1" defaultValue={quotation.groupSize.adults + quotation.groupSize.children} id={`persons-${product._id}`} style={{...inp, width:"70px"}} onChange={() => updateTourCalculation(product)} /></label>
                              </div>
                              <label style={lbl}>Tour Photo (optional)
                                <input type="file" accept="image/*" style={{fontSize:"11px"}} onChange={(e) => handleImageUpload(product._id, e.target.files[0])} />
                              </label>
                              {itemImages[product._id] && <img src={itemImages[product._id]} alt="preview" style={{width:"100%", height:"80px", objectFit:"cover", borderRadius:"4px", marginTop:"4px"}} />}
                              <div style={{fontWeight:"700", color:"#1d4ed8"}} id={`total-${product._id}`}>= ₹{(basePrice * (quotation.groupSize.adults + quotation.groupSize.children)).toLocaleString()}</div>
                            </div>
                          )}

                          {/* â”€â”€ VEHICLE FORM â”€â”€ */}
                          {product.type === 'vehicle' && (
                            <div style={s}>
                              <div style={row}>
                                <label style={lbl}>Vehicle Type<input type="text" id={`vehicletype-${product._id}`} style={inp} placeholder="e.g. Scorpio / Ertiga" /></label>
                                <label style={lbl}>Quantity<input type="number" min="1" defaultValue="1" id={`quantity-${product._id}`} style={{...inp, width:"70px"}} onChange={() => updateVehicleCalculation(product)} /></label>
                              </div>
                              <label style={lbl}>Route / Description<input type="text" id={`route-${product._id}`} style={inp} placeholder="e.g. Port Blair – Airport Transfer" /></label>
                              <div style={{fontWeight:"700", color:"#1d4ed8"}} id={`total-${product._id}`}>= ₹{basePrice.toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                        <button className="btn-primary btn-xs" style={{marginTop:"10px", alignSelf:"flex-end"}} onClick={() => addProductToQuotation(product)}>Add</button>
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
