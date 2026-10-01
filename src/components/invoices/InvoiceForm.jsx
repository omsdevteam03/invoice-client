import { useState, useEffect, useRef } from "react";
import { FaArrowLeft, FaSave, FaPlus, FaTrash, FaEye, FaEyeSlash, FaTimes, FaChevronDown } from "react-icons/fa";
import { INVOICE_LABELS, INVOICE_FONT, InvoiceLangToggle } from "./invoiceLang";

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
  border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px",
  fontSize: "0.875rem", color: "#0f172a", width: "100%", outline: "none",
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


/* ────────────────────────────────────────────────────────────────────────
 * Company Name dropdown — local to Invoices only (kept separate from the
 * Quotation module's EditableField.jsx on purpose, so the two document
 * types don't share state/behavior).
 * ──────────────────────────────────────────────────────────────────── */

const INVOICE_CUSTOM_COMPANIES_KEY = "invoice_custom_companies";
const INVOICE_ADD_CUSTOM_VALUE = "__add_custom_invoice_company__";

const INVOICE_DEFAULT_COMPANIES = [
  "Orange Mega Software Pvt Ltd",
  "Nova Tech Solutions",
  "BluePeak Innovations",
  "Zenith Digital Works",
  "Skyline Software Labs",
  "Vertex Cloud Systems",
  "Silver Lotus Technologies",
  "Crimson Bytes Pvt Ltd",
  "Northstar IT Services",
  "Pearl Coast Software",
];

