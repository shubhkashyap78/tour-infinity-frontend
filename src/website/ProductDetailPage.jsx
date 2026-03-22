import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useCart } from "./CartContext";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [guests, setGuests] = useState(1);
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    apiFetch(`/api/products/public/${id}`)
      .then((r) => r.json())
      .then((d) => { setProduct(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="ws-loading">⏳ Loading...</div>;
  if (!product?._id) return <div className="ws-empty">Product not found. <button onClick={() => navigate("/")}>Go back</button></div>;

  const images = product.media?.filter((m) => m.type === "image") || [];
  const inCart = items.some((i) => i._id === product._id);
  const isTour = product.type === "tour";

  const adultPrice = product.basePrice || 0;
  const childPrice = product.childPricing?.childPrice ?? Math.round(adultPrice / 2);

  const handleAdd = () => {
    addItem(product, isTour ? { infants: 0, children: 0, adults: 1 } : guests);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="ws-detail">
      <button className="ws-back-btn" onClick={() => navigate(-1)}>← Back</button>

      <div className="ws-detail-grid">
        {/* Gallery */}
        <div className="ws-gallery">
          <div className="ws-gallery-main">
            {images[activeImg] ? (
              <img src={images[activeImg].url} alt={product.title} />
            ) : (
              <div className="ws-gallery-placeholder">No image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="ws-gallery-thumbs">
              {images.map((img, i) => (
                <img key={i} src={img.url} alt=""
                  className={i === activeImg ? "ws-thumb-active" : ""}
                  onClick={() => setActiveImg(i)} />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="ws-detail-info">
          <span className="ws-card-type">{product.type}</span>
          <h1>{product.title}</h1>
          <p className="ws-detail-desc">{product.description}</p>

          {product.tags?.length > 0 && (
            <div className="ws-tags">
              {product.tags.map((t) => <span key={t} className="ws-tag">{t}</span>)}
            </div>
          )}

          {/* Pricing */}
          <div className="ws-pricing-box">
            {isTour ? (
              <div className="ws-tour-pricing">
                <div className="ws-tour-price-row">
                  <span>👨 Adult (11+ yrs)</span>
                  <span className="ws-price-main">{product.baseCurrency} {adultPrice.toLocaleString()}</span>
                </div>
                <div className="ws-tour-price-row">
                  <span>🧒 Child (5–11 yrs)</span>
                  <span>{product.baseCurrency} {childPrice.toLocaleString()}</span>
                </div>
                <div className="ws-tour-price-row">
                  <span>👶 Infant (0–5 yrs)</span>
                  <span className="ws-free-tag">FREE</span>
                </div>
              </div>
            ) : (
              <div className="ws-price-main">
                {product.baseCurrency} {product.basePrice?.toLocaleString()}
                <span className="ws-price-per"> / person</span>
              </div>
            )}

            {product.markets?.length > 0 && (
              <div className="ws-market-prices">
                {product.markets.map((m) => (
                  <div key={m.market} className="ws-market-row">
                    <span>{m.market}</span>
                    <span>{m.currency} {m.price?.toLocaleString()}</span>
                    {m.offerLabel && <span className="ws-offer-label">{m.offerLabel}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guests — only for non-tour */}
          {!isTour && (
            <div className="ws-guests-row">
              <label>Guests</label>
              <div className="ws-qty">
                <button onClick={() => setGuests((g) => Math.max(1, g - 1))}>−</button>
                <span>{guests}</span>
                <button onClick={() => setGuests((g) => g + 1)}>+</button>
              </div>
              <span className="ws-subtotal">
                = {product.baseCurrency} {(product.basePrice * guests).toLocaleString()}
              </span>
            </div>
          )}

          {isTour && (
            <div className="ws-tour-info-note">
              👥 Select number of guests in cart
            </div>
          )}

          <button
            className={`ws-add-btn-lg ${added ? "ws-add-btn-added" : ""}`}
            onClick={handleAdd}
            disabled={product.inventory?.stopSales}
          >
            {product.inventory?.stopSales
              ? "Not Available"
              : added
              ? "✓ Added to Cart!"
              : inCart
              ? "Add More to Cart"
              : "Add to Cart 🛒"}
          </button>

          {inCart && !added && (
            <button className="ws-view-cart-btn" onClick={() => navigate("/cart")}>
              View Cart →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
