import { useState, useEffect } from "react";
import { FaTimes, FaSave } from "react-icons/fa";

const UNITS = ["Nos", "Pcs", "Kg", "Gram", "Litre", "Meter", "Box", "Bag", "Set", "Hour", "Day", "Month"];
const GST_PRESETS = [0, 1, 3, 5, 12, 18, 28];
const BRAND = "#1F6F5C";

const inp = {
  border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px",
  fontSize: "0.875rem", color: "#0f172a", width: "100%", outline: "none",
  backgroundColor: "#fff", fontFamily: "inherit",
};
const lbl = { fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 };

const css = `
  .no-spinner::-webkit-outer-spin-button,
  .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .no-spinner { -moz-appearance: textfield; }
  .pf-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
  .pf-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .pf-span2 { grid-column: span 2; }
  .pf-combo { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; overflow: hidden; }
  .pf-combo input, .pf-combo select { border: none !important; border-radius: 0 !important; }
  .pf-combo select { border-left: 1px solid #e2e8f0 !important; width: 130px !important; flex-shrink: 0; }
  @media (max-width: 760px) {
    .pf-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .pf-grid-2 { grid-template-columns: 1fr; }
  }
`;

const EMPTY = {
  name: "", type: "Product", unit: "", hsn: "", category: "", item_code: "",
  sale_rate: "", sale_tax_mode: "Without Tax", discount: "", discount_type: "Percentage",
  wholesale_rate: "", wholesale_tax_mode: "Without Tax", min_wholesale_qty: "",
  purchase_rate: "", purchase_tax_mode: "Without Tax",
  gst_type: "With GST", gst_percent: 0,
  stock_qty: "", at_price: "", as_of_date: "", min_stock: "", location: "",
};

const capFirst = (s) => {
  const t = (s || "").trimStart();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// fills in missing fields from older products; derives sale tax mode from saved gst_type
const normalize = (p, type) => {
  if (!p) return { ...EMPTY, type: type || "Product" };
  const gst_type = p.gst_type || "With GST";
  return {
    ...EMPTY, ...p,
    unit: p.unit || "",
    gst_type,
    gst_percent: p.gst_percent ?? 0,
    sale_tax_mode: p.sale_tax_mode || (gst_type === "GST Included" ? "With Tax" : "Without Tax"),
  };
};

const Section = ({ title, children }) => (
  <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 12, padding: 18 }}>
    <div className="fw-bold mb-3" style={{ color: "#0f172a", fontSize: "0.9rem" }}>{title}</div>
    {children}
  </div>
);

// number input + "Without Tax / With Tax" dropdown, joined together
const PriceInput = ({ placeholder, value, onChange, mode, onMode }) => (
  <div className="pf-combo">
    <input type="number" className="no-spinner" style={inp} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    <select style={inp} value={mode} onChange={(e) => onMode(e.target.value)}>
      <option>Without Tax</option>
      <option>With Tax</option>
    </select>
  </div>
);

