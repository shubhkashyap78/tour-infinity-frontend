import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useCart } from "./CartContext";
import { useNavigate } from "react-router-dom";

const SERVICE_TYPES = [
  { key: "airport", label: "Airport Transfer", icon: "✈️", desc: "Pick up or drop to airport" },
  { key: "hotel",   label: "Hotel Transfer",   icon: "🏨", desc: "Hotel to hotel transfer" },
  { key: "fullday", label: "Full Day Excursion", icon: "🗺️", desc: "Explore at your own pace" },
];

const DURATION_OPTIONS = [
  { key: "fullDay4hrs", label: "4 Hours" },
  { key: "fullDay8hrs", label: "8 Hours / Full Day" },
];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceType, setServiceType] = useState(null);
  const [tripType, setTripType] = useState("oneWay"); // oneWay | twoWay
  const [duration, setDuration] = useState("fullDay8hrs");
  const [passengers, setPassengers] = useState(1);
  const [fields, setFields] = useState({ pickup: "", drop: "", date: "", time: "", returnDate: "", returnTime: "", flightNo: "", destination: "" });
  const [step, setStep] = useState(1); // 1=service, 2=details, 3=vehicles
  const { addItem, items } = useCart();
  const [added, setAdded] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/api/products/public?type=vehicle")
      .then((r) => r.json())
      .then((d) => setVehicles(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const setF = (k, v) => setFields((f) => ({ ...f, [k]: v }));

  const getPriceKey = () => {
    if (serviceType === "airport") return tripType === "twoWay" ? "airportTwoWay" : "airportOneWay";
    if (serviceType === "hotel")   return "hotelTransfer";
    if (serviceType === "fullday") return duration;
    return "airportOneWay";
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (v.inventory?.stopSales) return false;
    if (passengers > (v.vehicleCapacity || 4)) return false;
    return true;
  });

  const getPrice = (v) => {
    const key = getPriceKey();
    return v.transferPricing?.[key] || v.basePrice || 0;
  };

  const handleAdd = (v) => {
    const price = getPrice(v);
    const bookingDetails = {
      serviceType,
      tripType: serviceType === "airport" ? tripType : undefined,
      duration: serviceType === "fullday" ? duration : undefined,
      passengers,
      ...fields,
      priceKey: getPriceKey(),
    };
    addItem({ ...v, basePrice: price }, 1, bookingDetails);
    setAdded((a) => ({ ...a, [v._id]: true }));
    setTimeout(() => setAdded((a) => ({ ...a, [v._id]: false })), 1500);
  };

  const inCart = (id) => items.some((i) => i._id === id);

  return (
    <div>
      {/* Hero */}
      <section className="lp-hero" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1600&q=80)" }}>
        <div className="lp-hero-overlay" />
        <div className="lp-hero-content">
          <span className="lp-hero-icon">🚗</span>
          <h1>Transfers & Excursions</h1>
          <p>Airport transfers, hotel pickups and full day excursions across Mauritius.</p>
        </div>
      </section>

      <div className="lp-body">
        {/* Step 1 — Service Type */}
        <div className="vw-section">
          <div className="vw-step-label">Step 1 — Select Service Type</div>
          <div className="vw-service-grid">
            {SERVICE_TYPES.map((s) => (
              <button
                key={s.key}
                className={`vw-service-card ${serviceType === s.key ? "vw-service-active" : ""}`}
                onClick={() => { setServiceType(s.key); setStep(2); }}
              >
                <span className="vw-service-icon">{s.icon}</span>
                <span className="vw-service-label">{s.label}</span>
                <span className="vw-service-desc">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — Details */}
        {serviceType && (
          <div className="vw-section">
            <div className="vw-step-label">Step 2 — Fill Details</div>
            <div className="vw-details-box">

              {/* Airport Transfer */}
              {serviceType === "airport" && (
                <>
                  <div className="vw-toggle-row">
                    <button className={`vw-toggle-btn ${tripType === "oneWay" ? "active" : ""}`} onClick={() => setTripType("oneWay")}>One Way</button>
                    <button className={`vw-toggle-btn ${tripType === "twoWay" ? "active" : ""}`} onClick={() => setTripType("twoWay")}>Two Way (Round Trip)</button>
                  </div>
                  <div className="vw-fields-grid">
                    <label className="vw-field-label">Pickup Location
                      <input className="ws-form-input" value={fields.pickup} onChange={(e) => setF("pickup", e.target.value)} placeholder="e.g. SSR Airport" />
                    </label>
                    <label className="vw-field-label">Drop Location
                      <input className="ws-form-input" value={fields.drop} onChange={(e) => setF("drop", e.target.value)} placeholder="e.g. Grand Baie Hotel" />
                    </label>
                    <label className="vw-field-label">Pickup Date
                      <input className="ws-form-input" type="date" value={fields.date} onChange={(e) => setF("date", e.target.value)} />
                    </label>
                    <label className="vw-field-label">Pickup Time
                      <input className="ws-form-input" type="time" value={fields.time} onChange={(e) => setF("time", e.target.value)} />
                    </label>
                    {tripType === "twoWay" && (
                      <>
                        <label className="vw-field-label">Return Date
                          <input className="ws-form-input" type="date" value={fields.returnDate} onChange={(e) => setF("returnDate", e.target.value)} />
                        </label>
                        <label className="vw-field-label">Return Time
                          <input className="ws-form-input" type="time" value={fields.returnTime} onChange={(e) => setF("returnTime", e.target.value)} />
                        </label>
                      </>
                    )}
                    <label className="vw-field-label">Flight Number (optional)
                      <input className="ws-form-input" value={fields.flightNo} onChange={(e) => setF("flightNo", e.target.value)} placeholder="e.g. MK123" />
                    </label>
                    <label className="vw-field-label">Passengers
                      <input className="ws-form-input" type="number" min={1} max={20} value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} />
                    </label>
                  </div>
                </>
              )}

              {/* Hotel Transfer */}
              {serviceType === "hotel" && (
                <div className="vw-fields-grid">
                  <label className="vw-field-label">Pickup Hotel
                    <input className="ws-form-input" value={fields.pickup} onChange={(e) => setF("pickup", e.target.value)} placeholder="e.g. Beachcomber Hotel" />
                  </label>
                  <label className="vw-field-label">Drop Hotel
                    <input className="ws-form-input" value={fields.drop} onChange={(e) => setF("drop", e.target.value)} placeholder="e.g. LUX Grand Gaube" />
                  </label>
                  <label className="vw-field-label">Date
                    <input className="ws-form-input" type="date" value={fields.date} onChange={(e) => setF("date", e.target.value)} />
                  </label>
                  <label className="vw-field-label">Time
                    <input className="ws-form-input" type="time" value={fields.time} onChange={(e) => setF("time", e.target.value)} />
                  </label>
                  <label className="vw-field-label">Passengers
                    <input className="ws-form-input" type="number" min={1} max={20} value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} />
                  </label>
                </div>
              )}

              {/* Full Day Excursion */}
              {serviceType === "fullday" && (
                <>
                  <div className="vw-toggle-row">
                    {DURATION_OPTIONS.map((d) => (
                      <button key={d.key} className={`vw-toggle-btn ${duration === d.key ? "active" : ""}`} onClick={() => setDuration(d.key)}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <div className="vw-fields-grid">
                    <label className="vw-field-label">Date
                      <input className="ws-form-input" type="date" value={fields.date} onChange={(e) => setF("date", e.target.value)} />
                    </label>
                    <label className="vw-field-label">Pickup Time
                      <input className="ws-form-input" type="time" value={fields.time} onChange={(e) => setF("time", e.target.value)} />
                    </label>
                    <label className="vw-field-label" style={{ gridColumn: "1/-1" }}>Destinations / Notes
                      <input className="ws-form-input" value={fields.destination} onChange={(e) => setF("destination", e.target.value)} placeholder="e.g. Chamarel, Black River Gorges" />
                    </label>
                    <label className="vw-field-label">Passengers
                      <input className="ws-form-input" type="number" min={1} max={20} value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} />
                    </label>
                  </div>
                </>
              )}

              <button className="ws-add-btn-lg" style={{ marginTop: 8 }} onClick={() => setStep(3)}>
                Search Available Vehicles →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Vehicle List */}
        {serviceType && step === 3 && (
          <div className="vw-section">
            <div className="vw-step-label">Step 3 — Choose Your Vehicle</div>
            {loading ? (
              <div className="ws-loading">⏳ Loading...</div>
            ) : filteredVehicles.length === 0 ? (
              <div className="ws-empty">No vehicles available for {passengers} passenger{passengers > 1 ? "s" : ""}. Try reducing passenger count.</div>
            ) : (
              <div className="vw-vehicle-list">
                {filteredVehicles.map((v) => {
                  const price = getPrice(v);
                  const serviceLabel = SERVICE_TYPES.find((s) => s.key === serviceType)?.label;
                  return (
                    <div className="vw-vehicle-card" key={v._id}>
                      <div className="vw-vehicle-img">
                        {v.media?.[0]
                          ? <img src={v.media[0].url} alt={v.title} />
                          : <div className="vw-vehicle-img-placeholder">🚗</div>}
                      </div>
                      <div className="vw-vehicle-info">
                        <div className="vw-vehicle-name">{v.title}</div>
                        {v.vehicleModel && <div className="vw-vehicle-model">{v.vehicleModel}</div>}
                        <div className="vw-vehicle-specs">
                          <span>👥 {v.vehicleCapacity || 4} seats</span>
                          {v.hasAC && <span>❄️ AC</span>}
                          {v.luggageCapacity > 0 && <span>🧳 {v.luggageCapacity} bags</span>}
                        </div>
                        <div className="vw-vehicle-service-tag">{serviceLabel}{serviceType === "airport" ? ` · ${tripType === "twoWay" ? "Two Way" : "One Way"}` : ""}{serviceType === "fullday" ? ` · ${DURATION_OPTIONS.find((d) => d.key === duration)?.label}` : ""}</div>
                      </div>
                      <div className="vw-vehicle-right">
                        <div className="vw-vehicle-price">{v.baseCurrency} {price.toLocaleString()}</div>
                        <button
                          className={`ws-add-btn ${inCart(v._id) || added[v._id] ? "ws-add-btn-added" : ""}`}
                          onClick={() => handleAdd(v)}
                        >
                          {added[v._id] ? "✓ Added" : inCart(v._id) ? "In Cart" : "Select →"}
                        </button>
                        {inCart(v._id) && (
                          <button className="vw-view-cart" onClick={() => navigate("/cart")}>View Cart</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
