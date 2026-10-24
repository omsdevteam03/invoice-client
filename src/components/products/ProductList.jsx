import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaBoxes, FaSearch, FaPlus, FaEdit, FaTrash } from "react-icons/fa";

const LOW_STOCK_AT = 5; // change this number anytime

const statusConfig = {
  Paid: { bg: "#ecfdf5", color: "#059669" },
  Unpaid: { bg: "#fff7ed", color: "#ea580c" },
  Overdue: { bg: "#fef2f2", color: "#ef4444" },
  Draft: { bg: "#f8fafc", color: "#64748b" },
  Sent: { bg: "#eff6ff", color: "#2563eb" },
  Converted: { bg: "#f5f3ff", color: "#7c3aed" },
};

const capFirst = (s) => {
  const t = (s || "").trimStart();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const money = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "2026-10-21" -> "21/10/2026"
const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return y && m && day ? `${day}/${m}/${y}` : String(d);
};

const listCSS = `
.pm-grid { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
.pm-list-scroll { max-height: calc(100vh - 330px); min-height: 200px; overflow-y: auto; }
.pm-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
.pm-detail-grid .pm-right { text-align: right; }
.pm-tx-scroll { overflow-x: auto; }
.pm-tx-table { width: 100%; min-width: 620px; border-collapse: collapse; }
.pm-item-row:hover { background: #f1f5f9; }

@media (max-width: 860px) {
  .pm-grid { grid-template-columns: 1fr; }
  .pm-list-scroll { max-height: 260px; min-height: 0; }
  .pm-detail-grid { grid-template-columns: 1fr; }
  .pm-detail-grid .pm-right { text-align: left; }
}
`;

