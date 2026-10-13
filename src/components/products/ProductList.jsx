import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBoxes, FaSearch, FaPlus, FaEdit, FaTrash } from "react-icons/fa";

const LOW_STOCK_AT = 5; // change this number anytime

const listCSS = `
@media (max-width: 768px) {
  .pl-stat { flex: 1 1 calc(33.333% - 8px); min-width: 0 !important; padding: 10px 12px !important; }
  .pl-search { min-width: 0 !important; flex: 1 1 100% !important; }

  /* the white box around the table goes away; each row becomes its own card */
  .pl-wrap.bg-white { background: transparent !important; box-shadow: none !important; border-radius: 0 !important; }
  .pl-wrap .table-responsive { overflow: visible; }
  .pl-table { min-width: 0 !important; display: block; width: 100%; }
  .pl-table thead { display: none; }
  .pl-table tbody { display: block; }

  .pl-table tr {
    position: relative;
    display: flex !important;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    background: #fff;
    border: 1px solid #f1f5f9 !important;
    border-radius: 14px;
    box-shadow: 0 2px 10px rgba(15,23,42,0.06);
    padding: 14px 16px 12px;
    margin-bottom: 12px;
  }
  .pl-table td { display: block; padding: 0 !important; border: 0; }

  /* Name: full width, leaves room for the rate on the right */
  .pl-table td:nth-child(1) { order: 1; flex: 0 0 100%; padding-right: 96px !important; }
  /* Rate: pinned top-right */
  .pl-table td:nth-child(4) { order: 2; position: absolute; top: 14px; right: 16px; }
  /* Type / Unit / GST / Stock share one wrapping row */
  .pl-table td:nth-child(2) { order: 3; }
  .pl-table td:nth-child(3) { order: 4; }
  .pl-table td:nth-child(3):empty { display: none; }
  .pl-table td:nth-child(5) { order: 5; display: flex; align-items: baseline; gap: 6px; }
  .pl-table td:nth-child(6) { order: 6; }
  .pl-table td:nth-child(6)::before { content: "Stock: "; color: #64748b; font-weight: 500; font-size: 0.78rem; }
  /* Actions: own row, buttons on the right */
  .pl-table td:nth-child(7) {
    order: 7; flex: 0 0 100%; margin-top: 4px;
    padding-top: 10px !important; border-top: 1px solid #f1f5f9;
  }

  /* "No products found." row */
  .pl-table td[colspan] {
    display: block !important; flex: 0 0 100%; position: static;
    text-align: center; padding: 32px 16px !important; border: 0;
  }
  .pl-table td[colspan]::before { content: none; }
}
`;

export default function ProductList({ products, search, setSearch, onNew, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const q = search.trim().toLowerCase();
  const filtered = products.filter(p =>
    !q || (p.name || "").toLowerCase().includes(q) || (p.type || "").toLowerCase().includes(q)
  );

  // NEW
const capFirst = (s) => {
  const t = (s || "").trimStart();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

  const totalProducts = products.filter(p => p.type !== "Service").length;
  const totalServices = products.filter(p => p.type === "Service").length;
  const lowStock = products.filter(p => p.type !== "Service" && Number(p.stock_qty) <= LOW_STOCK_AT).length;

  const confirmDelete = () => {
    onDelete(deleteTarget.id);
    setDeleteTarget(null);
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

        <button onClick={onNew}
          className="d-flex align-items-center gap-2 border-0 fw-semibold px-3 py-2"
          style={{
            background: "linear-gradient(135deg,#1F6F5C,#134A3E)", color: "#fff", fontSize: "0.82rem",
            cursor: "pointer", borderRadius: 10, boxShadow: "0 4px 12px rgba(31,111,92,0.35)",
          }}>
          <FaPlus size={12} /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="d-flex justify-content-end mb-3">
        <div className="pl-search d-flex align-items-center gap-2"
          style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "8px 12px", minWidth: 240, flex: "0 1 320px" }}>
          <FaSearch size={13} color="#94a3b8" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            style={{ border: "none", outline: "none", fontSize: "0.85rem", width: "100%", background: "transparent" }} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="d-flex flex-wrap mb-4" style={{ gap: 12 }}>
        {[
          { label: "Products", count: totalProducts, color: "#1F6F5C" },
          { label: "Services", count: totalServices, color: "#7c3aed" },
          { label: "Low Stock", count: lowStock, color: "#ef4444" },
        ].map(s => (
          <div key={s.label} className="pl-stat" style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(15,23,42,0.06)", padding: "10px 18px", minWidth: 120 }}>
            <div className="fw-bold" style={{ fontSize: "1.1rem", color: s.color }}>{s.count}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#334155" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="pl-wrap bg-white" style={{ borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="pl-table" style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                {["NAME", "TYPE", "UNIT", "RATE", "GST", "STOCK", "ACTION"].map((h, i) => (
                  <th key={h} style={{
                    fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.04em",
                    padding: "14px 16px", textAlign: i === 6 ? "right" : "left", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isService = p.type === "Service";
                const low = !isService && Number(p.stock_qty) <= LOW_STOCK_AT;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>{capFirst(p.name)}</td>                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 700, borderRadius: 999, padding: "3px 10px",
                        background: isService ? "#f5f3ff" : "#E6F1EC", color: isService ? "#7c3aed" : "#1F6F5C",
                      }}>{p.type}</span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#64748b" }}>{p.unit}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", fontWeight: 600 }}>₹{Number(p.sale_rate).toLocaleString("en-IN")}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#64748b" }}>
  {p.gst_type === "Without GST" ? "No GST" : `${p.gst_percent}%`}
  {p.gst_type && p.gst_type !== "Without GST" && (
    <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{p.gst_type}</div>
  )}
</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", fontWeight: 700, color: isService ? "#94a3b8" : low ? "#ef4444" : "#059669" }}>
                      {isService ? "—" : p.stock_qty}
                      {low && <span style={{ fontSize: "0.65rem", marginLeft: 6 }}>LOW</span>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div className="d-flex gap-2 justify-content-end">
                        <button onClick={() => onEdit(p)} title="Edit" className="border-0 d-flex align-items-center justify-content-center"
                          style={{ width: 34, height: 34, borderRadius: 10, background: "#fff2e0", color: "#ea580c", cursor: "pointer" }}>
                          <FaEdit size={13} />
                        </button>
                        <button onClick={() => setDeleteTarget(p)} title="Delete" className="border-0 d-flex align-items-center justify-content-center"
                          style={{ width: 34, height: 34, borderRadius: 10, background: "#fee2e2", color: "#ef4444", cursor: "pointer" }}>
                          <FaTrash size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center" style={{ padding: "40px 16px", color: "#94a3b8", fontSize: "0.88rem" }}>
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="d-flex align-items-center justify-content-center"
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, padding: 16 }}
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-white" style={{ borderRadius: 14, padding: 24, width: "90%", maxWidth: 340, boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>
            <div className="d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef2f2", color: "#ef4444" }}>
              <FaTrash size={18} />
            </div>
            <div className="text-center fw-bold mb-1" style={{ fontSize: "1rem", color: "#0f172a" }}>Delete product?</div>
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