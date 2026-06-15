import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../api";
import toast from "react-hot-toast";
import QuotationBuilder from "./QuotationBuilder";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const STATUS_COLORS = {
  "Draft": "status-pending",
  "Sent": "status-confirmed", 
  "Viewed": "badge-tour",
  "Accepted": "status-completed",
  "Rejected": "status-cancelled",
  "Expired": "status-cancelled"
};

// Shared PDF Modal Component
function QuotationPDFModal({ quotation, onClose, extraActions }) {
  const previewRef = useRef(null);

  const downloadPDF = async () => {
    if (!previewRef.current) return;
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margins = { left: 0, right: 0, top: 0, bottom: 0 };
      const canvas = await html2canvas(previewRef.current, { scale: 1.4, useCORS: true, backgroundColor: "#ffffff" });
      const imgWidth = pageWidth;
      const pxPerMm = canvas.width / imgWidth;
      const pageHeightPx = pageHeight * pxPerMm;
      const pageCount = Math.ceil(canvas.height / pageHeightPx);
      for (let page = 0; page < pageCount; page++) {
        const sliceH = Math.min(pageHeightPx, canvas.height - page * pageHeightPx);
        const c = document.createElement("canvas");
        c.width = canvas.width; c.height = sliceH;
        c.getContext("2d").drawImage(canvas, 0, page * pageHeightPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        pdf.addImage(c.toDataURL("image/jpeg", 0.7), "JPEG", 0, 0, imgWidth, sliceH / pxPerMm, undefined, "FAST");
        if (page < pageCount - 1) pdf.addPage();
      }
      pdf.save(`Quotation-${quotation.quotationRef}.pdf`);
    } catch (err) { alert("Failed to generate PDF."); }
  };

  const q = quotation;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="quotation-builder" onClick={(e) => e.stopPropagation()}>
        <div className="quotation-header">
          <div>
            <h2>📋 Quotation Preview</h2>
            <div className="quotation-meta">
              <span className="quotation-ref">{q.quotationRef}</span>
              <span className="quotation-customer">{q.customerName}</span>
              <span className="quotation-status">{q.status}</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="quotation-body">
          <div className="preview-tab">
            <div className="quotation-preview">
              <div className="preview-header">
                <h3>Quotation Preview</h3>
                <div className="preview-actions">
                  <button className="btn-secondary" onClick={downloadPDF}>📄 Download PDF</button>
                  {extraActions}
                </div>
              </div>

              <div ref={previewRef} style={{background:"#fff",fontFamily:"Arial, sans-serif",color:"#1a1a1a",fontSize:"13px",lineHeight:"1.6",position:"relative"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,overflow:"hidden",pointerEvents:"none",zIndex:0,opacity:0.05,fontSize:"10px",color:"#1d4ed8",wordBreak:"break-all",padding:"8px",lineHeight:"2"}}>
                  {Array(60).fill(`Andaman Destinations • ${q.quotationRef} • `).join("")}
                </div>
                <div style={{position:"relative",zIndex:1,padding:"28px"}}>

                  {/* HEADER */}
                  <div style={{marginBottom:"16px"}}>
                    <img src="/assests/header_on_pdf.png" alt="header" style={{width:"100%",display:"block",objectFit:"contain"}} />
                  </div>

                  {/* GREETING */}
                  <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:"8px",padding:"12px 16px",marginBottom:"16px",fontSize:"12px"}}>
                    <div style={{fontWeight:"700",marginBottom:"4px"}}>Dear {q.customerName},</div>
                    <div>Greetings from Andaman Destinations. Our sales team has put up this Quote regarding your upcoming trip. Please go through it and let us know if you would like any changes. Contact details are provided at the end.</div>
                  </div>

                  {/* CUSTOMER DETAILS */}
                  <div style={{marginBottom:"16px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>Customer Details</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 20px",fontSize:"12px"}}>
                      {[["Name",q.customerName],["Phone",q.lead?.phone||q.phone||"—"],["Email",q.lead?.email||q.email||"—"],["Source",q.lead?.source||"—"]].map(([l,v],i)=>(
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
                      <span>Quote Price</span><span>Trip ID: {q.quotationRef}</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:"none"}}>
                      {[
                        {l:"DESTINATION",v:q.destination||"—"},
                        {l:"START DATE",v:q.travelDates?.startDate?new Date(q.travelDates.startDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}):"—"},
                        {l:"DURATION",v:q.duration||"—"},
                        {l:"PAX",v:`${q.groupSize.adults} Adults${q.groupSize.children>0?", "+q.groupSize.children+" Children":""}`},
                        {l:"TOTAL (INR)",v:`₹${q.pricing.total.toLocaleString()} (excl. GST)`},
                        {l:"STATUS",v:q.status}
                      ].map((r,i)=>(
                        <div key={i} style={{padding:"10px 14px",borderTop:"1px solid #e2e8f0",borderRight:i%3!==2?"1px solid #e2e8f0":"none"}}>
                          <div style={{fontSize:"9px",fontWeight:"700",color:"#6b7280",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"3px"}}>{r.l}</div>
                          <div style={{fontWeight:"600",color:"#111827",fontSize:"12px"}}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PRICE SUMMARY */}
                  <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"20px"}}>
                    <div style={{width:"300px",border:"1px solid #e2e8f0",borderRadius:"8px",overflow:"hidden"}}>
                      <div style={{background:"#1d4ed8",color:"#fff",padding:"8px 14px",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>Price Summary</div>
                      <div style={{padding:"0 14px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}>
                          <span style={{color:"#6b7280"}}>Package Cost</span><span>₹{q.pricing.subtotal.toLocaleString()}</span>
                        </div>
                        {q.pricing.agentMarkupPercent>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}><span style={{color:"#6b7280"}}>Service Charges ({q.pricing.agentMarkupPercent}%)</span><span>₹{(q.pricing.subtotal*q.pricing.agentMarkupPercent/100).toLocaleString()}</span></div>}
                        {q.pricing.discountPercent>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}><span style={{color:"#16a34a"}}>Discount ({q.pricing.discountPercent}%)</span><span style={{color:"#16a34a"}}>-₹{(q.pricing.subtotal*q.pricing.discountPercent/100).toLocaleString()}</span></div>}
                        {q.pricing.taxPercent>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}><span style={{color:"#6b7280"}}>GST ({q.pricing.taxPercent}%)</span><span>₹{q.pricing.taxes.toLocaleString()}</span></div>}
                        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",fontWeight:"800",fontSize:"15px",color:"#1d4ed8"}}><span>Total Amount</span><span>₹{q.pricing.total.toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* HOTELS */}
                  {q.items.filter(i=>i.type==="hotel").length>0&&(
                    <div style={{marginBottom:"16px"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>🏨 Hotels & Accommodation</div>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                        <thead><tr style={{background:"#1d4ed8",color:"#fff"}}>
                          <th style={{padding:"7px 10px",textAlign:"left",width:"26px"}}>#</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Hotel</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Check-in</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Nights / Rooms</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Meal Plan</th>
                          <th style={{padding:"7px 10px",textAlign:"right"}}>Amount</th>
                        </tr></thead>
                        <tbody>
                          {q.items.filter(i=>i.type==="hotel").map((item,i)=>(
                            <tr key={item._id} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                              <td style={{padding:"8px 10px",color:"#6b7280",fontWeight:"600"}}>{i+1}</td>
                              <td style={{padding:"8px 10px"}}>
                                {item.image&&<img src={item.image} alt={item.name} style={{width:"100%",maxWidth:"160px",height:"auto",objectFit:"contain",borderRadius:"6px",marginBottom:"6px",display:"block"}} />}
                                <div style={{fontWeight:"600",color:"#111827"}}>{item.name}</div>
                                {item.roomType&&<div style={{color:"#6b7280",fontSize:"11px"}}>{item.roomType}</div>}
                              </td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.checkIn?new Date(item.checkIn).toLocaleDateString("en-IN"):"—"}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.nights}N / {item.rooms} room{item.rooms>1?"s":""}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.mealPlan||"—"}</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:"700",color:"#111827"}}>₹{item.subtotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* PACKAGES */}
                  {q.items.filter(i=>i.type==="package").length>0&&(
                    <div style={{marginBottom:"16px"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>📦 Packages</div>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                        <thead><tr style={{background:"#1d4ed8",color:"#fff"}}>
                          <th style={{padding:"7px 10px",textAlign:"left",width:"26px"}}>#</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Package</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Date</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Pax</th>
                          <th style={{padding:"7px 10px",textAlign:"right"}}>Amount</th>
                        </tr></thead>
                        <tbody>
                          {q.items.filter(i=>i.type==="package").map((item,i)=>(
                            <tr key={item._id} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                              <td style={{padding:"8px 10px",color:"#6b7280",fontWeight:"600"}}>{i+1}</td>
                              <td style={{padding:"8px 10px"}}>
                                <div style={{fontWeight:"600",color:"#111827"}}>{item.name}</div>
                                {item.description&&<div style={{color:"#6b7280",fontSize:"11px"}}>{item.description}</div>}
                              </td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.serviceDate?new Date(item.serviceDate).toLocaleDateString("en-IN"):"—"}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.pax} pax</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:"700",color:"#111827"}}>₹{item.subtotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TOURS */}
                  {q.items.filter(i=>i.type==="tour").length>0&&(
                    <div style={{marginBottom:"16px"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>🗺️ Tours & Activities</div>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                        <thead><tr style={{background:"#1d4ed8",color:"#fff"}}>
                          <th style={{padding:"7px 10px",textAlign:"left",width:"26px"}}>#</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Tour</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Date</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Pax</th>
                          <th style={{padding:"7px 10px",textAlign:"right"}}>Amount</th>
                        </tr></thead>
                        <tbody>
                          {q.items.filter(i=>i.type==="tour").map((item,i)=>(
                            <tr key={item._id} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                              <td style={{padding:"8px 10px",color:"#6b7280",fontWeight:"600"}}>{i+1}</td>
                              <td style={{padding:"8px 10px"}}>
                                <div style={{fontWeight:"600",color:"#111827"}}>{item.name}</div>
                                {item.description&&<div style={{color:"#6b7280",fontSize:"11px"}}>{item.description}</div>}
                              </td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.serviceDate?new Date(item.serviceDate).toLocaleDateString("en-IN"):"—"}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.pax} pax</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:"700",color:"#111827"}}>₹{item.subtotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* VEHICLES */}
                  {q.items.filter(i=>i.type==="vehicle").length>0&&(
                    <div style={{marginBottom:"20px"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>🚗 Vehicles & Transfers</div>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                        <thead><tr style={{background:"#1d4ed8",color:"#fff"}}>
                          <th style={{padding:"7px 10px",textAlign:"left",width:"26px"}}>#</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Vehicle</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Type</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Route</th>
                          <th style={{padding:"7px 10px",textAlign:"left"}}>Qty</th>
                          <th style={{padding:"7px 10px",textAlign:"right"}}>Amount</th>
                        </tr></thead>
                        <tbody>
                          {q.items.filter(i=>i.type==="vehicle").map((item,i)=>(
                            <tr key={item._id} style={{background:i%2===0?"#f8fafc":"#fff",borderBottom:"1px solid #e2e8f0"}}>
                              <td style={{padding:"8px 10px",color:"#6b7280",fontWeight:"600"}}>{i+1}</td>
                              <td style={{padding:"8px 10px",fontWeight:"600",color:"#111827"}}>{item.name}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.vehicleType||"—"}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.route||"—"}</td>
                              <td style={{padding:"8px 10px",fontSize:"11px",color:"#4b5563"}}>{item.quantity}</td>
                              <td style={{padding:"8px 10px",textAlign:"right",fontWeight:"700",color:"#111827"}}>₹{item.subtotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* INCLUSIONS */}
                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>✔ Inclusions</div>
                    <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                      {["Accommodation as specified above.","All Accommodations - (Deluxe Hotels / Resorts)","Note: Check-in and check-out times at hotels would be as per hotel policies.","All entry tickets (as mentioned in the quotation)","All Sightseeing and Transfers by AC Personal Cab","Port Blair Airport Pick-up and Drop","Meals MAP (Daily Breakfast - Dinner)","All the boats and cruise are on sharing basis","All entry, Monuments, Parking and Permits charges as per itinerary.","Elephanta Boat Tickets Sharing Basis (Complementary Snorkeling 4 to 6 mins)","3-way Private Cruise charges","24 hours on-call assistance during your stay.","The Vehicle Will be used strictly as per your tour itinerary","Extra Fuel Surcharges will be applicable in this Package."].map((inc,i)=>(
                        <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                          <span style={{color:"#16a34a",fontWeight:"700",flexShrink:0}}>✔</span>
                          <span>{inc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* EXCLUSIONS */}
                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#ef4444",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #fecaca",paddingBottom:"4px"}}>✖ Exclusions</div>
                    <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                      {["Airfare to and from Port Blair.","The services of vehicles are not included on leisure days & after finishing the sightseeing tour as per the itinerary.","Any kind of personal expenses or optional tours or extra meals / beverages ordered at hotel.","Any kind of drinks (Alcohol, Mineral, Aerated, Bed Tea) or any other snack on tour or while waiting at airport or waiting for ferry at jetty.","Extra cost incidental to any change in the itinerary / stay on account of flight cancellation, ill health, and/or any factors beyond control.","Extra usage of vehicle for Evening Dinner / Shopping / Etc. is payable as extra. Vehicle will only be provided for tours as mentioned above.","Any Water Sports Activities / Adventurous Activity that is not mentioned in the Package Inclusions List.","Peak Season Surcharges of Hotels / Resorts (Applicable from 15th December to 20th January).","Additional Supplement Charge for Christmas Eve (24th December) and New Year Eve (31st December) at Hotels / Resorts.","Anything that is not mentioned in the Package Inclusions.","Ross & Smith Island Boat Tickets – Diglipur Party Own Payment.","5% GST.","Personal Expenses Like Lunch at Hotels, Room Service, Telephone Calls, Laundry, Any Portage at Airports and Hotels, Tips, Insurance, Wine, Mineral Water, Telephone Charges, Camera Tickets at Various Sightseeing/Tour, Guide Charges, Boating Charges and all other personal expenses.","Honeymoon Kit (Candle Light Dinner, Beach & Pool Side Setup, Flower Bed, Honeymoon Cake) at Havelock Island – Per Couple: Rs. 9,999/-.","Candle Light Dinner at Beach or Pool Side at Havelock Island – Per Couple: Rs. 5,500/-.","For disposal vehicles, an additional charge will apply for usage.","Anything not mentioned in the inclusions is excluded."].map((exc,i)=>(
                        <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                          <span style={{color:"#dc2626",fontWeight:"700",flexShrink:0}}>✖</span>
                          <span>{exc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WATER SPORTS - PORT BLAIR */}
                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>Top List of Water Sports in Andaman Islands (Best Places & Prices)</div>
                    <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                      {["Port Blair Water Activities","1. Shore Diving – Rs. 3,500/-","2. Sea Walk – Rs. 3,500/-","3. Parasailing – Rs. 3,500/-","4. Snorkeling – Rs. 1,000/-","5. Glass Bottom Boat Ride – Rs. 1,200/-","6. Coral Trip by Semi Submarine – Rs. 3,000/-","7. Dolphin Glass Boat Ride – Rs. 3,000/-","8. Kayaking (Half Hour) – Rs. 1,000/-","9. Kayaking (45 Minutes) – Rs. 1,500/-","10. Jet Ski Ride (1 Km) – Rs. 600/-","11. Jet Ski Ride (2 Km) – Rs. 1,000/-","12. Jet Ski Ride (3 Km) – Rs. 1,500/-"].map((item,i)=>(
                        <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                          <span style={{color:"#1d4ed8",fontWeight:"700",flexShrink:0}}>{i===0?"•":"–"}</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WATER SPORTS - HAVELOCK */}
                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>Havelock Water Activities</div>
                    <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                      {["1. Scuba Diving – Photo (20 Clicks) + 1 Video – Rs. 3,500/-","2. Boat Scuba Diving – Photo (20 Clicks) + 1 Video – Rs. 5,500/-","3. Sea Walk – With Photo (10 Clicks) + 1 Video – Rs. 3,800/-","4. Dolphin Glass Boat Ride (Half Hour Ride) – Rs. 3,500/-","5. Submarine Boat Ride (Half Hour Ride) – Rs. 3,500/-","6. Banana Ride – Rs. 600/-","7. Snorkeling – Rs. 1,600/-","8. Bioluminescence Night Kayaking – Rs. 3,500/-"].map((item,i)=>(
                        <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                          <span style={{color:"#1d4ed8",fontWeight:"700",flexShrink:0}}>–</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WATER SPORTS - NEIL ISLAND */}
                  <div style={{marginBottom:"20px"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",borderBottom:"2px solid #bfdbfe",paddingBottom:"4px"}}>Neil Island Water Activities</div>
                    <div style={{fontSize:"12px",color:"#374151",display:"flex",flexDirection:"column",gap:"5px"}}>
                      {["- Boat Scuba Diving – Photo (20 Clicks) + 1 Video – Rs. 4,500/-","- Snorkeling by Boat – Rs. 1,600/-","- Glass Boat Ride at Bharatpur Beach (30 Minutes) – Rs. 800/-","- Sofa Ride at Bharatpur Beach – Rs. 600/-","- Jet Ski Ride at Bharatpur Beach – Rs. 600/-"].map((item,i)=>(
                        <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                          <span style={{color:"#1d4ed8",fontWeight:"700",flexShrink:0}}>–</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div style={{borderTop:"2px solid #e2e8f0",paddingTop:"14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:"11px",color:"#9ca3af"}}>
                      <div style={{fontWeight:"600",color:"#6b7280",marginBottom:"4px"}}>Terms & Conditions</div>
                      {["The above mentioned hotels will be confirmed as per the room availability. Otherwise we will confirm a similar category hotel & itinerary might be re-arranged as per hotel availability at the time of booking.","Extra Person Cost: Children below 5 years are complimentary (this may differ for different hotels) in parent room without extra bed. Milk/food for infant or children below 5 years is chargeable and directly payable at hotel.","Children between 6-10 years & adults (above 10 yrs.) would cost extra according to the company policies.","In case false information like fake age is conveyed to the company by the customers, the company possesses full right to extract the fair amount from the customers without any objection from external authorities.","Hotels are very strict with the child policy. Please carry age proof so that it can be produced when asked.","Payment & Cancellation Policy: Cancellation has to be sent to us by email only.","From date of booking to 30 days only communication charges of Rs. 2000 per person or 5% of total amount + 18% GST, whichever is lower.","30-15 days prior to departure: 35% of tour cost.","14-07 days prior to departure: 50% of tour cost.","07-03 days prior to departure: 75% of tour cost.","03 days/no show: 100% of tour cost.","Payment Policy: 50% of the package amount at the time of booking. Balance amount 5 days before check-in.","Any booking for peak season (15 Dec to 15 Jan): NIL refund.","In case of unexpected bad weather condition or due to cancellation of ferry/helicopter/seaplane to Havelock or any other island, an equivalent hotel will be provided at Port Blair with additional cost. No refund will be made for unused room night.","The management may change / alter the tour plan due to natural calamity or political disturbances; no claim on such change or alteration will be entertained.","Above are the cancellation rules but we will put our best possible effort to minimize the cancellation charges.","In high season, no refund will be applicable within 30 days of the tour start date. (Normal cancellation policy will not be applicable on those dates.)"].map((item,i)=>(
                        <div key={i}>• {item}</div>
                      ))}
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:"11px",color:"#9ca3af",marginBottom:"24px"}}>Authorised Signature</div>
                      <div style={{borderTop:"1px solid #d1d5db",paddingTop:"4px",fontSize:"11px",color:"#6b7280",width:"140px"}}>Andaman Destinations</div>
                    </div>
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

  return <QuotationPDFModal quotation={quotation} onClose={onClose} extraActions={
    quotation.status === "Sent" && (
      <button className="btn-primary" onClick={convertToBooking} style={{background:"var(--success)"}}>
        ✅ Convert to Booking
      </button>
    )
  } />;
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