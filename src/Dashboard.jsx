import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import OverviewPage from "./pages/OverviewPage";
import BookingsPage from "./pages/BookingsPage";
import SimpleProductsPage from "./pages/SimpleProductsPage";
import SubscribersPage from "./pages/SubscribersPage";
import UsersPage from "./pages/UsersPage";
import EnquiriesPage from "./pages/EnquiriesPage";
import LeadsPage from "./pages/LeadsPage";
import QuotationsPage from "./pages/QuotationsPage";
import DraftQuotationsPage from "./pages/DraftQuotationsPage";

const NAV_ITEMS = [
  { key: "overview",    label: "Dashboard",   icon: "📊" },
  { key: "leads",       label: "Leads",       icon: "🎯" },
  { key: "drafts",      label: "Draft Quotes", icon: "📝" },
  { key: "quotations",  label: "Quotations",  icon: "📋" },
  { key: "bookings",    label: "Bookings",    icon: "📅" },
  { key: "enquiries",   label: "Enquiries",   icon: "💬" },
  { key: "hotel",       label: "Hotels",      icon: "🏨" },
  { key: "tour",        label: "Tours",       icon: "🗺️" },
  { key: "package",     label: "Packages",    icon: "📦" },
  { key: "vehicle",     label: "Vehicles",    icon: "🚗" },
  { key: "subscribers", label: "Newsletter",  icon: "📧" },
  { key: "users",       label: "Team",        icon: "👥" },
];

export default function Dashboard({ token, onLogout }) {
  const [leads, setLeads] = useState([]);
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
      const [meRes, subRes, bookRes, statsRes, prodRes, enqRes, leadRes] = await Promise.all([
        apiFetch("/api/auth/me",         { headers }),
        apiFetch("/api/newsletter",      { headers }),
        apiFetch("/api/bookings",        { headers }),
        apiFetch("/api/bookings/stats",  { headers }),
        apiFetch("/api/products",        { headers }),
        apiFetch("/api/enquiries",       { headers }),
        apiFetch("/api/leads",           { headers }),
      ]);
      if (meRes.ok) { const meData = await meRes.json(); setUser(meData.user); }
      if (subRes.ok)  setSubscribers(await subRes.json());
      if (bookRes.ok) setBookings(await bookRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (enqRes.ok)  { const enqs = await enqRes.json(); setEnquiryCount(enqs.filter((e) => e.status === "new").length); }
      if (leadRes.ok) { const leadData = await leadRes.json(); setLeads(leadData.leads || []); }
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

  const isAdmin = user?.role === "admin";
  const userPerms = user?.permissions || [];
  const canAccess = (key) => isAdmin || userPerms.includes(key);

  const visibleNavItems = NAV_ITEMS.filter(({ key }) => canAccess(key));

  const badgeCount = (key) => {
    if (key === "overview")     return null;
    if (key === "leads")        return leads.filter(l => l.status === "New").length || null;
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
          <img src="/assests/logo.png" alt="logo" className="header-logo" />
          <div className="dash-brand">TourInfinity <span>CRM</span></div>
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
            {visibleNavItems.map(({ key, label, icon }) => {
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

          {active === "drafts" && (
            <DraftQuotationsPage token={token} />
          )}

          {active === "quotations" && (
            <QuotationsPage token={token} onNavigate={setActive} onRefresh={loadCoreData} />
          )}

          {active === "bookings" && (
            <BookingsPage
              bookings={bookings}
              token={token}
              onRefresh={loadCoreData}
            />
          )}

          {PRODUCT_TYPES.includes(active) && (
            <SimpleProductsPage key={active} token={token} type={active} />
          )}

          {active === "subscribers" && (
            <SubscribersPage subscribers={subscribers} />
          )}

          {active === "users" && (
            <UsersPage token={token} />
          )}

          {active === "leads" && (
            <LeadsPage token={token} />
          )}

          {active === "enquiries" && (
            <EnquiriesPage token={token} />
          )}
        </main>
      </div>
    </div>
  );
}
