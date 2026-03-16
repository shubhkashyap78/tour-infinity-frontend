import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import OverviewPage from "./pages/OverviewPage";
import BookingsPage from "./pages/BookingsPage";
import ProductsPage from "./pages/ProductsPage";
import SubscribersPage from "./pages/SubscribersPage";
import UsersPage from "./pages/UsersPage";

const NAV_ITEMS = [
  { key: "overview",     label: "Dashboard",   icon: "🏠" },
  { key: "bookings",     label: "Bookings",    icon: "📋" },
  { key: "hotel",        label: "Hotels",      icon: "🏨" },
  { key: "tour",         label: "Tours",       icon: "🗺️" },
  { key: "package",      label: "Packages",    icon: "📦" },
  { key: "vehicle",      label: "Vehicles",    icon: "🚗" },
  { key: "subscribers",  label: "Subscribers", icon: "📧" },
  { key: "users",        label: "Team",        icon: "👥" },
];

export default function Dashboard({ token, onLogout }) {
  const [subscribers, setSubscribers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadCoreData = async () => {
    try {
      const [meRes, subRes, bookRes, statsRes, prodRes] = await Promise.all([
        apiFetch("/api/auth/me",         { headers }),
        apiFetch("/api/newsletter",      { headers }),
        apiFetch("/api/bookings",        { headers }),
        apiFetch("/api/bookings/stats",  { headers }),
        apiFetch("/api/products",        { headers }),
      ]);
      if (meRes.ok)   setUser((await meRes.json()).user);
      if (subRes.ok)  setSubscribers(await subRes.json());
      if (bookRes.ok) setBookings(await bookRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
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
        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
          <nav>
            {NAV_ITEMS.map(({ key, label, icon }) => {
              const count = badgeCount(key);
              return (
                <button
                  key={key}
                  className={`sidebar-item ${active === key ? "sidebar-item-active" : ""}`}
                  onClick={() => setActive(key)}
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
        </main>
      </div>
    </div>
  );
}
