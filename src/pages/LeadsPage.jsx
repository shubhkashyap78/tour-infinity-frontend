import { useState, useEffect } from "react";
import { apiFetch } from "../api";
import QuotationBuilder from "./QuotationBuilder";

const LEAD_SOURCES = ["Website", "Phone Call", "WhatsApp", "Referral", "Walk-in", "Social Media"];
const LEAD_STATUS = ["New", "Contacted", "Qualified", "Quoted", "Converted", "Lost"];
const PACKAGE_TYPES = ["Honeymoon", "Family", "Adventure", "LTC", "Group", "Corporate"];
const BUDGET_RANGES = ["Under ₹20k", "₹20k-50k", "₹50k-1L", "₹1L-2L", "Above ₹2L"];

export default function LeadsPage({ token }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showQuotationBuilder, setShowQuotationBuilder] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    phone: "",
    source: "Website",
    status: "New",
    packageType: "Family",
    travelDates: "",
    duration: "",
    groupSize: "",
    budget: "₹50k-1L",
    destination: "Port Blair + Havelock",
    requirements: "",
    notes: ""
  });

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadLeads = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/leads", { headers });
      if (res.ok) {
        const data = await res.json();
        // Handle both array and object response formats
        setLeads(Array.isArray(data) ? data : (data.leads || []));
      }
    } catch (err) {
      console.error("Failed to load leads:", err);
      setLeads([]); // Set empty array on error
    }
    setLoading(false);
  };

  useEffect(() => { loadLeads(); }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editLead ? "PUT" : "POST";
      const url = editLead ? `/api/leads/${editLead._id}` : "/api/leads";
      
      const res = await apiFetch(url, {
        method,
        headers,
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowModal(false);
        setEditLead(null);
        setFormData({
          customerName: "",
          email: "",
          phone: "",
          source: "Website",
          status: "New",
          packageType: "Family",
          travelDates: "",
          duration: "",
          groupSize: "",
          budget: "₹50k-1L",
          destination: "Port Blair + Havelock",
          requirements: "",
          notes: ""
        });
        loadLeads();
      }
    } catch (err) {
      console.error("Failed to save lead:", err);
    }
  };

  const updateLeadStatus = async (id, status) => {
    try {
      await apiFetch(`/api/leads/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status })
      });
      loadLeads();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const deleteLead = async (id) => {
    if (!confirm("Delete this lead?")) return;
    try {
      await apiFetch(`/api/leads/${id}`, { method: "DELETE", headers });
      loadLeads();
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  const openEditModal = (lead) => {
    setEditLead(lead);
    setFormData({
      customerName: lead.customerName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      packageType: lead.packageType,
      travelDates: lead.travelDates?.split('T')[0] || "",
      duration: lead.duration,
      groupSize: lead.groupSize,
      budget: lead.budget,
      destination: lead.destination,
      requirements: lead.requirements || "",
      notes: lead.notes || ""
    });
    setShowModal(true);
  };

  const filtered = (leads || [])
    .filter(lead => filter === "all" || lead.status.toLowerCase() === filter)
    .filter(lead => !search || 
      lead.customerName.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search)
    );

  const getStatusColor = (status) => {
    const colors = {
      "New": "status-pending",
      "Contacted": "status-confirmed", 
      "Qualified": "badge-tour",
      "Quoted": "badge-package",
      "Converted": "status-completed",
      "Lost": "status-cancelled"
    };
    return colors[status] || "status-pending";
  };

  const counts = (s) => s === "all" ? (leads || []).length : (leads || []).filter(l => l.status.toLowerCase() === s).length;

  if (loading) return <div className="dash-loading">⏳ Loading leads...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>🎯 Lead Management</h2>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input 
            className="form-input search-input" 
            placeholder="🔍 Search leads..."
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            ➕ Add Lead
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {["all", "new", "contacted", "qualified", "quoted", "converted", "lost"].map((s) => (
          <button 
            key={s} 
            className={`filter-tab ${filter === s ? "filter-tab-active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All Leads" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="filter-count">{counts(s)}</span>
          </button>
        ))}
      </div>

      {/* Leads Table */}
      {filtered.length === 0 ? (
        <div className="empty">No leads found. Add your first lead to get started!</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Package</th>
                <th>Travel Date</th>
                <th>Budget</th>
                <th>Source</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead._id}>
                  <td>
                    <div className="bk-name">{lead.customerName}</div>
                    <div className="bk-email">{lead.groupSize} pax • {lead.duration}</div>
                  </td>
                  <td>
                    <div>{lead.email}</div>
                    <div className="bk-email">{lead.phone}</div>
                  </td>
                  <td>
                    <span className="badge badge-package">{lead.packageType}</span>
                    <div className="bk-email">{lead.destination}</div>
                  </td>
                  <td>{lead.travelDates ? new Date(lead.travelDates).toLocaleDateString() : "TBD"}</td>
                  <td>{lead.budget}</td>
                  <td>
                    <span className="source-tag">{lead.source}</span>
                  </td>
                  <td>
                    <select 
                      className="pay-select"
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead._id, e.target.value)}
                    >
                      {LEAD_STATUS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-xs btn-confirm" onClick={() => openEditModal(lead)}>
                        ✏️ Edit
                      </button>
                      <a href={`tel:${lead.phone}`} className="btn-xs btn-complete" style={{textDecoration: "none"}}>
                        📞 Call
                      </a>
                      <a href={`https://wa.me/91${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="btn-xs" style={{background: "#25d366", color: "white", textDecoration: "none"}}>
                        💬 WhatsApp
                      </a>
                      <button 
                        className="btn-xs" 
                        style={{background: "#2563eb", color: "white"}}
                        onClick={() => {
                          setSelectedLeadId(lead._id);
                          setShowQuotationBuilder(true);
                        }}
                      >
                        📋 Quote
                      </button>
                      <button className="btn-xs btn-cancel" onClick={() => deleteLead(lead._id)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Lead Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editLead ? "Edit Lead" : "Add New Lead"}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <label className="form-label">
                  Customer Name *
                  <input 
                    className="form-input"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    required
                  />
                </label>
                
                <label className="form-label">
                  Phone Number *
                  <input 
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </label>
                
                <label className="form-label">
                  Email
                  <input 
                    className="form-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </label>
                
                <label className="form-label">
                  Lead Source
                  <select 
                    className="form-input"
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                  >
                    {LEAD_SOURCES.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </label>
                
                <label className="form-label">
                  Package Type
                  <select 
                    className="form-input"
                    value={formData.packageType}
                    onChange={(e) => setFormData({...formData, packageType: e.target.value})}
                  >
                    {PACKAGE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                
                <label className="form-label">
                  Budget Range
                  <select 
                    className="form-input"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  >
                    {BUDGET_RANGES.map(range => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </label>
                
                <label className="form-label">
                  Travel Date
                  <input 
                    className="form-input"
                    type="date"
                    value={formData.travelDates}
                    onChange={(e) => setFormData({...formData, travelDates: e.target.value})}
                  />
                </label>
                
                <label className="form-label">
                  Duration
                  <input 
                    className="form-input"
                    placeholder="e.g., 5N/6D"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  />
                </label>
                
                <label className="form-label">
                  Group Size
                  <input 
                    className="form-input"
                    placeholder="e.g., 2 Adults"
                    value={formData.groupSize}
                    onChange={(e) => setFormData({...formData, groupSize: e.target.value})}
                  />
                </label>
                
                <label className="form-label">
                  Status
                  <select 
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    {LEAD_STATUS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>
              
              <label className="form-label" style={{gridColumn: "1/-1"}}>
                Destination Preference
                <input 
                  className="form-input"
                  placeholder="e.g., Port Blair + Havelock + Neil"
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
                />
              </label>
              
              <label className="form-label" style={{gridColumn: "1/-1"}}>
                Special Requirements
                <textarea 
                  className="form-input"
                  rows="3"
                  placeholder="Any special requests, dietary requirements, accessibility needs..."
                  value={formData.requirements}
                  onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                />
              </label>
              
              <label className="form-label" style={{gridColumn: "1/-1"}}>
                Internal Notes
                <textarea 
                  className="form-input"
                  rows="2"
                  placeholder="Internal notes for follow-up..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </label>
              
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editLead ? "Update Lead" : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quotation Builder Modal */}
      {showQuotationBuilder && selectedLeadId && (
        <QuotationBuilder 
          leadId={selectedLeadId}
          token={token}
          onClose={() => {
            setShowQuotationBuilder(false);
            setSelectedLeadId(null);
          }}
        />
      )}
    </div>
  );
}