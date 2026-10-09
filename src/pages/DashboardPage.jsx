import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";   // adjust the path to where your hooks folder is
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  FaUsers, FaFileAlt, FaFileInvoiceDollar, FaRupeeSign,
  FaCheckCircle, FaExclamationCircle,
  FaArrowRight, FaChartBar,
} from "react-icons/fa";

const CUSTOMERS_API = `${import.meta.env.VITE_API_URL}/customers`;
const QUOTATIONS_API = `${import.meta.env.VITE_API_URL}/quotations`;
const INVOICES_API = `${import.meta.env.VITE_API_URL}/invoices`;

// Same avatar palette used across the app (Customers page) for visual consistency
const avatarGradients = [
  "linear-gradient(135deg,#1F6F5C,#134A3E)",
  "linear-gradient(135deg,#3D9481,#1F6F5C)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#ec4899,#db2777)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
];

// Statement-ledger design language: hairline rules instead of heavy shadow
// cards, a faint ruled-paper backdrop, serif headings for a "printed
// document" feel that matches the Quotation/Invoice paper templates, and
// tabular monospace figures so every amount lines up like a real ledger.
const statementStyles = `
.dash-page {
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0px, transparent 34px,
      rgba(31,111,92,0.05) 34px, rgba(31,111,92,0.05) 35px
    ),
    #F8F7F2;
  border-radius: 18px;
  padding: 28px 28px 8px;
}
.dash-eyebrow {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8A8578;
  font-family: system-ui, -apple-system, sans-serif;
}
.dash-serif {
  font-family: Georgia, "Times New Roman", serif;
}
.dash-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.dash-card {
  background: #fff;
  border: 1px solid #E7E3D6;
  border-radius: 12px;
}
.dash-tab {
  font-size: 0.78rem;
  font-weight: 600;
  font-family: system-ui, -apple-system, sans-serif;
  color: #6B7268;
  padding: 6px 2px;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
  background: none;
  border-left: none; border-right: none; border-top: none;
}
.dash-tab:hover { color: #1F6F5C; border-bottom-color: #BFDED2; }

.dash-stat {
  flex: 1 1 150px;
  min-width: 130px;
  padding: 4px 20px;
  border-left: 1px solid #E7E3D6;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.dash-stat:first-child { border-left: none; padding-left: 0; }
.dash-stat:hover { background-color: #FBFAF6; }

.dash-ledger-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #F0EDE3;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.dash-ledger-row:last-child { border-bottom: none; }
.dash-ledger-row:hover { background-color: #FBFAF6; }

.dash-status-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}

.dash-stub {
  border: 1px solid #E7E3D6;
  border-left: 3px dashed #C9C3B0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.dash-stub:hover { border-left-color: #1F6F5C; transform: translateX(2px); }

@media (max-width: 640px) {
  .dash-page { padding: 20px 14px 4px; border-radius: 14px; }
  .dash-stat { border-left: none; border-top: 1px solid #E7E3D6; padding: 12px 4px 4px; }
  .dash-stat:first-child { border-top: none; padding-top: 4px; }
}
`;

