import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { apiFetch } from "../api";
import { useCart } from "./CartContext";

const TYPES = ["all", "hotel", "tour", "package", "vehicle"];
const TYPE_ICONS = { hotel: "🏨", tour: "🗺️", package: "📦", vehicle: "🚗", all: "✨" };

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = searchParams.get("type") || "all";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { addItem, items } = useCart();
  const [added, setAdded] = useState({});

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeType !== "all") params.set("type", activeType);
    if (search) params.set("q", search);
    apiFetch(`/api/products/public?${params}`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [activeType, search]);

  const handleAdd = (p) => {
    addItem(p, 1);
    setAdded((a) => ({ ...a, [p._id]: true }));
    setTimeout(() => setAdded((a) => ({ ...a, [p._id]: false })), 1500);
  };

  const inCart = (id) => items.some((i) => i._id === id);

  return (
    <div className="ws-home">
      {/* Hero */}
      <section className="ws-hero">
        <h1>Discover Eastern Cape</h1>
        <p>Hotels, Tours, Packages & Vehicles — all in one place</p>
        <input
          className="ws-search"
          placeholder="Search hotels, tours..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      {/* Type Tabs */}
      <div className="ws-tabs">
        {TYPES.map((t) => (
          <button
            key={t}
            className={`ws-tab ${activeType === t ? "ws-tab-active" : ""}`}
            onClick={() => setSearchParams(t === "all" ? {} : { type: t })}
          >
            {TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="ws-loading">⏳ Loading...</div>
      ) : products.length === 0 ? (
        <div className="ws-empty">No results found.</div>
      ) : (
        <div className="ws-grid">
          {products.map((p) => (
            <div className="ws-card" key={p._id}>
              <Link to={`/product/${p._id}`}>
                <div className="ws-card-img">
                  {p.media?.[0] ? (
                    <img src={p.media[0].url} alt={p.title} />
                  ) : (
                    <div className="ws-card-img-placeholder">{TYPE_ICONS[p.type]}</div>
                  )}
                  <span className="ws-card-type">{p.type}</span>
                </div>
                <div className="ws-card-body">
                  <h3>{p.title}</h3>
                  <p className="ws-card-desc">{p.description?.slice(0, 80)}{p.description?.length > 80 ? "…" : ""}</p>
                </div>
              </Link>
              <div className="ws-card-footer">
                <span className="ws-price">
                  {p.baseCurrency} {p.basePrice?.toLocaleString()}
                </span>
                <button
                  className={`ws-add-btn ${inCart(p._id) ? "ws-add-btn-added" : ""}`}
                  onClick={() => handleAdd(p)}
                >
                  {added[p._id] ? "✓ Added" : inCart(p._id) ? "In Cart" : "+ Add"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
