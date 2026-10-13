import { useState, useEffect } from "react";
import { FaTimes, FaSave } from "react-icons/fa";

const UNITS = ["Nos", "Pcs", "Kg", "Gram", "Litre", "Meter", "Box", "Bag", "Set", "Hour", "Day", "Month"];
const GST_PRESETS = [0, 1, 3, 5, 12, 18, 28];
const GST_TYPES = ["With GST", "Without GST", "GST Included"];

const inp = {
  border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px",
  fontSize: "0.875rem", color: "#0f172a", width: "100%", outline: "none",
  backgroundColor: "#fff", fontFamily: "inherit",
};
const lbl = { fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 };

const spinnerCSS = `
  .no-spinner::-webkit-outer-spin-button,
  .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .no-spinner { -moz-appearance: textfield; }
`;

const EMPTY = { name: "", type: "Product", unit: "", sale_rate: "", gst_type: "With GST", gst_percent: 18, stock_qty: "" };
const capFirst = (s) => {
  const t = (s || "").trimStart();
  return t.charAt(0).toUpperCase() + t.slice(1);
};
// fills in any missing/null fields from older products
const normalize = (p) =>
  p ? { ...EMPTY, ...p, unit: p.unit || "", gst_type: p.gst_type || "With GST", gst_percent: p.gst_percent ?? 18 } : EMPTY;

export default function ProductForm({ product, onSave, onClose }) {
  const isEdit = !!product;
  const [form, setForm] = useState(() => normalize(product));
  const [customGst, setCustomGst] = useState(false);

  useEffect(() => { setForm(normalize(product)); setCustomGst(false); }, [product]);

  // a saved percent that isn't in the list (e.g. 2.5) opens in custom mode automatically
  const isCustomGst = customGst || !GST_PRESETS.includes(Number(form.gst_percent));

  // live price breakdown
  const rate = Number(form.sale_rate) || 0;
  const g = Number(form.gst_percent) || 0;
  let basePrice = rate, gstAmount = 0, finalPrice = rate;
  if (form.gst_type === "With GST") { gstAmount = (rate * g) / 100; finalPrice = rate + gstAmount; }
  else if (form.gst_type === "GST Included") { basePrice = rate / (1 + g / 100); gstAmount = rate - basePrice; finalPrice = rate; }
  const money = (n) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (!form.name.trim()) { alert("Please enter the product name."); return; }
    onSave({
      ...form,
      name: capFirst(form.name.trim()),      sale_rate: Number(form.sale_rate) || 0,
      gst_type: form.gst_type,
      gst_percent: Number(form.gst_percent) || 0,
      // Services never track stock
      stock_qty: form.type === "Service" ? 0 : Number(form.stock_qty) || 0,
    });
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <style>{spinnerCSS}</style>
      <div
        style={{
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480,
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center px-4 py-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div className="fw-bold" style={{ color: "#0f172a", fontSize: "1.05rem" }}>
            {isEdit ? "Edit Product" : "Add Product"}
          </div>
          <button onClick={onClose} className="border-0 rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 32, height: 32, background: "#f1f5f9", color: "#64748b", cursor: "pointer" }}>
            <FaTimes size={12} />
          </button>
        </div>

        <div className="p-4">
          <div className="row g-3">
            <div className="col-12">
              <label style={lbl}>Name *</label>
              <input style={inp} value={form.name} onChange={e => set("name", capFirst(e.target.value))} placeholder="e.g. Router" autoFocus />            </div>

            <div className="col-6">
              <label style={lbl}>Type</label>
              <select style={inp} value={form.type} onChange={e => set("type", e.target.value)}>
                <option>Product</option>
                <option>Service</option>
              </select>
            </div>
            <div className="col-6">
              <label style={lbl}>Unit</label>
              <select style={inp} value={form.unit || ""} onChange={e => set("unit", e.target.value)}>
                <option value="">None</option>
                {(UNITS.includes(form.unit) || !form.unit ? UNITS : [...UNITS, form.unit]).map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="col-6">
              <label style={lbl}>Sale Rate (₹)</label>
              <input type="number" className="no-spinner" style={inp} value={form.sale_rate} onChange={e => set("sale_rate", e.target.value)} placeholder="2000" />
            </div>
            <div className="col-6">
              <label style={lbl}>GST Type</label>
              <select style={inp} value={form.gst_type} onChange={e => set("gst_type", e.target.value)}>
                {GST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {form.gst_type !== "Without GST" && (
              <div className="col-6">
                <label style={lbl}>GST %</label>
                {isCustomGst ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        autoFocus type="number" className="no-spinner" min="0" max="100" step="0.01"
                        style={{ ...inp, paddingRight: 28 }}
                        value={form.gst_percent}
                        onChange={e => { setCustomGst(true); set("gst_percent", e.target.value); }}
                        placeholder="e.g. 2.5"
                      />
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "0.875rem", pointerEvents: "none" }}>%</span>
                    </div>
                    <button
                      type="button" title="Back to list"
                      onClick={() => { setCustomGst(false); set("gst_percent", 18); }}
                      style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", borderRadius: 8, width: 38, height: 38, cursor: "pointer", flexShrink: 0 }}
                    >✕</button>
                  </div>
                ) : (
                  <select
                    style={inp} value={form.gst_percent}
                    onChange={e => {
                      if (e.target.value === "custom") { setCustomGst(true); set("gst_percent", ""); }
                      else set("gst_percent", Number(e.target.value));
                    }}
                  >
                    {GST_PRESETS.map(g => <option key={g} value={g}>{g}%</option>)}
                    <option value="custom">Custom…</option>
                  </select>
                )}
              </div>
            )}

            {form.type === "Product" && (
              <div className={form.gst_type !== "Without GST" ? "col-6" : "col-12"}>
                <label style={lbl}>Stock Quantity</label>
                <input type="number" className="no-spinner" style={inp} value={form.stock_qty} onChange={e => set("stock_qty", e.target.value)} placeholder="e.g. 10" />
              </div>
            )}

            {rate > 0 && (
              <div className="col-12">
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem" }}>
                  <div className="d-flex justify-content-between" style={{ color: "#64748b" }}>
                    <span>Price before GST</span><span>{money(basePrice)}</span>
                  </div>
                  {form.gst_type !== "Without GST" && (
                    <div className="d-flex justify-content-between" style={{ color: "#64748b" }}>
                      <span>GST ({g}%)</span><span>{money(gstAmount)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold" style={{ color: "#1F6F5C", borderTop: "1px solid #e2e8f0", marginTop: 4, paddingTop: 4 }}>
                    <span>Final price</span><span>{money(finalPrice)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="d-flex gap-2 mt-4">
            <button onClick={onClose} className="flex-fill fw-semibold border-0"
              style={{ background: "#f1f5f9", color: "#334155", borderRadius: 10, padding: 10, fontSize: "0.85rem", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSave} className="flex-fill fw-semibold border-0 d-flex align-items-center justify-content-center gap-2"
              style={{ background: "linear-gradient(135deg,#1F6F5C,#134A3E)", color: "#fff", borderRadius: 10, padding: 10, fontSize: "0.85rem", cursor: "pointer" }}>
              <FaSave size={12} /> {isEdit ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}