export default function ProductList({ products, invoices = [], search, setSearch, onNew, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("products"); // "products" | "services"
  const [selectedId, setSelectedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const prevIds = useRef([]);

  const isService = (p) => p.type === "Service";

  // When a new item is added, jump to its tab and select it
  useEffect(() => {
    if (prevIds.current.length > 0) {
      const added = products.find((p) => !prevIds.current.includes(p.id));
      if (added) {
        setTab(isService(added) ? "services" : "products");
        setSelectedId(added.id);
        setSearch("");
      }
    }
    prevIds.current = products.map((p) => p.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const productCount = products.filter((p) => !isService(p)).length;
  const serviceCount = products.filter(isService).length;
  const lowStockCount = products.filter((p) => !isService(p) && Number(p.stock_qty) <= LOW_STOCK_AT).length;

  const q = search.trim().toLowerCase();
  const filtered = products
    .filter((p) => (tab === "services" ? isService(p) : !isService(p)))
    .filter((p) => !q || (p.name || "").toLowerCase().includes(q))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const selected = filtered.find((p) => p.id === selectedId) || filtered[0] || null;

  // Every invoice line that used the selected item
  const transactions = useMemo(() => {
    if (!selected) return [];
    const rows = [];
    invoices.forEach((inv) => {
      const proforma = inv.invoiceType === "Proforma" || (inv.invoiceNo || "").startsWith("PI-");
      (inv.items || []).forEach((it) => {
        if (it.productId && String(it.productId) === String(selected.id)) {
          rows.push({
            key: `${inv.id}-${it.sl}`,
            type: proforma ? "Proforma Invoice" : "Invoice",
            invoiceNo: inv.invoiceNo,
            name: inv.buyerName,
            date: inv.date,
            qty: it.qty,
            unit: it.unit,
            rate: it.rate,
            status: inv.status,
          });
        }
      });
    });
    return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [selected, invoices]);

  const confirmDelete = () => {
    onDelete(deleteTarget.id);
    setDeleteTarget(null);
  };

  const stock = selected ? Number(selected.stock_qty) || 0 : 0;
  const lowStock = selected && !isService(selected) && stock <= LOW_STOCK_AT;
  const label = { fontSize: "0.82rem", color: "#64748b" };
  const value = { fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" };

  const tabColors = { products: "#1F6F5C", services: "#7c3aed" };
  const tabBtn = (key, text, count) => {
    const active = tab === key;
    return (
      <button
        key={key}
        onClick={() => setTab(key)}
        className="border-0 fw-semibold d-flex align-items-center gap-2"
        style={{
          padding: "8px 18px", borderRadius: 10, cursor: "pointer", fontSize: "0.82rem",
          backgroundColor: active ? tabColors[key] : "#fff",
          color: active ? "#fff" : "#475569",
          boxShadow: active ? `0 4px 12px ${tabColors[key]}4D` : "0 1px 4px rgba(15,23,42,0.06)",
        }}
      >
        {text}
        <span style={{
          fontSize: "0.7rem", fontWeight: 700, borderRadius: 999, padding: "2px 8px",
          backgroundColor: active ? "rgba(255,255,255,0.25)" : "#f1f5f9",
          color: active ? "#fff" : "#64748b",
        }}>
          {count}
        </span>
      </button>
    );
  };

  return (
    <div style={{ width: "100%" }}>
      <style>{listCSS}</style>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <div className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 34, height: 34, background: "linear-gradient(135deg,#1F6F5C,#134A3E)" }}>
              <FaBoxes size={15} color="#fff" />
            </div>
            <h4 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.25rem" }}>Products</h4>
          </div>
          <div className="ms-1 d-flex align-items-center gap-1" style={{ fontSize: "0.78rem" }}>
            <span onClick={() => navigate("/")} style={{ color: "#1F6F5C", fontWeight: 600, cursor: "pointer" }}>Home</span>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ color: "#64748b" }}>Products</span>
          </div>
        </div>
        {lowStockCount > 0 && (
          <div style={{ background: "#fef2f2", color: "#ef4444", borderRadius: 999, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 700 }}>
            {lowStockCount} low stock
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {tabBtn("products", "Products", productCount)}
        {tabBtn("services", "Services", serviceCount)}
      </div>

      <div className="pm-grid">
        {/* ── Left: item list ── */}
        <div className="bg-white" style={{ borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div className="d-flex align-items-center gap-2 p-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <div className="d-flex align-items-center gap-2 flex-grow-1"
              style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "7px 10px", minWidth: 0 }}>
              <FaSearch size={12} color="#94a3b8" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === "services" ? "Search services..." : "Search products..."}
                style={{ border: "none", outline: "none", fontSize: "0.82rem", width: "100%", background: "transparent" }} />
            </div>
            <button onClick={() => onNew(tab === "services" ? "Service" : "Product")}
              className="d-flex align-items-center gap-1 border-0 fw-semibold"
              style={{
                background: "linear-gradient(135deg,#1F6F5C,#134A3E)", color: "#fff", fontSize: "0.78rem",
                cursor: "pointer", borderRadius: 10, padding: "8px 12px", whiteSpace: "nowrap",
              }}>
              <FaPlus size={10} /> Add {tab === "services" ? "Service" : "Item"}
            </button>
          </div>

          <div className="d-flex justify-content-between px-3 py-2"
            style={{ background: "#f8fafc", fontSize: "0.72rem", fontWeight: 700, color: "#64748b" }}>
            <span>ITEM</span>
            <span>{tab === "services" ? "RATE" : "QUANTITY"}</span>
          </div>

          <div className="pm-list-scroll">
            {filtered.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                {tab === "services" ? "No services found." : "No products found."}
              </div>
            ) : filtered.map((p) => {
              const active = selected && p.id === selected.id;
              const qty = Number(p.stock_qty) || 0;
              const low = !isService(p) && qty <= LOW_STOCK_AT;
              return (
                <div key={p.id} onClick={() => setSelectedId(p.id)}
                  className="pm-item-row d-flex justify-content-between align-items-center px-3 py-2"
                  style={{
                    cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                    background: active ? "#E6F1EC" : "transparent",
                    borderLeft: active ? "3px solid #1F6F5C" : "3px solid transparent",
                  }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: active ? 700 : 500, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                    {capFirst(p.name)}
                  </span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: isService(p) ? "#0f172a" : low ? "#ef4444" : "#059669", whiteSpace: "nowrap" }}>
                    {isService(p) ? money(p.sale_rate) : qty}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: item details + transactions ── */}
        <div className="d-flex flex-column gap-3" style={{ minWidth: 0 }}>
          {!selected ? (
            <div className="bg-white" style={{ borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", padding: "48px 16px", textAlign: "center", color: "#94a3b8", fontSize: "0.88rem" }}>
              {tab === "services"
                ? "Add a service to see its details here."
                : "Add a product to see its details and sales here."}
            </div>
          ) : (
            <>
              <div className="bg-white p-3" style={{ borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                    <div className="fw-bold" style={{ fontSize: "1.05rem", color: "#0f172a", overflowWrap: "anywhere" }}>
                      {capFirst(selected.name)}
                    </div>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 700, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap",
                      background: isService(selected) ? "#f5f3ff" : "#E6F1EC", color: isService(selected) ? "#7c3aed" : "#1F6F5C",
                    }}>{selected.type}</span>
                  </div>
                  <div className="d-flex gap-2">
                    <button onClick={() => onEdit(selected)} title="Edit" className="border-0 d-flex align-items-center gap-2 fw-semibold"
                      style={{ borderRadius: 10, background: "#fff2e0", color: "#ea580c", cursor: "pointer", fontSize: "0.78rem", padding: "7px 12px" }}>
                      <FaEdit size={12} /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget(selected)} title="Delete" className="border-0 d-flex align-items-center gap-2 fw-semibold"
                      style={{ borderRadius: 10, background: "#fee2e2", color: "#ef4444", cursor: "pointer", fontSize: "0.78rem", padding: "7px 12px" }}>
                      <FaTrash size={12} /> Delete
                    </button>
                  </div>
                </div>

                <div className="pm-detail-grid">
                  <div>
                    <span style={label}>Sale price: </span>
                    <span style={value}>{money(selected.sale_rate)}</span>
                    {selected.gst_type === "GST Included" && <span style={label}> (incl)</span>}
                  </div>
                  {!isService(selected) ? (
                    <div className="pm-right">
                      <span style={label}>Stock quantity: </span>
                      <span style={{ ...value, color: lowStock ? "#ef4444" : "#059669" }}>{stock}</span>
                      {lowStock && <span style={{ fontSize: "0.65rem", marginLeft: 6, color: "#ef4444", fontWeight: 700 }}>LOW</span>}
                    </div>
                  ) : <div />}

                  <div>
                    <span style={label}>GST: </span>
                    <span style={value}>
                      {selected.gst_type === "Without GST" ? "No GST" : `${selected.gst_percent}% (${selected.gst_type})`}
                    </span>
                  </div>
                  {!isService(selected) ? (
                    <div className="pm-right">
                      <span style={label}>Stock value: </span>
                      <span style={value}>{money(stock * (Number(selected.sale_rate) || 0))}</span>
                    </div>
                  ) : <div />}

                  <div>
                    <span style={label}>Unit: </span>
                    <span style={value}>{selected.unit || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3" style={{ borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                <div className="fw-bold mb-2" style={{ fontSize: "0.9rem", color: "#0f172a" }}>Transactions</div>
                <div className="pm-tx-scroll">
                  <table className="pm-tx-table">
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Type", "Invoice no.", "Name", "Date", "Quantity", "Price / unit", "Status"].map((h) => (
                          <th key={h} style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: "28px 12px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                            No sales yet. Invoices that use this item will appear here.
                          </td>
                        </tr>
                      ) : transactions.map((t) => {
                        const sc = statusConfig[t.status] || statusConfig.Draft;
                        return (
                          <tr key={t.key} style={{ borderTop: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 12px", fontSize: "0.82rem", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{t.type}</td>
                            <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#1F6F5C", fontWeight: 700, whiteSpace: "nowrap" }}>{t.invoiceNo}</td>
                            <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#334155" }}>{t.name}</td>
                            <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#64748b", whiteSpace: "nowrap" }}>{fmtDate(t.date)}</td>
                            <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#334155", whiteSpace: "nowrap" }}>{t.qty}{t.unit ? ` ${t.unit}` : ""}</td>
                            <td style={{ padding: "10px 12px", fontSize: "0.82rem", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{money(t.rate)}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, borderRadius: 999, padding: "3px 10px", background: sc.bg, color: sc.color }}>{t.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="d-flex align-items-center justify-content-center"
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, padding: 16 }}
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-white" style={{ borderRadius: 14, padding: 24, width: "90%", maxWidth: 340, boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef2f2", color: "#ef4444" }}>
              <FaTrash size={18} />
            </div>
            <div className="text-center fw-bold mb-1" style={{ fontSize: "1rem", color: "#0f172a" }}>
              Delete {isService(deleteTarget) ? "service" : "product"}?
            </div>
            <div className="text-center mb-4" style={{ fontSize: "0.85rem", color: "#64748b" }}>
              <strong>{capFirst(deleteTarget.name)}</strong> will be deleted. This can't be undone.
            </div>
            <div className="d-flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-fill fw-semibold border-0"
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