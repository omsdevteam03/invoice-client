import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  FaUsers, FaFileAlt, FaFileInvoiceDollar, FaRupeeSign,
  FaCheckCircle, FaExclamationCircle, FaArrowUp,
  FaArrowRight, FaChartBar,
} from "react-icons/fa";

const CUSTOMERS_API = 'http://localhost:3000/api/customers';
const QUOTATIONS_API = 'http://localhost:3000/api/quotations';
const INVOICES_API = 'http://localhost:3000/api/invoices';

const avatarGradients = [
  "linear-gradient(135deg,#f97316,#ea580c)",
  "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#ec4899,#db2777)",
];

function Avatar({ name, size = 36 }) {
  const initials = name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  const grad = avatarGradients[(name?.charCodeAt(0) || 0) % avatarGradients.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "10px",
      background: grad, display: "flex", alignItems: "center",
      justifyContent: "center", color: "#fff", fontWeight: 700,
      fontSize: "0.75rem", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(CUSTOMERS_API).then(r => r.json()),
      fetch(QUOTATIONS_API).then(r => r.json()),
      fetch(INVOICES_API).then(r => r.json()),
    ]).then(([c, q, i]) => {
      setCustomers(Array.isArray(c) ? c : []);
      setQuotations(Array.isArray(q) ? q : []);
      setInvoices(Array.isArray(i) ? i : []);
      setLoading(false);
    }).catch(err => {
      console.error('Dashboard load error:', err);
      setLoading(false);
    });
  }, []);

  // Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === "Active").length;
  const totalQuotations = quotations.length;
  const approvedQuotations = quotations.filter(q => q.status === "Approved").length;
  const quotationValue = quotations.reduce((a, b) => a + Number(b.amount || 0), 0);
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(i => i.status === "Paid").length;
  const unpaidInvoices = invoices.filter(i => i.status === "Unpaid").length;
const getTotal = (inv) => {
  const sub = (inv.items || []).reduce((a, b) => a + Number(b.amount || 0), 0);
  return sub + Math.round(sub * 0.18);
};

const totalRevenue = invoices
  .filter(i => i.status === "Paid")
  .reduce((a, b) => a + getTotal(b), 0);

