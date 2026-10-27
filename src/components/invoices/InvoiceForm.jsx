import { useState, useEffect, useRef, useMemo } from "react";
import { FaArrowLeft, FaSave, FaPlus, FaTrash, FaEye, FaEyeSlash, FaTimes, FaChevronDown, FaSearch } from "react-icons/fa";
import { INVOICE_LABELS, INVOICE_FONT, InvoiceLangToggle, useTamilDescriptions, translateToTamil, unitLabel, numberToWordsTamil, splitGst, gstRows } from "./invoiceLang";
import axiosInstance from "../../api/axiosInstance"; // same helper CompanySettings uses
import ProductForm from "../products/ProductForm";

function logoStyle(shape, size) {
  if (shape === "circle") return { width: size, height: size, borderRadius: "50%", objectFit: "cover" };
  if (shape === "square") return { width: size, height: size, borderRadius: 8, objectFit: "contain" };
  return { height: size, width: "auto", maxWidth: size * 3, objectFit: "contain" }; // original
}

// Capitalizes the first letter of every word, e.g. "abi kumar" -> "Abi Kumar"
function capitalizeWords(str) {
  return String(str || "").replace(/\b\p{L}/gu, (ch) => ch.toUpperCase());
}

const spinnerCSS = `
  .no-spinner::-webkit-outer-spin-button,
  .no-spinner::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .no-spinner {
    -moz-appearance: textfield;
  }
`;
const inp = {
  border: "1px solid #e2e8f0", borderRadius: "8px", padding: "5px 10px",
  fontSize: "0.82rem", lineHeight: 1.3, color: "#0f172a", width: "100%", outline: "none",
  backgroundColor: "#fff", fontFamily: "inherit",
};

// Units for the Qty column. Add or remove entries here anytime.
const UNIT_OPTIONS = [
  "Nos", "Pcs", "Kg", "Gram", "Ton", "Litre", "ml",
  "Meter", "Sq.ft", "Box", "Bag", "Set", "Hour", "Day", "Month",
];

// ── Custom units (saved in the browser, shared by all item rows) ──────────
const INVOICE_CUSTOM_UNITS_KEY = "invoice_custom_units";
const ADD_CUSTOM_UNIT_VALUE = "__add_custom_unit__";

function readCustomUnits() {
  try {
    const raw = localStorage.getItem(INVOICE_CUSTOM_UNITS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function UnitSelectField({ value, onChange, style }) {
  const [customUnits, setCustomUnits] = useState(readCustomUnits);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pos, setPos] = useState({});
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const options = [...UNIT_OPTIONS, ...customUnits.filter(u => !UNIT_OPTIONS.includes(u))];
  if (value && !options.includes(value)) options.push(value);

  const closeMenu = () => { setOpen(false); setAdding(false); setDraft(""); };

  // Close on outside click, scroll or resize (the menu is position: fixed)
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      closeMenu();
    };
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      closeMenu();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [open]);

  const toggle = () => {
    if (open) { closeMenu(); return; }
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 240));
    const openUp = window.innerHeight - r.bottom < 330 && r.top > 330;
    setPos(openUp ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 });
    setOpen(true);
  };

  const pick = (u) => { onChange(u); closeMenu(); };

  const saveCustom = () => {
    const name = draft.trim();
    if (!name) { closeMenu(); return; }
    const existing = options.find(u => u.toLowerCase() === name.toLowerCase());
    if (existing) {
      pick(existing);
      return;
    }
    const next = [...customUnits, name];
    try { localStorage.setItem(INVOICE_CUSTOM_UNITS_KEY, JSON.stringify(next)); } catch { }
    setCustomUnits(next);
    pick(name);
  };

  const chip = (active) => ({
    border: active ? "1.5px solid #1F6F5C" : "1.5px solid #e2e8f0",
    background: active ? "#1F6F5C" : "#fff",
    color: active ? "#fff" : "#0f172a",
    borderRadius: 8, padding: "6px 4px", fontSize: "0.78rem", fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  });

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        style={{
          ...style,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4,
          cursor: "pointer", textAlign: "left",
          borderColor: open ? "#1F6F5C" : "#e2e8f0",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: value ? "#0f172a" : "#94a3b8" }}>
          {value || "-"}
        </span>
        <FaChevronDown size={8} color="#64748b" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", zIndex: 10000, width: 228, boxSizing: "border-box",
            background: "#fff", border: "1px solid #BFDED2", borderRadius: 12,
            boxShadow: "0 12px 32px rgba(15,23,42,0.18)", padding: 10, ...pos,
          }}
        >
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: 8 }}>
            SELECT UNIT
          </div>

          <div style={{ maxHeight: 200, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            <button type="button" onClick={() => pick("")} style={chip(!value)}>None</button>
            {options.map(u => (
              <button
                key={u}
                type="button"
                title={u}
                onClick={() => pick(u)}
                style={chip(u === value)}
                onMouseEnter={e => { if (u !== value) e.currentTarget.style.background = "#E6F1EC"; }}
                onMouseLeave={e => { if (u !== value) e.currentTarget.style.background = "#fff"; }}
              >
                {u}
              </button>
            ))}
          </div>

          {adding ? (
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <input
                autoFocus
                type="text"
                value={draft}
                maxLength={12}
                placeholder="e.g. Quintal"
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); saveCustom(); }
                  if (e.key === "Escape") { e.preventDefault(); closeMenu(); }
                }}
                style={{ flex: 1, minWidth: 0, border: "1.5px solid #1F6F5C", borderRadius: 8, padding: "6px 8px", fontSize: "0.8rem", outline: "none" }}
              />
              <button
                type="button"
                onClick={saveCustom}
                style={{ border: "none", borderRadius: 8, padding: "0 12px", background: "#1F6F5C", color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                width: "100%", marginTop: 10, padding: "8px 10px",
                border: "1.5px dashed #1F6F5C", borderRadius: 8,
                background: "#E6F1EC", color: "#175646",
                fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
              }}
            >
              <FaPlus size={9} /> Add Custom Unit
            </button>
          )}
        </div>
      )}
    </>
  );
}


