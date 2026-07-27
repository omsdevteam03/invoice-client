import { useState, useEffect } from "react";
import { FaArrowLeft, FaSave, FaPlus, FaTrash, FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";

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

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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
function InvoicePreview({ form, isMobile, onClose }) {    const subtotal = form.items.reduce((a, b) => a + Number(b.amount || 0), 0);
  const gstPercent = Number(form.gstPercent || 18);
  const tax = form.gstType === "With GST" ? Math.round(subtotal * (gstPercent / 100)) : 0;
  const total = form.gstType === "With GST" ? subtotal + tax : subtotal;
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
        <div style={{ backgroundColor: "#fff", padding: isMobile ? "10px" : "14px", fontFamily: "Arial, sans-serif", overflowX: isMobile ? "auto" : "visible" }}>
          <table style={{ width: "100%", minWidth: isMobile ? "560px" : "auto", borderCollapse: "collapse", border: "1px solid #000" }}>
            <tbody>
              <tr>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "8px 10px", width: "60%" }}>
                  <div className="d-flex align-items-start gap-2">
                   {form.logo
                      ? <img src={form.logo} alt="Logo" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
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
                  <div style={{ fontSize: "0.62rem", color: "#64748b" }}>Invoice No.</div>
                  <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#0f172a" }}>{form.invoiceNo || "—"}</div>
                </td>
                <td style={{ border: "1px solid #000", padding: "8px 10px", verticalAlign: "top", width: "15%" }}>
                  <div style={{ fontSize: "0.62rem", color: "#64748b" }}>Dated</div>
                  <div style={{ fontWeight: 700, fontSize: "0.7rem", color: "#0f172a" }}>{formatDate(form.date)}</div>
                </td>
              </tr>

              <tr>
                <td colSpan={4} style={{ border: "1px solid #000", padding: "6px 10px" }}>
                  <div style={{ fontSize: "0.6rem", color: "#64748b" }}>Buyer (Bill to)</div>
                  <div style={{ fontWeight: 700, fontSize: "0.72rem", color: "#0f172a" }}>
                    {form.buyerName || <span style={{ color: "#cbd5e1" }}>Buyer Name</span>}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "#334155" }}>{form.buyerAddress}</div>
                  <div style={{ fontSize: "0.65rem", color: "#334155" }}>Mobile: {form.buyerMobile}</div>
                  {form.buyerGSTIN && (
                    <div style={{ fontSize: "0.65rem", color: "#334155" }}>GSTIN: {form.buyerGSTIN}</div>
                  )}
                </td>
              </tr>

              <tr style={{ backgroundColor: "#f1f5f9" }}>
                {cell("Sl.", { fontWeight: 700, textAlign: "center", width: "6%" })}
                {cell("Description", { fontWeight: 700, width: "50%" })}
                {cell("Qty", { fontWeight: 700, textAlign: "center", width: "10%" })}
                {cell("Rate", { fontWeight: 700, textAlign: "right", width: "17%" })}
                {cell("Amount", { fontWeight: 700, textAlign: "right", width: "17%" })}
              </tr>

              {form.items.map((item, i) => (
                <tr key={i}>
                  {cell(item.sl, { textAlign: "center" })}
                  {cell(item.description || <span style={{ color: "#cbd5e1" }}>—</span>)}
                  {cell(item.qty, { textAlign: "center" })}
                  {cell(Number(item.rate).toFixed(0), { textAlign: "right" })}
                  {cell(Number(item.amount).toFixed(0), { textAlign: "right" })}
                </tr>
              ))}

              <tr>
                {cell("")}{cell(<strong>Sub Total</strong>)}{cell("")}{cell("")}
                {cell(<strong>{subtotal.toFixed(0)}</strong>, { textAlign: "right" })}
              </tr>
     {form.gstType === "With GST" && (
                <tr>
                  {cell("")}{cell(<strong>{`GST @ ${gstPercent}%`}</strong>)}{cell("")}{cell("")}
                  {cell(<strong>{tax.toFixed(0)}</strong>, { textAlign: "right" })}
                </tr>
              )}
              <tr>
                {cell("")}{cell(<strong>Total Invoice Value</strong>)}{cell("")}{cell("")}
                {cell(<strong>{total.toFixed(0)}</strong>, { textAlign: "right" })}
              </tr>
              <tr>
                {cell("")}{cell("Amount Paid")}{cell("")}{cell("")}
                {cell(amountPaid.toFixed(0), { textAlign: "right" })}
              </tr>
              <tr style={{ backgroundColor: "#ecfdf5" }}>
                {cell("")}{cell(<strong>Amount Due</strong>)}{cell("")}{cell("")}
                {cell(<strong style={{ color: "#059669" }}>{due.toFixed(0)}</strong>, { textAlign: "right" })}
              </tr>

              <tr>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "6px 10px" }}>
                  <div style={{ fontSize: "0.58rem", color: "#64748b" }}>Amount Chargeable (In words)</div>
                  <div style={{ fontWeight: 700, fontSize: "0.65rem", color: "#0f172a" }}>{words}</div>
                </td>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "6px 10px" }}>
                  {form.dueDate && (
                    <>
                      <div style={{ fontSize: "0.58rem", color: "#64748b" }}>Due Date</div>
                      <div style={{ fontWeight: 700, fontSize: "0.65rem", color: "#0f172a" }}>{formatDate(form.dueDate)}</div>
                    </>
                  )}
                </td>
              </tr>

              <tr>
                <td colSpan={3} style={{ border: "1px solid #000", padding: "6px 10px", verticalAlign: "top" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.62rem", textDecoration: "underline", marginBottom: 3 }}>Declaration:</div>
                  <div style={{ fontSize: "0.58rem", color: "#334155", lineHeight: 1.5 }}>
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                  </div>
                  {form.notes && (
                    <div style={{ fontSize: "0.58rem", color: "#475569", marginTop: 4, fontStyle: "italic" }}>
                      Note: {form.notes}
                    </div>
                  )}
                </td>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "6px 10px", textAlign: "right", verticalAlign: "bottom" }}>
