import { useState, useEffect } from "react";
import { FaArrowLeft, FaPrint, FaEdit, FaFileInvoiceDollar } from "react-icons/fa";
import { INVOICE_LABELS, INVOICE_FONT, InvoiceLangToggle, useTamilDescriptions } from "./invoiceLang";

function logoStyle(shape, size) {
  if (shape === "circle") return { width: size, height: size, borderRadius: "50%", objectFit: "cover" };
  if (shape === "square") return { width: size, height: size, borderRadius: 8, objectFit: "contain" };
  return { height: size, width: "auto", maxWidth: size * 3, objectFit: "contain" }; // original
}

function numberToWords(num) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  num = Math.round(Number(num));
  if (!Number.isFinite(num) || num < 0) return "Zero";

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

// ── Hook: track viewport for responsive layout ──────────────────────────────
function useIsMobile(breakpoint = 700) {
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

const cell = (content, style = {}) => (
  <td style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "0.82rem", verticalAlign: "top", ...style }}>
    {content}
  </td>
);

export default function InvoiceDocument({ invoice, onBack, onEdit, onConvertToFinal }) {
  const isMobile = useIsMobile(700);
  const [lang, setLang] = useState(invoice.invoiceLang === "ta" ? "ta" : "en");
  const L = INVOICE_LABELS[lang];
  const tDesc = useTamilDescriptions(invoice.items, lang);
  const rawSum = invoice.items.reduce((a, b) => a + Number(b.amount), 0);
  const gstPercent = Number(invoice.gstPercent || 18);
  let subtotal, tax, total;
  if (invoice.gstType === "With GST") {
    subtotal = rawSum;
    tax = Math.round(subtotal * (gstPercent / 100));
    total = subtotal + tax;
  } else if (invoice.gstType === "GST Included") {
    total = rawSum;
    tax = Math.round(rawSum - (rawSum / (1 + gstPercent / 100)));
    subtotal = total - tax;
  } else {
    subtotal = rawSum;
    tax = 0;
    total = subtotal;
  }
  const amountPaid = Number(invoice.amountPaid || 0);
  const due = total - amountPaid;
  const words = `INR – Indian Rupees ${numberToWords(total)} Only`;
  const isProforma = invoice.invoiceType === "Proforma" || (invoice.invoiceNo || "").startsWith("PI-");
  const formatDate = (d) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[parseInt(m) - 1]}-${y}`;
  };

  // On mobile, shrink font sizes / padding so the (still) table-based
  // invoice document scrolls horizontally instead of squashing illegibly.
  const cellFontSize = isMobile ? "0.64rem" : "0.82rem";
  const cellPad = isMobile ? "4px 4px" : "6px 8px";

  const mobileCell = (content, style = {}) => (
    <td style={{ border: "1px solid #000", padding: cellPad, fontSize: cellFontSize, verticalAlign: "top", ...style }}>
      {content}
    </td>
  );

  return (
    <div style={{ maxWidth: "860px" }}>

      <style>{`
        @media print {
          .no-print { display: none !important; }

          .print-modal-backdrop {
            position: static !important;
            inset: auto !important;
            background: #fff !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            display: block !important;
          }
          .print-modal-card {
            position: static !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
          .print-doc {
            padding: 20px !important;
            background: #fff !important;
          }
        }
      `}</style>


      {/* Top Bar */}
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
        <div className="d-flex gap-2" style={{ flexWrap: "wrap" }}>
          <InvoiceLangToggle lang={lang} onChange={setLang} />
          {isProforma && invoice.status !== "Converted" && (
            <button onClick={() => onConvertToFinal && onConvertToFinal(invoice)}
              className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
              style={{ backgroundColor: "#ede9fe", color: "#7c3aed", cursor: "pointer", fontSize: "0.85rem" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#7c3aed"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#ede9fe"; e.currentTarget.style.color = "#7c3aed"; }}
            >
              <FaFileInvoiceDollar size={12} /> Convert to Invoice
            </button>
          )}

          <button onClick={() => onEdit && onEdit(invoice)}
            className="no-print d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
            style={{ backgroundColor: "#eff6ff", color: "#2563eb", cursor: "pointer", fontSize: "0.85rem" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#2563eb"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; }}
          >
            <FaEdit size={12} /> Edit
          </button>

          <button onClick={() => window.print()}
            className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-4 py-2"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", cursor: "pointer", fontSize: "0.85rem" }}
          >
            <FaPrint size={12} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Invoice Document — scrolls horizontally on narrow screens instead
          of squashing the table illegibly, since it's a fixed-format doc. */}
      <div
        className="print-doc"
        style={{
          padding: isMobile ? "14px" : "32px",
          fontFamily: INVOICE_FONT,
          overflowX: isMobile ? "auto" : "visible",
          backgroundColor: "#fff",
        }}
      >
        {invoice.invoiceType === "Proforma" && (
          <div style={{
            textAlign: "center", fontWeight: 700, letterSpacing: "0.08em",
            fontSize: isMobile ? "0.85rem" : "1rem", color: "#7c3aed",
            border: "1.5px solid #7c3aed", borderRadius: 8, padding: "6px 0",
            marginBottom: 12, backgroundColor: "#f5f3ff",
          }}>
            {L.proforma}
          </div>
        )}
        <table style={{
          width: "100%", borderCollapse: "collapse", border: "1px solid #000",
          tableLayout: isMobile ? "fixed" : "auto",
          overflowWrap: "anywhere",
        }}>
          {isMobile && (
            <colgroup>
              <col style={{ width: "8%" }} />
              <col style={{ width: "38%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
            </colgroup>
          )}
          <tbody>

            {/* Header Row — Company + Invoice Info */}
            <tr>
              <td colSpan={3} style={{ border: "1px solid #000", padding: isMobile ? "8px" : "10px 12px" }}>
                <div className="d-flex align-items-start gap-3">
                  {/* Logo placeholder */}
                  {invoice.logo && (
                    <img src={invoice.logo} alt="Logo" style={{ ...logoStyle(invoice.logoShape, isMobile ? 40 : 52), flexShrink: 0 }} />
                  )}

                  <div>
                    <div style={{ fontWeight: 700, fontSize: isMobile ? "0.8rem" : "0.95rem", color: "#0f172a" }}>{invoice.companyName}</div>
                    {invoice.companyAddress && (
                      <div style={{ fontSize: isMobile ? "0.65rem" : "0.78rem", color: "#334155", whiteSpace: "pre-line" }}>{invoice.companyAddress}</div>
                    )}
                    {invoice.companyGSTIN && (
                      <div style={{ fontSize: isMobile ? "0.65rem" : "0.78rem", color: "#334155" }}>{L.gstNumber}: {invoice.companyGSTIN}</div>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ border: "1px solid #000", padding: isMobile ? "8px" : "10px 12px", verticalAlign: "top" }}>
                <div style={{ fontSize: isMobile ? "0.65rem" : "0.78rem", color: "#64748b" }}>{L.invoiceNo}</div>
                <div style={{ fontWeight: 700, fontSize: isMobile ? "0.8rem" : "0.95rem", color: "#0f172a" }}>{invoice.invoiceNo}</div>
              </td>
              <td style={{ border: "1px solid #000", padding: isMobile ? "8px" : "10px 12px", verticalAlign: "top" }}>
                <div style={{ fontSize: isMobile ? "0.65rem" : "0.78rem", color: "#64748b" }}>{L.dated}</div>
                <div style={{ fontWeight: 700, fontSize: isMobile ? "0.65rem" : "0.88rem", color: "#0f172a", whiteSpace: isMobile ? "normal" : "nowrap" }}>{formatDate(invoice.date)}</div>
              </td>
            </tr>

            {/* Buyer Row */}
            <tr>
              <td colSpan={5} style={{ border: "1px solid #000", padding: isMobile ? "6px 8px" : "8px 12px" }}>
                <div style={{ fontSize: isMobile ? "0.62rem" : "0.75rem", color: "#64748b", marginBottom: 2 }}>{L.buyer}</div>
                <div style={{ fontWeight: 700, fontSize: isMobile ? "0.75rem" : "0.88rem", color: "#0f172a" }}>
                  {L.name}: {invoice.buyerName}
                </div>
                {invoice.buyerCompanyName && (
                  <div style={{ fontWeight: 600, fontSize: isMobile ? "0.68rem" : "0.82rem", color: "#334155" }}>
                    {L.company}: {invoice.buyerCompanyName}
                  </div>
                )}
                {invoice.buyerAddress && (
                  <div style={{ fontSize: isMobile ? "0.68rem" : "0.82rem", color: "#334155", whiteSpace: "pre-line" }}>{invoice.buyerAddress}</div>
                )}

                {invoice.buyerMobile && (
                  <div style={{ fontSize: isMobile ? "0.68rem" : "0.82rem", color: "#334155" }}>{L.mobile}: {invoice.buyerMobile}</div>
                )}

                {invoice.buyerGSTIN && (
                  <div style={{ fontSize: isMobile ? "0.68rem" : "0.82rem", color: "#334155" }}>GSTIN: {invoice.buyerGSTIN}</div>
                )}
              </td>
            </tr>

            {/* Table Header */}
            <tr style={{ backgroundColor: "#f1f5f9" }}>
              {mobileCell(L.sl, { fontWeight: 700, textAlign: "center", width: "6%" })}
              {mobileCell(L.description, { fontWeight: 700, width: "46%" })}
              {mobileCell(L.qty, { fontWeight: 700, textAlign: "center", width: "14%" })}
              {mobileCell(L.rate, { fontWeight: 700, textAlign: "right", width: "17%", whiteSpace: isMobile ? "normal" : "nowrap" })}
              {mobileCell(L.amount, { fontWeight: 700, textAlign: "right", width: "17%", whiteSpace: isMobile ? "normal" : "nowrap" })}
            </tr>

            {/* Items */}
            {invoice.items.map((item, i) => (
              <tr key={i}>
                {mobileCell(item.sl, { textAlign: "center" })}
                {mobileCell(tDesc(item))}
                {mobileCell(`${item.qty}${item.unit ? " " + item.unit : ""}`, { textAlign: "center", whiteSpace: "nowrap" })}
                {mobileCell(formatAmount(item.rate), { textAlign: "right" })}
                {mobileCell(formatAmount(item.amount), { textAlign: "right" })}
              </tr>
            ))}

            {/* Subtotal */}
            <tr>
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(<strong>{L.subTotal}</strong>, { border: "1px solid #000" })}
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(<strong>{formatAmount(subtotal)}</strong>, { border: "1px solid #000", textAlign: "right" })}
            </tr>

            {/* GST */}
            {invoice.gstType !== "No GST" && (
              <tr>
                {mobileCell("", { border: "1px solid #000" })}
                {mobileCell(<strong>{`${L.gst} @ ${gstPercent}%${invoice.gstType === "GST Included" ? ` (${L.included})` : ""}`}</strong>, { border: "1px solid #000" })}
                {mobileCell("", { border: "1px solid #000" })}
                {mobileCell("", { border: "1px solid #000" })}
                {mobileCell(<strong>{formatAmount(tax)}</strong>, { border: "1px solid #000", textAlign: "right" })}
              </tr>
            )}

            {/* Total Invoice Value */}
            <tr>
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(<strong>{L.total}</strong>, { border: "1px solid #000" })}
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(<strong>{formatAmount(total)}</strong>, { border: "1px solid #000", textAlign: "right" })}
            </tr>

            {/* Amount Paid */}
            <tr>
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(L.paid, { border: "1px solid #000" })}
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(formatAmount(amountPaid), { border: "1px solid #000", textAlign: "right" })}
            </tr>

            {/* Amount Due */}
            <tr style={{ backgroundColor: "#ecfdf5" }}>
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(<strong>{L.due}</strong>, { border: "1px solid #000" })}
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(<strong>{formatAmount(due)}</strong>, { border: "1px solid #000", textAlign: "right", color: "#059669" })}
            </tr>

            {/* Amount in Words */}
            <tr>
              <td colSpan={invoice.dueDate ? 3 : 5} style={{ border: "1px solid #000", padding: isMobile ? "6px 8px" : "8px 12px" }}>
                <div style={{ fontSize: isMobile ? "0.62rem" : "0.75rem", color: "#64748b" }}>{L.inWords}</div>
                <div style={{ fontWeight: 700, fontSize: isMobile ? "0.68rem" : "0.82rem", color: "#0f172a" }}>{words}</div>
              </td>
              {invoice.dueDate && (
                <td colSpan={2} style={{ border: "1px solid #000", padding: isMobile ? "6px 8px" : "8px 12px" }}>
                  <div style={{ fontSize: isMobile ? "0.62rem" : "0.75rem", color: "#64748b" }}>{L.dueDate}</div>
                  <div style={{ fontWeight: 700, fontSize: isMobile ? "0.68rem" : "0.82rem" }}>{formatDate(invoice.dueDate)}</div>
                </td>
              )}
            </tr>

            {/* Declaration + Signature */}
            <tr>
              <td colSpan={3} style={{ border: "1px solid #000", padding: isMobile ? "6px 8px" : "8px 12px", verticalAlign: "top" }}>
                <div style={{ fontWeight: 700, fontSize: isMobile ? "0.68rem" : "0.82rem", textDecoration: "underline", marginBottom: 4 }}>{L.declaration}</div>
                <div style={{ fontSize: isMobile ? "0.65rem" : "0.78rem", color: "#334155", lineHeight: 1.6 }}>
                  {L.declarationText}
                </div>
                {invoice.notes && (
                  <div style={{ fontSize: isMobile ? "0.65rem" : "0.78rem", color: "#475569", marginTop: 6, fontStyle: "italic", whiteSpace: "pre-line" }}>
                    {L.note}: {invoice.notes}
                  </div>
                )}
              </td>
              <td colSpan={2} style={{ border: "1px solid #000", padding: isMobile ? "6px 8px" : "8px 12px", textAlign: "right", verticalAlign: "bottom" }}>
                <div style={{ fontSize: isMobile ? "0.68rem" : "0.82rem", color: "#334155" }}>{L.forCompany(invoice.companyName)}</div>    {/* Signature Image or Upload */}
                <div style={{ margin: "8px 0", minHeight: 48, display: "flex", justifyContent: "flex-end" }}>
                  {invoice.signature
                    ? <img src={invoice.signature} alt="Signature" style={{ maxHeight: 60, maxWidth: 160, objectFit: "contain" }} />
                    : <div style={{ width: 160, height: 52 }} />
                  }
                </div>

                <div style={{ fontSize: isMobile ? "0.68rem" : "0.82rem", color: "#475569" }}>{L.signatory}</div>
              </td>
            </tr>

          </tbody>
        </table>

        {/* Table now fits the screen width, so no sideways-scroll hint is needed */}

      </div>
    </div>
  );
}