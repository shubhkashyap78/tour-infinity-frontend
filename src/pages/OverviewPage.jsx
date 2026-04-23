const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function OverviewPage({ stats, productCounts, subscribers, bookings, setActive }) {
  const b = stats?.bookings || {};
  const revenue = stats?.revenue || 0;
  const monthly = stats?.monthly || [];
  const maxRevenue = Math.max(...monthly.map((m) => m.revenue), 1);

  const bookingCards = [
    { label: "Total Bookings", value: b.total ?? 0,     icon: "📋", color: "#3b82f6", key: "bookings" },
    { label: "Confirmed",      value: b.confirmed ?? 0, icon: "✅", color: "#22c55e", key: "bookings" },
    { label: "Pending",        value: b.pending ?? 0,   icon: "⏳", color: "#f59e0b", key: "bookings" },
    { label: "Cancelled",      value: b.cancelled ?? 0, icon: "❌", color: "#ef4444", key: "bookings" },
    { label: "Completed",      value: b.completed ?? 0, icon: "🏁", color: "#8b5cf6", key: "bookings" },
    { label: "Total Revenue",  value: `$${revenue.toLocaleString()}`, icon: "💰", color: "#10b981", key: null },
  ];

  const inventoryCards = [
    { label: "Hotels",      value: productCounts.hotel ?? 0,   icon: "🏨", key: "hotel" },
    { label: "Tours",       value: productCounts.tour ?? 0,    icon: "🗺️", key: "tour" },
    { label: "Packages",    value: productCounts.package ?? 0, icon: "📦", key: "package" },
    { label: "Vehicles",    value: productCounts.vehicle ?? 0, icon: "🚗", key: "vehicle" },
    { label: "Subscribers", value: subscribers.length,         icon: "📧", key: "subscribers" },
  ];

  return (
    <>
      <h2>📊 Dashboard Overview</h2>

      <div className="section-title">Business Metrics</div>
      <div className="stat-grid">
        {bookingCards.map(({ label, value, icon, color, key }) => (
          <div className="stat-card" key={label}
            onClick={() => key && setActive(key)}
            style={{ cursor: key ? "pointer" : "default" }}>
            <div className="stat-icon">{icon}</div>
            <div className="stat-num">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="section-title">Inventory Management</div>
      <div className="stat-grid">
        {inventoryCards.map(({ label, value, icon, key }) => (
          <div className="stat-card" key={label} onClick={() => setActive(key)} style={{ cursor: "pointer" }}>
            <div className="stat-icon">{icon}</div>
            <div className="stat-num">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {monthly.length > 0 && (
        <>
          <div className="section-title">Revenue Analytics</div>
          <div className="chart-card">
            <div className="bar-chart">
              {monthly.map((m) => {
                const height = Math.max((m.revenue / maxRevenue) * 140, 4);
                return (
                  <div className="bar-col" key={`${m._id.year}-${m._id.month}`}>
                    <div className="bar-tooltip">${m.revenue.toLocaleString()}<br />{m.bookings} bookings</div>
                    <div className="bar" style={{ height }}></div>
                    <div className="bar-label">{MONTHS[m._id.month - 1]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {stats?.byType?.length > 0 && (
        <>
          <div className="section-title">Performance by Category</div>
          <div className="type-grid">
            {stats.byType.map((t) => (
              <div className="type-card" key={t._id}>
                <div className="type-name">{t._id}</div>
                <div className="type-count">{t.count} bookings</div>
                <div className="type-rev">${t.revenue.toLocaleString()} revenue</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Recent Activity</div>
      {bookings.length === 0 ? (
        <p className="empty">No bookings yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Ref</th><th>Customer</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {bookings.slice(0, 5).map((bk) => (
              <tr key={bk._id}>
                <td><code>{bk.bookingRef}</code></td>
                <td>{bk.customerName}</td>
                <td><span className={`badge badge-${bk.productType}`}>{bk.productType}</span></td>
                <td>{bk.currency} {bk.totalAmount?.toLocaleString()}</td>
                <td><span className={`status-badge status-${bk.status}`}>{bk.status}</span></td>
                <td>{new Date(bk.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
