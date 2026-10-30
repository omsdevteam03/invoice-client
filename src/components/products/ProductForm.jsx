import { useState, useEffect } from "react";
import { FaTimes, FaSave } from "react-icons/fa";

const UNITS = ["Nos", "Pcs", "Kg", "Gram", "Litre", "Meter", "Box", "Bag", "Set", "Hour", "Day", "Month"];
const GST_PRESETS = [1, 3, 5, 12, 18, 28];
const BRAND = "#1F6F5C";
// starting suggestions; categories and locations you already used are added to these automatically
const DEFAULT_CATEGORIES = ["Groceries", "Electronics", "Furniture", "Stationery", "Hardware"];
const DEFAULT_LOCATIONS = ["Shop", "Godown"];

const inp = {
  border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px",
  fontSize: "0.82rem", color: "#0f172a", width: "100%", outline: "none",
  backgroundColor: "#fff", fontFamily: "inherit", height: 34,
};
const lbl = { fontSize: "0.7rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 3 };

const css = `
  .no-spinner::-webkit-outer-spin-button,
  .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .no-spinner { -moz-appearance: textfield; }
  .pf-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px 14px; }
  .pf-span2 { grid-column: span 2; }
  .pf-span4 { grid-column: span 4; }
  .pf-hint { grid-column: span 1; align-self: end; font-size: 0.72rem; color: #1F6F5C; line-height: 1.3; padding-bottom: 6px; }
  .pf-combo { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; overflow: hidden; }
  .pf-combo input, .pf-combo select { border: none !important; border-radius: 0 !important; }
  .pf-combo select { border-left: 1px solid #e2e8f0 !important; width: 104px !important; flex-shrink: 0; }
  @media (max-width: 760px) {
    .pf-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .pf-span4 { grid-column: span 2; }
    .pf-hint { grid-column: span 2; padding-bottom: 0; }
  }
`;

const EMPTY = {
  name: "", type: "Product", unit: "", hsn: "", category: "", item_code: "",
  sale_rate: "", sale_tax_mode: "Without Tax", discount: "", discount_type: "Percentage",
  wholesale_rate: "", wholesale_tax_mode: "Without Tax", min_wholesale_qty: "",
  purchase_rate: "", purchase_tax_mode: "Without Tax",
  gst_type: "Without GST", gst_percent: 0,
  stock_qty: "", at_price: "", as_of_date: "", min_stock: "", location: "",
};

const capFirst = (s) => {
  const t = (s || "").trimStart();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// fills in missing fields from older products; a 0% rate always means "No GST"
const normalize = (p, type) => {
  if (!p) return { ...EMPTY, type: type || "Product" };
  const pct = Number(p.gst_percent) || 0;
  return {
    ...EMPTY, ...p,
    unit: p.unit || "",
    gst_type: pct === 0 ? "Without GST" : (p.gst_type || "With GST"),
    gst_percent: pct,
  };
};

const Section = ({ children }) => (
  <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 10, padding: 12 }}>
    {children}
  </div>
);

