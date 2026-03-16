import { Outlet, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { CartProvider, useCart } from "./CartContext";

function Navbar() {
  const { items } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="ws-nav">
      <Link to="/" className="ws-nav-brand">
        <img src="/assests/logo.jpeg" alt="Eastcape" className="ws-nav-logo" />
        <span>Eastcape</span>
      </Link>

      <div className={`ws-nav-links ${menuOpen ? "ws-nav-open" : ""}`}>
        <Link to="/?type=hotel"   onClick={() => setMenuOpen(false)}>Hotels</Link>
        <Link to="/?type=tour"    onClick={() => setMenuOpen(false)}>Tours</Link>
        <Link to="/?type=package" onClick={() => setMenuOpen(false)}>Packages</Link>
        <Link to="/?type=vehicle" onClick={() => setMenuOpen(false)}>Vehicles</Link>
      </div>

      <div className="ws-nav-right">
        <button className="ws-cart-btn" onClick={() => navigate("/cart")}>
          🛒 {items.length > 0 && <span className="ws-cart-badge">{items.length}</span>}
        </button>
        <button className="ws-hamburger" onClick={() => setMenuOpen((o) => !o)}>☰</button>
      </div>
    </nav>
  );
}

export default function WebsiteLayout() {
  return (
    <CartProvider>
      <div className="ws-layout">
        <Navbar />
        <main className="ws-main">
          <Outlet />
        </main>
        <footer className="ws-footer">
          © {new Date().getFullYear()} Eastcape Booking. All rights reserved.
          &nbsp;|&nbsp; <Link to="/admin">Admin</Link>
        </footer>
      </div>
    </CartProvider>
  );
}