// Dropdown of company profiles coming from Settings ➜ Company.
// No hardcoded names, no localStorage.
function CompanySelectField({ value, companies = [], onSelect, placeholder = "Select company", style }) {
  const options = companies.filter(c => c.companyName);
  // keep an old invoice's company visible even if it's no longer in Settings
  const valueMissing = value && !options.some(c => c.companyName === value);

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const company = options.find(c => c.companyName === e.target.value);
        if (company) onSelect(company);
      }}
      style={{ ...style, cursor: "pointer" }}
    >
      <option value="" disabled>{placeholder}</option>
      {valueMissing && <option value={value}>{value}</option>}
      {options.map(c => (
        <option key={c.id} value={c.companyName}>
          {c.companyName}{c.status === "active" ? " (Active)" : ""}
        </option>
      ))}
    </select>
  );
}

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${months[parseInt(m) - 1]}-${y}`;
}

function numberToWords(num) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (num === 0) return "Zero";
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + numberToWords(num % 100) : "");
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + numberToWords(num % 1000) : "");
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + numberToWords(num % 100000) : "");
  return numberToWords(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + numberToWords(num % 10000000) : "");
}
// Formats a number as Indian-grouped currency text, e.g. 70000 -> "70,000.00"
function formatAmount(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const cell = (content, style = {}) => (
  <td style={{ border: "1px solid #000", padding: "5px 7px", fontSize: "0.7rem", verticalAlign: "top", ...style }}>
    {content}
  </td>
);

// ── Numbering helpers ────────────────────────────────────────────────────
const isProformaRecord = (i) =>
  i.invoiceType === "Proforma" || (i.invoiceNo || "").startsWith("PI-");
const isFinalRecord = (i) => !isProformaRecord(i);

// ── Hook: track viewport for responsive layout ──────────────────────────────
function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= breakpoint);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}

// ── Live Preview (full mirror of InvoiceDocument, shown alongside the form) ─
const PREVIEW_DOC_WIDTH = 560; // natural width of the invoice table

function InvoicePreview({ form, isMobile, onClose, showHsn = true }) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(null);
  const customCols = form.customColumns || [];
  const cols = (showHsn ? 6 : 5) + customCols.length;   // table columns in the preview
  const customTd = (key, content, extra = {}) => (
    <td key={key} style={{ border: "1px solid #000", padding: "5px 7px", fontSize: "0.7rem", verticalAlign: "top", ...extra }}>
      {content}
    </td>
  );
  // empty HSN + custom cells for the total rows
  const hsnBlank = (<>{showHsn && cell("")}{customCols.map(c => customTd(c.key, ""))}</>);

  useEffect(() => {
    if (!isMobile) return;
    const update = () => {
      if (!wrapRef.current) return;
      const s = Math.min(1, wrapRef.current.clientWidth / PREVIEW_DOC_WIDTH);
      setScale(s);
      if (innerRef.current) setScaledHeight(innerRef.current.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, [isMobile]);

  const previewLang = form.invoiceLang === "ta" ? "ta" : "en";
  const L = INVOICE_LABELS[previewLang];
  const tDesc = useTamilDescriptions(form.items, previewLang);
  const rawSum = form.items.reduce((a, b) => a + Number(b.amount || 0), 0);
  const gstPercent = Number(form.gstPercent || 18);
  let subtotal, tax, total;
  if (form.gstType === "With GST") {
    subtotal = rawSum;
    tax = Math.round(subtotal * (gstPercent / 100));
    total = subtotal + tax;
  } else if (form.gstType === "GST Included") {
    total = rawSum;
    tax = Math.round(rawSum - (rawSum / (1 + gstPercent / 100)));
    subtotal = total - tax;
  } else {
    subtotal = rawSum;
    tax = 0;
    total = subtotal;
  }
  const gst = splitGst(tax, gstPercent, form.companyGSTIN, form.buyerGSTIN);
  const gstComponentRows = form.gstType !== "No GST" ? gstRows(gst, gstPercent, form.gstType, L) : [];

  const amountPaid = Number(form.amountPaid || 0);
  const due = total - amountPaid;

  const words = total > 0
    ? (previewLang === "ta"
        ? `${L.wordsPrefix} ${numberToWordsTamil(total)} ${L.wordsSuffix}`
        : `${L.wordsPrefix} ${numberToWords(total)} ${L.wordsSuffix}`)
    : "—";

  const panelStyle = isMobile
    ? {
      ...styles.previewPanel,
      width: "100%",
      minWidth: 0,
      maxWidth: "100%",
      flex: "none",
      position: "static",
      height: "auto",
      borderRadius: "16px",
      border: "1.5px solid #f1f5f9",
      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    }
    : styles.previewPanel;

  return (
    <div style={panelStyle}>
      <div style={styles.previewHeader}>
        <FaEye size={14} color="#059669" />
        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>Live Preview</span>
        {isMobile ? (
          <button
            onClick={onClose}
            className="border-0 bg-transparent d-flex align-items-center justify-content-center"
            style={{ marginLeft: "auto", color: "#64748b", cursor: "pointer", padding: 6 }}
            aria-label="Close preview"
          >
            <FaTimes size={16} />
          </button>
        ) : (
          <span style={{ fontSize: "0.7rem", color: "#94a3b8", marginLeft: "auto" }}>Updates as you type</span>
        )}
      </div>

      <div style={{ padding: isMobile ? "10px" : "16px", overflowY: isMobile ? "visible" : "auto", flex: isMobile ? "none" : 1, backgroundColor: "#f1f5f9" }}>
        <div
          ref={wrapRef}
          style={isMobile ? { width: "100%", height: scaledHeight ?? "auto", overflow: "hidden" } : undefined}
        >
        <div
          ref={innerRef}
          style={{
            backgroundColor: "#fff",
            padding: "14px",
            fontFamily: INVOICE_FONT,
            ...(isMobile
              ? { width: PREVIEW_DOC_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }
              : {}),
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
            <tbody>
              <tr>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "8px 10px", width: "50%" }}>
                  <div className="d-flex align-items-start gap-2">
                  {form.logo
                    ? <img src={form.logo} alt="Logo" style={{ ...logoStyle(form.logoShape, 36), flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 36, backgroundColor: "#059669", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.55rem" }}>OMS</span>
                    </div>
                  }
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#0f172a" }}>
                      {form.companyName || <span style={{ color: "#cbd5e1" }}>Company Name</span>}
                    </div>
                    {form.companyAddress && (
                      <div style={{ fontSize: "0.62rem", color: "#334155", whiteSpace: "pre-line", marginTop: 2 }}>
                        {form.companyAddress}
                      </div>
                    )}
                  </div>
                </div>
                </td>
            <td colSpan={cols - 3} style={{ border: "1px solid #000", padding: "8px 10px", verticalAlign: "top", width: "50%" }}>
  <div style={{ fontSize: "0.7rem", whiteSpace: "nowrap", marginBottom: 4 }}>
    <span style={{ color: "#64748b" }}>{L.invoiceNo}: </span>
    <span style={{ fontWeight: 700, color: "#0f172a" }}>{form.invoiceNo || "—"}</span>
  </div>
  <div style={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>
    <span style={{ color: "#64748b" }}>{L.dated}: </span>
    <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatDate(form.date)}</span>
  </div>
</td>
              </tr>

       <tr>
  <td colSpan={3} style={{ border: "1px solid #000", padding: "6px 10px", verticalAlign: "top" }}>
    <div style={{ fontWeight: 700, fontSize: "0.65rem", color: "#0f172a", marginBottom: 2 }}>{previewLang === "ta" ? L.to.replace(/:$/, "") : "To"}</div>
    <div style={{ fontWeight: 700, fontSize: "0.72rem", color: "#0f172a" }}>
      {form.buyerSalutation ? form.buyerSalutation + " " : ""}{form.buyerName || <span style={{ color: "#cbd5e1" }}>Buyer Name</span>}
    </div>
    {form.buyerCompanyName && (
      <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "#334155" }}>{form.buyerCompanyName}</div>
    )}
    {form.buyerAddress && (
      <div style={{ fontSize: "0.65rem", color: "#334155", whiteSpace: "pre-line" }}>{L.address}: {form.buyerAddress}</div>
    )}
    {form.buyerMobile && (
      <div style={{ fontSize: "0.65rem", color: "#334155" }}>{L.mobile}: {form.buyerMobile}</div>
    )}
    {form.buyerGSTIN && (
      <div style={{ fontSize: "0.65rem", color: "#334155" }}>GSTIN: {form.buyerGSTIN}</div>
    )}
  </td>
  <td colSpan={cols - 3} style={{ border: "1px solid #000", padding: "6px 10px", verticalAlign: "top" }}>
    <div style={{ fontWeight: 700, fontSize: "0.65rem", color: "#0f172a", marginBottom: 2 }}>{previewLang === "ta" ? L.from.replace(/:$/, "") : "From"}</div>
    <div style={{ fontSize: "0.65rem", color: "#334155", whiteSpace: "pre-line" }}>
      {L.address}: {form.companyAddress || <span style={{ color: "#cbd5e1" }}>Company Address</span>}
    </div>
    {form.companyMobile && (
      <div style={{ fontSize: "0.65rem", color: "#334155" }}>
        {L.mobile}: {form.companyMobile}
      </div>
    )}
    {form.companyEmail && (
      <div style={{ fontSize: "0.65rem", color: "#334155" }}>
        Email: {form.companyEmail}
      </div>
    )}
    <div style={{ fontSize: "0.65rem", color: "#334155" }}>
      GSTIN: {form.companyGSTIN || <span style={{ color: "#cbd5e1" }}>—</span>}
    </div>
  </td>
</tr>

              <tr style={{ backgroundColor: "#f1f5f9" }}>
                {cell(L.sl, { fontWeight: 700, textAlign: "center", width: "6%" })}
                {cell(L.description, { fontWeight: 700, width: "34%" })}
                {showHsn && cell("HSN / SAC", { fontWeight: 700, textAlign: "center", width: "12%" })}
                {customCols.map(c => customTd(c.key, c.label, { fontWeight: 700, textAlign: "center" }))}
                {cell(L.qty, { fontWeight: 700, textAlign: "center", width: "12%" })}
                {cell(L.rate, { fontWeight: 700, textAlign: "right", width: "18%" })}
                {cell(L.amount, { fontWeight: 700, textAlign: "right", width: "18%" })}
              </tr>

              {form.items.map((item, i) => (
                <tr key={i}>
                  {cell(item.sl, { textAlign: "center" })}
                  {cell(
                    <>
                      {tDesc(item) || <span style={{ color: "#cbd5e1" }}>—</span>}
                      {Number(item.discount) > 0 && (
                        <div style={{ fontSize: "0.58rem", color: "#64748b" }}>
                          {previewLang === "ta" ? "தள்ளுபடி" : "Discount"}: {item.discountType === "amount" ? `₹${Number(item.discount).toLocaleString("en-IN")}` : `${item.discount}%`}
                        </div>
                      )}
                    </>
                  )}
                  {showHsn && cell(item.hsnCode || "—", { textAlign: "center" })}
                  {customCols.map(c => customTd(c.key, item.custom?.[c.key] || "—", { textAlign: "center" }))}
                  {cell(`${item.qty}${item.unit ? " " + unitLabel(item.unit, previewLang) : ""}`, { textAlign: "center", whiteSpace: "nowrap" })}
                  {cell(formatAmount(item.rate), { textAlign: "right" })}
                  {cell(formatAmount(item.amount), { textAlign: "right" })}
                </tr>
              ))}

              <tr>
{cell("")}{cell(<strong>{L.subTotal}</strong>)}{hsnBlank}{cell("")}{cell("")}
{cell(<strong>{formatAmount(form.gstType === "GST Included" ? total : subtotal)}</strong>, { textAlign: "right" })}
              </tr>

              {/* GST — one row per component (CGST/SGST or IGST) */}
              {gstComponentRows.map((row, i) => (
                <tr key={`gst-${i}`}>
                  {cell("")}{cell(<strong>{row.label}</strong>)}{hsnBlank}{cell("")}{cell("")}
                  {cell(<strong>{formatAmount(row.amount)}</strong>, { textAlign: "right" })}
                </tr>
              ))}

              <tr>
                {cell("")}{cell(<strong>{L.total}</strong>)}{hsnBlank}{cell("")}{cell("")}
                {cell(<strong>{formatAmount(total)}</strong>, { textAlign: "right" })}
              </tr>
              <tr>
                {cell("")}{cell(L.paid)}{hsnBlank}{cell("")}{cell("")}
                {cell(formatAmount(amountPaid), { textAlign: "right" })}
              </tr>
              <tr style={{ backgroundColor: "#ecfdf5" }}>
                {cell("")}{cell(<strong>{L.due}</strong>)}{hsnBlank}{cell("")}{cell("")}
                {cell(<strong style={{ color: "#059669" }}>{formatAmount(due)}</strong>, { textAlign: "right" })}
              </tr>

              <tr>
                <td colSpan={form.dueDate ? cols - 2 : cols} style={{ border: "1px solid #000", padding: "6px 10px" }}>
                  <div style={{ fontSize: "0.58rem", color: "#64748b" }}>{L.inWords}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.65rem", color: "#0f172a" }}>{words}</div>
                </td>
                {form.dueDate && (
                  <td colSpan={2} style={{ border: "1px solid #000", padding: "6px 10px" }}>
                    <div style={{ fontSize: "0.58rem", color: "#64748b" }}>{L.dueDate}</div>
                    <div style={{ fontWeight: 700, fontSize: "0.65rem", color: "#0f172a" }}>{formatDate(form.dueDate)}</div>
                  </td>
                )}
              </tr>

              <tr>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "6px 10px", verticalAlign: "top" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.62rem", textDecoration: "underline", marginBottom: 3 }}>{L.declaration}</div>
                  <div style={{ fontSize: "0.58rem", color: "#334155", lineHeight: 1.5 }}>
                    {L.declarationText}
                  </div>
                  {form.notes && (
                    <div style={{ fontSize: "0.58rem", color: "#475569", marginTop: 4, fontStyle: "italic", whiteSpace: "pre-line" }}>
                      {L.note}: {form.notes}
                    </div>
                  )}
                </td>
                <td colSpan={cols - 3} style={{ border: "1px solid #000", padding: "6px 10px", textAlign: "right", verticalAlign: "bottom" }}>
                  <div style={{ fontSize: "0.6rem", color: "#334155" }}>{L.forCompany(form.companyName || "Your Company")}</div>                  <div style={{ margin: "6px 0", minHeight: 36, display: "flex", justifyContent: "flex-end" }}>
                    {form.signature
                      ? <img src={form.signature} alt="Signature" style={{ maxHeight: 44, maxWidth: 120, objectFit: "contain" }} />
                      : <div style={{ width: 120, height: 40 }} />
                    }
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "#475569" }}>{L.signatory}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* System generated note */}
          <div style={{
            textAlign: "center",
            marginTop: 8,
            fontSize: "0.6rem",
            color: "#64748b",
            fontStyle: "italic",
          }}>
            {previewLang === "ta"
              ? "இது கணினியால் உருவாக்கப்பட்ட விலைப்பட்டியல்."
              : "This is a system generated invoice."}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
// ── Phone input with country-code picker ─────────────────────────────────
const PHONE_GREEN = "#1F6F5C";
const PHONE_COUNTRIES = [
  { iso: "IN", name: "India", dial: "+91" },
  { iso: "US", name: "United States", dial: "+1" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966" },
  { iso: "QA", name: "Qatar", dial: "+974" },
  { iso: "KW", name: "Kuwait", dial: "+965" },
  { iso: "OM", name: "Oman", dial: "+968" },
  { iso: "BH", name: "Bahrain", dial: "+973" },
  { iso: "SG", name: "Singapore", dial: "+65" },
  { iso: "MY", name: "Malaysia", dial: "+60" },
  { iso: "LK", name: "Sri Lanka", dial: "+94" },
  { iso: "NP", name: "Nepal", dial: "+977" },
  { iso: "BD", name: "Bangladesh", dial: "+880" },
  { iso: "PK", name: "Pakistan", dial: "+92" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "NZ", name: "New Zealand", dial: "+64" },
  { iso: "DE", name: "Germany", dial: "+49" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "IT", name: "Italy", dial: "+39" },
  { iso: "ES", name: "Spain", dial: "+34" },
  { iso: "NL", name: "Netherlands", dial: "+31" },
  { iso: "CH", name: "Switzerland", dial: "+41" },
  { iso: "SE", name: "Sweden", dial: "+46" },
  { iso: "IE", name: "Ireland", dial: "+353" },
  { iso: "RU", name: "Russia", dial: "+7" },
  { iso: "CN", name: "China", dial: "+86" },
  { iso: "JP", name: "Japan", dial: "+81" },
  { iso: "KR", name: "South Korea", dial: "+82" },
  { iso: "HK", name: "Hong Kong", dial: "+852" },
  { iso: "TH", name: "Thailand", dial: "+66" },
  { iso: "ID", name: "Indonesia", dial: "+62" },
  { iso: "PH", name: "Philippines", dial: "+63" },
  { iso: "VN", name: "Vietnam", dial: "+84" },
  { iso: "ZA", name: "South Africa", dial: "+27" },
  { iso: "NG", name: "Nigeria", dial: "+234" },
  { iso: "KE", name: "Kenya", dial: "+254" },
  { iso: "EG", name: "Egypt", dial: "+20" },
  { iso: "TR", name: "Turkey", dial: "+90" },
  { iso: "BR", name: "Brazil", dial: "+55" },
  { iso: "MX", name: "Mexico", dial: "+52" },
];
const PHONE_CUSTOM_KEY = "phone_custom_codes";

function readCustomCodes() {
  try {
    const p = JSON.parse(localStorage.getItem(PHONE_CUSTOM_KEY) || "[]");
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

// "+91 9940895128" -> { country, number }. No "+" prefix => India.
function parsePhone(value, all) {
  const v = String(value || "").trim();
  if (v.startsWith("+")) {
    const m = [...all].sort((a, b) => b.dial.length - a.dial.length).find(c => v.startsWith(c.dial));
    if (m) return { country: m, number: v.slice(m.dial.length).replace(/\D/g, "") };
  }
  return { country: all[0], number: v.replace(/\D/g, "") };
}

function PhoneInput({ value, onChange, placeholder = "9876543210", inputClassName = "", inputStyle = {}, name }) {
  const [customCodes, setCustomCodes] = useState(readCustomCodes);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pickedIso, setPickedIso] = useState(null);
  const wrapRef = useRef(null);

  const all = useMemo(() => [...PHONE_COUNTRIES, ...customCodes], [customCodes]);
  const parsed = parsePhone(value, all);
  const picked = all.find(c => c.iso === pickedIso);
  // keeps US vs Canada (both +1) as the user chose
  const country = picked && picked.dial === parsed.country.dial ? picked : parsed.country;

  const closeMenu = () => { setOpen(false); setQ(""); setAdding(false); setDraft(""); };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) closeMenu(); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const emit = (dial, number) => onChange(number ? `${dial} ${number}` : dial);

  const pickCountry = (c) => { setPickedIso(c.iso); emit(c.dial, parsed.number); closeMenu(); };

  const saveCustom = () => {
    let dial = draft.trim().replace(/[^\d+]/g, "");
    if (!dial) { closeMenu(); return; }
    if (!dial.startsWith("+")) dial = "+" + dial;
    if (dial.length < 2 || dial.length > 6) return;
    const existing = all.find(c => c.dial === dial);
    if (existing) { pickCountry(existing); return; }
    const entry = { iso: `custom-${dial}`, name: "Custom code", dial, custom: true };
    const next = [...customCodes, entry];
    try { localStorage.setItem(PHONE_CUSTOM_KEY, JSON.stringify(next)); } catch { }
    setCustomCodes(next);
    pickCountry(entry);
  };

  const s = q.trim().toLowerCase();
  const list = all.filter(c => !s || c.name.toLowerCase().includes(s) || c.iso.toLowerCase().includes(s) || c.dial.includes(s));

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "flex", gap: 8, width: "100%" }}>
      <button
        type="button"
        onClick={() => (open ? closeMenu() : setOpen(true))}
        style={{
          display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          border: `1px solid ${open ? PHONE_GREEN : "#e2e8f0"}`, borderRadius: 8,
          background: "#fff", padding: "0 10px", cursor: "pointer",
          fontSize: "0.875rem", color: "#0f172a",
        }}
      >
        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8" }}>{country.custom ? "+" : country.iso}</span>
        <span>{country.dial}</span>
        <FaChevronDown size={9} color="#64748b" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      <input
        type="tel"
        name={name}
        autoComplete="tel-national"
        value={parsed.number}
        onChange={e => emit(country.dial, e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
        className={inputClassName}
        style={{ flex: 1, minWidth: 0, ...inputStyle }}
      />

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 1000,
          width: 300, maxWidth: "calc(100vw - 32px)", boxSizing: "border-box",
          background: "#fff", border: "1px solid #BFDED2", borderRadius: 14,
          boxShadow: "0 12px 32px rgba(15,23,42,0.18)", padding: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 12px" }}>
            <FaSearch size={12} color="#94a3b8" />
            <input
              autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search country or code"
              style={{ border: "none", outline: "none", width: "100%", fontSize: "0.82rem", background: "transparent" }}
            />
          </div>

          {adding ? (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input
                autoFocus value={draft} maxLength={6} placeholder="e.g. +212"
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); saveCustom(); }
                  if (e.key === "Escape") { e.preventDefault(); closeMenu(); }
                }}
                style={{ flex: 1, minWidth: 0, border: `1.5px solid ${PHONE_GREEN}`, borderRadius: 8, padding: "7px 10px", fontSize: "0.85rem", outline: "none" }}
              />
              <button type="button" onClick={saveCustom}
                style={{ border: "none", borderRadius: 8, padding: "0 14px", background: PHONE_GREEN, color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                Add
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", marginTop: 8,
                padding: "9px 12px", border: `1.5px dashed ${PHONE_GREEN}`, borderRadius: 10,
                background: "#E6F1EC", color: "#175646", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
              }}>
              <FaPlus size={10} /> Add custom code
            </button>
          )}

          <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 8 }}>
            {list.length === 0 && (
              <div style={{ padding: 14, textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>No match</div>
            )}
            {list.map(c => {
              const active = c.iso === country.iso;
              return (
                <div
                  key={c.iso}
                  onClick={() => pickCountry(c)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "9px 12px", borderRadius: 10, cursor: "pointer",
                    background: active ? "#E6F1EC" : "transparent",
                    color: active ? "#175646" : "#0f172a", fontSize: "0.85rem", fontWeight: 600,
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f1f5f9"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span>{c.name}</span>
                  <span style={{ color: active ? PHONE_GREEN : "#64748b" }}>{c.dial}{active ? " ✓" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductSelect({ products = [], value, onPick, style }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all"); // all | products | services
  const [pos, setPos] = useState({});
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const MENU_W = 340;

  const selected = products.find(p => String(p.id) === String(value));
  const closeMenu = () => { setOpen(false); setQ(""); setTab("all"); };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      closeMenu();
    };
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      closeMenu();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [open]);

  const toggle = () => {
    if (open) { closeMenu(); return; }
    const r = btnRef.current.getBoundingClientRect();
    const w = Math.min(MENU_W, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const openUp = window.innerHeight - r.bottom < 400 && r.top > 400;
    setPos(openUp ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 });
    setOpen(true);
  };

  const pick = (id) => { onPick(id); closeMenu(); };

  const list = products.filter(p => {
    const isService = p.type === "Service";
    if (tab === "products" && isService) return false;
    if (tab === "services" && !isService) return false;
    const s = q.trim().toLowerCase();
    return !s || (p.name || "").toLowerCase().includes(s);
  });

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      style={{
        border: "none", borderRadius: 999, padding: "5px 14px", fontSize: "0.78rem", fontWeight: 700,
        cursor: "pointer",
        background: tab === key ? "#1F6F5C" : "#eef1f5",
        color: tab === key ? "#fff" : "#475569",
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        style={{
          ...style,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
          cursor: "pointer", textAlign: "left",
          borderColor: open ? "#1F6F5C" : "#e2e8f0",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: selected ? "#0f172a" : "#94a3b8" }}>
          {selected ? selected.name : "Select product / service"}
        </span>
        <FaChevronDown size={8} color="#64748b" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", zIndex: 10000, width: Math.min(MENU_W, window.innerWidth - 16),
            boxSizing: "border-box", background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 14, boxShadow: "0 12px 32px rgba(15,23,42,0.18)", ...pos,
          }}
        >
          <div style={{ padding: "12px 12px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "8px 12px" }}>
              <FaSearch size={12} color="#94a3b8" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search product or service..."
                style={{ border: "none", outline: "none", width: "100%", fontSize: "0.85rem", background: "transparent" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, padding: "0 12px 10px" }}>
            {tabBtn("all", "All")}
            {tabBtn("products", "Products")}
            {tabBtn("services", "Services")}
          </div>

          <div style={{ maxHeight: 260, overflowY: "auto", borderTop: "1px solid #f1f5f9" }}>
            {list.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: "0.82rem" }}>No items found.</div>
            ) : list.map(p => {
              const isService = p.type === "Service";
              const stock = Number(p.stock_qty ?? 0);
              const rate = Number(p.sale_rate ?? 0);
              return (
                <div
                  key={p.id}
                  onClick={() => pick(p.id)}
                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#E6F1EC"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>{p.name}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a", whiteSpace: "nowrap" }}>
                      ₹{rate.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: "0.68rem", fontWeight: 700, borderRadius: 999, padding: "2px 10px",
                        background: isService ? "#f5f3ff" : "#E6F1EC",
                        color: isService ? "#7c3aed" : "#1F6F5C",
                      }}>
                        {isService ? "Service" : "Product"}
                      </span>
                      {p.unit && <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>per {p.unit}</span>}
                    </span>
                    {!isService && (
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: stock > 0 ? "#059669" : "#ef4444" }}>
                        {stock > 0 ? `In stock: ${stock}` : "Out of stock"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => pick("")}
            style={{
              width: "100%", border: "none", borderTop: "1px solid #f1f5f9", background: "#f8fafc",
              padding: "10px 14px", fontSize: "0.78rem", fontWeight: 700, color: "#475569",
              cursor: "pointer", borderRadius: "0 0 14px 14px",
            }}
          >
            ✎ Custom item (type manually, no stock)
          </button>
        </div>
      )}
    </>
  );
}

// Finds the product for a row: by productId, or by the same name (ignores capital letters)
const findProduct = (products, item) =>
  products.find(p => String(p.id) === String(item.productId)) ||
  products.find(p => (p.name || "").trim().toLowerCase() === (item.description || "").trim().toLowerCase());

function ItemDescriptionField({ products = [], item, onType, onPick, onAddNew, style, stockFor }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all"); // all | products | services
  const [pos, setPos] = useState({});
  const boxRef = useRef(null);
  const menuRef = useRef(null);
  const MENU_W = 340;

  const linked = findProduct(products, item);
  const text = item.description || "";
  // when a product is already picked, show the full list instead of only that product
  const q = linked && linked.name === text ? "" : text.trim().toLowerCase();

  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (boxRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      closeMenu();
    };
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      closeMenu();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [open]);

  const openMenu = () => {
    if (open) return;
    const r = boxRef.current.getBoundingClientRect();
    const w = Math.min(MENU_W, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const openUp = window.innerHeight - r.bottom < 360 && r.top > 360;
    setPos(openUp ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 });
    setOpen(true);
  };

  const pick = (id) => { onPick(id); closeMenu(); };

  const list = products.filter(p => {
    const isService = p.type === "Service";
    if (tab === "products" && isService) return false;
    if (tab === "services" && !isService) return false;
    return !q || (p.name || "").toLowerCase().includes(q);
  });

  const tabBtn = (key, label) => (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={() => setTab(key)}
      style={{
        border: "none", borderRadius: 999, padding: "5px 14px", fontSize: "0.78rem", fontWeight: 700,
        cursor: "pointer",
        background: tab === key ? "#1F6F5C" : "#eef1f5",
        color: tab === key ? "#fff" : "#475569",
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div ref={boxRef}>
        <textarea
          rows={2}
          value={text}
          onFocus={openMenu}
          onClick={openMenu}
          onChange={e => { onType(e.target.value); openMenu(); }}
          placeholder="Type to search product / service..."
          style={{ ...style, resize: "vertical" }}
        />
        {linked && (() => {
          const avail = stockFor ? stockFor(linked) : Infinity;
          const over = linked.type !== "Service" && Number(item.qty || 0) > avail;
          return over ? (
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#ef4444", marginTop: 2 }}>
              ⚠ Only {Math.max(avail, 0)} available
            </div>
          ) : null;
        })()}
      </div>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", zIndex: 10000, width: Math.min(MENU_W, window.innerWidth - 16),
            boxSizing: "border-box", background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 14, boxShadow: "0 12px 32px rgba(15,23,42,0.18)", ...pos,
          }}
        >
          <div style={{ display: "flex", gap: 6, padding: "10px 12px" }}>
            {tabBtn("all", "All")}
            {tabBtn("products", "Products")}
            {tabBtn("services", "Services")}
          </div>

          <div style={{ maxHeight: 260, overflowY: "auto", borderTop: "1px solid #f1f5f9" }}>
            {list.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                No match — keep typing for a custom item.
              </div>
            ) : list.map(p => {
              const isService = p.type === "Service";
              const stock = stockFor ? stockFor(p) : Number(p.stock_qty ?? 0);
              const rate = Number(p.sale_rate ?? 0);
              const out = !isService && stock <= 0;
              return (
                <div
                  key={p.id}
                  onClick={() => { if (!out) pick(p.id); }}
                  title={out ? "Out of stock" : undefined}
                  style={{
                    padding: "10px 14px", borderBottom: "1px solid #f1f5f9",
                    cursor: out ? "not-allowed" : "pointer",
                    opacity: out ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!out) e.currentTarget.style.background = "#E6F1EC"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>{p.name}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a", whiteSpace: "nowrap" }}>
                      ₹{rate.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: "0.68rem", fontWeight: 700, borderRadius: 999, padding: "2px 10px",
                        background: isService ? "#f5f3ff" : "#E6F1EC",
                        color: isService ? "#7c3aed" : "#1F6F5C",
                      }}>
                        {isService ? "Service" : "Product"}
                      </span>
                      {p.unit && <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>per {p.unit}</span>}
                    </span>
                    {!isService && (
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: stock > 0 ? "#059669" : "#ef4444" }}>
                        {stock > 0 ? `In stock: ${stock}` : "Out of stock"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => { closeMenu(); onAddNew && onAddNew(); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", border: "none", borderTop: "1px solid #f1f5f9",
              background: "#f8fafc", color: "#1F6F5C",
              padding: "10px 14px", fontSize: "0.82rem", fontWeight: 700,
              cursor: "pointer", borderRadius: "0 0 14px 14px", textAlign: "left",
            }}
          >
            <FaPlus size={10} /> New Product / Service
          </button>
        </div>
      )}
    </>
  );
}

// Row amount = qty × rate − discount (discountType: "percent" or "amount")
const calcAmount = (it) => {
  const gross = (Number(it.qty) || 0) * (Number(it.rate) || 0);
  const d = Number(it.discount) || 0;
  const off = it.discountType === "amount" ? d : (gross * Math.min(d, 100)) / 100;
  return Math.max(0, Math.round((gross - off) * 100) / 100);
};

// Optional item columns the user can add / remove with the "+" button
const OPTIONAL_COLS = [
  { key: "hsn", label: "HSN / SAC", hint: "Needed for E-Way Bill" },
  { key: "discount", label: "Discount", hint: "% or ₹ per item" },
];

// Desktop items grid: Sl | Description | Qty+Unit | Rate | [HSN] | [Discount] | Amount | +/delete
const itemGrid = (showHsn, showDiscount, customCount = 0) =>
  ["22px", "minmax(130px,1fr)", "110px", "84px", showHsn && "96px", showDiscount && "108px", ...Array(customCount).fill("96px"), "84px", "20px"]
    .filter(Boolean)
    .join(" ");

// "+" button that lists the columns not added yet
function AddColumnButton({ available, onAdd, onCustom, buttonStyle, children }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pos, setPos] = useState({});
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const saveCustom = () => {
    const name = draft.trim();
    if (!name) return;
    onCustom && onCustom(name);
    setOpen(false);
  };

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - 220, window.innerWidth - 228));
    setPos({ left, top: r.bottom + 6 });
    setAdding(false);
    setDraft("");
    setOpen(true);
  };

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle} title="Add column" style={buttonStyle}>
        {children}
      </button>
      {open && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", zIndex: 10000, width: 220, boxSizing: "border-box",
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
            boxShadow: "0 12px 32px rgba(15,23,42,0.18)", padding: 6, ...pos,
          }}
        >
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", padding: "6px 10px 4px" }}>
            ADD COLUMN
          </div>
          {available.map((c) => (
            <div
              key={c.key}
              onClick={() => { onAdd(c.key); setOpen(false); }}
              style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#E6F1EC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>{c.label}</div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{c.hint}</div>
            </div>
          ))}

          {adding ? (
            <div style={{ display: "flex", gap: 6, padding: "8px 6px 4px" }}>
              <input
                autoFocus
                value={draft}
                maxLength={20}
                placeholder="e.g. Batch No"
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); saveCustom(); }
                  if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
                }}
                style={{ flex: 1, minWidth: 0, border: "1.5px solid #1F6F5C", borderRadius: 8, padding: "6px 8px", fontSize: "0.8rem", outline: "none" }}
              />
              <button
                type="button"
                onClick={saveCustom}
                style={{ border: "none", borderRadius: 8, padding: "0 12px", background: "#1F6F5C", color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
              >
                Add
              </button>
            </div>
          ) : (
            <div
              onClick={() => setAdding(true)}
              style={{
                margin: "6px 4px 2px", padding: "8px 10px", border: "1.5px dashed #1F6F5C", borderRadius: 8,
                background: "#E6F1EC", color: "#175646", fontWeight: 700, fontSize: "0.8rem",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <FaPlus size={9} /> Custom column
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function InvoiceForm({ invoice, invoices = [], customers = [], onSave, onBack, companyInfo, onCompanyChange, docSettings, invoiceType = "Final" }) {
  const isEdit = !!invoice;
  const isMobile = useIsMobile(900);
  const GST_PRESETS = [1, 3, 5, 12, 18, 28];
  const [customGst, setCustomGst] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);
  // Optional item columns the user switched on with the "+" button
  const [itemCols, setItemCols] = useState({ hsn: false, discount: false });

  // In-app error message (replaces the browser alert popup)
  const [formAlert, setFormAlert] = useState(null);
  const showAlert = (message) => {
    setFormAlert(message);
    setTimeout(() => setFormAlert(null), 4000);
  };

  const [companies, setCompanies] = useState([]);
  useEffect(() => {
    axiosInstance.get("/settings/companies")
      .then(res => setCompanies(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Failed to load companies:", err));
  }, []);

  const [products, setProducts] = useState([]);
useEffect(() => {
  fetch(`${import.meta.env.VITE_API_URL}/products`)
    .then(r => r.json())
    .then(d => setProducts(Array.isArray(d) ? d : []))
    .catch(err => console.error("Failed to load products:", err));
}, []);

  // Quick-create product popup: holds the row index that asked for it
  const [quickAddRow, setQuickAddRow] = useState(null);

  const handleQuickSave = async (product) => {
    const payload = { ...product, id: product.id || `PRD-${Date.now()}` };
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Save failed with status ${res.status}`);
      const saved = await res.json();
      setProducts(prev =>
        prev.some(p => p.id === saved.id)
          ? prev.map(p => (p.id === saved.id ? saved : p))
          : [saved, ...prev]
      );
      if (quickAddRow !== null) pickProduct(quickAddRow, saved.id, saved);
      setQuickAddRow(null);
    } catch (err) {
      console.error("Quick add product failed:", err);
      showAlert("Failed to save product: " + err.message);
    }
  };

  const [showPreview, setShowPreview] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth > 900 : true
  );


  // Proforma invoices keep the "PI-" series regardless of Settings, since
  // that's a distinct document type. Final invoices use the prefix saved
  // in Settings ➜ Invoice & Quotation (falls back to "INV-" if not set yet).
  const docType = invoice?.invoiceType || invoiceType;
  const savedInvoicePrefix = docSettings?.invoicePrefix || "INV-";
  const savedProformaPrefix = docSettings?.proformaPrefix || "PI-";
  const prefix = docType === "Proforma" ? savedProformaPrefix : savedInvoicePrefix;

  // Count only records of the SAME type (using the isProformaRecord /
  // isFinalRecord fallback above), and take the highest existing number
  // + 1 — never a plain .length count, which drifts the moment a record
  // is deleted or a type-fallback miscounts a legacy row.
  const sameTypeNumbers = invoices
    .filter(docType === "Proforma" ? isProformaRecord : isFinalRecord)
    .map(i => parseInt((i.invoiceNo || "").match(/(\d+)$/)?.[1] || "0", 10));
  const nextInvoiceNum = (sameTypeNumbers.length ? Math.max(...sameTypeNumbers) : 0) + 1;
  const nextInvoiceNo = `${prefix}${String(nextInvoiceNum).padStart(3, "0")}`;
  const [form, setForm] = useState(invoice || {
    invoiceNo: nextInvoiceNo,
    invoiceType: docType,
    date: new Date().toISOString().split("T")[0],
    dueDate: "",
    status: docType === "Proforma" ? "Draft" : "Unpaid",
    gstType: "No GST",
    gstPercent: docSettings?.gstPercent ?? 18,
    // Prefilled from Settings ➜ Company at creation time only.
    // Once saved, these live on the invoice record itself (snapshot) and
    // will never be overwritten by later Settings changes.
    companyName: companyInfo?.companyName || "",
    companyAddress: companyInfo?.companyAddress || "",
    companyMobile: companyInfo?.companyPhone || "",
    companyEmail: companyInfo?.companyEmail || "",
    companyGSTIN: companyInfo?.gstin || "",
    logo: companyInfo?.logo || null,
    logoShape: "original",
    // Default signature
    //  — still fully replaceable via "Change Signature"
    // below, this just avoids showing an empty "No signature uploaded" box.
    signature: "/signature.png",
    buyerSalutation: "",
    buyerName: "",
    buyerCompanyName: "",
    buyerAddress: "",
    buyerMobile: "",
    buyerGSTIN: "",
    amountPaid: 0,
    notes: docSettings?.defaultNotes || "",
    items: [{ sl: 1, description: "", qty: 1, unit: "Nos", rate: "", amount: 0 }],
  });
  // ✅ Keep the form in sync with whatever invoice was passed in.
  // Without this, if InvoiceForm's instance is reused (not remounted) between
  // "Edit" clicks, useState's initial value is only applied once and the form
  // can end up showing stale or blank data instead of the saved invoice.
  useEffect(() => {
    if (invoice) {
      setForm(invoice);
    }
  }, [invoice]);

  // companyInfo loads asynchronously from Settings. If this form mounted
  // (creating a NEW invoice) before that fetch finished, the initial state
  // above locked in a blank logo/company fields. Backfill them once
  // companyInfo arrives — but only for brand-new invoices, and only fields
  // the user hasn't already typed into, so we never overwrite an edit or
  // touch an existing saved invoice.
  useEffect(() => {
    if (invoice) return; // editing an existing invoice — never touch its snapshot
    setForm(prev => ({
      ...prev,
      logo: prev.logo || companyInfo?.logo || null,
      companyName: prev.companyName || companyInfo?.companyName || "",
      companyAddress: prev.companyAddress || companyInfo?.companyAddress || "",
      companyMobile: prev.companyMobile || companyInfo?.companyPhone || "",
      companyEmail: prev.companyEmail || companyInfo?.companyEmail || "",
      companyGSTIN: prev.companyGSTIN || companyInfo?.gstin || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyInfo]);
  // NEW — add this block after the one above
  useEffect(() => {
    if (invoice) return; // editing an existing invoice — never touch its snapshot
    setForm(prev => ({
      ...prev,
      notes: prev.notes || docSettings?.defaultNotes || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docSettings]);

  const NAME_FIELDS = ["buyerName", "buyerCompanyName"];
  const updateField = (field, value) => {
    if (NAME_FIELDS.includes(field) && typeof value === "string") value = capitalizeWords(value);
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Switch between Final/Proforma — swaps the invoice number's prefix
  // (INV-003 ↔ PI-003) live, keeping the numeric part unchanged, and resets
  // status to a sensible default for the new type (Draft for Proforma,
  // Unpaid for Final) since the two types use different status sets.
  // Each type (Final / Proforma) has its OWN numbering series. Switching the
  // dropdown must compute a fresh number for the newly-selected type — never
  // reuse the previous type's number, or the two series bleed into each other
  // (e.g. INV-001 flipped to Proforma becomes PI-001, "spending" 001 from the
  // Final series and permanently offsetting both from then on).
  const handleInvoiceTypeChange = (newType) => {
    const prefix = newType === "Proforma"
      ? (docSettings?.proformaPrefix || "PI-")
      : (docSettings?.invoicePrefix || "INV-");
    const existingNumbers = invoices
      .filter(newType === "Proforma" ? isProformaRecord : isFinalRecord)
      .map(i => parseInt((i.invoiceNo || "").match(/(\d+)$/)?.[1] || "0", 10));
    const nextNum = (existingNumbers.length ? Math.max(...existingNumbers) : 0) + 1;

    setForm(prev => ({
      ...prev,
      invoiceType: newType,
      invoiceNo: `${prefix}${String(nextNum).padStart(3, "0")}`,
      status: newType === "Proforma" ? "Draft" : "Unpaid",
    }));
  };
  // companyInfo is shared/global data (also used on the printed document),
  // so edits here mutate it directly — same pattern as the logo upload —
  // and we bump a dummy field to force this component to re-render.
  const updateCompanyField = (field, value) => {
    onCompanyChange({ ...companyInfo, [field]: value });
  };

  const pickCustomer = (c) => {
    setForm(prev => ({
      ...prev,
      buyerName: c.name || "",
      buyerCompanyName: c.company || "",
      buyerMobile: c.phone || "",
      buyerAddress: [c.address, c.city].filter(Boolean).join(", "),
      buyerGSTIN: c.gst_number || c.gstNumber || c.gstin || "",
    }));
    setShowCustomerList(false);
  };

    const pickCompany = (c) => {
    setForm(prev => ({
      ...prev,
      companyName: c.companyName || "",
      companyAddress: c.companyAddress || "",
      companyMobile: c.companyPhone || "",
      companyEmail: c.companyEmail || "",
      companyGSTIN: c.gstin || "",
      logo: c.logo || null,
    }));
  };

  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    if (field === "description") items[i].descriptionTa = undefined;
    if (["qty", "rate", "discount", "discountType"].includes(field)) {
      items[i].amount = calcAmount(items[i]);
    }
    setForm(prev => ({ ...prev, items }));
  };
  const pickProduct = (i, productId, productObj) => {
  const items = [...form.items];
  if (!productId) {
    items[i] = { ...items[i], productId: undefined, itemType: undefined };   // custom item
  } else {
    const p = productObj || products.find(x => String(x.id) === String(productId));
    if (!p) return;
    const rate = Number(p.sale_rate ?? 0);
    items[i] = {
      ...items[i],
      productId: p.id,
      itemType: p.type === "Service" ? "Service" : "Product",
      hsnCode: p.hsn_code || p.hsnCode || "",
      description: p.name,
      descriptionTa: undefined,
      unit: p.unit || items[i].unit || "Nos",
      rate,
      amount: calcAmount({ ...items[i], qty: items[i].qty || 1, rate }),
    };
  }
  setForm(prev => ({ ...prev, items }));
};
  // Typing by hand: keeps the product link only while the text still equals the product name
  const typeDescription = (i, value) => {
    const items = [...form.items];
    const linked = products.find(x => String(x.id) === String(items[i].productId));
    items[i] = {
      ...items[i],
      description: value,
      descriptionTa: undefined,
      productId: linked && linked.name === value ? items[i].productId : undefined,
      itemType: linked && linked.name === value ? items[i].itemType : undefined,
    };
    setForm(prev => ({ ...prev, items }));
  };

    // Stock still free for a product, as seen by the row at index rowIdx
  const availableStock = (productId, rowIdx) => {
    const p = products.find(x => String(x.id) === String(productId));
    if (!p || p.type === "Service") return Infinity;
    const base = Number(p.stock_qty ?? 0);
    // editing a saved Final invoice: its old qty was already deducted, so give it back
    const wasDeducted = invoice?.id && !isProformaRecord(invoice);
    const alreadyDeducted = wasDeducted
      ? (invoice.items || [])
          .filter(it => String(it.productId) === String(productId))
          .reduce((s, it) => s + (Number(it.qty) || 0), 0)
      : 0;
    // qty used by the OTHER rows of this same invoice
    const usedElsewhere = form.items.reduce(
      (s, it, idx) =>
        idx !== rowIdx && String(findProduct(products, it)?.id) === String(productId)
          ? s + (Number(it.qty) || 0)
          : s,
      0
    );
    return base + alreadyDeducted - usedElsewhere;
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { sl: prev.items.length + 1, description: "", qty: 1, unit: "Nos", rate: "", amount: 0 }],
    }));
  };

  const removeItem = (i) => {
    const items = form.items.filter((_, idx) => idx !== i).map((item, idx) => ({ ...item, sl: idx + 1 }));
    setForm(prev => ({ ...prev, items }));
  };

  // A column is visible if the user added it, or if any item already has data for it
  // (e.g. a product with an HSN code, or an invoice being edited).
  const showHsn = itemCols.hsn || form.items.some(it => String(it.hsnCode || "").trim());
  const showDiscount = itemCols.discount || form.items.some(it => Number(it.discount) > 0);
  const availableCols = OPTIONAL_COLS.filter(c => (c.key === "hsn" ? !showHsn : !showDiscount));

  const addColumn = (key) => setItemCols(prev => ({ ...prev, [key]: true }));

  // Custom columns the user created with "+ Custom column" (saved on the invoice)
  const customCols = form.customColumns || [];

  const addCustomColumn = (label) => {
    if (customCols.some(c => c.label.toLowerCase() === label.toLowerCase())) {
      showAlert(`"${label}" column is already added.`);
      return;
    }
    setForm(prev => ({
      ...prev,
      customColumns: [...(prev.customColumns || []), { key: `cc_${Date.now().toString(36)}`, label }],
    }));
  };

  const removeCustomColumn = (key) => {
    setForm(prev => ({
      ...prev,
      customColumns: (prev.customColumns || []).filter(c => c.key !== key),
      items: prev.items.map(it => {
        const { [key]: _removed, ...rest } = it.custom || {};
        return { ...it, custom: rest };
      }),
    }));
  };

  const updateCustom = (i, key, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], custom: { ...(items[i].custom || {}), [key]: value } };
    setForm(prev => ({ ...prev, items }));
  };

  // Removing a column also clears its values so hidden data can't affect the invoice
  const removeColumn = (key) => {
    setItemCols(prev => ({ ...prev, [key]: false }));
    setForm(prev => ({
      ...prev,
      items: prev.items.map(it => {
        if (key === "hsn") return { ...it, hsnCode: "" };
        const cleared = { ...it, discount: 0 };
        return { ...cleared, amount: calcAmount(cleared) };
      }),
    }));
  };

  const rawSum = form.items.reduce((a, b) => a + Number(b.amount), 0);
  const gstPercent = Number(form.gstPercent || 18);
  let subtotal, tax, total;
  if (form.gstType === "With GST") {
    subtotal = rawSum;
    tax = Math.round(subtotal * (gstPercent / 100));
    total = subtotal + tax;
  } else if (form.gstType === "GST Included") {
    total = rawSum;
    tax = Math.round(rawSum - (rawSum / (1 + gstPercent / 100)));
    subtotal = total - tax;
  } else {
    subtotal = rawSum;
    tax = 0;
    total = subtotal;
  }
