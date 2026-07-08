import { FaArrowLeft, FaPrint, FaEdit } from "react-icons/fa";
import { companyInfo } from "../../data/invoiceData";

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
  <td style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "0.82rem", verticalAlign: "top", ...style }}>
    {content}
  </td>
);

export default function InvoiceDocument({ invoice, onBack, onEdit }) {
  const subtotal = invoice.items.reduce((a, b) => a + Number(b.amount), 0);
  const tax = invoice.gstType === "With GST" ? Math.round(subtotal * 0.18)
    : invoice.gstType === "Without GST" ? Math.round(subtotal - subtotal / 1.18)
    : 0;
  const total = invoice.gstType === "With GST" ? subtotal + tax : subtotal;
  const amountPaid = Number(invoice.amountPaid || 0);
  const due = total - amountPaid;
  const words = `INR – Indian Rupees ${numberToWords(total)} Only`;

  const formatDate = (d) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[parseInt(m) - 1]}-${y}`;
  };

  return (
    <div style={{ maxWidth: "860px" }}>

      {/* Top Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <button onClick={onBack}
          className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
          style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "#e2e8f0"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "#f1f5f9"}
        >
          <FaArrowLeft size={12} /> Back
        </button>
        <div className="d-flex gap-2">
          <button onClick={() => onEdit(invoice)}
            className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
            style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f97316"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#475569"; }}
          >
            <FaEdit size={12} /> Edit
          </button>
          <button onClick={() => window.print()}
            className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-4 py-2"
            style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", cursor: "pointer", fontSize: "0.85rem" }}
          >
            <FaPrint size={12} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-white print-doc" style={{ padding: "32px", fontFamily: "Arial, sans-serif" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
          <tbody>

            {/* Header Row — Company + Invoice Info */}
            <tr>
              <td colSpan={2} style={{ border: "1px solid #000", padding: "10px 12px", width: "60%" }}>
                <div className="d-flex align-items-start gap-3">
                  {/* Logo placeholder */}
                  {companyInfo.logo
  ? <img src={companyInfo.logo} alt="Logo" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  : <div style={{ width: 52, height: 52, backgroundColor: "#f97316", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.7rem", textAlign: "center", lineHeight: 1.2 }}>OMS</span>
    </div>
}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{companyInfo.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#334155", whiteSpace: "pre-line" }}>{companyInfo.address}</div>
                    <div style={{ fontSize: "0.78rem", color: "#334155" }}>GST Number (GSTIN): {companyInfo.gstin}</div>
                  </div>
                </div>
              </td>
              <td style={{ border: "1px solid #000", padding: "10px 12px", verticalAlign: "top", width: "25%" }}>
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Invoice No.</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{invoice.invoiceNo}</div>
              </td>
              <td style={{ border: "1px solid #000", padding: "10px 12px", verticalAlign: "top", width: "15%" }}>
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Dated</div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>{formatDate(invoice.date)}</div>
              </td>
            </tr>

            {/* Buyer Row */}
            <tr>
              <td colSpan={4} style={{ border: "1px solid #000", padding: "8px 12px" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 2 }}>Buyer (Bill to)</div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>{invoice.buyerName}</div>
                <div style={{ fontSize: "0.82rem", color: "#334155" }}>{invoice.buyerAddress}</div>
                <div style={{ fontSize: "0.82rem", color: "#334155" }}>Mobile: {invoice.buyerMobile}</div>
                {invoice.buyerGSTIN && (
                  <div style={{ fontSize: "0.82rem", color: "#334155" }}>GSTIN: {invoice.buyerGSTIN}</div>
                )}
              </td>
            </tr>

            {/* Table Header */}
            <tr style={{ backgroundColor: "#f1f5f9" }}>
              {cell("Sl. No.", { fontWeight: 700, textAlign: "center", width: "6%" })}
              {cell("Description of Services", { fontWeight: 700, width: "52%" })}
              {cell("Qty", { fontWeight: 700, textAlign: "center", width: "8%" })}
              {cell("Rate (₹)", { fontWeight: 700, textAlign: "right", width: "17%" })}
              {cell("Amount (₹)", { fontWeight: 700, textAlign: "right", width: "17%" })}
            </tr>

            {/* Items */}
            {invoice.items.map((item, i) => (
              <tr key={i}>
                {cell(item.sl, { textAlign: "center" })}
                {cell(item.description)}
                {cell(item.qty, { textAlign: "center" })}
                {cell(`${Number(item.rate).toFixed(2)}`, { textAlign: "right" })}
                {cell(`${Number(item.amount).toFixed(2)}`, { textAlign: "right" })}
              </tr>
            ))}

            {/* Subtotal */}
            <tr>
              {cell("", { border: "1px solid #000" })}
              {cell(<strong>Sub Total</strong>, { border: "1px solid #000" })}
              {cell("", { border: "1px solid #000" })}
              {cell("", { border: "1px solid #000" })}
              {cell(<strong>{subtotal.toFixed(2)}</strong>, { border: "1px solid #000", textAlign: "right" })}
            </tr>

         {/* GST */}
            {invoice.gstType !== "No GST" && (
              <tr>
                {cell("", { border: "1px solid #000" })}
                {cell(<strong>{invoice.gstType === "With GST" ? "GST @ 18%" : "GST (included)"}</strong>, { border: "1px solid #000" })}
                {cell("", { border: "1px solid #000" })}
                {cell("", { border: "1px solid #000" })}
                {cell(<strong>{tax.toFixed(2)}</strong>, { border: "1px solid #000", textAlign: "right" })}
              </tr>
            )}

            {/* Total Invoice Value */}
            <tr>
              {cell("", { border: "1px solid #000" })}
              {cell(<strong>Total Invoice Value</strong>, { border: "1px solid #000" })}
              {cell("", { border: "1px solid #000" })}
              {cell("", { border: "1px solid #000" })}
              {cell(<strong>{total.toFixed(2)}</strong>, { border: "1px solid #000", textAlign: "right" })}
            </tr>

            {/* Amount Paid */}
            <tr>
              {cell("", { border: "1px solid #000" })}
              {cell("Amount Paid", { border: "1px solid #000" })}
              {cell("", { border: "1px solid #000" })}
              {cell("", { border: "1px solid #000" })}
              {cell(amountPaid.toFixed(2), { border: "1px solid #000", textAlign: "right" })}
            </tr>

            {/* Amount Due */}
            <tr style={{ backgroundColor: "#fff7ed" }}>
              {cell("", { border: "1px solid #000" })}
              {cell(<strong>Amount Due</strong>, { border: "1px solid #000" })}
              {cell("", { border: "1px solid #000" })}
              {cell("", { border: "1px solid #000" })}
              {cell(<strong>{due.toFixed(2)}</strong>, { border: "1px solid #000", textAlign: "right", color: "#ea580c" })}
            </tr>

            {/* Amount in Words */}
            <tr>
              <td colSpan={3} style={{ border: "1px solid #000", padding: "8px 12px" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Amount Chargeable (In words)</div>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>{words}</div>
              </td>
              <td colSpan={2} style={{ border: "1px solid #000", padding: "8px 12px" }}>
                {invoice.dueDate && (
                  <>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Due Date</div>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{formatDate(invoice.dueDate)}</div>
                  </>
                )}
              </td>
            </tr>

            {/* Declaration + Signature */}
          {/* Declaration + Signature */}
<tr>
  <td colSpan={3} style={{ border: "1px solid #000", padding: "8px 12px", verticalAlign: "top" }}>
    <div style={{ fontWeight: 700, fontSize: "0.82rem", textDecoration: "underline", marginBottom: 4 }}>Declaration:</div>
    <div style={{ fontSize: "0.78rem", color: "#334155", lineHeight: 1.6 }}>
      We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
    </div>
    {invoice.notes && (
      <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: 6, fontStyle: "italic" }}>
        Note: {invoice.notes}
      </div>
    )}
  </td>
  <td colSpan={2} style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "right", verticalAlign: "bottom" }}>
    <div style={{ fontSize: "0.82rem", color: "#334155" }}>For OrangeMegaSoftware Pvt ltd</div>

    {/* Signature Image or Upload */}
    <div style={{ margin: "8px 0", minHeight: 48, display: "flex", justifyContent: "flex-end" }}>
      {invoice.signature
        ? <img src={invoice.signature} alt="Signature" style={{ maxHeight: 60, maxWidth: 160, objectFit: "contain" }} />
     : <div style={{ width: 160, height: 52 }} />
      }
    </div>

    <div style={{ fontSize: "0.82rem", color: "#475569" }}>Authorized Signatory</div>
  </td>
</tr>

          </tbody>
        </table>

       
      </div>
    </div>
  );
}