function Avatar({ name, size = 36 }) {
  const initials = name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  const grad = avatarGradients[(name?.charCodeAt(0) || 0) % avatarGradients.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "8px",
      background: grad, display: "flex", alignItems: "center",
      justifyContent: "center", color: "#fff", fontWeight: 700,
      fontSize: "0.72rem", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// Status color scheme, shared by the invoice ledger list and the stub cards
const invoiceStatusColors = {
  Paid: "#1F6F5C",
  Unpaid: "#B8860B",
  Overdue: "#B3261E",
  Draft: "#8A8578",
};
const quotationStatusColors = {
  Approved: "#1F6F5C",
  Pending: "#B8860B",
  Draft: "#8A8578",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // add this above `export default function DashboardPage()`
    const timed = (label, url) => {
      const t = performance.now();
      return fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }).then(r => r.json()).then(d => {
        console.log(label, Math.round(performance.now() - t), "ms");
        return d;
      });
    };

    // inside useEffect
    Promise.all([
      timed("customers", CUSTOMERS_API),
      timed("quotations", QUOTATIONS_API),
      timed("invoices", INVOICES_API),
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

  // Chart / ledger data
  const invoiceStatusData = [
    { name: "Paid", value: paidInvoices },
    { name: "Unpaid", value: unpaidInvoices },
    { name: "Overdue", value: invoices.filter(i => i.status === "Overdue").length },
    { name: "Draft", value: invoices.filter(i => i.status === "Draft").length },
  ];
  const invoiceStatusTotal = invoiceStatusData.reduce((a, b) => a + b.value, 0) || 1;
  // Rolling 6-month window ending on the current month (today, not hardcoded),
  // with each paid invoice's revenue bucketed into the month it actually falls in.
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const monthBuckets = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTH_NAMES[d.getMonth()], revenue: 0 };
  });
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

  invoices
    .filter(inv => inv.status === "Paid")
    .forEach(inv => {
      const raw = inv.date || inv.invoiceDate || inv.paidDate || inv.createdAt;
      const d = raw ? new Date(raw) : null;
      const key = d && !isNaN(d) ? `${d.getFullYear()}-${d.getMonth()}` : currentMonthKey; // undated invoices fall back to the current month
      const bucket = monthBuckets.find(m => m.key === key) || monthBuckets[monthBuckets.length - 1];
      bucket.revenue += getTotal(inv);
    });

  const monthlyRevenue = monthBuckets;
  const currentMonthRevenue = monthBuckets[monthBuckets.length - 1].revenue;

  const stats = [
    { label: "Total Customers", value: totalCustomers, sub: `${activeCustomers} active`, icon: <FaUsers size={13} />, path: "/customers" },
    { label: "Quotations", value: totalQuotations, sub: `₹${quotationValue.toLocaleString()} value`, icon: <FaFileAlt size={13} />, path: "/quotations" },
    { label: "Invoices", value: totalInvoices, sub: `${paidInvoices} paid · ${unpaidInvoices} unpaid`, icon: <FaFileInvoiceDollar size={13} />, path: "/invoices" },
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, sub: `₹${totalDue.toLocaleString()} due`, icon: <FaRupeeSign size={13} />, path: "/invoices", mono: true },
  ];

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: "60vh" }}>
        <div className="text-center">
          <div className="spinner-border" style={{ color: "#1F6F5C" }} />
          <div className="mt-2 dash-eyebrow" style={{ letterSpacing: "0.06em" }}>Loading dashboard…</div>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div style={{ maxWidth: "1200px" }}>
      <style>{statementStyles}</style>

      <div className="dash-page">

        {/* Header — reads like a statement letterhead */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap" style={{ gap: 14 }}>
          <div>
            <div className="dash-eyebrow mb-1">Statement of account · {today}</div>
            <div className="d-flex align-items-center gap-2">
              <FaChartBar size={16} color="#1F6F5C" />
              <h4 className="fw-bold mb-0 dash-serif" style={{ color: "#16241F", fontSize: "1.35rem" }}>Dashboard</h4>
            </div>
            <p className="mb-0 small mt-1" style={{ color: "#8A8578" }}>
              Welcome back, {user?.name || "there"} — here's your business overview
            </p>
          </div>
          <div className="d-flex gap-4">
            {[
              { label: "Customers", path: "/customers" },
              { label: "Quotations", path: "/quotations" },
              { label: "Invoices", path: "/invoices" },
            ].map(({ label, path }) => (
              <button key={label} onClick={() => navigate(path)} className="dash-tab">
                {label} <FaArrowRight size={9} style={{ marginLeft: 2 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Stat strip — single statement bar, hairline-divided columns instead of separate cards */}
        <div className="dash-card d-flex flex-wrap mb-4" style={{ padding: "18px 22px" }}>
          {stats.map(({ label, value, sub, icon, path, mono }) => (
            <div className="dash-stat" key={label} onClick={() => navigate(path)}>
              <div className="d-flex align-items-center gap-2 mb-1" style={{ color: "#1F6F5C" }}>
                {icon}
                <span className="dash-eyebrow" style={{ color: "#8A8578" }}>{label}</span>
              </div>
              <div className={`fw-bold ${mono ? "dash-mono" : "dash-serif"}`} style={{ fontSize: "1.5rem", color: "#16241F", lineHeight: 1.1 }}>
                {value}
              </div>
              <div className="dash-mono" style={{ color: "#8A8578", fontSize: "0.72rem", marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-lg-8">
            <div className="dash-card h-100 p-4">
              <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap" style={{ gap: 8 }}>
                <div>
                  <div className="dash-eyebrow mb-1">Revenue ledger</div>
                  <div className="dash-serif fw-bold" style={{ color: "#16241F", fontSize: "1rem" }}>Monthly Revenue</div>
                </div>
                <span className="dash-mono" style={{ color: "#1F6F5C", fontSize: "0.8rem", fontWeight: 700 }}>
                  ₹{currentMonthRevenue.toLocaleString()} <span style={{ color: "#8A8578", fontWeight: 400 }}>this month</span>
                </span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyRevenue} barSize={26}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8578" }} axisLine={{ stroke: "#E7E3D6" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8578" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, "Revenue"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E7E3D6", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "0.78rem", fontFamily: "Georgia, serif" }}
                    cursor={{ fill: "#F8F7F2" }} />
                  <Bar dataKey="revenue" fill="url(#tealGrad)" radius={[3, 3, 0, 0]} />
                  <defs>
                    <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3D9481" />
                      <stop offset="100%" stopColor="#134A3E" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Invoice status — a stacked "receipt" bar + ledger list instead of the default donut chart */}
          <div className="col-12 col-lg-4">
            <div className="dash-card h-100 p-4">
              <div className="dash-eyebrow mb-1">Breakdown</div>
              <div className="dash-serif fw-bold mb-3" style={{ color: "#16241F", fontSize: "1rem" }}>Invoice Status</div>

              {invoices.length > 0 ? (
                <>
                  <div style={{ display: "flex", width: "100%", height: 10, borderRadius: 6, overflow: "hidden", marginBottom: 16, backgroundColor: "#F0EDE3" }}>
                    {invoiceStatusData.filter(d => d.value > 0).map(({ name, value }) => (
                      <div key={name} style={{ width: `${(value / invoiceStatusTotal) * 100}%`, backgroundColor: invoiceStatusColors[name] }} />
                    ))}
                  </div>
                  <div className="d-flex flex-column">
                    {invoiceStatusData.map(({ name, value }) => (
                      <div key={name} className="d-flex justify-content-between align-items-center" style={{ padding: "7px 0", borderBottom: "1px solid #F0EDE3", opacity: value === 0 ? 0.45 : 1 }}>
                        <div className="d-flex align-items-center gap-2">
                          <div className="dash-status-dot" style={{ backgroundColor: invoiceStatusColors[name] }} />
                          <span style={{ fontSize: "0.8rem", color: "#4A4E48" }}>{name}</span>
                        </div>
                        <span className="dash-mono fw-bold" style={{ fontSize: "0.85rem", color: "#16241F" }}>
                          {value} <span style={{ color: "#8A8578", fontWeight: 400 }}>· {Math.round((value / invoiceStatusTotal) * 100)}%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4" style={{ color: "#8A8578", fontSize: "0.85rem" }}>No invoices yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Overview + Recent — ledger-row lists instead of nested cards */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-lg-4">
            <div className="dash-card h-100 p-4">
              <div className="dash-eyebrow mb-1">At a glance</div>
              <div className="dash-serif fw-bold mb-2" style={{ color: "#16241F", fontSize: "1rem" }}>Quick Overview</div>
              <div>
                {[
                  { label: "Active Customers", value: activeCustomers, total: totalCustomers, icon: <FaUsers size={13} /> },
                  { label: "Approved Quotations", value: approvedQuotations, total: totalQuotations, icon: <FaCheckCircle size={13} /> },
                  { label: "Paid Invoices", value: paidInvoices, total: totalInvoices, icon: <FaFileInvoiceDollar size={13} /> },
                  { label: "Pending Amount", value: `₹${totalDue.toLocaleString()}`, total: null, icon: <FaExclamationCircle size={13} /> },
                ].map(({ label, value, total, icon }) => (
                  <div key={label} className="dash-ledger-row">
                    <div className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: "#E6F1EC", color: "#1F6F5C" }}>
                      {icon}
                    </div>
                    <div className="flex-grow-1">
                      <div style={{ fontSize: "0.72rem", color: "#8A8578" }}>{label}</div>
                      <div className="dash-mono fw-bold" style={{ color: "#16241F", fontSize: "0.92rem" }}>
                        {value}
                        {total !== null && <span style={{ color: "#8A8578", fontWeight: 400 }}> / {total}</span>}
                      </div>
                    </div>
                    {total !== null && total > 0 && (
                      <div className="dash-mono" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1F6F5C" }}>
                        {Math.round((value / total) * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Customers */}
          <div className="col-12 col-lg-4">
            <div className="dash-card h-100 p-4">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="dash-eyebrow mb-1">Roster</div>
                  <div className="dash-serif fw-bold" style={{ color: "#16241F", fontSize: "1rem" }}>Recent Customers</div>
                </div>
                <button onClick={() => navigate("/customers")}
                  className="border-0 bg-transparent d-flex align-items-center gap-1 fw-semibold"
                  style={{ color: "#1F6F5C", fontSize: "0.72rem", cursor: "pointer" }}>
                  View all <FaArrowRight size={9} />
                </button>
              </div>
              {customers.length === 0 ? (
                <div className="text-center py-3" style={{ color: "#8A8578", fontSize: "0.85rem" }}>No customers yet</div>
              ) : (
                <div>
                  {customers.slice(0, 4).map(c => (
                    <div key={c.id} className="dash-ledger-row" onClick={() => navigate("/customers")}>
                      <Avatar name={c.name} size={34} />
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-semibold text-truncate" style={{ color: "#16241F", fontSize: "0.84rem" }}>{c.name}</div>
                        <div className="text-truncate" style={{ color: "#8A8578", fontSize: "0.7rem" }}>{c.company || c.email}</div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div className="dash-mono fw-bold" style={{ color: "#16241F", fontSize: "0.8rem" }}>
                          {c.totalBilled > 0 ? `₹${Number(c.totalBilled).toLocaleString()}` : "—"}
                        </div>
                        <span style={{
                          fontSize: "0.66rem", fontWeight: 600,
                          color: c.status === "Active" ? "#1F6F5C" : c.status === "Lead" ? "#3D9481" : "#8A8578",
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

          {/* Recent Invoices */}
          <div className="col-12 col-lg-4">
            <div className="dash-card h-100 p-4">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="dash-eyebrow mb-1">Billing</div>
                  <div className="dash-serif fw-bold" style={{ color: "#16241F", fontSize: "1rem" }}>Recent Invoices</div>
                </div>
                <button onClick={() => navigate("/invoices")}
                  className="border-0 bg-transparent d-flex align-items-center gap-1 fw-semibold"
                  style={{ color: "#1F6F5C", fontSize: "0.72rem", cursor: "pointer" }}>
                  View all <FaArrowRight size={9} />
                </button>
              </div>
              {invoices.length === 0 ? (
                <div className="text-center py-3" style={{ color: "#8A8578", fontSize: "0.85rem" }}>No invoices yet</div>
              ) : (
                <div>
                  {invoices.slice(0, 4).map(inv => (
                    <div key={inv.id} className="dash-ledger-row" onClick={() => navigate("/invoices")}>
                      <div className="dash-status-dot" style={{ backgroundColor: invoiceStatusColors[inv.status] || "#8A8578" }} />
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-semibold text-truncate" style={{ color: "#16241F", fontSize: "0.84rem" }}>{inv.buyerName}</div>
                        <div className="dash-mono" style={{ color: "#8A8578", fontSize: "0.7rem" }}>{inv.invoiceNo || inv.id}</div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div className="dash-mono fw-bold" style={{ color: "#16241F", fontSize: "0.8rem" }}>₹{Number(inv.total || 0).toLocaleString()}</div>
                        <span style={{ fontSize: "0.66rem", fontWeight: 600, color: invoiceStatusColors[inv.status] || "#8A8578" }}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Quotations — receipt-stub cards */}
        <div className="dash-card p-4 mb-4">
          <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap" style={{ gap: 10 }}>
            <div>
              <div className="dash-eyebrow mb-1">Proposals</div>
              <div className="dash-serif fw-bold" style={{ color: "#16241F", fontSize: "1rem" }}>Recent Quotations</div>
              <div style={{ color: "#8A8578", fontSize: "0.75rem" }}>{quotations.length} quotations · ₹{quotationValue.toLocaleString()} total value</div>
            </div>
            <button onClick={() => navigate("/quotations")}
              className="border-0 rounded-2 fw-semibold px-3 py-2 d-flex align-items-center gap-1"
              style={{ background: "linear-gradient(135deg,#1F6F5C,#134A3E)", color: "#fff", fontSize: "0.78rem", cursor: "pointer" }}>
              View all <FaArrowRight size={10} />
            </button>
          </div>

          {quotations.length === 0 ? (
            <div className="text-center py-3" style={{ color: "#8A8578", fontSize: "0.85rem" }}>No quotations yet</div>
          ) : (
            <div className="row g-3">
              {quotations.slice(0, 3).map(q => {
                const sColor = quotationStatusColors[q.status] || "#8A8578";
                return (
                  <div className="col-12 col-md-4" key={q.id}>
                    <div className="dash-stub p-3 h-100" onClick={() => navigate("/quotations")}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="dash-mono fw-bold" style={{ color: "#1F6F5C", fontSize: "0.72rem" }}>
                          {q.quotationNumber || ""}
                        </div>
                        <span style={{ fontSize: "0.64rem", fontWeight: 700, color: sColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {q.status}
                        </span>
                      </div>
                      <div className="dash-serif fw-bold mb-1" style={{ color: "#16241F", fontSize: "0.92rem" }}>{q.name}</div>
                      <div style={{ color: "#8A8578", fontSize: "0.74rem", marginBottom: 10 }}>{q.company}</div>
                      <div className="d-flex justify-content-between align-items-center pt-2" style={{ borderTop: "1px dashed #E7E3D6" }}>
                        <span style={{ color: "#8A8578", fontSize: "0.7rem" }}>{q.date}</span>
                        <span className="dash-mono fw-bold" style={{ color: "#16241F", fontSize: "0.98rem" }}>₹{Number(q.amount).toLocaleString()}</span>
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