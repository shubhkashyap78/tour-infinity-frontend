import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useCart } from "./CartContext";

const WHY_ITEMS = [
  { icon: "🏖️", title: "Pristine Beaches", desc: "Crystal-clear lagoons and white sandy shores stretching for miles." },
  { icon: "🌿", title: "Lush Nature", desc: "Tropical forests, volcanic peaks, and breathtaking waterfalls." },
  { icon: "🍽️", title: "Rich Culture", desc: "A melting pot of Creole, Indian, French and African flavours." },
  { icon: "🤿", title: "Water Sports", desc: "World-class diving, snorkelling, kite-surfing and deep-sea fishing." },
  { icon: "🛡️", title: "Safe Destination", desc: "One of Africa's safest and most stable travel destinations." },
  { icon: "✈️", title: "Easy Access", desc: "Direct flights from major cities across Europe, Asia and Africa." },
];

function ProductCard({ p, onAdd, added, inCart }) {
  return (
    <div className="ws-card">
      <Link to={`/product/${p._id}`}>
        <div className="ws-card-img">
          {p.media?.[0] ? (
            <img src={p.media[0].url} alt={p.title} />
          ) : (
            <div className="ws-card-img-placeholder">{p.type === "hotel" ? "🏨" : "📦"}</div>
          )}
          <span className="ws-card-type">{p.type}</span>
        </div>
        <div className="ws-card-body">
          <h3>{p.title}</h3>
          <p className="ws-card-desc">
            {p.description?.slice(0, 80)}{p.description?.length > 80 ? "…" : ""}
          </p>
        </div>
      </Link>
      <div className="ws-card-footer">
        <span className="ws-price">{p.baseCurrency} {p.basePrice?.toLocaleString()}</span>
        <button
          className={`ws-add-btn ${inCart ? "ws-add-btn-added" : ""}`}
          onClick={() => onAdd(p)}
        >
          {added ? "✓ Added" : inCart ? "In Cart" : "+ Add"}
        </button>
      </div>
    </div>
  );
}

function SectionGrid({ type, title, icon, emptyMsg, viewAllPath }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem, items } = useCart();
  const [added, setAdded] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch(`/api/products/public?type=${type}`)
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d.slice(0, 4) : []))
      .finally(() => setLoading(false));
  }, [type]);

  const handleAdd = (p) => {
    addItem(p, 1);
    setAdded((a) => ({ ...a, [p._id]: true }));
    setTimeout(() => setAdded((a) => ({ ...a, [p._id]: false })), 1500);
  };

  return (
    <section className="hp-section">
      <div className="hp-section-header">
        <h2 className="hp-section-title">{icon} {title}</h2>
        <button className="hp-view-all" onClick={() => navigate(viewAllPath)}>
          View All →
        </button>
      </div>

      {loading ? (
        <div className="ws-loading" style={{ padding: "40px" }}>⏳ Loading...</div>
      ) : products.length === 0 ? (
        <div className="hp-empty-section">{emptyMsg}</div>
      ) : (
        <div className="ws-grid" style={{ padding: "0 0 8px" }}>
          {products.map((p) => (
            <ProductCard
              key={p._id}
              p={p}
              onAdd={handleAdd}
              added={added[p._id]}
              inCart={items.some((i) => i._id === p._id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="ws-home">

      {/* ── Hero ── */}
      <section className="hp-hero">
        <div className="hp-hero-overlay" />
        <div className="hp-hero-content">
          <span className="hp-hero-tag">✈️ Your Dream Getaway Awaits</span>
          <h1>Experience the Magic of <span>Mauritius</span></h1>
          <p>
            Turquoise lagoons, luxury resorts, vibrant culture and unforgettable adventures —
            all crafted into perfect holiday packages just for you.
          </p>
          <div className="hp-hero-btns">
            <button className="hp-btn-primary" onClick={() => navigate("/?type=package")}>
              Explore Packages
            </button>
            <button className="hp-btn-outline" onClick={() => navigate("/?type=hotel")}>
              Browse Hotels
            </button>
          </div>
        </div>
      </section>

      {/* ── Why Mauritius ── */}
      <section className="hp-why">
        <div className="hp-why-inner">
          <div className="hp-section-label">Why Mauritius?</div>
          <h2 className="hp-why-title">A Paradise Like No Other</h2>
          <p className="hp-why-sub">
            Nestled in the Indian Ocean, Mauritius offers an unmatched blend of natural beauty,
            warm hospitality and world-class experiences.
          </p>
          <div className="hp-why-grid">
            {WHY_ITEMS.map((item) => (
              <div className="hp-why-card" key={item.title}>
                <div className="hp-why-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sections ── */}
      <div className="hp-sections-wrap">
        <SectionGrid type="hotel"   title="Featured Hotels"  icon="🏨" viewAllPath="/hotels"   emptyMsg="Hotels coming soon!" />
        <SectionGrid type="package" title="Tour Packages"    icon="📦" viewAllPath="/packages" emptyMsg="Packages coming soon!" />
        <SectionGrid type="tour"    title="Sea Activities"  icon="🌊" viewAllPath="/tours"    emptyMsg="Sea activities coming soon!" />
        <SectionGrid type="vehicle" title="Vehicle Rentals"  icon="🚗" viewAllPath="/vehicles" emptyMsg="Vehicles coming soon!" />
      </div>

      {/* ── CTA Banner ── */}
      <section className="hp-cta">
        <div className="hp-cta-inner">
          <h2>Ready to Plan Your Mauritius Trip?</h2>
          <p>Our travel experts are here to craft the perfect itinerary for you.</p>
          <button className="hp-btn-primary" onClick={() => navigate("/?type=package")}>
            Start Planning →
          </button>
        </div>
      </section>

    </div>
  );
}