// dropdown of saved values with "+ Add new…" that turns into a text box
const ComboSelect = ({ value, onChange, options, placeholder }) => {
  const [adding, setAdding] = useState(false);
  const list = [...new Set([...options, ...(value ? [value] : [])])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (adding) {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <input autoFocus style={inp} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        <button type="button" title="Back to list" onClick={() => setAdding(false)}
          style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", borderRadius: 8, width: 34, height: 34, cursor: "pointer", flexShrink: 0 }}>✕</button>
      </div>
    );
  }
  return (
    <select style={inp} value={value || ""}
      onChange={(e) => {
        if (e.target.value === "__new") { onChange(""); setAdding(true); }
        else onChange(e.target.value);
      }}>
      <option value="">Select</option>
      {list.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__new">+ Add new…</option>
    </select>
  );
};

export default function ProductForm({ product, defaultType, products = [], onSave, onClose }) {
  const isEdit = !!product;
  const [form, setForm] = useState(() => normalize(product, defaultType));
  const [tab, setTab] = useState("pricing");
  const [customGst, setCustomGst] = useState(false);
  const [resetKey, setResetKey] = useState(0); // resets the category / location dropdowns

  useEffect(() => {
    setForm(normalize(product, defaultType));
    setTab("pricing");
    setCustomGst(false);
    setResetKey((k) => k + 1);
  }, [product, defaultType]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const uniq = (key) => [...new Set(products.map((p) => (p[key] || "").trim()).filter(Boolean))];
  const categoryOptions = [...new Set([...DEFAULT_CATEGORIES, ...uniq("category")])];
  const locationOptions = [...new Set([...DEFAULT_LOCATIONS, ...uniq("location")])];
  const isService = form.type === "Service";
  const noun = isService ? "Service" : "Item";

  // GST Type: "With GST" | "GST Included" | "Without GST" (shown as "No GST")
  const taxNone = form.gst_type === "Without GST";
  const isCustomGst = !taxNone && (customGst || !GST_PRESETS.includes(Number(form.gst_percent)));
  const taxSelectValue = isCustomGst ? "custom" : String(form.gst_percent);

  const onGstType = (type) => {
    setCustomGst(false);
    setForm((p) => ({
      ...p,
      gst_type: type,
      gst_percent: type === "Without GST" ? 0 : (Number(p.gst_percent) > 0 ? p.gst_percent : 18),
    }));
  };

  const onTaxRate = (v) => {
    if (v === "custom") { setCustomGst(true); set("gst_percent", ""); }
    else { setCustomGst(false); set("gst_percent", Number(v)); }
  };

  // live price breakdown
  const rate = Number(form.sale_rate) || 0;
  const discVal = Number(form.discount) || 0;
  // discount comes off the sale price first, then GST is worked out on what is left
  const discAmount = Math.min(form.discount_type === "Amount" ? discVal : (rate * discVal) / 100, rate);
  const netRate = rate - discAmount;
  const g = taxNone ? 0 : Number(form.gst_percent) || 0;
  let basePrice = netRate, gstAmount = 0, finalPrice = netRate;
  if (form.gst_type === "With GST") { gstAmount = (netRate * g) / 100; finalPrice = netRate + gstAmount; }
  else if (form.gst_type === "GST Included") { basePrice = netRate / (1 + g / 100); gstAmount = netRate - basePrice; finalPrice = netRate; }
  const money = (n) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const unitName = form.unit || "unit";
  const minQ = Number(form.min_wholesale_qty) || 0;
  const wholesaleHint = Number(form.wholesale_rate) > 0 && minQ > 0
    ? `From ${minQ} ${unitName} and above: ${money(Number(form.wholesale_rate))} per ${unitName}${rate > 0 ? ` (instead of ${money(rate)})` : ""}.`
    : "";

  const handleSave = (andNew = false) => {
    if (!form.name.trim()) { alert(`Please enter the ${noun.toLowerCase()} name.`); return; }
    const num = (v) => Number(v) || 0;
    // the same GST Type applies to sale, wholesale and purchase prices
    const taxMode = form.gst_type === "GST Included" ? "With Tax" : "Without Tax";
    onSave({
      ...form,
      name: capFirst(form.name.trim()),
      sale_rate: num(form.sale_rate),
      discount: num(form.discount),
      wholesale_rate: num(form.wholesale_rate),
      min_wholesale_qty: num(form.min_wholesale_qty),
      purchase_rate: num(form.purchase_rate),
      gst_type: taxNone ? "Without GST" : form.gst_type,
      gst_percent: taxNone ? 0 : num(form.gst_percent),
      sale_tax_mode: taxMode,
      wholesale_tax_mode: taxMode,
      purchase_tax_mode: taxMode,
      // Services never track stock
      stock_qty: isService ? 0 : num(form.stock_qty),
      at_price: isService ? 0 : num(form.at_price),
      min_stock: isService ? 0 : num(form.min_stock),
    }, andNew);
    if (andNew) { setForm({ ...EMPTY, type: form.type }); setTab("pricing"); setCustomGst(false); setResetKey((k) => k + 1); }
  };

  const tabBtn = (key, text) => (
    <button key={key} type="button" onClick={() => setTab(key)} className="border-0 bg-transparent fw-semibold"
      style={{
        padding: "6px 14px", fontSize: "0.82rem", cursor: "pointer",
        color: tab === key ? "#e11d48" : "#94a3b8",
        borderBottom: tab === key ? "2px solid #e11d48" : "2px solid transparent",
      }}>
      {text}
    </button>
  );

  const numInput = (field, placeholder) => (
    <input type="number" className="no-spinner" style={inp} placeholder={placeholder}
      value={form[field]} onChange={(e) => set(field, e.target.value)} />
  );

  const hintStyle = { fontSize: "0.68rem", color: "#94a3b8", marginTop: 2, lineHeight: 1.25 };
  // number box with the unit (Kg, Pcs...) shown inside it
  const unitInput = (field, placeholder) => (
    <div style={{ position: "relative" }}>
      <input type="number" className="no-spinner" style={{ ...inp, paddingRight: 48 }} placeholder={placeholder}
        value={form[field]} onChange={(e) => set(field, e.target.value)} />
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "0.75rem", fontWeight: 600, pointerEvents: "none" }}>
        {form.unit || "unit"}
      </span>
    </div>
  );
  const stockQty = Number(form.stock_qty) || 0;
  const stockCost = Number(form.at_price) || 0;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <style>{css}</style>
      <div
        style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 980, maxHeight: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Product / Service toggle */}
        <div className="d-flex justify-content-between align-items-center px-4 py-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div className="d-flex align-items-center gap-4 flex-wrap">
            <div className="fw-bold" style={{ color: "#0f172a", fontSize: "1rem" }}>
              {isEdit ? `Edit ${noun}` : `Add ${noun}`}
            </div>
            <div className="d-flex align-items-center gap-2" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
              <span style={{ color: !isService ? BRAND : "#94a3b8" }}>Product</span>
              <div
                role="switch" aria-checked={isService}
                onClick={() => { set("type", isService ? "Product" : "Service"); setTab("pricing"); }}
                style={{ width: 42, height: 22, borderRadius: 999, background: BRAND, position: "relative", cursor: "pointer", transition: "0.2s" }}>
                <div style={{ position: "absolute", top: 3, left: isService ? 23 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "0.2s" }} />
              </div>
              <span style={{ color: isService ? BRAND : "#94a3b8" }}>Service</span>
            </div>
          </div>
          <button onClick={onClose} className="border-0 rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 28, height: 28, background: "#f1f5f9", color: "#64748b", cursor: "pointer" }}>
            <FaTimes size={11} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "14px 20px" }}>
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
              <ComboSelect key={`cat-${resetKey}`} value={form.category} onChange={(v) => set("category", v)} options={categoryOptions} placeholder="Type new category" />
            </div>
            <div className="pf-span2">
              <label style={lbl}>{noun} Code</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={inp} value={form.item_code} onChange={(e) => set("item_code", e.target.value)} placeholder={`${noun} Code`} />
                <button type="button" onClick={() => set("item_code", `${isService ? "SRV" : "ITM"}-${Date.now().toString().slice(-6)}`)}
                  className="border-0 fw-semibold"
                  style={{ background: "#E6F1EC", color: BRAND, borderRadius: 8, padding: "0 12px", fontSize: "0.75rem", whiteSpace: "nowrap", cursor: "pointer", height: 34 }}>
                  Assign Code
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="d-flex mt-2 mb-2" style={{ borderBottom: "1px solid #e2e8f0" }}>
            {tabBtn("pricing", "Pricing")}
            {!isService && tabBtn("stock", "Stock")}
          </div>

          {tab === "pricing" && (
            <Section>
              <div className="pf-grid">
                {/* Row 1: purchase -> wholesale -> min qty */}
                <div>
                  <label style={lbl}>Purchase Price (₹ / {unitName})</label>
                  {numInput("purchase_rate", "Purchase Price")}
                </div>
                <div>
                  <label style={lbl}>Wholesale Price (₹ / {unitName})</label>
                  {numInput("wholesale_rate", "Wholesale Price")}
                </div>
                <div>
                  <label style={lbl}>Minimum Wholesale Qty</label>
                  <div style={{ position: "relative" }}>
                    <input type="number" className="no-spinner" style={{ ...inp, paddingRight: 48 }} placeholder="Min. Qty"
                      value={form.min_wholesale_qty} onChange={(e) => set("min_wholesale_qty", e.target.value)} />
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "0.75rem", fontWeight: 600, pointerEvents: "none" }}>
                      {form.unit || "unit"}
                    </span>
                  </div>
                </div>
                <div className="pf-hint">{wholesaleHint}</div>
                {/* Row 2: sale price, discount, GST type, tax rate */}
                <div>
                  <label style={lbl}>Sale Price (₹ / {unitName})</label>
                  {numInput("sale_rate", "Sale Price")}
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
                <div>
                  <label style={lbl}>GST Type</label>
                  <select style={inp} value={form.gst_type} onChange={(e) => onGstType(e.target.value)}>
                    <option value="With GST">With GST</option>
                    <option value="GST Included">GST Included</option>
                    <option value="Without GST">No GST</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tax Rate (GST %)</label>
                  {taxNone ? (
                    <select style={{ ...inp, background: "#f1f5f9", color: "#94a3b8" }} disabled>
                      <option>—</option>
                    </select>
                  ) : isCustomGst ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <input autoFocus type="number" className="no-spinner" min="0" max="100" step="0.01"
                          style={{ ...inp, paddingRight: 26 }} value={form.gst_percent} placeholder="e.g. 2.5"
                          onChange={(e) => { setCustomGst(true); set("gst_percent", e.target.value); }} />
                        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "0.8rem", pointerEvents: "none" }}>%</span>
                      </div>
                      <button type="button" title="Back to list" onClick={() => onTaxRate("18")}
                        style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", borderRadius: 8, width: 34, height: 34, cursor: "pointer", flexShrink: 0 }}>✕</button>
                    </div>
                  ) : (
                    <select style={inp} value={taxSelectValue} onChange={(e) => onTaxRate(e.target.value)}>
                      {GST_PRESETS.map((x) => <option key={x} value={x}>{x}%</option>)}
                      <option value="custom">Custom…</option>
                    </select>
                  )}
                </div>

                {/* Live price breakdown, one line */}
                {rate > 0 && (
                  <div className="pf-span4 d-flex flex-wrap gap-4"
                    style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem", color: "#64748b" }}>
                    {discAmount > 0 && <span>Discount: <b style={{ color: "#ef4444" }}>-{money(discAmount)}</b></span>}
                    <span>Price before GST: <b style={{ color: "#334155" }}>{money(basePrice)}</b></span>
                    {!taxNone && <span>GST ({g}%): <b style={{ color: "#334155" }}>{money(gstAmount)}</b></span>}
                    <span style={{ color: BRAND, fontWeight: 700 }}>Final price: {money(finalPrice)}</span>
                  </div>
                )}

              </div>
            </Section>
          )}

          {tab === "stock" && !isService && (
            <Section>
              <div className="pf-grid">
                <div>
                  <label style={lbl}>Stock In Hand Now</label>
                  {unitInput("stock_qty", "e.g. 10")}
                  <div style={hintStyle}>How much you have today</div>
                </div>
                <div>
                  <label style={lbl}>Cost Per {unitName} (₹)</label>
                  {numInput("at_price", "e.g. 30")}
                  <div style={hintStyle}>What 1 {unitName} cost you. Used for stock value</div>
                </div>
                <div>
                  <label style={lbl}>Counted On</label>
                  <input type="date" style={inp} value={form.as_of_date || ""} onChange={(e) => set("as_of_date", e.target.value)} />
                  <div style={hintStyle}>Date of this stock count</div>
                </div>
                <div>
                  <label style={lbl}>Low Stock Alert At</label>
                  {unitInput("min_stock", "e.g. 5")}
                  <div style={hintStyle}>Shows "Low Stock" when stock reaches this</div>
                </div>
                <div className="pf-span2">
                  <label style={lbl}>Location</label>
                  <ComboSelect key={`loc-${resetKey}`} value={form.location} onChange={(v) => set("location", v)} options={locationOptions} placeholder="Type new location, e.g. Rack A" />
                  <div style={hintStyle}>Shelf, rack or godown (optional)</div>
                </div>
                {stockQty > 0 && stockCost > 0 && (
                  <div className="pf-span2 d-flex align-items-center"
                    style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem", color: "#64748b", alignSelf: "start", marginTop: 16 }}>
                    Stock value: {stockQty} {unitName} × {money(stockCost)} =&nbsp;
                    <b style={{ color: BRAND }}>{money(stockQty * stockCost)}</b>
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="d-flex justify-content-end gap-2 px-4 py-2" style={{ borderTop: "1px solid #f1f5f9" }}>
          <button onClick={onClose} className="fw-semibold border-0"
            style={{ background: "#f1f5f9", color: "#334155", borderRadius: 8, padding: "7px 18px", fontSize: "0.82rem", cursor: "pointer" }}>
            Cancel
          </button>
          {!isEdit && (
            <button onClick={() => handleSave(true)} className="fw-semibold"
              style={{ background: "#fff", color: BRAND, border: `1px solid ${BRAND}`, borderRadius: 8, padding: "7px 18px", fontSize: "0.82rem", cursor: "pointer" }}>
              Save &amp; New
            </button>
          )}
          <button onClick={() => handleSave(false)} className="fw-semibold border-0 d-flex align-items-center justify-content-center gap-2"
            style={{ background: "linear-gradient(135deg,#1F6F5C,#134A3E)", color: "#fff", borderRadius: 8, padding: "7px 22px", fontSize: "0.82rem", cursor: "pointer" }}>
            <FaSave size={12} /> {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}