export default function ProductForm({ product, defaultType, onSave, onClose }) {
  const isEdit = !!product;
  const [form, setForm] = useState(() => normalize(product, defaultType));
  const [tab, setTab] = useState("pricing");
  const [customGst, setCustomGst] = useState(false);

  useEffect(() => {
    setForm(normalize(product, defaultType));
    setTab("pricing");
    setCustomGst(false);
  }, [product, defaultType]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const isService = form.type === "Service";
  const noun = isService ? "Service" : "Item";

  // Tax rate: "none" | preset number | custom
  const taxNone = form.gst_type === "Without GST";
  const isCustomGst = customGst || (!taxNone && !GST_PRESETS.includes(Number(form.gst_percent)));
  const taxSelectValue = taxNone ? "none" : isCustomGst ? "custom" : String(form.gst_percent);

  const onTaxRate = (v) => {
    if (v === "none") { setCustomGst(false); setForm((p) => ({ ...p, gst_type: "Without GST", gst_percent: 0 })); }
    else if (v === "custom") { setCustomGst(true); setForm((p) => ({ ...p, gst_type: p.sale_tax_mode === "With Tax" ? "GST Included" : "With GST", gst_percent: "" })); }
    else { setCustomGst(false); setForm((p) => ({ ...p, gst_type: p.sale_tax_mode === "With Tax" ? "GST Included" : "With GST", gst_percent: Number(v) })); }
  };

  const onSaleMode = (mode) => setForm((p) => ({
    ...p, sale_tax_mode: mode,
    gst_type: p.gst_type === "Without GST" ? "Without GST" : mode === "With Tax" ? "GST Included" : "With GST",
  }));

  // live price breakdown
  const rate = Number(form.sale_rate) || 0;
  const g = Number(form.gst_percent) || 0;
  let basePrice = rate, gstAmount = 0, finalPrice = rate;
  if (form.gst_type === "With GST") { gstAmount = (rate * g) / 100; finalPrice = rate + gstAmount; }
  else if (form.gst_type === "GST Included") { basePrice = rate / (1 + g / 100); gstAmount = rate - basePrice; finalPrice = rate; }
  const money = (n) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSave = (andNew = false) => {
    if (!form.name.trim()) { alert(`Please enter the ${noun.toLowerCase()} name.`); return; }
    const num = (v) => Number(v) || 0;
    onSave({
      ...form,
      name: capFirst(form.name.trim()),
      sale_rate: num(form.sale_rate),
      discount: num(form.discount),
      wholesale_rate: num(form.wholesale_rate),
      min_wholesale_qty: num(form.min_wholesale_qty),
      purchase_rate: num(form.purchase_rate),
      gst_percent: taxNone ? 0 : num(form.gst_percent),
      // Services never track stock
      stock_qty: isService ? 0 : num(form.stock_qty),
      at_price: isService ? 0 : num(form.at_price),
      min_stock: isService ? 0 : num(form.min_stock),
    }, andNew);
    if (andNew) { setForm({ ...EMPTY, type: form.type }); setTab("pricing"); setCustomGst(false); }
  };

  const tabBtn = (key, text) => (
    <button key={key} type="button" onClick={() => setTab(key)} className="border-0 bg-transparent fw-semibold"
      style={{
        padding: "10px 16px", fontSize: "0.88rem", cursor: "pointer",
        color: tab === key ? "#e11d48" : "#94a3b8",
        borderBottom: tab === key ? "2px solid #e11d48" : "2px solid transparent",
      }}>
      {text}
    </button>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <style>{css}</style>
      <div
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 960, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Product / Service toggle */}
        <div className="d-flex justify-content-between align-items-center px-4 py-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div className="d-flex align-items-center gap-4 flex-wrap">
            <div className="fw-bold" style={{ color: "#0f172a", fontSize: "1.1rem" }}>
              {isEdit ? `Edit ${noun}` : `Add ${noun}`}
            </div>
            <div className="d-flex align-items-center gap-2" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              <span style={{ color: !isService ? BRAND : "#94a3b8" }}>Product</span>
              <div
                role="switch" aria-checked={isService}
                onClick={() => { set("type", isService ? "Product" : "Service"); setTab("pricing"); }}
                style={{ width: 46, height: 24, borderRadius: 999, background: BRAND, position: "relative", cursor: "pointer", transition: "0.2s" }}>
                <div style={{ position: "absolute", top: 3, left: isService ? 25 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "0.2s" }} />
              </div>
              <span style={{ color: isService ? BRAND : "#94a3b8" }}>Service</span>
            </div>
          </div>
          <button onClick={onClose} className="border-0 rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 32, height: 32, background: "#f1f5f9", color: "#64748b", cursor: "pointer" }}>
            <FaTimes size={12} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4" style={{ overflowY: "auto", flex: 1 }}>
          <div className="pf-grid">
            <div className="pf-span2">
              <label style={lbl}>{noun} Name *</label>
              <input style={inp} value={form.name} onChange={(e) => set("name", capFirst(e.target.value))}
                placeholder={isService ? "e.g. Installation" : "e.g. Router"} autoFocus />
            </div>
            <div>
              <label style={lbl}>{isService ? "SAC" : "HSN"} Code</label>
              <input style={inp} value={form.hsn} onChange={(e) => set("hsn", e.target.value)} placeholder={isService ? "Service SAC" : "Item HSN"} />
            </div>
            <div>
              <label style={lbl}>Unit</label>
              <select style={inp} value={form.unit || ""} onChange={(e) => set("unit", e.target.value)}>
                <option value="">Select Unit</option>
                {(UNITS.includes(form.unit) || !form.unit ? UNITS : [...UNITS, form.unit]).map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="pf-span2">
              <label style={lbl}>Category</label>
              <input style={inp} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Category" />
            </div>
            <div className="pf-span2">
              <label style={lbl}>{noun} Code</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={inp} value={form.item_code} onChange={(e) => set("item_code", e.target.value)} placeholder={`${noun} Code`} />
                <button type="button" onClick={() => set("item_code", `${isService ? "SRV" : "ITM"}-${Date.now().toString().slice(-6)}`)}
                  className="border-0 fw-semibold"
                  style={{ background: "#E6F1EC", color: BRAND, borderRadius: 8, padding: "0 14px", fontSize: "0.78rem", whiteSpace: "nowrap", cursor: "pointer" }}>
                  Assign Code
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="d-flex mt-4 mb-3" style={{ borderBottom: "1px solid #e2e8f0" }}>
            {tabBtn("pricing", "Pricing")}
            {!isService && tabBtn("stock", "Stock")}
          </div>

          {tab === "pricing" && (
            <div className="d-flex flex-column gap-3">
              <Section title="Sale Price">
                <div className="pf-grid-2">
                  <div>
                    <label style={lbl}>Sale Price (₹)</label>
                    <PriceInput placeholder="Sale Price" value={form.sale_rate} onChange={(v) => set("sale_rate", v)}
                      mode={form.sale_tax_mode} onMode={onSaleMode} />
                  </div>
                  <div>
                    <label style={lbl}>Disc. On Sale Price</label>
                    <div className="pf-combo">
                      <input type="number" className="no-spinner" style={inp} placeholder="Discount" value={form.discount} onChange={(e) => set("discount", e.target.value)} />
                      <select style={inp} value={form.discount_type} onChange={(e) => set("discount_type", e.target.value)}>
                        <option>Percentage</option>
                        <option>Amount</option>
                      </select>
                    </div>
                  </div>
                </div>

                {rate > 0 && (
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", marginTop: 14, maxWidth: 360 }}>
                    <div className="d-flex justify-content-between" style={{ color: "#64748b" }}>
                      <span>Price before GST</span><span>{money(basePrice)}</span>
                    </div>
                    {!taxNone && (
                      <div className="d-flex justify-content-between" style={{ color: "#64748b" }}>
                        <span>GST ({g}%)</span><span>{money(gstAmount)}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between fw-bold" style={{ color: BRAND, borderTop: "1px solid #e2e8f0", marginTop: 4, paddingTop: 4 }}>
                      <span>Final price</span><span>{money(finalPrice)}</span>
                    </div>
                  </div>
                )}

                <div className="fw-bold mt-4 mb-3" style={{ color: "#0f172a", fontSize: "0.9rem" }}>Wholesale Price</div>
                <div className="pf-grid-2">
                  <div>
                    <label style={lbl}>Wholesale Price (₹)</label>
                    <PriceInput placeholder="Wholesale Price" value={form.wholesale_rate} onChange={(v) => set("wholesale_rate", v)}
                      mode={form.wholesale_tax_mode} onMode={(v) => set("wholesale_tax_mode", v)} />
                  </div>
                  <div>
                    <label style={lbl}>Minimum Wholesale Qty</label>
                    <input type="number" className="no-spinner" style={inp} placeholder="Minimum Wholesale Qty"
                      value={form.min_wholesale_qty} onChange={(e) => set("min_wholesale_qty", e.target.value)} />
                  </div>
                </div>
              </Section>

              <div className="pf-grid-2">
                <Section title="Purchase Price">
                  <label style={lbl}>Purchase Price (₹)</label>
                  <PriceInput placeholder="Purchase Price" value={form.purchase_rate} onChange={(v) => set("purchase_rate", v)}
                    mode={form.purchase_tax_mode} onMode={(v) => set("purchase_tax_mode", v)} />
                </Section>

                <Section title="Taxes">
                  <label style={lbl}>Tax Rate (GST %)</label>
                  {isCustomGst ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <input autoFocus type="number" className="no-spinner" min="0" max="100" step="0.01"
                          style={{ ...inp, paddingRight: 28 }} value={form.gst_percent} placeholder="e.g. 2.5"
                          onChange={(e) => { setCustomGst(true); set("gst_percent", e.target.value); }} />
                        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "0.875rem", pointerEvents: "none" }}>%</span>
                      </div>
                      <button type="button" title="Back to list" onClick={() => onTaxRate("18")}
                        style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", borderRadius: 8, width: 40, cursor: "pointer", flexShrink: 0 }}>✕</button>
                    </div>
                  ) : (
                    <select style={inp} value={taxSelectValue} onChange={(e) => onTaxRate(e.target.value)}>
                      <option value="none">None</option>
                      {GST_PRESETS.filter((x) => x > 0).map((x) => <option key={x} value={x}>{x}%</option>)}
                      <option value="custom">Custom…</option>
                    </select>
                  )}
                </Section>
              </div>
            </div>
          )}

          {tab === "stock" && !isService && (
            <Section title="Opening Stock">
              <div className="pf-grid">
                <div>
                  <label style={lbl}>Opening Quantity</label>
                  <input type="number" className="no-spinner" style={inp} value={form.stock_qty} onChange={(e) => set("stock_qty", e.target.value)} placeholder="e.g. 10" />
                </div>
                <div>
                  <label style={lbl}>At Price (₹)</label>
                  <input type="number" className="no-spinner" style={inp} value={form.at_price} onChange={(e) => set("at_price", e.target.value)} placeholder="Price per unit" />
                </div>
                <div>
                  <label style={lbl}>As Of Date</label>
                  <input type="date" style={inp} value={form.as_of_date || ""} onChange={(e) => set("as_of_date", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Min Stock To Maintain</label>
                  <input type="number" className="no-spinner" style={inp} value={form.min_stock} onChange={(e) => set("min_stock", e.target.value)} placeholder="e.g. 5" />
                </div>
                <div className="pf-span2">
                  <label style={lbl}>Location</label>
                  <input style={inp} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Rack A" />
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="d-flex justify-content-end gap-2 px-4 py-3" style={{ borderTop: "1px solid #f1f5f9" }}>
          <button onClick={onClose} className="fw-semibold border-0"
            style={{ background: "#f1f5f9", color: "#334155", borderRadius: 10, padding: "10px 20px", fontSize: "0.85rem", cursor: "pointer" }}>
            Cancel
          </button>
          {!isEdit && (
            <button onClick={() => handleSave(true)} className="fw-semibold"
              style={{ background: "#fff", color: BRAND, border: `1px solid ${BRAND}`, borderRadius: 10, padding: "10px 20px", fontSize: "0.85rem", cursor: "pointer" }}>
              Save &amp; New
            </button>
          )}
          <button onClick={() => handleSave(false)} className="fw-semibold border-0 d-flex align-items-center justify-content-center gap-2"
            style={{ background: "linear-gradient(135deg,#1F6F5C,#134A3E)", color: "#fff", borderRadius: 10, padding: "10px 24px", fontSize: "0.85rem", cursor: "pointer" }}>
            <FaSave size={12} /> {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}