const due = total - Number(form.amountPaid || 0);

// GST split (CGST+SGST for intra-state, IGST for inter-state) for the Totals block
const formGst = splitGst(tax, gstPercent, form.companyGSTIN, form.buyerGSTIN);
const formGstRows = form.gstType !== "No GST" ? gstRows(formGst, gstPercent, form.gstType, INVOICE_LABELS[form.invoiceLang === "ta" ? "ta" : "en"]) : [];

// Keep Amount Paid in sync with the chosen status (same rule as InvoicesPage)
const handleStatusSelect = (newStatus) => {
  setForm(prev => ({
    ...prev,
    status: newStatus,
    amountPaid:
      newStatus === "Paid" ? total :
      (newStatus === "Unpaid" || newStatus === "Overdue") ? 0 :
      prev.amountPaid, // Draft / Sent / Converted: leave as is
  }));
};

const handleSave = async () => {
    if (!form.buyerName || !form.invoiceNo) {
      showAlert("Please fill Invoice No and Buyer Name.");
      return;
    }
    if (form.invoiceType !== "Proforma") {
      const badIdx = form.items.findIndex((it, i) => {
        const p = findProduct(products, it);
        return p && Number(it.qty || 0) > availableStock(p.id, i);
      });
      if (badIdx !== -1) {
        const it = form.items[badIdx];
        const avail = Math.max(availableStock(findProduct(products, it).id, badIdx), 0);
        showAlert(`Not enough stock for "${it.description}". Only ${avail} available for item #${it.sl}.`);
        return;
      }
    }
    const rawSum = form.items.reduce((a, b) => a + Number(b.amount), 0);
    const gstPercent = Number(form.gstPercent || 18);
    let subtotal, tax, total;
    if (form.gstType === "With GST") {
      subtotal = rawSum;
      tax = Math.round(subtotal * (gstPercent / 100));
      total = subtotal + tax;
    } else if (form.gstType === "GST Included") {
      total = rawSum;
      tax = Math.round(rawSum - (rawSum / (1 + gstPercent / 100)));
      subtotal = total - tax;
    } else {
      subtotal = rawSum;
      tax = 0;
      total = subtotal;
    }
    const amountDue = total - Number(form.amountPaid || 0);


    // Store the Tamil text with each item so the invoice stays Tamil on any device
    let items = form.items;
    if (form.invoiceLang === "ta") {
      items = await Promise.all(
        form.items.map(async (it) => {
          const text = (it.description || "").trim();
          if (!text) return it;
          if (/[\u0B80-\u0BFF]/.test(text)) return { ...it, descriptionTa: text }; // already Tamil
          try {
            return { ...it, descriptionTa: await translateToTamil(text) };
          } catch {
            return it;
          }
        })
      );
    }

    onSave({
      ...form,
      items,
      invoiceLang: form.invoiceLang === "ta" ? "ta" : "en",
      id: invoice?.id || `INV-${Date.now()}`,
      logo: form.logo,
      total,
      amountDue,
    });
  };
  return (
    <>
      <style>{spinnerCSS}</style>

      {formAlert && (
        <div
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 3000,
            maxWidth: "min(380px, calc(100vw - 40px))",
            backgroundColor: "#fef2f2", color: "#b91c1c",
            border: "1px solid #fecaca", borderLeft: "4px solid #ef4444",
            padding: "12px 14px", borderRadius: 10,
            fontSize: "0.85rem", fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}
        >
          <span style={{ flex: 1 }}>⚠ {formAlert}</span>
          <button
            onClick={() => setFormAlert(null)}
            className="border-0 bg-transparent p-0"
            style={{ color: "#b91c1c", cursor: "pointer", fontSize: "0.9rem" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}

      <div style={isMobile ? styles.splitContainerMobile : styles.splitContainer}>
        {/* ══ LEFT: Form ══ */}
        <div style={
          showPreview && !isMobile
            ? { ...styles.formSide, flex: "0 0 700px", maxWidth: "700px" }
            : { ...styles.formSide, maxWidth: "100%" }
        }>

          <div className="d-flex justify-content-between align-items-center mb-2 no-print"
            style={{
              flexWrap: "nowrap", gap: 6,
              backgroundColor: "#fff", padding: "4px 0",
            }}>
            <button onClick={onBack}
              className="d-flex align-items-center gap-1 border-0 rounded-2 fw-semibold px-2 py-1"
              style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.74rem" }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#e2e8f0"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#f1f5f9"}
            >
              <FaArrowLeft size={12} /> Back
            </button>
            {!isMobile && (
              <div className="d-flex align-items-center gap-2">
                <h5 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "0.95rem" }}>
                  {isEdit ? "Edit" : "New"}
                </h5>
                <select
                  value={form.invoiceType || "Final"}
                  onChange={e => handleInvoiceTypeChange(e.target.value)}
                  style={{
                    border: "none", outline: "none", cursor: "pointer",
                    fontWeight: 700, fontSize: "0.8rem",
                    color: form.invoiceType === "Proforma" ? "#7c3aed" : "#0f172a",
                    backgroundColor: form.invoiceType === "Proforma" ? "#f5f3ff" : "#E6F1EC",
                    borderRadius: 6, padding: "3px 6px",
                  }}
                >
                  <option value="Final">Invoice</option>
                  <option value="Proforma">Proforma Invoice</option>
                </select>
              </div>
            )}
            <div className="d-flex gap-2 align-items-center" style={{ flexWrap: "nowrap" }}>
              <InvoiceLangToggle
                lang={form.invoiceLang === "ta" ? "ta" : "en"}
                onChange={(l) => updateField("invoiceLang", l)}
              />
              <button
                title={showPreview ? "Hide Preview" : "Show Preview"}
                onClick={() => setShowPreview(v => !v)}
                className="d-flex align-items-center gap-1 border-0 rounded-2 fw-semibold px-2 py-1"
                style={{ backgroundColor: showPreview ? "#ecfdf5" : "#f1f5f9", color: showPreview ? "#059669" : "#475569", cursor: "pointer", fontSize: "0.74rem", border: showPreview ? "1px solid #a7f3d0" : "1px solid transparent" }}
              >
                {showPreview ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
              </button>
              <button onClick={handleSave}
                className="d-flex align-items-center gap-1 border-0 rounded-2 fw-semibold px-3 py-1"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", cursor: "pointer", fontSize: "0.74rem", boxShadow: "0 2px 8px rgba(5,150,105,0.3)" }}
              >
                <FaSave size={12} /> {isEdit ? "Update Invoice" : "Generate Invoice"}
              </button>
            </div>
          </div>

          {isMobile && (
            <div className="d-flex align-items-center gap-2 mb-3">
              <h5 className="fw-bold mb-0" style={{ color: "#0f172a" }}>{isEdit ? "Edit" : "New"}</h5>
              <select
                value={form.invoiceType || "Final"}
                onChange={e => handleInvoiceTypeChange(e.target.value)}
                style={{
                  border: "none", outline: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: "0.95rem",
                  color: form.invoiceType === "Proforma" ? "#7c3aed" : "#0f172a",
                  backgroundColor: form.invoiceType === "Proforma" ? "#f5f3ff" : "#E6F1EC",
                  borderRadius: 8, padding: "4px 10px",
                }}
              >
                <option value="Final">Invoice</option>
                <option value="Proforma">Proforma Invoice</option>
              </select>
            </div>
          )}

      

          <div className="card border-0 shadow-sm" style={{ borderRadius: "16px" }}>
            <div className="p-3">

              {/* Invoice Meta */}
              <div className="row g-2 mb-3 p-3 rounded-3" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div
                  className="col-12 d-flex justify-content-between align-items-center"
                  style={{ flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 12 : 0 }}
                >
                  <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.9rem" }}>Invoice Details</div>

                  <div className="d-flex align-items-center gap-3">
                    {form.logo
                      ? <img src={form.logo} alt="Logo" style={logoStyle(form.logoShape, 48)} />
                      : <div style={{ width: 48, height: 48, backgroundColor: "#059669", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.65rem" }}>OMS</span>
                      </div>
                    }
                    <div>
                      <label htmlFor="logo-upload"
                        style={{ fontSize: "0.78rem", fontWeight: 600, color: "#059669", cursor: "pointer", border: "1.5px solid #059669", borderRadius: "8px", padding: "4px 12px" }}>
                        {form.logo ? "Change Logo" : "Upload Logo"}
                      </label>
                      <input
                        id="logo-upload" type="file" accept="image/*" style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              updateField("logo", reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {form.logo && (
                        <button
                          onClick={() => updateField("logo", null)}
                          className="border-0 bg-transparent ms-2"
                          style={{ fontSize: "0.75rem", color: "#ef4444", cursor: "pointer" }}>
                          Remove
                        </button>
                      )}
                      <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 2 }}>PNG, JPG up to 2MB</div>
                      {form.logo && (
                        <select value={form.logoShape || "original"} onChange={(e) => updateField("logoShape", e.target.value)}
                          style={{ marginTop: 6, fontSize: "0.75rem", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>
                          <option value="original">Original</option>
                          <option value="square">Square</option>
                          <option value="circle">Circle</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editable company (seller) details — shown on both the preview and the printed invoice */}
                <div className="col-12 col-md-5">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Company Name</label>
                  <CompanySelectField
                    value={form.companyName}
                    companies={companies}
                    onSelect={pickCompany}
                    placeholder="Select Company"
                    style={inp}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Company GSTIN</label>
                  <input
                    value={form.companyGSTIN || ""}
                    maxLength={15}
                    onChange={e => updateField("companyGSTIN", e.target.value.toUpperCase())}
                    style={{ ...inp, textTransform: "uppercase" }}
                    placeholder="Enter GSTIN"
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Company Mobile</label>
                  <input
                    value={form.companyMobile || ""}
                    onChange={e => updateField("companyMobile", e.target.value)}
                    style={inp}
                    placeholder="Enter Mobile"
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Company Email</label>
                  <input
                    value={form.companyEmail || ""}
                    onChange={e => updateField("companyEmail", e.target.value)}
                    style={inp}
                    placeholder="Enter Email"
                  />
                </div>
                <div className="col-12">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Company Address</label>
                  <textarea
                    rows={2}
                    value={form.companyAddress || ""}
                    onChange={e => updateField("companyAddress", e.target.value)}
                    style={{ ...inp, resize: "vertical" }}
                    placeholder="Enter Company Address"
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Invoice No *</label>
                  <input value={form.invoiceNo} onChange={e => updateField("invoiceNo", e.target.value)} style={inp} placeholder="INV-001" />              </div>
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Invoice Date *</label>
                  <input type="date" value={form.date} onChange={e => updateField("date", e.target.value)} style={inp} />
                </div>
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => updateField("dueDate", e.target.value)} style={inp} />
                </div>
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Status</label>
                  <select value={form.status} onChange={e => handleStatusSelect(e.target.value)} style={inp}>
                    {form.invoiceType === "Proforma" ? (
                      <>
                        <option>Draft</option>
                        <option>Sent</option>
                        <option>Converted</option>
                      </>
                    ) : (
                      <>
                        <option>Unpaid</option>
                        <option>Paid</option>
                        <option>Overdue</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>GST Type</label>
                  <select value={form.gstType} onChange={e => updateField("gstType", e.target.value)} style={inp}>
                    <option>With GST</option>
                    <option>GST Included</option>
                    <option>No GST</option>
                  </select>
                </div>
                {form.gstType !== "No GST" && (
                  <div className="col-12 col-md-4">
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>GST %</label>

                    {customGst || !GST_PRESETS.includes(Number(form.gstPercent)) ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <div style={{ position: "relative", flex: 1 }}>
                          <input
                            autoFocus
                            type="number"
                            className="no-spinner"
                            min="0"
                            max="100"
                            step="0.01"
                            value={form.gstPercent}
                            onChange={e => { setCustomGst(true); updateField("gstPercent", e.target.value); }}
                            placeholder="e.g. 2.5"
                            style={{ ...inp, paddingRight: 28 }}
                          />
                          <span style={{
                            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                            color: "#64748b", fontSize: "0.875rem", pointerEvents: "none",
                          }}>%</span>
                        </div>
                        <button
                          type="button"
                          title="Back to list"
                          onClick={() => { setCustomGst(false); updateField("gstPercent", 18); }}
                          style={{
                            border: "1px solid #e2e8f0", background: "#fff", color: "#64748b",
                            borderRadius: 8, width: 38, height: 38, cursor: "pointer", flexShrink: 0,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <select
                        value={form.gstPercent}
                        onChange={e => {
                          if (e.target.value === "custom") {
                            setCustomGst(true);
                            updateField("gstPercent", "");
                          } else {
                            updateField("gstPercent", Number(e.target.value));
                          }
                        }}
                        style={inp}
                      >
                        <option value={1}>1%</option>
                        <option value={3}>3%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                        <option value="custom">Custom</option>
                      </select>
                    )}
                  </div>
                )}
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Amount Paid (₹)</label>
                  <input type="number" className="no-spinner" value={form.amountPaid} onChange={e => updateField("amountPaid", e.target.value)} style={inp} placeholder="0" />
                </div>
              </div>

              {/* Buyer Details */}
              <div className="row g-2 mb-3 p-3 rounded-3" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="col-12">
                  <div className="fw-bold mb-1" style={{ color: "#0f172a", fontSize: "0.9rem" }}>Buyer Details (Bill To)</div>
                </div>
                <div className="col-12 col-md-6">
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Buyer Name *</label>
<div style={{ display: "flex", gap: 8 }}>
  <select
    value={form.buyerSalutation || ""}
    onChange={e => updateField("buyerSalutation", e.target.value)}
    style={{ ...inp, width: 90, flexShrink: 0, cursor: "pointer" }}
  >
    <option value="">Title</option>
    <option value="Mr.">Mr.</option>
    <option value="Mrs.">Mrs.</option>
    <option value="Ms.">Ms.</option>
    <option value="Miss">Miss</option>
    <option value="Dr.">Dr.</option>
  </select>
<div style={{ position: "relative", flex: 1, minWidth: 0 }}>
  <input
    name="buyerName"
                      autoComplete="off"
                      value={form.buyerName || ""}
                      onFocus={() => setShowCustomerList(true)}
                      onClick={() => setShowCustomerList(true)}
                      onBlur={() => setShowCustomerList(false)}
                      onChange={e => { updateField("buyerName", e.target.value); setShowCustomerList(true); }}
                      style={{ ...inp, paddingRight: 34 }}
                      placeholder="Select or type customer name"
                    />

                    {form.buyerName && (
                      <button
                        type="button"
                        title="Clear customer"
                        onMouseDown={e => {
                          e.preventDefault();
                          setForm(prev => ({
                            ...prev,
                            buyerName: "",
                            buyerCompanyName: "",
                            buyerMobile: "",
                            buyerAddress: "",
                            buyerGSTIN: "",
                          }));
                          setShowCustomerList(true);
                        }}
                        style={{
                          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                          border: "none", background: "transparent", color: "#94a3b8",
                          cursor: "pointer", fontSize: "0.9rem", padding: 4,
                        }}
                      >
                        ✕
                      </button>
                    )}

                    {showCustomerList && (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                        marginTop: 4, background: "#fff", border: "1px solid #e2e8f0",
                        borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,0.15)",
                        maxHeight: 220, overflowY: "auto",
                      }}>
                        {customers
                          .filter(c => {
                            const q = (form.buyerName || "").toLowerCase();
                            return !q || (c.name || "").toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q);
                          })
                          .map(c => (
                            <div
                              key={c.id}
                              onMouseDown={e => { e.preventDefault(); pickCustomer(c); }}
                              style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#E6F1EC"}
                              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                            >
                              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a" }}>{c.name}</div>
                              {c.company && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{c.company}</div>}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Company Name</label>
                  <input name="buyerCompanyName" autoComplete="organization" value={form.buyerCompanyName || ""} onChange={e => updateField("buyerCompanyName", e.target.value)} style={inp} placeholder="Client Company Name" />              </div>
                <div className="col-12 col-md-6">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Mobile Number</label>
                  <PhoneInput
  name="buyerMobile"
  value={form.buyerMobile}
  onChange={val => updateField("buyerMobile", val)}
  inputStyle={inp}
  placeholder="9876543210"
/>              </div>
                <div className="col-12 col-md-8">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Address</label>
                  <textarea name="buyerAddress" autoComplete="street-address" rows={2} value={form.buyerAddress} onChange={e => updateField("buyerAddress", e.target.value)} style={{ ...inp, resize: "vertical" }} placeholder="Full address..." />              </div>
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>GSTIN (optional)</label>
                  <input name="buyerGSTIN" autoComplete="off" maxLength={15} value={form.buyerGSTIN} onChange={e => updateField("buyerGSTIN", e.target.value.toUpperCase())} style={{ ...inp, textTransform: "uppercase" }} placeholder="33AABCA1234B1ZX" />              </div>
              </div>

              {/* Items Table */}
              <div className="mb-3">
                <div className="fw-bold mb-2" style={{ color: "#0f172a", fontSize: "0.9rem" }}>Services / Items</div>

                {isMobile ? (
                  // ── Stacked card layout for items on mobile ──────────────
                  <div className="d-flex flex-column gap-2">
                    {form.items.map((item, i) => (
                      <div key={i} className="rounded-3 p-3" style={{ border: "1px solid #e2e8f0", backgroundColor: "#fff" }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8" }}>Item #{item.sl}</span>
                          {form.items.length > 1 && (
                            <button onClick={() => removeItem(i)} className="border-0 bg-transparent p-0" style={{ color: "#ef4444", cursor: "pointer" }}>
                              <FaTrash size={12} />
                            </button>
                   )}
    </div>
    <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Description</label>
    <div style={{ marginBottom: 8 }}>
      <ItemDescriptionField
        products={products}
        item={item}
        onType={v => typeDescription(i, v)}
stockFor={p => availableStock(p.id, i)}
        onPick={v => pickProduct(i, v)}
        onAddNew={() => setQuickAddRow(i)}
        style={{ ...inp, fontSize: "0.82rem" }}
      />
      {showHsn && (
        <div className="d-flex align-items-center gap-1" style={{ marginTop: 4 }}>
          <input
            value={item.hsnCode ?? ""}
            onChange={e => updateItem(i, "hsnCode", e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="HSN / SAC code"
            style={{ ...inp, fontSize: "0.72rem", padding: "4px 8px" }}
          />
          <button type="button" title="Remove HSN / SAC column" onClick={() => removeColumn("hsn")}
            style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", padding: "0 4px" }}>
            ✕
          </button>
        </div>
      )}
    </div>
                        <div className="row g-2">
                          <div className="col-6">
                            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Qty</label>
                            <input type="number" className="no-spinner" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} placeholder="1" style={{ ...inp, fontSize: "0.82rem" }} />
                          </div>
                          <div className="col-6">
                            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Unit</label>
                            <UnitSelectField
                              value={item.unit ?? ""}
                              onChange={val => updateItem(i, "unit", val)}
                              style={{ ...inp, fontSize: "0.82rem" }}
                            />
                          </div>
                          <div className="col-6">
                            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Rate</label>
                            <input type="number" className="no-spinner" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} placeholder="0" style={{ ...inp, fontSize: "0.82rem" }} />
                          </div>
                          {showDiscount && (
                            <div className="col-6">
                              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                                Discount{" "}
                                <button type="button" title="Remove Discount column" onClick={() => removeColumn("discount")}
                                  style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", padding: 0 }}>
                                  ✕
                                </button>
                              </label>
                              <div className="d-flex gap-1">
                                <input
                                  type="number" className="no-spinner" min="0"
                                  value={item.discount ?? ""}
                                  onChange={e => updateItem(i, "discount", e.target.value)}
                                  placeholder="0"
                                  style={{ ...inp, fontSize: "0.82rem", minWidth: 0 }}
                                />
                                <select
                                  value={item.discountType || "percent"}
                                  onChange={e => updateItem(i, "discountType", e.target.value)}
                                  style={{ ...inp, fontSize: "0.82rem", padding: "8px 2px", width: 52, flexShrink: 0, cursor: "pointer" }}
                                >
                                  <option value="percent">%</option>
                                  <option value="amount">₹</option>
                                </select>
                              </div>
                            </div>
                          )}
                          {customCols.map(c => (
                            <div className="col-6" key={c.key}>
                              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                                {c.label}{" "}
                                <button type="button" title={`Remove ${c.label} column`} onClick={() => removeCustomColumn(c.key)}
                                  style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", padding: 0 }}>
                                  ✕
                                </button>
                              </label>
                              <input
                                value={item.custom?.[c.key] ?? ""}
                                onChange={e => updateCustom(i, c.key, e.target.value)}
                                placeholder={c.label}
                                style={{ ...inp, fontSize: "0.82rem", minWidth: 0 }}
                              />
                            </div>
                          ))}
                          <div className="col-6">
                            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Amount</label>
                            <div className="fw-semibold" style={{ fontSize: "0.85rem", color: "#0f172a", padding: "8px 0" }}>
                              ₹{Number(item.amount).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // ── Table layout for items on desktop ────────────────────
                  <div className="rounded-3 overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                    <div className="px-3 py-2" style={{ display: "grid", gridTemplateColumns: itemGrid(showHsn, showDiscount, customCols.length), gap: 6, backgroundColor: "#0f172a", alignItems: "center" }}>
                      {[
                        { label: "Sl." },
                        { label: "Description of Services" },
                        { label: "Qty" },
                        { label: "Rate (₹)" },
                        showHsn && { label: "HSN / SAC", remove: "hsn" },
                        showDiscount && { label: "Discount", remove: "discount" },
                        ...customCols.map(c => ({ label: c.label, removeCustom: c.key })),
                        { label: "Amount (₹)" },
                      ].filter(Boolean).map((h) => (
                        <div key={h.label} style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 4 }}>
                          {h.label}
                          {(h.remove || h.removeCustom) && (
                            <button
                              type="button"
                              title={`Remove ${h.label} column`}
                              onClick={() => (h.removeCustom ? removeCustomColumn(h.removeCustom) : removeColumn(h.remove))}
                              style={{ border: "none", background: "transparent", color: "#f87171", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: "0.75rem" }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <AddColumnButton
                          available={availableCols}
                          onAdd={addColumn}
                          onCustom={addCustomColumn}
                          buttonStyle={{
                            width: 20, height: 20, borderRadius: 6, border: "none", padding: 0,
                            background: "#1F6F5C", color: "#fff", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <FaPlus size={9} />
                        </AddColumnButton>
                      </div>
                    </div>

                    {form.items.map((item, i) => (
                      <div key={i} className="px-3 py-2" style={{ display: "grid", gridTemplateColumns: itemGrid(showHsn, showDiscount, customCols.length), gap: 6, alignItems: "center", borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{item.sl}</div>

                        <div>
                          <ItemDescriptionField
                            products={products}
                            item={item}
                            onType={v => typeDescription(i, v)}
                            stockFor={p => availableStock(p.id, i)}
                            onPick={v => pickProduct(i, v)}
                            onAddNew={() => setQuickAddRow(i)}
                            style={{ ...inp, fontSize: "0.82rem" }}
                          />
                        </div>

                        <div className="d-flex gap-1">
                          <input type="number" className="no-spinner" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} placeholder="1" style={{ ...inp, fontSize: "0.82rem", padding: "8px 6px", minWidth: 0 }} />
                          <UnitSelectField
                            value={item.unit ?? ""}
                            onChange={val => updateItem(i, "unit", val)}
                            style={{ ...inp, fontSize: "0.78rem", padding: "8px 6px", width: 62, flexShrink: 0 }}
                          />
                        </div>

                        <input type="number" className="no-spinner" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} placeholder="0" style={{ ...inp, fontSize: "0.82rem", padding: "8px 6px", minWidth: 0 }} />

                        {showHsn && (
                          <input
                            value={item.hsnCode ?? ""}
                            onChange={e => updateItem(i, "hsnCode", e.target.value.replace(/\D/g, "").slice(0, 8))}
                            placeholder="HSN / SAC"
                            style={{ ...inp, fontSize: "0.78rem", padding: "8px 6px", minWidth: 0 }}
                          />
                        )}

                        {showDiscount && (
                          <div className="d-flex gap-1">
                            <input
                              type="number" className="no-spinner" min="0"
                              value={item.discount ?? ""}
                              onChange={e => updateItem(i, "discount", e.target.value)}
                              placeholder="0"
                              style={{ ...inp, fontSize: "0.82rem", padding: "8px 6px", minWidth: 0 }}
                            />
                            <select
                              value={item.discountType || "percent"}
                              onChange={e => updateItem(i, "discountType", e.target.value)}
                              style={{ ...inp, fontSize: "0.78rem", padding: "8px 2px", width: 48, flexShrink: 0, cursor: "pointer" }}
                            >
                              <option value="percent">%</option>
                              <option value="amount">₹</option>
                            </select>
                          </div>
                        )}

                        {customCols.map(c => (
                          <input
                            key={c.key}
                            value={item.custom?.[c.key] ?? ""}
                            onChange={e => updateCustom(i, c.key, e.target.value)}
                            placeholder={c.label}
                            style={{ ...inp, fontSize: "0.78rem", padding: "8px 6px", minWidth: 0 }}
                          />
                        ))}

                        <div className="fw-semibold" style={{ fontSize: "0.82rem", color: "#0f172a" }}>
                          ₹{Number(item.amount).toLocaleString()}
                        </div>

                        <div className="text-end">
                          {form.items.length > 1 && (
                            <button onClick={() => removeItem(i)} className="border-0 bg-transparent p-0" style={{ color: "#ef4444", cursor: "pointer" }}>
                              <FaTrash size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="d-flex gap-2 flex-wrap mt-2">
                  <button onClick={addItem}
                    className="d-flex align-items-center gap-2 border-0 rounded-3 px-3 py-2"
                    style={{ backgroundColor: "#f1f5f9", color: "#475569", fontSize: "0.82rem", cursor: "pointer" }}>
                    <FaPlus size={10} /> Add Item
                  </button>
                  {isMobile && (
                    <AddColumnButton
                      available={availableCols}
                      onAdd={addColumn}
                      onCustom={addCustomColumn}
                      buttonStyle={{
                        display: "flex", alignItems: "center", gap: 8, border: "none", borderRadius: 12,
                        padding: "8px 16px", backgroundColor: "#E6F1EC", color: "#1F6F5C",
                        fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      <FaPlus size={10} /> Add Field
                    </AddColumnButton>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="d-flex justify-content-end mb-3">
                <div style={{ minWidth: isMobile ? "100%" : "280px", width: isMobile ? "100%" : "auto" }}>
                  {(() => {
                    const rows = [
                      { label: "Sub Total", value: `₹${(form.gstType === "GST Included" ? total : subtotal).toLocaleString()}` },
                      // GST — one line per component (CGST/SGST or IGST)
                      ...formGstRows.map(r => ({ label: r.label, value: `₹${Number(r.amount || 0).toLocaleString()}` })),
                      { label: "Total Invoice Value", value: `₹${total.toLocaleString()}`, bold: true },
                      { label: "Amount Paid", value: `₹${Number(form.amountPaid || 0).toLocaleString()}` },
                    ];
                    return rows.map(({ label, value, bold }) => (
                      <div key={label} className="d-flex justify-content-between py-1" style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "0.85rem", color: bold ? "#0f172a" : "#64748b", fontWeight: bold ? 700 : 400 }}>{label}</span>
                        <span style={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: bold ? 700 : 600 }}>{value}</span>
                      </div>
                    ));
                  })()}
                  <div className="d-flex justify-content-between py-2 px-3 rounded-3 mt-1" style={{ backgroundColor: "#0f172a" }}>
                    <span className="fw-bold" style={{ color: "#fff", fontSize: "0.9rem" }}>Amount Due</span>
                    <span className="fw-bold" style={{ color: "#34d399", fontSize: "1.1rem" }}>₹{due.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-3">
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Notes (optional)</label>
                <textarea rows={2} value={form.notes} onChange={e => updateField("notes", e.target.value)}
                  style={{ ...inp, resize: "vertical" }} placeholder="Additional notes for the client..." />
              </div>

              {/* Signature Upload */}
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 8 }}>
                  Authorized Signature
                </label>
                <div
                  className="d-flex align-items-center gap-4 p-3 rounded-3"
                  style={{
                    backgroundColor: "#f8fafc", border: "1.5px dashed #e2e8f0",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                  }}
                >
                  <div style={{
                    width: isMobile ? "100%" : 180, height: 70, border: "1px solid #e2e8f0", borderRadius: 8,
                    backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, overflow: "hidden",
                  }}>
                    {form.signature
                      ? <img src={form.signature} alt="Signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                      : <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>No signature uploaded</span>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 8 }}>
                      Upload your signature image (PNG with transparent background recommended)
                    </div>
                    <div className="d-flex gap-2" style={{ flexWrap: "wrap" }}>
                      <label htmlFor="sig-upload"
                        style={{
                          fontSize: "0.78rem", fontWeight: 600, color: "#059669",
                          border: "1.5px solid #059669", borderRadius: 8,
                          padding: "6px 14px", cursor: "pointer", display: "inline-block"
                        }}>
                        {form.signature ? "Change Signature" : "Upload Signature"}
                      </label>
                      <input id="sig-upload" type="file" accept="image/*" style={{ display: "none" }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => updateField("signature", reader.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {form.signature && (
                        <button onClick={() => updateField("signature", null)}
                          className="border-0 rounded-3 fw-semibold px-3 py-1"
                          style={{ backgroundColor: "#fef2f2", color: "#ef4444", fontSize: "0.78rem", cursor: "pointer" }}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 4 }}>PNG, JPG, SVG up to 2MB</div>
                  </div>
                </div>
              </div>

              {/* ══ Mobile: Preview appended inline, right after the form content ══ */}
              {isMobile && showPreview && (
                <div style={{ marginTop: 24 }}>
                  <InvoicePreview form={form} isMobile={true} onClose={() => setShowPreview(false)} showHsn={showHsn} />              </div>
              )}

            </div>
          </div>
        </div>

        {/* ══ RIGHT: Preview — sticky sidebar on desktop only ══ */}
        {showPreview && !isMobile && <InvoicePreview form={form} isMobile={false} showHsn={showHsn} />}    </div>

      {quickAddRow !== null && (
        <ProductForm
          product={null}
          defaultType="Product"
          onSave={handleQuickSave}
          onClose={() => setQuickAddRow(null)}
        />
      )}
    </>
  );
}

const styles = {
  splitContainer: { display: "flex", gap: "24px", alignItems: "flex-start", width: "100%" },
  splitContainerMobile: { display: "flex", flexDirection: "column", gap: "20px", width: "100%", maxWidth: "100%", overflowX: "hidden" },
  formSide: { flex: "1 1 0", minWidth: 0 },
  previewPanel: {
    flex: "1 1 0", minWidth: "420px", position: "sticky", top: "20px",
    backgroundColor: "#fff", borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1.5px solid #f1f5f9",
    display: "flex", flexDirection: "column", height: "calc(100vh - 40px)", overflow: "hidden",
  },
  previewHeader: {
    display: "flex", alignItems: "center", gap: 8, padding: "14px 16px",
    borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa", borderRadius: "16px 16px 0 0",
  },
};