<div style={{ fontSize: "0.6rem", color: "#334155" }}>For {form.companyName || "Your Company"}</div>                  <div style={{ margin: "6px 0", minHeight: 36, display: "flex", justifyContent: "flex-end" }}>
                    {form.signature
                      ? <img src={form.signature} alt="Signature" style={{ maxHeight: 44, maxWidth: 120, objectFit: "contain" }} />
                      : <div style={{ width: 120, height: 40 }} />
                    }
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "#475569" }}>Authorized Signatory</div>
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

export default function InvoiceForm({ invoice, invoices = [], onSave, onBack, companyInfo, onCompanyChange, docSettings, invoiceType = "Final" }) {
    const isEdit = !!invoice;
  const isMobile = useIsMobile(900);
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
    gstType: "With GST",
    gstPercent: docSettings?.gstPercent ?? 18,
    // Prefilled from Settings ➜ Company at creation time only.
    // Once saved, these live on the invoice record itself (snapshot) and
    // will never be overwritten by later Settings changes.
    companyName: companyInfo?.companyName || "",
    companyAddress: companyInfo?.companyAddress || "",
    companyGSTIN: companyInfo?.gstin || "",
    logo: companyInfo?.logo || null,
    // Default signature — still fully replaceable via "Change Signature"
    // below, this just avoids showing an empty "No signature uploaded" box.
    signature: "/default-signature.png",
    buyerName: "", 
    buyerAddress: "",
    buyerMobile: "",
    buyerGSTIN: "",
    amountPaid: 0,
    notes: docSettings?.defaultNotes || "",
    items: [{ sl: 1, description: "", qty: 1, rate: 0, amount: 0 }],
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

  const updateField = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

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
      items: [...prev.items, { sl: prev.items.length + 1, description: "", qty: 1, rate: 0, amount: 0 }],
    }));
  };

  const removeItem = (i) => {
    const items = form.items.filter((_, idx) => idx !== i).map((item, idx) => ({ ...item, sl: idx + 1 }));
    setForm(prev => ({ ...prev, items }));
  };

const subtotal = form.items.reduce((a, b) => a + Number(b.amount), 0);
  const gstPercent = Number(form.gstPercent || 18);
  const tax = form.gstType === "With GST" ? Math.round(subtotal * (gstPercent / 100)) : 0;
  const total = form.gstType === "With GST" ? subtotal + tax : subtotal;
  const due = total - Number(form.amountPaid || 0);