function readInvoiceCustomCompanies() {
  try {
    const raw = localStorage.getItem(INVOICE_CUSTOM_COMPANIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (err) {
    console.error("Failed to read saved invoice companies:", err);
    return [];
  }
}

function writeInvoiceCustomCompanies(list) {
  try {
    localStorage.setItem(INVOICE_CUSTOM_COMPANIES_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to save invoice companies:", err);
  }
}

function useInvoiceCustomCompanies() {
  const [customCompanies, setCustomCompanies] = useState(readInvoiceCustomCompanies);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === INVOICE_CUSTOM_COMPANIES_KEY) setCustomCompanies(readInvoiceCustomCompanies());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addCustomCompany = (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return null;
    const current = readInvoiceCustomCompanies();
    const exists = [...INVOICE_DEFAULT_COMPANIES, ...current].some((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      const next = [...current, trimmed];
      writeInvoiceCustomCompanies(next);
      setCustomCompanies(next);
    }
    return trimmed;
  };

  return { customCompanies, addCustomCompany };
}

// Native <select> of preset + custom companies, with a "+ Add Custom
// Company" option that reveals an inline text field to save a brand-new
// company (which then becomes selectable here going forward).
function CompanySelectField({ value, onChange, placeholder = "Select company", style }) {
  const { customCompanies, addCustomCompany } = useInvoiceCustomCompanies();
  const [addingCustom, setAddingCustom] = useState(false);
  const [draftName, setDraftName] = useState("");

  const options = [...INVOICE_DEFAULT_COMPANIES, ...customCompanies.filter((c) => !INVOICE_DEFAULT_COMPANIES.includes(c))];
  if (value && !options.includes(value)) options.push(value);

  const confirmCustom = () => {
    const saved = addCustomCompany(draftName);
    if (saved) onChange(saved);
    setDraftName("");
    setAddingCustom(false);
  };
  const cancelCustom = () => {
    setDraftName("");
    setAddingCustom(false);
  };

  if (addingCustom) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%" }}>
        <input
          autoFocus
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Enter company name"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); confirmCustom(); }
            if (e.key === "Escape") { e.preventDefault(); cancelCustom(); }
          }}
          style={{ ...style, cursor: "text" }}
        />
        <button type="button" onClick={confirmCustom}
          style={{ border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 12, fontWeight: 600, background: "#16A34A", color: "#fff", cursor: "pointer", flexShrink: 0 }}>
          Save
        </button>
        <button type="button" onClick={cancelCustom}
          style={{ border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 12, fontWeight: 600, background: "#e5e7eb", color: "#374151", cursor: "pointer", flexShrink: 0 }}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        if (e.target.value === INVOICE_ADD_CUSTOM_VALUE) { setAddingCustom(true); return; }
        onChange(e.target.value);
      }}
      style={{ ...style, cursor: "pointer" }}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value={INVOICE_ADD_CUSTOM_VALUE}>+ Add Custom Company</option>
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
  return Number(n || 0).toLocaleString("en-IN", {
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
// A record is Proforma if it's explicitly tagged that way, OR — for older
// records saved before invoiceType existed — if its number carries the
// "PI-" prefix. Anything else counts as Final. Checking the prefix as a
// fallback (instead of just `i.invoiceType || "Final"`) matters: any
// record missing invoiceType would otherwise silently get counted as
// Final, so the Proforma series never sees its own invoices and always
// computes "0 existing" → always starts back at 001.
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
function InvoicePreview({ form, isMobile, onClose }) {
  const L = INVOICE_LABELS[form.invoiceLang === "ta" ? "ta" : "en"];
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
  const amountPaid = Number(form.amountPaid || 0);
  const due = total - amountPaid;

  const words = total > 0 ? `INR – Indian Rupees ${numberToWords(total)} Only` : "—";

  // On mobile the preview is now rendered inline at the end of the form
  // (not a fixed full-screen overlay), so it should flow naturally with
  // the page instead of trying to fill the viewport height.
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
        <div style={{ backgroundColor: "#fff", padding: isMobile ? "10px" : "14px", fontFamily: INVOICE_FONT, overflowX: isMobile ? "auto" : "visible" }}>
          <table style={{ width: "100%", minWidth: isMobile ? "560px" : "auto", borderCollapse: "collapse", border: "1px solid #000" }}>
            <tbody>
              <tr>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "8px 10px", width: "60%" }}>                  <div className="d-flex align-items-start gap-2">
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
                    <div style={{ fontSize: "0.6rem", color: "#334155", whiteSpace: "pre-line" }}>
                      {form.companyAddress || <span style={{ color: "#cbd5e1" }}>Company Address</span>}
                    </div>
                    <div style={{ fontSize: "0.62rem", color: "#334155" }}>
                      GSTIN: {form.companyGSTIN || <span style={{ color: "#cbd5e1" }}>—</span>}
                    </div>
                  </div>
                </div>
                </td>
                <td style={{ border: "1px solid #000", padding: "8px 10px", verticalAlign: "top", width: "25%" }}>
                  <div style={{ fontSize: "0.62rem", color: "#64748b" }}>{L.invoiceNo}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#0f172a" }}>{form.invoiceNo || "—"}</div>
                </td>
                <td style={{ border: "1px solid #000", padding: "8px 10px", verticalAlign: "top", width: "15%" }}>
                  <div style={{ fontSize: "0.62rem", color: "#64748b" }}>{L.dated}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.7rem", color: "#0f172a" }}>{formatDate(form.date)}</div>
                </td>
              </tr>

              <tr>
                <td colSpan={5} style={{ border: "1px solid #000", padding: "6px 10px" }}>
                  <div style={{ fontSize: "0.6rem", color: "#64748b" }}>{L.buyer}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.72rem", color: "#0f172a" }}>
                    {form.buyerName || <span style={{ color: "#cbd5e1" }}>Buyer Name</span>}
                  </div>
                  {form.buyerCompanyName && (
                    <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "#334155" }}>{form.buyerCompanyName}</div>
                  )}
                  <div style={{ fontSize: "0.65rem", color: "#334155", whiteSpace: "pre-line" }}>{form.buyerAddress}</div>

                  <div style={{ fontSize: "0.65rem", color: "#334155" }}>{L.mobile}: {form.buyerMobile}</div>
                  {form.buyerGSTIN && (
                    <div style={{ fontSize: "0.65rem", color: "#334155" }}>GSTIN: {form.buyerGSTIN}</div>
                  )}
                </td>
              </tr>

              <tr style={{ backgroundColor: "#f1f5f9" }}>
                {cell(L.sl, { fontWeight: 700, textAlign: "center", width: "6%" })}
                {cell(L.description, { fontWeight: 700, width: "46%" })}
                {cell(L.qty, { fontWeight: 700, textAlign: "center", width: "14%" })}
                {cell(L.rate, { fontWeight: 700, textAlign: "right", width: "17%" })}
                {cell(L.amount, { fontWeight: 700, textAlign: "right", width: "17%" })}
              </tr>

              {form.items.map((item, i) => (
                <tr key={i}>
                  {cell(item.sl, { textAlign: "center" })}
                  {cell(item.description || <span style={{ color: "#cbd5e1" }}>—</span>)}
                  {cell(`${item.qty}${item.unit ? " " + item.unit : ""}`, { textAlign: "center", whiteSpace: "nowrap" })}
                  {cell(formatAmount(item.rate), { textAlign: "right" })}
                  {cell(formatAmount(item.amount), { textAlign: "right" })}
                </tr>
              ))}

              <tr>
                {cell("")}{cell(<strong>{L.subTotal}</strong>)}{cell("")}{cell("")}
                {cell(<strong>{formatAmount(subtotal)}</strong>, { textAlign: "right" })}
              </tr>
              {form.gstType !== "No GST" && (
                <tr>
                                {cell("")}{cell(<strong>{`${L.gst} @ ${gstPercent}%${form.gstType === "GST Included" ? ` (${L.included})` : ""}`}</strong>)}{cell("")}{cell("")}
                  {cell(<strong>{formatAmount(tax)}</strong>, { textAlign: "right" })}
                </tr>
              )}

              <tr>
                {cell("")}{cell(<strong>{L.total}</strong>)}{cell("")}{cell("")}
                {cell(<strong>{formatAmount(total)}</strong>, { textAlign: "right" })}
              </tr>
              <tr>
                {cell("")}{cell(L.paid)}{cell("")}{cell("")}
                {cell(formatAmount(amountPaid), { textAlign: "right" })}
              </tr>
              <tr style={{ backgroundColor: "#ecfdf5" }}>
                {cell("")}{cell(<strong>{L.due}</strong>)}{cell("")}{cell("")}
                {cell(<strong style={{ color: "#059669" }}>{formatAmount(due)}</strong>, { textAlign: "right" })}
              </tr>

              <tr>
                <td colSpan={form.dueDate ? 3 : 5} style={{ border: "1px solid #000", padding: "6px 10px" }}>
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
                <td colSpan={2} style={{ border: "1px solid #000", padding: "6px 10px", textAlign: "right", verticalAlign: "bottom" }}>
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
          {isMobile && (
            <div style={{ textAlign: "center", fontSize: "0.65rem", color: "#94a3b8", marginTop: 6, fontStyle: "italic" }}>
              ← Scroll sideways to see the full invoice →
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvoiceForm({ invoice, invoices = [], customers = [], onSave, onBack, companyInfo, onCompanyChange, docSettings, invoiceType = "Final" }) {
  const isEdit = !!invoice;
  const isMobile = useIsMobile(900);
  const GST_PRESETS = [1, 3, 5, 12, 18, 28];
  const [customGst, setCustomGst] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);
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
    companyGSTIN: companyInfo?.gstin || "",
    logo: companyInfo?.logo || null,
    logoShape: "original",
    // Default signature
    //  — still fully replaceable via "Change Signature"
    // below, this just avoids showing an empty "No signature uploaded" box.
    signature: "/signature.png",
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

  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    if (field === "qty" || field === "rate") {
      items[i].amount = Number(items[i].qty) * Number(items[i].rate);
    }
    setForm(prev => ({ ...prev, items }));
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

  const handleSave = () => {
    if (!form.buyerName || !form.invoiceNo) {
      alert("Please fill Invoice No and Buyer Name.");
      return;
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


    onSave({
      ...form,
      id: invoice?.id || `INV-${Date.now()}`,
      logo: form.logo,
      total,
      amountDue,
    });
  };
  return (
    <>
      <style>{spinnerCSS}</style>
      <div style={isMobile ? styles.splitContainerMobile : styles.splitContainer}>
        {/* ══ LEFT: Form ══ */}
        <div style={
          showPreview && !isMobile
            ? { ...styles.formSide, flex: "0 0 700px", maxWidth: "700px" }
            : { ...styles.formSide, maxWidth: "100%" }
        }>

          <div className="d-flex justify-content-between align-items-center mb-4 no-print"
            style={{
              flexWrap: "wrap", gap: 10,
              position: "sticky", top: 0, zIndex: 20,
              backgroundColor: "#fff", padding: "10px 0",
            }}>
            <button onClick={onBack}
              className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
              style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#e2e8f0"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#f1f5f9"}
            >
              <FaArrowLeft size={12} /> Back
            </button>
            {!isMobile && (
              <div className="d-flex align-items-center gap-2">
                <h5 className="fw-bold mb-0" style={{ color: "#0f172a" }}>
                  {isEdit ? "Edit" : "New"}
                </h5>
                <select
                  value={form.invoiceType || "Final"}
                  onChange={e => handleInvoiceTypeChange(e.target.value)}
                  style={{
                    border: "none", outline: "none", cursor: "pointer",
                    fontWeight: 700, fontSize: "1.05rem",
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
            <div className="d-flex gap-2">
              <button
                onClick={() => setShowPreview(v => !v)}
                className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
                style={{ backgroundColor: showPreview ? "#ecfdf5" : "#f1f5f9", color: showPreview ? "#059669" : "#475569", cursor: "pointer", fontSize: "0.85rem", border: showPreview ? "1px solid #a7f3d0" : "1px solid transparent" }}
              >
                {showPreview ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
              <button onClick={handleSave}
                className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-4 py-2"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", cursor: "pointer", fontSize: "0.85rem", boxShadow: "0 4px 12px rgba(5,150,105,0.3)" }}
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

          <div className="mb-3">
            <InvoiceLangToggle
              lang={form.invoiceLang === "ta" ? "ta" : "en"}
              onChange={(l) => updateField("invoiceLang", l)}
            />
          </div>

          <div className="card border-0 shadow-sm" style={{ borderRadius: "16px" }}>
            <div className="p-4">

              {/* Invoice Meta */}
              <div className="row g-3 mb-4 p-3 rounded-3" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
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
                    onChange={(val) => updateField("companyName", val)}
                    placeholder="Enter Company Name"
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
                <div className="col-12 col-md-3">
                  {/* spacer to keep the grid tidy on desktop */}
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
                  <select value={form.status} onChange={e => updateField("status", e.target.value)} style={inp}>
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
              <div className="row g-3 mb-4 p-3 rounded-3" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="col-12">
                  <div className="fw-bold mb-2" style={{ color: "#0f172a", fontSize: "0.9rem" }}>Buyer Details (Bill To)</div>
                </div>
                <div className="col-12 col-md-6">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Buyer Name *</label>
                  <div style={{ position: "relative" }}>
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
                <div className="col-12 col-md-6">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Company Name</label>
                  <input name="buyerCompanyName" autoComplete="organization" value={form.buyerCompanyName || ""} onChange={e => updateField("buyerCompanyName", e.target.value)} style={inp} placeholder="Client Company Name" />              </div>
                <div className="col-12 col-md-6">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Mobile Number</label>
                  <input name="buyerMobile" autoComplete="tel" value={form.buyerMobile} onChange={e => updateField("buyerMobile", e.target.value)} style={inp} placeholder="9876543210" />              </div>
                <div className="col-12 col-md-8">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Address</label>
                  <textarea name="buyerAddress" autoComplete="street-address" rows={2} value={form.buyerAddress} onChange={e => updateField("buyerAddress", e.target.value)} style={{ ...inp, resize: "vertical" }} placeholder="Full address..." />              </div>
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>GSTIN (optional)</label>
                  <input name="buyerGSTIN" autoComplete="off" maxLength={15} value={form.buyerGSTIN} onChange={e => updateField("buyerGSTIN", e.target.value.toUpperCase())} style={{ ...inp, textTransform: "uppercase" }} placeholder="33AABCA1234B1ZX" />              </div>
              </div>

              {/* Items Table */}
              <div className="mb-4">
                <div className="fw-bold mb-3" style={{ color: "#0f172a", fontSize: "0.9rem" }}>Services / Items</div>

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
                        <textarea rows={2} value={item.description} onChange={e => updateItem(i, "description", e.target.value)}
                          style={{ ...inp, resize: "vertical", fontSize: "0.82rem", marginBottom: 8 }} placeholder="Service description..." />
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
                    <div className="row g-0 px-3 py-2" style={{ backgroundColor: "#0f172a" }}>
                      {["Sl.", "Description of Services", "Qty", "Rate (₹)", "Amount (₹)", ""].map((h, i) => (
                        <div key={i}
                          className={i === 1 ? "col-4" : i === 2 ? "col-2" : i === 5 ? "col-1" : "col"}
                          style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em" }}>
                          {h}
                        </div>
                      ))}
                    </div>

                    {form.items.map((item, i) => (
                      <div key={i} className="row g-0 px-3 py-2 align-items-center" style={{ borderTop: "1px solid #f1f5f9" }}>
                        <div className="col" style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{item.sl}</div>
                        <div className="col-4 pe-2">
                          <textarea rows={2} value={item.description} onChange={e => updateItem(i, "description", e.target.value)}
                            style={{ ...inp, resize: "vertical", fontSize: "0.82rem" }} placeholder="Service description..." />
                        </div>
                        <div className="col-2 pe-2 d-flex gap-1">
                          <input type="number" className="no-spinner" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} placeholder="1" style={{ ...inp, fontSize: "0.82rem", padding: "8px 6px", minWidth: 0 }} />
                          <UnitSelectField
                            value={item.unit ?? ""}
                            onChange={val => updateItem(i, "unit", val)}
                            style={{ ...inp, fontSize: "0.78rem", padding: "8px 6px", width: 62, flexShrink: 0 }}
                          />
                        </div>
                        <div className="col pe-2">
                          <input type="number" className="no-spinner" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} placeholder="0" style={{ ...inp, fontSize: "0.82rem" }} />                        </div>
                        <div className="col fw-semibold" style={{ fontSize: "0.82rem", color: "#0f172a" }}>
                          ₹{Number(item.amount).toLocaleString()}
                        </div>
                        <div className="col-1 text-end">
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

                <button onClick={addItem}
                  className="d-flex align-items-center gap-2 border-0 rounded-3 px-3 py-2 mt-2"
                  style={{ backgroundColor: "#f1f5f9", color: "#475569", fontSize: "0.82rem", cursor: "pointer" }}>
                  <FaPlus size={10} /> Add Item
                </button>
              </div>

              {/* Totals */}
              <div className="d-flex justify-content-end mb-4">
                <div style={{ minWidth: isMobile ? "100%" : "280px", width: isMobile ? "100%" : "auto" }}>
                  {[
                    { label: "Sub Total", value: `₹${subtotal.toLocaleString()}` },
                    ...(form.gstType !== "No GST" ? [{
                      label: `GST @ ${gstPercent}%${form.gstType === "GST Included" ? " (Included)" : ""}`,
                      value: `₹${tax.toLocaleString()}`
                    }] : []),
                    { label: "Total Invoice Value", value: `₹${total.toLocaleString()}`, bold: true },
                    { label: "Amount Paid", value: `₹${Number(form.amountPaid || 0).toLocaleString()}` },
                  ].map(({ label, value, bold }) => (
                    <div key={label} className="d-flex justify-content-between py-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "0.85rem", color: bold ? "#0f172a" : "#64748b", fontWeight: bold ? 700 : 400 }}>{label}</span>
                      <span style={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: bold ? 700 : 600 }}>{value}</span>
                    </div>
                  ))}
                  <div className="d-flex justify-content-between py-3 px-3 rounded-3 mt-2" style={{ backgroundColor: "#0f172a" }}>
                    <span className="fw-bold" style={{ color: "#fff", fontSize: "0.9rem" }}>Amount Due</span>
                    <span className="fw-bold" style={{ color: "#34d399", fontSize: "1.1rem" }}>₹{due.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
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
                  <InvoicePreview form={form} isMobile={true} onClose={() => setShowPreview(false)} />              </div>
              )}

            </div>
          </div>
        </div>

        {/* ══ RIGHT: Preview — sticky sidebar on desktop only ══ */}
        {showPreview && !isMobile && <InvoicePreview form={form} isMobile={false} />}    </div>
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