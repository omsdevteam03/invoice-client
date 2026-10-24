import { useState, useEffect } from "react";
import { FaArrowLeft, FaPrint, FaEdit, FaFileInvoiceDollar, FaClipboardList } from "react-icons/fa";
import { INVOICE_LABELS, INVOICE_FONT, InvoiceLangToggle, useTamilDescriptions, unitLabel, numberToWordsTamil } from "./invoiceLang";
import EwayBillChecklist, { isEwayBillReady } from "./EwayBillChecklist";

function logoStyle(shape, size) {
  if (shape === "circle") return { width: size, height: size, borderRadius: "50%", objectFit: "cover" };
  if (shape === "square") return { width: size, height: size, borderRadius: 8, objectFit: "contain" };
  return { height: size, width: "auto", maxWidth: size * 3, objectFit: "contain" };
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

function formatAmount(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

export default function InvoiceDocument({ invoice, onBack, onEdit, onConvertToFinal, onGenerateEWB, onUpdateEwbVehicle, onCancelEwb }) {
  const isMobile = useIsMobile(700);
  const [lang, setLang] = useState(invoice.invoiceLang === "ta" ? "ta" : "en");
  const [showEwbPanel, setShowEwbPanel] = useState(false); // checklist hidden by default
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
  const words = lang === "ta"
    ? `${L.wordsPrefix} ${numberToWordsTamil(total)} ${L.wordsSuffix}`
    : `${L.wordsPrefix} ${numberToWords(total)} ${L.wordsSuffix}`;
  const isProforma = invoice.invoiceType === "Proforma" || (invoice.invoiceNo || "").startsWith("PI-");

  // E-Way Bill: button works only when every checklist item is ticked
  const ewbReady = isEwayBillReady(invoice);
  const ewbBlocked = !invoice.ewayBillNo && !ewbReady;

  const formatDate = (d) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[parseInt(m) - 1]}-${y}`;
  };

  const cellFontSize = isMobile ? "0.62rem" : "0.78rem";
  const cellPad = isMobile ? "2px 4px" : "5px 10px";

  const mobileCell = (content, style = {}) => (
    <td style={{ border: "1px solid #000", padding: cellPad, fontSize: cellFontSize, lineHeight: 1.3, verticalAlign: "top", ...style }}>
      {content}
    </td>
  );

  const fmtDT = (iso) => iso
    ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
    : "—";
  const ewb = invoice.ewayBillDetails || {};

  const ewbRow = (label, value, bold) => (
    <div style={{ display: "flex", gap: 8, fontSize: isMobile ? "0.66rem" : "0.78rem", padding: "0", lineHeight: 1.3 }}>
      <span style={{ width: isMobile ? 92 : 120, flexShrink: 0, color: "#475569" }}>{label}</span>
      <span style={{ color: "#0f172a", fontWeight: bold ? 700 : 500, wordBreak: "break-word" }}>: {value || "—"}</span>
    </div>
  );

  const partyFont = isMobile ? "0.64rem" : "0.76rem";
  const partyRow = (label, value, bold) => value ? (
    <div style={{ display: "flex", fontSize: partyFont, padding: "0", lineHeight: 1.30, color: "#334155" }}>
      <span style={{ width: isMobile ? 56 : 70, flexShrink: 0 }}>{label}</span>
      <span style={{ width: 10, flexShrink: 0 }}>:</span>
      <span style={{ flex: 1, minWidth: 0, color: "#0f172a", fontWeight: bold ? 700 : 400, whiteSpace: "pre-line", wordBreak: "break-word" }}>
        {value}
      </span>
    </div>
  ) : null;
  const partyLine = (value, bold) => value ? (
    <div style={{ fontSize: partyFont, padding: "0", lineHeight: 1.30, color: bold ? "#0f172a" : "#334155", fontWeight: bold ? 700 : 600, wordBreak: "break-word" }}>
      {value}
    </div>
  ) : null;
  const partyBox = (title, children, divider) => (
    <div style={{ borderLeft: divider && !isMobile ? "1px solid #000" : "none", padding:"3px 8px" }}>
      <div style={{ fontWeight: 700, fontSize: partyFont, color: "#0f172a", padding: "0 0 2px", lineHeight: 1.30 }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
    <div style={{ flex: "1 1 640px", maxWidth: 860, minWidth: 0 }}>

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
       <div className="d-flex justify-content-between align-items-center mb-2 no-print"
        style={{
          flexWrap: "wrap", gap: 6,
          backgroundColor: "#fff", padding: "4px 0",
        }}>
        <div className="d-flex gap-2" style={{ flexWrap: "wrap" }}>
          <button onClick={onBack}
            className="d-flex align-items-center gap-1 border-0 rounded-2 fw-semibold px-2 py-1"
            style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.74rem" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#e2e8f0"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "#f1f5f9"}
          >
            <FaArrowLeft size={12} /> Back
          </button>

          {invoice.ewayBillNo && (
            <>
              <button onClick={() => onUpdateEwbVehicle && onUpdateEwbVehicle(invoice)}
                className="border-0 rounded-2 fw-semibold px-2 py-1"
                style={{ backgroundColor: "#fef3c7", color: "#b45309", fontSize: "0.74rem", cursor: "pointer" }}>
                Update Vehicle
              </button>
              <button onClick={() => onCancelEwb && onCancelEwb(invoice)}
                className="border-0 rounded-2 fw-semibold px-2 py-1"
                style={{ backgroundColor: "#fef2f2", color: "#ef4444", fontSize: "0.74rem", cursor: "pointer" }}>
                Cancel E-Way Bill
              </button>
            </>
          )}
        </div>

        <div className="d-flex gap-2" style={{ flexWrap: "wrap" }}>
          <InvoiceLangToggle lang={lang} onChange={setLang} />

          {isProforma && invoice.status !== "Converted" && (
            <button onClick={() => onConvertToFinal && onConvertToFinal(invoice)}
              className="d-flex align-items-center gap-1 border-0 rounded-2 fw-semibold px-2 py-1"
              style={{ backgroundColor: "#ede9fe", color: "#7c3aed", cursor: "pointer", fontSize: "0.74rem" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#7c3aed"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#ede9fe"; e.currentTarget.style.color = "#7c3aed"; }}
            >
              <FaFileInvoiceDollar size={12} /> Convert to Invoice
            </button>
          )}

          {/* Checklist show/hide toggle */}
          {!isProforma && !invoice.ewayBillNo && (
            <button
              onClick={() => setShowEwbPanel(v => !v)}
              title={showEwbPanel ? "Hide E-Way Bill checklist" : "Show E-Way Bill checklist"}
              className="d-flex align-items-center gap-1 border-0 rounded-2 fw-semibold px-2 py-1"
              style={{
                backgroundColor: showEwbPanel ? "#e2e8f0" : "#f1f5f9",
                color: "#475569", cursor: "pointer", fontSize: "0.74rem",
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                backgroundColor: ewbReady ? "#10b981" : "#f59e0b",
              }} />
              <FaClipboardList size={12} /> Checklist
            </button>
          )}

          {/* Generate E-Way Bill button — disabled until the checklist is fully ticked */}
          {!isProforma && (
            <button
              onClick={() => onGenerateEWB && onGenerateEWB(invoice)}
              disabled={ewbBlocked}
              title={ewbBlocked ? "Open the Checklist and complete it first" : ""}
              className="d-flex align-items-center gap-1 border-0 rounded-2 fw-semibold px-2 py-1"
              style={{
                backgroundColor: invoice.ewayBillNo ? "#ecfdf5" : "#fef3c7",
                color: invoice.ewayBillNo ? "#059669" : "#b45309",
                cursor: ewbBlocked ? "not-allowed" : "pointer",
                opacity: ewbBlocked ? 0.5 : 1,
                fontSize: "0.74rem",
                border: invoice.ewayBillNo ? "1px solid #a7f3d0" : "1px solid #fcd34d"
              }}
              onMouseEnter={e => {
                if (e.currentTarget.disabled) return;
                e.currentTarget.style.backgroundColor = invoice.ewayBillNo ? "#059669" : "#b45309";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={e => {
                if (e.currentTarget.disabled) return;
                e.currentTarget.style.backgroundColor = invoice.ewayBillNo ? "#ecfdf5" : "#fef3c7";
                e.currentTarget.style.color = invoice.ewayBillNo ? "#059669" : "#b45309";
              }}
            >
              <FaFileInvoiceDollar size={12} />
              {invoice.ewayBillNo ? `EWB: ${invoice.ewayBillNo}` : "Generate E-Way Bill"}
            </button>
          )}

          <button onClick={() => onEdit && onEdit(invoice)}
            className="no-print d-flex align-items-center gap-1 border-0 rounded-2 fw-semibold px-2 py-1"
            style={{ backgroundColor: "#eff6ff", color: "#2563eb", cursor: "pointer", fontSize: "0.74rem" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#2563eb"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; }}
          >
            <FaEdit size={12} /> Edit
          </button>

          <button onClick={() => window.print()}
            className="d-flex align-items-center gap-1 border-0 rounded-2 fw-semibold px-3 py-1"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", cursor: "pointer", fontSize: "0.74rem" }}
          >
            <FaPrint size={12} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Invoice Document */}
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

        {/* E-Way Bill details — joined to the invoice table (same border) */}
        {invoice.ewayBillNo && (
          <div style={{ border: "1px solid #000", borderBottom: "none", backgroundColor: "#fff" }}>
            <div style={{
              textAlign: "center", padding: "3px 0", borderBottom: "1px solid #000",
              backgroundColor: "#f1f5f9", fontWeight: 700, lineHeight: 1.3,
              fontSize: isMobile ? "0.75rem" : "0.88rem", color: "#0f172a",
            }}>
              E - WAY BILL
            </div>

            <div style={{ padding: "8px 12px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", columnGap: 16 }}>
              <div>
                {ewbRow("E-Way Bill No.", invoice.ewayBillNo, true)}
                {ewbRow("E-Way Bill Date", fmtDT(invoice.ewayBillDate))}
                {ewbRow("Valid From", fmtDT(invoice.ewayBillDate))}
                {ewbRow("Valid To", fmtDT(invoice.ewayBillValidUpto))}
                {ewbRow("Vehicle No.", ewb.vehicleNo, true)}
                {ewbRow("Transporter ID", ewb.transporterId)}
              </div>
              <div>
                {ewbRow("Mode of Transport", "Road")}
                {ewbRow("Type", "Outward - Supply")}
                {ewbRow("Document Type", "Tax Invoice")}
                {ewbRow("Document No.", invoice.invoiceNo)}
                {ewbRow("Document Date", formatDate(invoice.date))}
                {ewbRow("From Place", ewb.fromPlace)}
                {ewbRow("To Place", ewb.toPlace)}
              </div>
            </div>

          </div>
        )}

        <table style={{
          width: "100%", borderCollapse: "collapse", border: "1px solid #000",
          tableLayout: isMobile ? "fixed" : "auto",
          overflowWrap: "anywhere",
        }}>
          {isMobile && (
            <colgroup>
              <col style={{ width: "7%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "19%" }} />
              <col style={{ width: "19%" }} />
            </colgroup>
          )}
          <tbody>

            {/* Header Row */}
            <tr>
              <td colSpan={3} style={{ border: "1px solid #000", padding: isMobile ? "4px 8px" : "5px 12px" }}>
                <div className="d-flex align-items-start gap-3">
                  {invoice.logo && (
                    <img src={invoice.logo} alt="Logo" style={{ ...logoStyle(invoice.logoShape, isMobile ? 32 : 40), flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: isMobile ? "0.76rem" : "0.88rem", lineHeight: 1.3, color: "#0f172a" }}>{invoice.companyName}</div>
                    {invoice.companyAddress && (
                      <div style={{ fontSize: isMobile ? "0.62rem" : "0.72rem", lineHeight: 1.3, color: "#334155", whiteSpace: "pre-line", marginTop: 0 }}>
                        {invoice.companyAddress}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td colSpan={3} style={{ border: "1px solid #000", padding: isMobile ? "4px 8px" : "5px 12px", verticalAlign: "top" }}>
                <div style={{ fontSize: isMobile ? "0.64rem" : "0.78rem", lineHeight: 1.3, whiteSpace: isMobile ? "normal" : "nowrap", marginBottom: 1 }}>
                  <span style={{ color: "#64748b" }}>{L.invoiceNo}: </span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{invoice.invoiceNo}</span>
                </div>
                <div style={{ fontSize: isMobile ? "0.64rem" : "0.78rem", lineHeight: 1.3, whiteSpace: isMobile ? "normal" : "nowrap" }}>
                  <span style={{ color: "#64748b" }}>{L.dated}: </span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatDate(invoice.date)}</span>
                </div>
              </td>
            </tr>

                 {/* From / To boxes */}
            <tr>
              <td colSpan={6} style={{ border: "1px solid #000", padding: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 0 }}>
                  {partyBox(lang === "ta" ? L.to.replace(/:$/, "") : "To", (
                    <>
                      {partyLine(`${invoice.buyerSalutation ? invoice.buyerSalutation + " " : ""}${invoice.buyerName || ""}`.trim(), true)}
                      {partyLine(invoice.buyerCompanyName)}
                      {partyRow("GSTIN", invoice.buyerGSTIN)}
                      {partyRow(L.address, invoice.buyerAddress)}
                      {partyRow(L.mobile, invoice.buyerMobile)}
                    </>
                  ))}
                  {partyBox(lang === "ta" ? L.from.replace(/:$/, "") : "From", (
                    <>
                      {partyLine(invoice.companyName, true)}
                      {partyRow("GSTIN", invoice.companyGSTIN)}
                      {partyRow(L.address, invoice.companyAddress)}
                      {partyRow(L.mobile, invoice.companyMobile)}
                      {partyRow("Email", invoice.companyEmail)}
                    </>
                  ), true)}
                </div>
              </td>
            </tr>

             

            <tr style={{ backgroundColor: "#f1f5f9" }}>
              {mobileCell(L.sl, { fontWeight: 700, textAlign: "center", width: "6%", whiteSpace: "nowrap" })}
              {mobileCell(L.description, { fontWeight: 700, width: "38%" })}
              {mobileCell("HSN / SAC", { fontWeight: 700, textAlign: "center", width: "12%", whiteSpace: isMobile ? "normal" : "nowrap" })}
              {mobileCell(L.qty, { fontWeight: 700, textAlign: "center", width: "12%" })}
              {mobileCell(L.rate, { fontWeight: 700, textAlign: "right", width: "16%", whiteSpace: isMobile ? "normal" : "nowrap" })}
              {mobileCell(L.amount, { fontWeight: 700, textAlign: "right", width: "16%", whiteSpace: isMobile ? "normal" : "nowrap" })}
            </tr>

            {/* Items */}
            {invoice.items.map((item, i) => (
              <tr key={i}>
                {mobileCell(item.sl, { textAlign: "center" })}
                {mobileCell(
                  <>
                    {tDesc(item)}
                    {Number(item.discount) > 0 && (
                      <div style={{ fontSize: isMobile ? "0.58rem" : "0.7rem", color: "#64748b" }}>
                        {lang === "ta" ? "தள்ளுபடி" : "Discount"}: {item.discountType === "amount" ? `₹${Number(item.discount).toLocaleString("en-IN")}` : `${item.discount}%`}
                      </div>
                    )}
                  </>
                )}
                {mobileCell(item.hsnCode || "—", { textAlign: "center" })}
                {mobileCell(`${item.qty}${item.unit ? " " + unitLabel(item.unit, lang) : ""}`, { textAlign: "center", whiteSpace: "nowrap" })}
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
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(<strong>{formatAmount(invoice.gstType === "GST Included" ? total : subtotal)}</strong>, { border: "1px solid #000", textAlign: "right" })}
            </tr>

            {/* GST */}
            {invoice.gstType !== "No GST" && (
              <tr>
                {mobileCell("", { border: "1px solid #000" })}
                {mobileCell(<strong>{`${L.gst} @ ${gstPercent}%${invoice.gstType === "GST Included" ? ` (${L.included})` : ""}`}</strong>, { border: "1px solid #000" })}
                {mobileCell("", { border: "1px solid #000" })}
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
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(<strong>{formatAmount(total)}</strong>, { border: "1px solid #000", textAlign: "right" })}
            </tr>

            {/* Amount Paid */}
            <tr>
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(L.paid, { border: "1px solid #000" })}
              {mobileCell("", { border: "1px solid #000" })}
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
              {mobileCell("", { border: "1px solid #000" })}
              {mobileCell(<strong>{formatAmount(due)}</strong>, { border: "1px solid #000", textAlign: "right", color: "#059669" })}
            </tr>

            {/* Amount in Words */}
            <tr>
              <td colSpan={invoice.dueDate ? 4 : 6} style={{ border: "1px solid #000", padding: isMobile ? "3px 8px" : "4px 12px" }}>
                <div style={{ fontSize: isMobile ? "0.6rem" : "0.7rem", lineHeight: 1.3, color: "#64748b" }}>{L.inWords}</div>
                <div style={{ fontWeight: 700, fontSize: isMobile ? "0.64rem" : "0.76rem", lineHeight: 1.3, color: "#0f172a" }}>{words}</div>
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
              <td colSpan={3} style={{ border: "1px solid #000", padding: isMobile ? "3px 8px" : "4px 12px", verticalAlign: "top" }}>
                <div style={{ fontWeight: 700, fontSize: isMobile ? "0.64rem" : "0.76rem", lineHeight: 1.3, textDecoration: "underline", marginBottom: 1 }}>{L.declaration}</div>
                <div style={{ fontSize: isMobile ? "0.62rem" : "0.72rem", color: "#334155", lineHeight: 1.3 }}>
                  {L.declarationText}
                </div>
                {invoice.notes && (
                  <div style={{ fontSize: isMobile ? "0.62rem" : "0.72rem", lineHeight: 1.3, color: "#475569", marginTop: 2, fontStyle: "italic", whiteSpace: "pre-line" }}>
                    {L.note}: {invoice.notes}
                  </div>
                )}
              </td>
              <td colSpan={3} style={{ border: "1px solid #000", padding: isMobile ? "3px 8px" : "4px 12px", textAlign: "right", verticalAlign: "bottom" }}>
                <div style={{ fontSize: isMobile ? "0.64rem" : "0.76rem", lineHeight: 1.3, color: "#334155" }}>{L.forCompany(invoice.companyName)}</div>
                <div style={{ margin: "2px 0", minHeight: 36, display: "flex", justifyContent: "flex-end" }}>
                  {invoice.signature
                    ? <img src={invoice.signature} alt="Signature" style={{ maxHeight: 40, maxWidth: 140, objectFit: "contain" }} />
                    : <div style={{ width: 140, height: 36 }} />
                  }
                </div>
                <div style={{ fontSize: isMobile ? "0.64rem" : "0.76rem", lineHeight: 1.3, color: "#475569" }}>{L.signatory}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* System generated note */}
        <div style={{
          textAlign: "center",
          marginTop: 4,
          lineHeight: 1.3,
          fontSize: isMobile ? "0.6rem" : "0.7rem",
          color: "#64748b",
          fontStyle: "italic",
        }}>
          {lang === "ta"
            ? "இது கணினியால் உருவாக்கப்பட்ட விலைப்பட்டியல்."
            : "This is a system generated invoice."}
        </div>
      </div>
    </div>

    {/* E-Way Bill checklist — right side, hidden for Proforma and when printing */}
    {!isProforma && showEwbPanel && <EwayBillChecklist invoice={invoice} />}
    </div>
  );
}