const totalDue = invoices
  .filter(i => i.status !== "Paid")
  .reduce((a, b) => a + (getTotal(b) - Number(b.amountPaid || 0)), 0);  

  // Chart data
  const invoiceStatusData = [
    { name: "Paid", value: paidInvoices, color: "#10b981" },
    { name: "Unpaid", value: unpaidInvoices, color: "#f97316" },
    { name: "Overdue", value: invoices.filter(i => i.status === "Overdue").length, color: "#ef4444" },
    { name: "Draft", value: invoices.filter(i => i.status === "Draft").length, color: "#94a3b8" },
  ].filter(d => d.value > 0);

  const monthlyRevenue = [
    { month: "Jan", revenue: 12000 },
    { month: "Feb", revenue: 18500 },
    { month: "Mar", revenue: 22000 },
    { month: "Apr", revenue: 15000 },
    { month: "May", revenue: 28000 },
    { month: "Jun", revenue: totalRevenue },
  ];

  const stats = [
    { label: "Total Customers", value: totalCustomers, sub: `${activeCustomers} active`, bg: "linear-gradient(135deg,#f97316,#ea580c)", icon: <FaUsers size={20} />, path: "/customers" },
    { label: "Quotations", value: totalQuotations, sub: `₹${quotationValue.toLocaleString()} value`, bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)", icon: <FaFileAlt size={20} />, path: "/quotations" },
    { label: "Invoices", value: totalInvoices, sub: `${paidInvoices} paid · ${unpaidInvoices} unpaid`, bg: "linear-gradient(135deg,#10b981,#059669)", icon: <FaFileInvoiceDollar size={20} />, path: "/invoices" },
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, sub: `₹${totalDue.toLocaleString()} due`, bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)", icon: <FaRupeeSign size={20} />, path: "/invoices" },
  ];

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: "60vh" }}>
        <div className="text-center">
          <div className="spinner-border" style={{ color: "#f97316" }} />
          <div className="mt-2" style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px" }}>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <div className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 34, height: 34, background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
              <FaChartBar size={15} color="#fff" />
            </div>
            <h4 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.2rem" }}>Dashboard</h4>
          </div>
          <p className="mb-0 small ms-1" style={{ color: "#94a3b8" }}>
            Welcome back, Admin — here's your business overview
          </p>
        </div>
        <div className="d-flex gap-2">
          {[
            { label: "Customers", path: "/customers", bg: "#fff7ed", color: "#f97316" },
            { label: "Quotations", path: "/quotations", bg: "#eff6ff", color: "#3b82f6" },
            { label: "Invoices", path: "/invoices", bg: "#ecfdf5", color: "#10b981" },
          ].map(({ label, path, bg, color }) => (
            <button key={label} onClick={() => navigate(path)}
              className="border-0 rounded-3 fw-semibold px-3 py-2 d-flex align-items-center gap-1"
              style={{ backgroundColor: bg, color, fontSize: "0.78rem", cursor: "pointer" }}>
              {label} <FaArrowRight size={10} />
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {stats.map(({ label, value, sub, bg, icon, path }) => (
          <div className="col-6 col-lg-3" key={label}>
            <div className="card border-0 h-100"
              style={{ borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", cursor: "pointer", transition: "transform 0.15s" }}
              onClick={() => navigate(path)}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="d-flex align-items-center justify-content-center rounded-3"
                    style={{ width: 44, height: 44, background: bg, color: "#fff" }}>
                    {icon}
                  </div>
                  <FaArrowUp size={12} color="#10b981" />
                </div>
                <div className="fw-bold mb-1" style={{ fontSize: "1.6rem", color: "#0f172a", lineHeight: 1 }}>{value}</div>
                <div style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: 500 }}>{label}</div>
                <div style={{ color: "#64748b", fontSize: "0.72rem", marginTop: 2 }}>{sub}</div>
              </div>
              <div style={{ height: 3, background: bg }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-8">
          <div className="card border-0 h-100" style={{ borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.95rem" }}>Monthly Revenue</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Revenue trend over 6 months</div>
                </div>
                <span className="rounded-pill px-3 py-1" style={{ backgroundColor: "#ecfdf5", color: "#059669", fontSize: "0.72rem", fontWeight: 600 }}>
                  ₹{totalRevenue.toLocaleString()} this month
                </span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyRevenue} barSize={28}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, "Revenue"]}
                    contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "0.78rem" }}
                    cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="revenue" fill="url(#orangeGrad)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card border-0 h-100" style={{ borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <div className="p-4">
              <div className="fw-bold mb-1" style={{ color: "#0f172a", fontSize: "0.95rem" }}>Invoice Status</div>
              <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: 12 }}>Breakdown by status</div>
              {invoiceStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={invoiceStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                      {invoiceStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "none", fontSize: "0.78rem" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-4" style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No invoices yet</div>
              )}
              <div className="d-flex flex-column gap-2 mt-2">
                {invoiceStatusData.map(({ name, value, color }) => (
                  <div key={name} className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: color }} />
                      <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{name}</span>
                    </div>
                    <span className="fw-bold" style={{ fontSize: "0.82rem", color: "#0f172a" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Overview + Recent */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-4">
          <div className="card border-0 h-100" style={{ borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <div className="p-4">
              <div className="fw-bold mb-3" style={{ color: "#0f172a", fontSize: "0.95rem" }}>Quick Overview</div>
              <div className="d-flex flex-column gap-3">
                {[
                  { label: "Active Customers", value: activeCustomers, total: totalCustomers, color: "#f97316", icon: <FaUsers size={14} /> },
                  { label: "Approved Quotations", value: approvedQuotations, total: totalQuotations, color: "#3b82f6", icon: <FaCheckCircle size={14} /> },
                  { label: "Paid Invoices", value: paidInvoices, total: totalInvoices, color: "#10b981", icon: <FaFileInvoiceDollar size={14} /> },
                  { label: "Pending Amount", value: `₹${totalDue.toLocaleString()}`, total: null, color: "#ef4444", icon: <FaExclamationCircle size={14} /> },
                ].map(({ label, value, total, color, icon }) => (
                  <div key={label} className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor: "#f8fafc" }}>
                    <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                      style={{ width: 34, height: 34, backgroundColor: color + "20", color }}>
                      {icon}
                    </div>
                    <div className="flex-grow-1">
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{label}</div>
                      <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.95rem" }}>
                        {value}
                        {total !== null && <span style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: 400 }}> / {total}</span>}
                      </div>
                    </div>
                    {total !== null && total > 0 && (
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color, backgroundColor: color + "15", padding: "2px 8px", borderRadius: 20 }}>
                        {Math.round((value / total) * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Customers */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 h-100" style={{ borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <div className="d-flex justify-content-between align-items-center px-4 pt-4 pb-2">
              <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.95rem" }}>Recent Customers</div>
              <button onClick={() => navigate("/customers")}
                className="border-0 bg-transparent d-flex align-items-center gap-1 fw-semibold"
                style={{ color: "#f97316", fontSize: "0.75rem", cursor: "pointer" }}>
                View all <FaArrowRight size={10} />
              </button>
            </div>
            <div className="px-4 pb-4">
              {customers.length === 0 ? (
                <div className="text-center py-3" style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No customers yet</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {customers.slice(0, 4).map(c => (
                    <div key={c.id} className="d-flex align-items-center gap-3 p-2 rounded-3"
                      style={{ transition: "background 0.15s", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                      onClick={() => navigate("/customers")}
                    >
                      <Avatar name={c.name} size={36} />
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-semibold text-truncate" style={{ color: "#0f172a", fontSize: "0.85rem" }}>{c.name}</div>
                        <div className="text-truncate" style={{ color: "#94a3b8", fontSize: "0.72rem" }}>{c.company || c.email}</div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.82rem" }}>
                          {c.totalBilled > 0 ? `₹${Number(c.totalBilled).toLocaleString()}` : "—"}
                        </div>
                        <span className="rounded-pill px-2"
                          style={{
                            fontSize: "0.65rem", fontWeight: 600,
                            backgroundColor: c.status === "Active" ? "#ecfdf5" : c.status === "Lead" ? "#eff6ff" : "#f8fafc",
                            color: c.status === "Active" ? "#059669" : c.status === "Lead" ? "#3b82f6" : "#64748b"
                          }}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 h-100" style={{ borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <div className="d-flex justify-content-between align-items-center px-4 pt-4 pb-2">
              <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.95rem" }}>Recent Invoices</div>
              <button onClick={() => navigate("/invoices")}
                className="border-0 bg-transparent d-flex align-items-center gap-1 fw-semibold"
                style={{ color: "#f97316", fontSize: "0.75rem", cursor: "pointer" }}>
                View all <FaArrowRight size={10} />
              </button>
            </div>
            <div className="px-4 pb-4">
              {invoices.length === 0 ? (
                <div className="text-center py-3" style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No invoices yet</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {invoices.slice(0, 4).map(inv => {
                    const sc = {
                      Paid: { bg: "#ecfdf5", color: "#059669" },
                      Unpaid: { bg: "#fff7ed", color: "#ea580c" },
                      Overdue: { bg: "#fef2f2", color: "#ef4444" },
                      Draft: { bg: "#f8fafc", color: "#64748b" },
                    }[inv.status] || { bg: "#f8fafc", color: "#64748b" };
                    return (
                      <div key={inv.id} className="d-flex align-items-center gap-3 p-2 rounded-3"
                        style={{ transition: "background 0.15s", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => navigate("/invoices")}
                      >
                        <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                          style={{ width: 36, height: 36, background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }}>
                          <FaFileInvoiceDollar size={14} />
                        </div>
                        <div className="flex-grow-1 min-w-0">
                          <div className="fw-semibold text-truncate" style={{ color: "#0f172a", fontSize: "0.85rem" }}>{inv.buyerName}</div>
                          <div style={{ color: "#94a3b8", fontSize: "0.72rem" }}>{inv.id}</div>
                        </div>
                        <div className="text-end flex-shrink-0">
                          <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.82rem" }}>₹{Number(inv.total || 0).toLocaleString()}</div>
                          <span className="rounded-pill px-2" style={{ fontSize: "0.65rem", fontWeight: 600, backgroundColor: sc.bg, color: sc.color }}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Quotations */}
      <div className="card border-0" style={{ borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <div className="d-flex justify-content-between align-items-center px-4 pt-4 pb-2">
          <div>
            <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.95rem" }}>Recent Quotations</div>
            <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{quotations.length} quotations · ₹{quotationValue.toLocaleString()} total value</div>
          </div>
          <button onClick={() => navigate("/quotations")}
            className="border-0 rounded-3 fw-semibold px-3 py-2 d-flex align-items-center gap-1"
            style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", fontSize: "0.78rem", cursor: "pointer" }}>
            View all <FaArrowRight size={10} />
          </button>
        </div>
        <div className="px-4 pb-4">
          {quotations.length === 0 ? (
            <div className="text-center py-3" style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No quotations yet</div>
          ) : (
            <div className="row g-3">
              {quotations.slice(0, 3).map(q => {
                const sc = {
                  Approved: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
                  Pending: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
                  Draft: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
                }[q.status] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
                return (
                  <div className="col-12 col-md-4" key={q.id}>
                    <div className="card border-0 h-100"
                      style={{ borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden", cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                      onClick={() => navigate("/quotations")}
                    >
                      <div style={{ height: 3, background: "linear-gradient(90deg,#f97316,#ea580c)" }} />
                      <div className="p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="fw-bold" style={{ color: "#f97316", fontSize: "0.72rem" }}>{q.id}</div>
                          <span className="rounded-pill px-2 py-1 fw-semibold"
                            style={{ fontSize: "0.65rem", backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                            {q.status}
                          </span>
                        </div>
                        <div className="fw-bold mb-1" style={{ color: "#0f172a", fontSize: "0.9rem" }}>{q.name}</div>
                        <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: 8 }}>{q.company}</div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span style={{ color: "#64748b", fontSize: "0.72rem" }}>{q.date}</span>
                          <span className="fw-bold" style={{ color: "#0f172a", fontSize: "1rem" }}>₹{Number(q.amount).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}