import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBox, FaBoxes, FaCheck, FaHourglassHalf, FaExclamationTriangle, FaFileAlt,
  FaSearch, FaChevronDown, FaChevronLeft, FaChevronRight,
  FaPlus, FaTrash, FaHistory, FaThLarge, FaListUl, FaTimes,
  FaRupeeSign, FaBell, FaRegClock, FaSyncAlt,
} from "react-icons/fa";
import axiosInstance from "../../api/axiosInstance";

const BRAND = "#1F6F5C";
const LOW_STOCK_AT = 5; // used when an item has no "Min Stock To Maintain"
const PAGE_SIZE = 10;

const statusConfig = {
  Paid: { bg: "#ecfdf5", color: "#059669" },
  Unpaid: { bg: "#fff7ed", color: "#ea580c" },
  Overdue: { bg: "#fef2f2", color: "#ef4444" },
  Draft: { bg: "#f8fafc", color: "#64748b" },
  Sent: { bg: "#eff6ff", color: "#2563eb" },
  Converted: { bg: "#f5f3ff", color: "#7c3aed" },
};

const STOCK_BADGE = {
  in: { text: "In Stock", bg: "#ecfdf5", color: "#059669" },
  low: { text: "Low Stock", bg: "#fff7ed", color: "#ea580c" },
  out: { text: "Out of Stock", bg: "#fef2f2", color: "#ef4444" },
};


const isService = (p) => p.type === "Service";
const capFirst = (s) => {
  const t = (s || "").trimStart();
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const money = (n) =>
  "₹ " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return y && m && day ? `${day}/${m}/${y}` : String(d);
};
const gstOf = (p) => (p.gst_type === "Without GST" ? 0 : Number(p.gst_percent) || 0);
const discountText = (p) => {
  const d = Number(p.discount) || 0;
  if (d <= 0) return "—";
  return p.discount_type === "Amount" ? money(d) : `${d}%`;
};
const stockLevel = (p) => Number(p.min_stock) || LOW_STOCK_AT;
const stockState = (p) => {
  const qty = Number(p.stock_qty) || 0;
  if (qty <= 0) return "out";
  if (qty <= stockLevel(p)) return "low";
  return "in";
};

const css = `
.pl-card { background:#fff; border-radius:14px; box-shadow:0 2px 10px rgba(0,0,0,0.06); }
.pl-cards { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
.pl-scroll { overflow-x:auto; }
.pl-table { width:100%; border-collapse:collapse; }
.pl-row:hover { background:#f8fafc; }
.pl-chk { width:15px; height:15px; accent-color:${BRAND}; cursor:pointer; }
.pl-btn-ghost:hover { background:#f1f5f9 !important; }
.pl-split { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; margin-top:16px; align-items:start; }
@media (max-width: 992px) { .pl-cards { grid-template-columns:repeat(2,minmax(0,1fr)); } .pl-split { grid-template-columns:1fr; } }
@media (max-width: 520px) { .pl-cards { grid-template-columns:1fr; } }
`;

const ctl = {
  border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", fontSize: "0.78rem",
  color: "#334155", height: 38, outline: "none", fontFamily: "inherit",
};
const th = {
  fontSize: "0.72rem", color: "#64748b", fontWeight: 700, padding: "12px", textAlign: "left", whiteSpace: "nowrap",
};
const td = { padding: "12px", fontSize: "0.78rem", color: "#334155", whiteSpace: "nowrap", verticalAlign: "middle" };

const Select = ({ icon, value, onChange, options }) => (
  <div style={{ position: "relative", display: "inline-block" }}>
    {icon && (
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#475569", pointerEvents: "none", display: "flex", fontSize: 12 }}>
        {icon}
      </span>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...ctl, appearance: "none", WebkitAppearance: "none", fontWeight: 600, cursor: "pointer", padding: `0 30px 0 ${icon ? 34 : 12}px` }}
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
    <FaChevronDown size={9} color="#475569" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
  </div>
);

const StatCard = ({ bg, border, accent, label, labelColor, icon, value, onClick }) => (
  <div
    onClick={onClick}
    style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, cursor: onClick ? "pointer" : "default", minWidth: 0 }}
  >
    <div style={{ width: 40, height: 40, borderRadius: 10, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: labelColor }}>{label}</div>
      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  </div>
);

const MOVE_TYPE = {
  in: { text: "Stock added", bg: "#ecfdf5", color: "#059669" },
  out: { text: "Stock reduced", bg: "#fff7ed", color: "#ea580c" },
  adjust: { text: "Adjusted", bg: "#eff6ff", color: "#2563eb" },
};
const pill = (b) => ({ fontSize: "0.7rem", fontWeight: 700, borderRadius: 999, padding: "3px 10px", background: b.bg, color: b.color });
const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "—" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
};