const handleSave = () => {
    if (!form.buyerName || !form.invoiceNo) {
      alert("Please fill Invoice No and Buyer Name.");
      return;
    }
const subtotal = form.items.reduce((a, b) => a + Number(b.amount), 0);
    const gstPercent = Number(form.gstPercent || 18);
    const tax = form.gstType === "With GST" ? Math.round(subtotal * (gstPercent / 100)) : 0;
    const total = form.gstType === "With GST" ? subtotal + tax : subtotal;
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

        <div className="d-flex justify-content-between align-items-center mb-4 no-print" style={{ flexWrap: "wrap", gap: 10 }}>
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
                    ? <img src={form.logo} alt="Logo" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }} />
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
                  </div>
                </div>
              </div>

              {/* Editable company (seller) details — shown on both the preview and the printed invoice */}
              <div className="col-12 col-md-5">
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Company Name</label>
           <input
                  value={form.companyName || ""}
                  onChange={e => updateField("companyName", e.target.value)}
                  style={inp}
                  placeholder="Enter Company Name"
                />
              </div>
              <div className="col-12 col-md-4">
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Company GSTIN</label>
               <input
                  value={form.companyGSTIN || ""}
                  onChange={e => updateField("companyGSTIN", e.target.value)}
                  style={inp}
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
                  <option>No GST</option>
                </select>
              </div>
              {form.gstType === "With GST" && (
                <div className="col-12 col-md-4">
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>GST %</label>
                  <select value={form.gstPercent} onChange={e => updateField("gstPercent", Number(e.target.value))} style={inp}>
                    <option value={1}>1%</option>
                    <option value={3}>3%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
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
<input name="buyerName" autoComplete="name" value={form.buyerName} onChange={e => updateField("buyerName", e.target.value)} style={inp} placeholder="Client / Company Name" />              </div>
              <div className="col-12 col-md-6">
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Mobile Number</label>
<input name="buyerMobile" autoComplete="tel" value={form.buyerMobile} onChange={e => updateField("buyerMobile", e.target.value)} style={inp} placeholder="9876543210" />              </div>
              <div className="col-12 col-md-8">
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Address</label>
<textarea name="buyerAddress" autoComplete="street-address" rows={2} value={form.buyerAddress} onChange={e => updateField("buyerAddress", e.target.value)} style={{ ...inp, resize: "vertical" }} placeholder="Full address..." />              </div>
              <div className="col-12 col-md-4">
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>GSTIN (optional)</label>
<input name="buyerGSTIN" autoComplete="off" value={form.buyerGSTIN} onChange={e => updateField("buyerGSTIN", e.target.value)} style={inp} placeholder="33AABCA1234B1ZX" />              </div>
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
                        <div className="col-4">
                          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Qty</label>
                          <input type="number" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} style={{ ...inp, fontSize: "0.82rem" }} />
                        </div>
                        <div className="col-4">
                          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Rate</label>
                          <input type="number" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} style={{ ...inp, fontSize: "0.82rem" }} />
                        </div>
                        <div className="col-4">
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
                        className={i === 1 ? "col-5" : i === 5 ? "col-1" : "col"}
                        style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em" }}>
                        {h}
                      </div>
                    ))}
                  </div>

                  {form.items.map((item, i) => (
                    <div key={i} className="row g-0 px-3 py-2 align-items-center" style={{ borderTop: "1px solid #f1f5f9" }}>
                      <div className="col" style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{item.sl}</div>
                      <div className="col-5 pe-2">
                        <textarea rows={2} value={item.description} onChange={e => updateItem(i, "description", e.target.value)}
                          style={{ ...inp, resize: "vertical", fontSize: "0.82rem" }} placeholder="Service description..." />
                      </div>
                      <div className="col pe-2">
                        <input type="number" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} style={{ ...inp, fontSize: "0.82rem" }} />
                      </div>
                      <div className="col pe-2">
                        <input type="number" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} style={{ ...inp, fontSize: "0.82rem" }} />
                      </div>
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
                  ...(form.gstType === "With GST" ? [{
                    label: `GST @ ${gstPercent}%`,
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