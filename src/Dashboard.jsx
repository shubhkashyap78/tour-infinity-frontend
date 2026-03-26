import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import OverviewPage from "./pages/OverviewPage";
import BookingsPage from "./pages/BookingsPage";
import ProductsPage from "./pages/ProductsPage";
import SubscribersPage from "./pages/SubscribersPage";
import UsersPage from "./pages/UsersPage";
import EnquiriesPage from "./pages/EnquiriesPage";

const NAV_ITEMS = [
  { key: "overview",    label: "Dashboard",   icon: "🏠" },
  { key: "enquiries",   label: "Enquiries",   icon: "📬" },
  { key: "bookings",    label: "Bookings",    icon: "📋" },
  { key: "hotel",       label: "Hotels",      icon: "🏨" },
  { key: "tour",        label: "Sea Activities", icon: "🌊" },
  { key: "package",     label: "Packages",    icon: "📦" },
  { key: "vehicle",     label: "Vehicles",    icon: "🚗" },
  { key: "subscribers", label: "Subscribers", icon: "📧" },
  { key: "users",       label: "Team",        icon: "👥" },
];

export default function Dashboard({ token, onLogout }) {
  const [subscribers, setSubscribers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadCoreData = async () => {
    try {
      const [meRes, subRes, bookRes, statsRes, prodRes, enqRes] = await Promise.all([
        apiFetch("/api/auth/me",         { headers }),
        apiFetch("/api/newsletter",      { headers }),
        apiFetch("/api/bookings",        { headers }),
        apiFetch("/api/bookings/stats",  { headers }),
        apiFetch("/api/products",        { headers }),
        apiFetch("/api/enquiries",       { headers }),
      ]);
      if (meRes.ok)   setUser((await meRes.json()).user);
      if (subRes.ok)  setSubscribers(await subRes.json());
      if (bookRes.ok) setBookings(await bookRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (enqRes.ok)  { const enqs = await enqRes.json(); setEnquiryCount(enqs.filter((e) => e.status === "new").length); }
      if (prodRes.ok) {
        const prods = await prodRes.json();
        const counts = {};
        ["hotel", "tour", "package", "vehicle"].forEach((t) => {
          counts[t] = prods.filter((p) => p.type === t).length;
        });
        setProductCounts(counts);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadCoreData(); }, [token]);

  if (loading) return <div className="dash-loading">⏳ Loading...</div>;

  const badgeCount = (key) => {
    if (key === "overview")     return null;
    if (key === "subscribers")  return subscribers.length;
    if (key === "bookings")     return stats?.bookings?.total ?? bookings.length;
    if (key === "enquiries")    return enquiryCount || null;
    return productCounts[key] ?? 0;
  };

  const PRODUCT_TYPES = ["hotel", "tour", "package", "vehicle"];

  return (
    <div className="dash">
      {/* ── Header ── */}
      <header className="dash-header">
        <div className="dash-header-left">
          <button className="btn-toggle" onClick={() => setSidebarOpen((o) => !o)}>☰</button>
          <img src="/assests/logo.jpeg" alt="logo" className="header-logo" />
          <div className="dash-brand">Eastcape Booking <span>Admin</span></div>
        </div>
        <div className="dash-user">
          👤 {user?.name} &nbsp;|&nbsp;
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div className="dash-body">
        {/* Sidebar overlay backdrop on mobile */}
        {sidebarOpen && window.innerWidth <= 768 && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 140 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
          <nav>
            {NAV_ITEMS.map(({ key, label, icon }) => {
              const count = badgeCount(key);
              return (
                <button
                  key={key}
                  className={`sidebar-item ${active === key ? "sidebar-item-active" : ""}`}
                  onClick={() => { setActive(key); if (window.innerWidth <= 768) setSidebarOpen(false); }}
                >
                  <span className="sidebar-icon">{icon}</span>
                  {sidebarOpen && (
                    <>
                      <span className="sidebar-label">{label}</span>
                      {count !== null && <span className="sidebar-badge">{count}</span>}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Main Content ── */}
        <main className="dash-main">
          {active === "overview" && (
            <OverviewPage
              stats={stats}
              productCounts={productCounts}
              subscribers={subscribers}
              bookings={bookings}
              setActive={setActive}
            />
          )}

          {active === "bookings" && (
            <BookingsPage
              bookings={bookings}
              token={token}
              onRefresh={loadCoreData}
            />
          )}

          {PRODUCT_TYPES.includes(active) && (
            <ProductsPage key={active} token={token} type={active} />
          )}

          {active === "subscribers" && (
            <SubscribersPage subscribers={subscribers} />
          )}

          {active === "users" && (
            <UsersPage token={token} />
          )}

          {active === "enquiries" && (
            <EnquiriesPage token={token} />
          )}
        </main>
      </div>
    </div>
  );
}