function AdjustModal({ items, initialId, onClose, onDone }) {
  const [productId, setProductId] = useState(initialId || "");
  const [mode, setMode] = useState("in");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const p = items.find((x) => String(x.id) === String(productId));
  const current = Number(p?.stock_qty) || 0;
  const n = Number(qty) || 0;
  const next = mode === "in" ? current + n : mode === "out" ? current - n : n;
  const unit = p?.unit || "units";

  const submit = async () => {
    if (!p) { setError("Choose a product."); return; }
    if (qty === "" || n < 0 || (mode !== "set" && n === 0)) { setError("Enter a valid quantity."); return; }
    if (next < 0) { setError(`You only have ${current} ${unit} in stock.`); return; }
    setSaving(true); setError("");
    try {
      const res = await axiosInstance.post("/products/adjust", { productId: p.id, mode, qty: n, note: note.trim() });
      onDone(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = { width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", background: "#fff" };
  const label = { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#334155", margin: "12px 0 5px" };
  const modeBtn = (key, text) => (
    <button key={key} type="button" onClick={() => setMode(key)}
      style={{ flex: 1, border: mode === key ? `1.5px solid ${BRAND}` : "1.5px solid #e2e8f0", background: mode === key ? "#E6F1EC" : "#fff", color: mode === key ? BRAND : "#475569", borderRadius: 10, padding: "8px 4px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
      {text}
    </button>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div className="d-flex justify-content-between align-items-center">
          <div className="fw-bold" style={{ fontSize: "1.05rem", color: "#0f172a" }}>Stock Adjustment</div>
          <button onClick={onClose} className="border-0 rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 28, height: 28, background: "#f1f5f9", color: "#64748b", cursor: "pointer" }}><FaTimes size={11} /></button>
        </div>

        <label style={label}>Product</label>
        <select style={field} value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Select product</option>
          {items.map((x) => <option key={x.id} value={x.id}>{capFirst(x.name)} ({Number(x.stock_qty) || 0} {x.unit})</option>)}
        </select>
        {p && <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>Current stock: <b>{current} {unit}</b></div>}

        <label style={label}>Action</label>
        <div className="d-flex gap-2">{modeBtn("in", "Add stock")}{modeBtn("out", "Reduce stock")}{modeBtn("set", "Set count")}</div>

        <label style={label}>{mode === "set" ? "Counted quantity" : "Quantity"}</label>
        <input type="number" min="0" style={field} value={qty} onChange={(e) => { setQty(e.target.value); setError(""); }} placeholder="e.g. 10" />
        {p && qty !== "" && <div style={{ fontSize: "0.75rem", color: next < 0 ? "#ef4444" : BRAND, fontWeight: 600, marginTop: 4 }}>New stock will be: {next} {unit}</div>}

        <label style={label}>Note <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
        <input style={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Purchase received, damaged, counting mistake" />
        <div className="d-flex flex-wrap gap-1 mt-2">
          {(mode === "in" ? ["Purchase received", "Customer return"] : mode === "out" ? ["Damaged", "Expired", "Lost"] : ["Counting mistake", "Stock count"]).map((t) => (
            <button key={t} type="button" onClick={() => setNote(t)}
              style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", borderRadius: 999, padding: "2px 10px", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>
              {t}
            </button>
          ))}
        </div>

        {error && <div style={{ color: "#ef4444", fontSize: "0.78rem", fontWeight: 600, marginTop: 10 }}>{error}</div>}

        <div className="d-flex gap-2 mt-4">
          <button onClick={onClose} className="flex-fill fw-semibold border-0" style={{ background: "#f1f5f9", color: "#334155", borderRadius: 8, padding: 10, fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-fill fw-semibold border-0"
            style={{ background: "linear-gradient(135deg,#1F6F5C,#134A3E)", color: "#fff", borderRadius: 8, padding: 10, fontSize: "0.85rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryTab({ products = [], onStockChanged }) {
  const stockItems = useMemo(() => products.filter((p) => !isService(p)), [products]);
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [adjust, setAdjust] = useState(null); // null = closed, otherwise { productId }
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");

  const loadMoves = () =>
    axiosInstance.get("/products/movements", { params: { limit: 100 } })
      .then((res) => setMoves(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Failed to load stock movements:", err))
      .finally(() => setLoading(false));

  useEffect(() => { loadMoves(); }, []);

  const clearAll = async () => {
    setClearing(true); setClearError("");
    try {
      await axiosInstance.delete("/products/movements");
      setMoves([]); setShowAll(false); setConfirmClear(false);
    } catch (err) {
      setClearError(err.response?.data?.message || err.message);
    } finally {
      setClearing(false);
    }
  };

  const totalQty = stockItems.reduce((a, p) => a + (Number(p.stock_qty) || 0), 0);
  const inventoryValue = stockItems.reduce(
    (a, p) => a + (Number(p.stock_qty) || 0) * (Number(p.at_price) || Number(p.purchase_rate) || 0), 0);
  const alerts = stockItems.filter((p) => stockState(p) !== "in")
    .sort((a, b) => (Number(a.stock_qty) || 0) - (Number(b.stock_qty) || 0));
  const shownMoves = showAll ? moves : moves.slice(0, 8);

  const onDone = (res) => {
    onStockChanged && onStockChanged(res.productId, res.stock_qty);
    setAdjust(null);
    loadMoves();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Track your product stock, manage quantities and stay updated with low stock alerts.</div>
        <button onClick={() => setAdjust({ productId: "" })} className="d-flex align-items-center gap-2 fw-semibold"
          style={{ background: "#fff", color: BRAND, border: `1.5px solid ${BRAND}`, borderRadius: 10, padding: "9px 16px", fontSize: "0.82rem", cursor: "pointer" }}>
          <FaSyncAlt size={12} /> Stock Adjustment
        </button>
      </div>

      <div className="pl-card">
        <div className="pl-cards p-3">
          <StatCard bg="#ecfdf5" border="#d1fae5" accent="#22a06b" labelColor="#047857" icon={<FaBox size={16} />}
            label="Total Products" value={stockItems.length} />
          <StatCard bg="#eff6ff" border="#dbeafe" accent="#3b82f6" labelColor="#1d4ed8" icon={<FaBoxes size={16} />}
            label="Total Stock Quantity" value={totalQty.toLocaleString("en-IN")} />
          <StatCard bg="#f5f3ff" border="#ddd6fe" accent="#8b5cf6" labelColor="#6d28d9" icon={<FaRupeeSign size={15} />}
            label="Inventory Value" value={money(inventoryValue)} />
          <StatCard bg="#fef2f2" border="#fecaca" accent="#ef4444" labelColor="#b91c1c" icon={<FaExclamationTriangle size={15} />}
            label="Low Stock Items" value={alerts.length} />
        </div>
      </div>

      <div className="pl-split">
      {/* Low stock alerts */}
      <div className="pl-card p-3">
        <div className="d-flex align-items-center gap-2 mb-2">
          {alerts.length === 0
            ? <span style={{ width: 22, height: 22, borderRadius: "50%", background: BRAND, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><FaCheck size={11} /></span>
            : <FaBell size={14} color="#ef4444" />}
          <span className="fw-bold" style={{ fontSize: "0.9rem", color: "#0f172a" }}>Low Stock Alerts</span>
          {alerts.length > 0 && <span style={{ background: "#fee2e2", color: "#ef4444", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700, padding: "1px 8px" }}>{alerts.length}</span>}
        </div>
        {alerts.length === 0 ? (
          <div style={{ background: "linear-gradient(180deg,#f0faf6,#e6f4ee)", borderRadius: 12, padding: "24px 16px", textAlign: "center" }}>
            <svg width="120" height="96" viewBox="0 0 120 96" style={{ display: "block", margin: "0 auto 8px" }}>
              <circle cx="60" cy="22" r="14" fill="#1F6F5C" />
              <path d="M53 22l5 5 9-10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M60 40 L100 52 L60 64 L20 52 Z" fill="#e2e8f0" />
              <path d="M20 52 L60 64 L60 94 L20 82 Z" fill="#cbd5e1" />
              <path d="M100 52 L60 64 L60 94 L100 82 Z" fill="#e8edf3" />
            </svg>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>All items are well stocked.</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>Great! You don't have any low stock items right now.</div>
          </div>
        ) : (
          <div className="pl-scroll">
            <table className="pl-table" style={{ minWidth: 440 }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                {["Product Name", "Current Stock", "Min. Level", "Status", "Action"].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {alerts.map((p) => (
                  <tr key={p.id} className="pl-row" style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ ...td, fontWeight: 700, color: "#0f172a" }}>{capFirst(p.name)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{Number(p.stock_qty) || 0} {p.unit}</td>
                    <td style={td}>{stockLevel(p)}</td>
                    <td style={td}><span style={pill(STOCK_BADGE[stockState(p)])}>{STOCK_BADGE[stockState(p)].text}</span></td>
                    <td style={td}>
                      <button onClick={() => setAdjust({ productId: p.id })} className="fw-semibold"
                        style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: BRAND, borderRadius: 8, padding: "5px 12px", fontSize: "0.76rem", cursor: "pointer" }}>
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent stock movements */}
      <div className="pl-card p-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <FaRegClock size={14} color={BRAND} />
            <span className="fw-bold" style={{ fontSize: "0.9rem", color: "#0f172a" }}>Recent Stock Movements</span>
          </div>
          <div className="d-flex align-items-center gap-3">
            {moves.length > 8 && (
              <button onClick={() => setShowAll((v) => !v)} className="border-0 bg-transparent fw-semibold" style={{ color: BRAND, fontSize: "0.78rem", cursor: "pointer" }}>
                {showAll ? "Show less" : "View all"}
              </button>
            )}
            {moves.length > 0 && (
              <button onClick={() => { setClearError(""); setConfirmClear(true); }} className="border-0 bg-transparent fw-semibold d-flex align-items-center gap-1" style={{ color: "#ef4444", fontSize: "0.78rem", cursor: "pointer" }}>
                <FaTrash size={10} /> Clear history
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <div style={{ fontSize: "0.82rem", color: "#94a3b8", padding: "10px 0" }}>Loading…</div>
        ) : moves.length === 0 ? (
          <div style={{ fontSize: "0.82rem", color: "#94a3b8", padding: "10px 0" }}>No stock movements yet. They appear when you adjust stock or sell items on an invoice.</div>
        ) : (
          <div className="pl-scroll">
            <table className="pl-table" style={{ minWidth: 520 }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                {["Product Name", "Type", "Qty", "Date & Time", "Notes"].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {shownMoves.map((m) => {
                  const t = MOVE_TYPE[m.type] || MOVE_TYPE.adjust;
                  return (
                    <tr key={m.id} className="pl-row" style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ ...td, fontWeight: 700, color: "#0f172a" }}>
                        {capFirst(m.product_name)}
                        {m.product_deleted && <span style={{ marginLeft: 8, fontSize: "0.68rem", fontWeight: 600, color: "#ef4444", background: "#fef2f2", borderRadius: 999, padding: "2px 8px" }}>Product deleted</span>}
                      </td>
                      <td style={td}><span style={pill(t)}>{t.text}</span></td>
                      <td style={{ ...td, fontWeight: 700, color: m.qty >= 0 ? "#059669" : "#ef4444" }}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                      <td style={{ ...td, color: "#64748b" }}>{fmtDateTime(m.created_at)}</td>
                      <td style={{ ...td, whiteSpace: "normal", minWidth: 150 }}>{m.note}{m.created_by_name ? <span style={{ color: "#94a3b8" }}> · {m.created_by_name}</span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </div>

      {adjust && <AdjustModal items={stockItems} initialId={adjust.productId} onClose={() => setAdjust(null)} onDone={onDone} />}

      {confirmClear && (
        <div className="d-flex align-items-center justify-content-center"
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 2000, padding: 16 }}
          onClick={() => setConfirmClear(false)}>
          <div className="bg-white" style={{ borderRadius: 14, padding: 24, width: "90%", maxWidth: 360, boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef2f2", color: "#ef4444" }}>
              <FaTrash size={18} />
            </div>
            <div className="text-center fw-bold mb-1" style={{ fontSize: "1rem", color: "#0f172a" }}>Clear stock history?</div>
            <div className="text-center mb-3" style={{ fontSize: "0.85rem", color: "#64748b" }}>
              All {moves.length} history rows will be deleted. Your current stock numbers will not change. This can't be undone.
            </div>
            {clearError && <div className="text-center mb-3" style={{ color: "#ef4444", fontSize: "0.78rem", fontWeight: 600 }}>{clearError}</div>}
            <div className="d-flex gap-2">
              <button onClick={() => setConfirmClear(false)} className="flex-fill fw-semibold border-0"
                style={{ background: "#f1f5f9", color: "#334155", borderRadius: 8, padding: 10, fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
              <button onClick={clearAll} disabled={clearing} className="flex-fill fw-semibold border-0"
                style={{ background: "linear-gradient(135deg,#f87171,#ef4444)", color: "#fff", borderRadius: 8, padding: 10, fontSize: "0.85rem", cursor: clearing ? "not-allowed" : "pointer", opacity: clearing ? 0.7 : 1 }}>
                {clearing ? "Clearing..." : "Clear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductList({ products, invoices = [], search, setSearch, onNew, onEdit, onDelete, onStockChanged }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => {
    const saved = sessionStorage.getItem("items-tab");
    return ["products", "services", "inventory"].includes(saved) ? saved : "products";
  }); // "products" | "services" | "inventory"
  const [statusF, setStatusF] = useState("all");
  const [catF, setCatF] = useState("all");
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState([]);
  const [deleteIds, setDeleteIds] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [menu, setMenu] = useState(null); // { id, top, left }
  const [focusId, setFocusId] = useState(null);
  const prevIds = useRef([]);

  const services = tab === "services";

  const changeTab = (key) => {
    setTab(key);
    sessionStorage.setItem("items-tab", key);
    setStatusF("all"); setCatF("all");
    setChecked([]); setExpandedId(null);
  };

  // When a new item is added, jump to its tab and highlight it
  useEffect(() => {
    if (prevIds.current.length > 0) {
      const added = products.find((p) => !prevIds.current.includes(p.id));
      if (added) {
        changeTab(isService(added) ? "services" : "products");
        setSearch("");
        setFocusId(added.id);
      }
    }
    prevIds.current = products.map((p) => p.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Close the row menu on any outside click / scroll / resize
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  // Sales per item (from invoice lines)
  const salesByItem = useMemo(() => {
    const map = {};
    invoices.forEach((inv) => {
      const proforma = inv.invoiceType === "Proforma" || (inv.invoiceNo || "").startsWith("PI-");
      (inv.items || []).forEach((it) => {
        if (!it.productId) return;
        const k = String(it.productId);
        (map[k] = map[k] || []).push({
          key: `${inv.id}-${it.sl}`,
          type: proforma ? "Proforma Invoice" : "Invoice",
          invoiceNo: inv.invoiceNo,
          name: inv.buyerName,
          date: inv.date,
          qty: it.qty,
          unit: it.unit,
          rate: it.rate,
          amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
          status: inv.status,
        });
      });
    });
    Object.values(map).forEach((rows) => rows.sort((a, b) => String(b.date).localeCompare(String(a.date))));
    return map;
  }, [invoices]);

  const tabItems = useMemo(
    () => products.filter((p) => (services ? isService(p) : !isService(p))),
    [products, services]
  );
  const categories = [...new Set(tabItems.map((p) => (p.category || "").trim()).filter(Boolean))].sort();

  const q = search.trim().toLowerCase();
  const filtered = tabItems
    .filter((p) => {
      if (q && !((p.name || "").toLowerCase().includes(q) || (p.item_code || "").toLowerCase().includes(q))) return false;
      if (catF !== "all" && (p.category || "").trim() !== catF) return false;
      if (statusF !== "all") {
        if (services) {
          const active = p.active !== false;
          if ((statusF === "active") !== active) return false;
        } else if (stockState(p) !== statusF) return false;
      }
      return true;
    }); // no sorting here: the server sends newest first, so new items stay on top

  // Back to page 1 whenever the filters change, then jump to a newly added item
  useEffect(() => { setPage(1); }, [tab, search, statusF, catF]);
  useEffect(() => {
    if (!focusId) return;
    const idx = filtered.findIndex((p) => p.id === focusId);
    if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE) + 1);
    const t = setTimeout(() => setFocusId(null), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const start = (curPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => Math.abs(n - curPage) <= 2);

  // Summary cards
  const counts = { in: 0, low: 0, out: 0 };
  if (!services) tabItems.forEach((p) => { counts[stockState(p)] += 1; });
  const d = new Date();
  const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const monthRevenue = services
    ? tabItems.reduce((sum, p) => sum + (salesByItem[String(p.id)] || [])
        .filter((s) => s.type === "Invoice" && String(s.date).slice(0, 7) === monthKey)
        .reduce((a, s) => a + s.amount, 0), 0)
    : 0;
  const avgPrice = tabItems.length
    ? tabItems.reduce((a, p) => a + (Number(p.sale_rate) || 0), 0) / tabItems.length
    : 0;
  const activeCount = tabItems.filter((p) => p.active !== false).length;

  // Selection + delete
  const allOnPage = rows.length > 0 && rows.every((p) => checked.includes(p.id));
  const toggleAll = () =>
    setChecked(allOnPage
      ? checked.filter((id) => !rows.some((r) => r.id === id))
      : [...new Set([...checked, ...rows.map((r) => r.id)])]);
  const toggleOne = (id) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const deleteItems = products.filter((p) => deleteIds.includes(p.id));
  const confirmDelete = () => {
    deleteIds.forEach((id) => onDelete(id));
    setChecked((c) => c.filter((id) => !deleteIds.includes(id)));
    setDeleteIds([]);
  };
  const deleteKind = deleteItems.length && deleteItems.every(isService) ? "service"
    : deleteItems.length && deleteItems.every((p) => !isService(p)) ? "product" : "item";

  const openMenu = (e, id) => {
    e.stopPropagation();
    if (menu && menu.id === id) { setMenu(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ id, top: r.bottom + 4, left: Math.max(8, r.right - 160) });
  };

  const statusOptions = services
    ? [["all", "All Services"], ["active", "Active"], ["inactive", "Inactive"]]
    : [["all", "All Products"], ["in", "In Stock"], ["low", "Low Stock"], ["out", "Out of Stock"]];
  const catSelect = (
    <Select value={catF} onChange={setCatF} options={[["all", "All Categories"], ...categories.map((c) => [c, c])]} />
  );

  const tabBtn = (key, text, count) => {
    const active = tab === key;
    return (
      <button key={key} onClick={() => changeTab(key)} className="fw-semibold d-flex align-items-center gap-2"
        style={{
          padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: "0.82rem",
          border: active ? `1px solid ${BRAND}` : "1px solid #e2e8f0",
          background: active ? BRAND : "#fff", color: active ? "#fff" : "#475569",
        }}>
        {text}
        {count !== undefined && (
          <span style={{
            fontSize: "0.68rem", fontWeight: 700, borderRadius: 999, padding: "1px 7px",
            background: active ? "rgba(255,255,255,0.25)" : "#f1f5f9", color: active ? "#fff" : "#64748b",
          }}>{count}</span>
        )}
      </button>
    );
  };

  const colCount = services ? 11 : 13;
  const menuItem = products.find((p) => menu && p.id === menu.id);

  return (
    <div style={{ width: "100%" }}>
      <style>{css}</style>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-start gap-2">
          <FaBox size={22} color={BRAND} style={{ marginTop: 4 }} />
          <div>
            <h4 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.25rem" }}>Items</h4>
            <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
              <span onClick={() => navigate("/")} style={{ cursor: "pointer", color: BRAND, fontWeight: 600 }}>Home</span>
              {" / Products & Services"}
            </div>
          </div>
        </div>
        <button onClick={() => onNew(services ? "Service" : "Product")}
          className="d-flex align-items-center gap-2 border-0 fw-semibold"
          style={{ background: "linear-gradient(135deg,#1F6F5C,#134A3E)", color: "#fff", fontSize: "0.82rem", cursor: "pointer", borderRadius: 10, padding: "10px 18px" }}>
          <FaPlus size={11} /> Add Item
        </button>
      </div>

      {/* Tabs */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {tabBtn("products", "Products", products.filter((p) => !isService(p)).length)}
        {tabBtn("services", "Services", products.filter(isService).length)}
        {tabBtn("inventory", "Inventory")}
      </div>

      {tab === "inventory" ? (
        <InventoryTab products={products} onStockChanged={onStockChanged} />
      ) : (
      <div className="pl-card">
        {/* Summary cards */}
        <div className="pl-cards p-3">
          {!services ? (
            <>
              <StatCard bg="#eff6ff" border="#dbeafe" accent="#3b82f6" labelColor="#1d4ed8" icon={<FaBoxes size={16} />}
                label="Total Products" value={tabItems.length} onClick={() => setStatusF("all")} />
              <StatCard bg="#ecfdf5" border="#d1fae5" accent="#22a06b" labelColor="#047857" icon={<FaCheck size={15} />}
                label="In Stock" value={counts.in} onClick={() => setStatusF("in")} />
              <StatCard bg="#fffbeb" border="#fde68a" accent="#f59e0b" labelColor="#b45309" icon={<FaHourglassHalf size={15} />}
                label="Low Stock" value={counts.low} onClick={() => setStatusF("low")} />
              <StatCard bg="#fef2f2" border="#fecaca" accent="#ef4444" labelColor="#b91c1c" icon={<FaExclamationTriangle size={15} />}
                label="Out of Stock" value={counts.out} onClick={() => setStatusF("out")} />
            </>
          ) : (
            <>
              <StatCard bg="#eff6ff" border="#dbeafe" accent="#3b82f6" labelColor="#1d4ed8" icon={<FaBoxes size={16} />}
                label="Total Services" value={tabItems.length} />
              <StatCard bg="#ecfdf5" border="#d1fae5" accent="#22a06b" labelColor="#047857" icon={<FaCheck size={15} />}
                label="Active Services" value={activeCount} />
              <StatCard bg="#fffbeb" border="#fde68a" accent="#f59e0b" labelColor="#b45309" icon={<FaHourglassHalf size={15} />}
                label="Total Revenue (This Month)" value={money(monthRevenue)} />
              <StatCard bg="#f5f3ff" border="#ddd6fe" accent="#8b5cf6" labelColor="#6d28d9" icon={<FaFileAlt size={15} />}
                label="Avg. Service Price" value={money(avgPrice)} />
            </>
          )}
        </div>
        <div style={{ borderTop: "1px solid #f1f5f9", margin: "0 16px" }} />

        {/* Toolbar */}
        <div className="d-flex flex-wrap gap-2 align-items-center p-3">
          <div className="d-flex align-items-center gap-2" style={{ ...ctl, flex: "1 1 260px", padding: "0 12px", minWidth: 0 }}>
            <FaSearch size={12} color="#94a3b8" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={services ? "Search services by name or code..." : "Search products by name or code..."}
              style={{ border: "none", outline: "none", fontSize: "0.78rem", width: "100%", background: "transparent" }} />
          </div>
          <Select icon={services ? <FaListUl /> : <FaThLarge />} value={statusF} onChange={setStatusF} options={statusOptions} />
          {catSelect}
        </div>

        {/* Bulk action bar */}
        {checked.length > 0 && (
          <div className="d-flex align-items-center gap-3 mx-3 mb-3 px-3 py-2"
            style={{ background: "#E6F1EC", borderRadius: 10, fontSize: "0.8rem", color: BRAND, fontWeight: 600 }}>
            {checked.length} selected
            <button type="button" onClick={() => setDeleteIds(checked)} className="border-0 d-flex align-items-center gap-2 fw-semibold"
              style={{ background: "#fee2e2", color: "#ef4444", borderRadius: 8, padding: "5px 12px", fontSize: "0.76rem", cursor: "pointer" }}>
              <FaTrash size={11} /> Delete selected
            </button>
            <button type="button" onClick={() => setChecked([])} className="border-0 bg-transparent ms-auto" style={{ color: "#64748b", cursor: "pointer" }}>
              <FaTimes size={12} />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="px-3">
          <div className="pl-scroll" style={{ border: "1px solid #f1f5f9", borderRadius: 10 }}>
            <table className="pl-table" style={{ minWidth: services ? 960 : 1160 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ ...th, width: 40 }}>
                    <input type="checkbox" className="pl-chk" checked={allOnPage} onChange={toggleAll} />
                  </th>
                  <th style={th}>{services ? "Service Name" : "Product Name"}</th>
                  <th style={th}>Item Code</th>
                  <th style={th}>Category</th>
                  <th style={th}>Unit</th>
                  <th style={th}>Sale Price</th>
                  <th style={th}>Discount</th>
                  <th style={th}>Purchase Price</th>
                  <th style={th}>GST</th>
                  {!services && <th style={th}>In Stock</th>}
                  {!services && <th style={th}>Low Stock Level</th>}
                  <th style={th}>Status</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} style={{ padding: "36px 12px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                      {services ? "No services found." : "No products found."}
                    </td>
                  </tr>
                ) : rows.map((p) => {
                  const state = stockState(p);
                  const badge = services
                    ? (p.active === false
                        ? { text: "Inactive", bg: "#f1f5f9", color: "#64748b" }
                        : { text: "Active", bg: "#ecfdf5", color: "#059669" })
                    : STOCK_BADGE[state];
                  const g = gstOf(p);
                  const sales = salesByItem[String(p.id)] || [];
                  return (
                    <Fragment key={p.id}>
                      <tr className="pl-row" style={{ borderTop: "1px solid #f1f5f9", background: focusId === p.id ? "#E6F1EC" : undefined }}>
                        <td style={td}>
                          <input type="checkbox" className="pl-chk" checked={checked.includes(p.id)} onChange={() => toggleOne(p.id)} />
                        </td>
                        <td style={{ ...td, minWidth: 160 }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{capFirst(p.name)}</div>
                          {services && p.hsn && <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>SAC: {p.hsn}</div>}
                        </td>
                        <td style={{ ...td, fontWeight: 600 }}>{p.item_code || "—"}</td>
                        <td style={td}>{p.category || "—"}</td>
                        <td style={td}>{p.unit || "—"}</td>
                        <td style={{ ...td, fontWeight: 600, color: "#0f172a" }}>{money(p.sale_rate)}</td>
                        <td style={{ ...td, color: Number(p.discount) > 0 ? "#ef4444" : "#334155", fontWeight: 600 }}>{discountText(p)}</td>
                        <td style={td}>{Number(p.purchase_rate) > 0 ? money(p.purchase_rate) : "—"}</td>
                        <td style={td}>{g ? `${g}%` : "—"}</td>
                        {!services && <td style={{ ...td, fontWeight: 600 }}>{Number(p.stock_qty) || 0}</td>}
                        {!services && <td style={{ ...td, fontWeight: 600, color: "#ef4444" }}>{stockLevel(p)}</td>}
                        <td style={td}>
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, borderRadius: 999, padding: "3px 10px", background: badge.bg, color: badge.color }}>
                            {badge.text}
                          </span>
                        </td>
                        <td style={td}>
                          <div className="d-flex align-items-center gap-2">
                            <button type="button" onClick={() => onEdit(p)} className="pl-btn-ghost fw-semibold"
                              style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#334155", borderRadius: 8, padding: "5px 14px", fontSize: "0.76rem", cursor: "pointer" }}>
                              Edit
                            </button>
                            <button type="button" aria-label="More actions" onClick={(e) => openMenu(e, p.id)} className="pl-btn-ghost"
                              style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#334155", borderRadius: 8, width: 30, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <FaChevronDown size={9} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedId === p.id && (
                        <tr style={{ borderTop: "1px solid #f1f5f9" }}>
                          <td colSpan={colCount} style={{ background: "#f8fafc", padding: "12px 16px" }}>
                            <div className="fw-bold mb-2" style={{ fontSize: "0.82rem", color: "#0f172a" }}>Sales history</div>
                            {sales.length === 0 ? (
                              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>No sales yet. Invoices that use this item will appear here.</div>
                            ) : (
                              <div className="pl-scroll">
                                <table className="pl-table" style={{ minWidth: 620 }}>
                                  <thead>
                                    <tr>
                                      {["Type", "Invoice no.", "Name", "Date", "Quantity", "Price / unit", "Status"].map((h) => (
                                        <th key={h} style={{ ...th, padding: "6px 12px" }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sales.map((t) => {
                                      const sc = statusConfig[t.status] || statusConfig.Draft;
                                      return (
                                        <tr key={t.key} style={{ borderTop: "1px solid #e2e8f0" }}>
                                          <td style={{ ...td, fontWeight: 600, padding: "8px 12px" }}>{t.type}</td>
                                          <td style={{ ...td, color: BRAND, fontWeight: 700, padding: "8px 12px" }}>{t.invoiceNo}</td>
                                          <td style={{ ...td, padding: "8px 12px" }}>{t.name}</td>
                                          <td style={{ ...td, color: "#64748b", padding: "8px 12px" }}>{fmtDate(t.date)}</td>
                                          <td style={{ ...td, padding: "8px 12px" }}>{t.qty}{t.unit ? ` ${t.unit}` : ""}</td>
                                          <td style={{ ...td, fontWeight: 600, padding: "8px 12px" }}>{money(t.rate)}</td>
                                          <td style={{ ...td, padding: "8px 12px" }}>
                                            <span style={{ fontSize: "0.7rem", fontWeight: 700, borderRadius: 999, padding: "3px 10px", background: sc.bg, color: sc.color }}>{t.status}</span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer / pagination */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 p-3">
          <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
            {filtered.length === 0
              ? "No items to show"
              : `Showing ${start + 1} to ${start + rows.length} of ${filtered.length} ${services ? "services" : "items"}`}
          </div>
          <div className="d-flex align-items-center gap-1">
            <button type="button" disabled={curPage === 1} onClick={() => setPage(curPage - 1)} className="pl-btn-ghost"
              style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: curPage === 1 ? "default" : "pointer", opacity: curPage === 1 ? 0.5 : 1 }}>
              <FaChevronLeft size={10} />
            </button>
            {pageNums.map((n) => (
              <button key={n} type="button" onClick={() => setPage(n)}
                style={{ width: 30, height: 30, borderRadius: 8, border: n === curPage ? `1px solid ${BRAND}` : "1px solid #e2e8f0", background: n === curPage ? BRAND : "#fff", color: n === curPage ? "#fff" : "#334155", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                {n}
              </button>
            ))}
            <button type="button" disabled={curPage === totalPages} onClick={() => setPage(curPage + 1)} className="pl-btn-ghost"
              style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: curPage === totalPages ? "default" : "pointer", opacity: curPage === totalPages ? 0.5 : 1 }}>
              <FaChevronRight size={10} />
            </button>
          </div>
          </div>
      </div>
      )}

      {/* Row action menu */}
      {menu && menuItem && (
        <div onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: menu.top, left: menu.left, zIndex: 1500, width: 160, background: "#fff", borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,0.18)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <button type="button" className="pl-btn-ghost d-flex align-items-center gap-2 border-0 bg-white w-100 text-start fw-semibold"
            style={{ padding: "10px 14px", fontSize: "0.78rem", color: "#334155", cursor: "pointer" }}
            onClick={() => { setExpandedId(expandedId === menu.id ? null : menu.id); setMenu(null); }}>
            <FaHistory size={11} /> {expandedId === menu.id ? "Hide sales history" : "Sales history"}
          </button>
          <button type="button" className="pl-btn-ghost d-flex align-items-center gap-2 border-0 bg-white w-100 text-start fw-semibold"
            style={{ padding: "10px 14px", fontSize: "0.78rem", color: "#ef4444", cursor: "pointer", borderTop: "1px solid #f1f5f9" }}
            onClick={() => { setDeleteIds([menu.id]); setMenu(null); }}>
            <FaTrash size={11} /> Delete
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteIds.length > 0 && (
        <div className="d-flex align-items-center justify-content-center"
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 2000, padding: 16 }}
          onClick={() => setDeleteIds([])}>
          <div className="bg-white" style={{ borderRadius: 14, padding: 24, width: "90%", maxWidth: 340, boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef2f2", color: "#ef4444" }}>
              <FaTrash size={18} />
            </div>
            <div className="text-center fw-bold mb-1" style={{ fontSize: "1rem", color: "#0f172a" }}>
              {deleteItems.length > 1 ? `Delete ${deleteItems.length} ${deleteKind}s?` : `Delete ${deleteKind}?`}
            </div>
            <div className="text-center mb-4" style={{ fontSize: "0.85rem", color: "#64748b" }}>
              {deleteItems.length > 1
                ? <>These {deleteItems.length} {deleteKind}s will be deleted. This can't be undone.</>
                : <><strong>{capFirst(deleteItems[0]?.name)}</strong> will be deleted. This can't be undone.</>}
            </div>
            <div className="d-flex gap-2">
              <button onClick={() => setDeleteIds([])} className="flex-fill fw-semibold border-0"
                style={{ background: "#f1f5f9", color: "#334155", borderRadius: 8, padding: 10, fontSize: "0.85rem" }}>Cancel</button>
              <button onClick={confirmDelete} className="flex-fill fw-semibold border-0"
                style={{ background: "linear-gradient(135deg,#f87171,#ef4444)", color: "#fff", borderRadius: 8, padding: 10, fontSize: "0.85rem" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}