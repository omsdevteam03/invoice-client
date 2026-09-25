import { useState } from "react";
import { FaMoneyBillWave, FaTimes } from "react-icons/fa";

const paymentMethods = ["UPI", "Cash", "Bank Transfer", "Card", "Cheque", "Other"];

// Same total/due calculation used in InvoiceList — kept local here so this
// modal doesn't depend on InvoiceList's internals.
function calcTotals(invoice) {
  const subtotal = (invoice.items || []).reduce((a, b) => a + b.amount, 0);
  const gstPercent = Number(invoice.gstPercent || 18);
  const tax = invoice.gstType === "With GST" ? Math.round(subtotal * (gstPercent / 100)) : 0;
  const total = invoice.gstType === "With GST" ? subtotal + tax : subtotal;
  const due = invoice.status === "Paid" ? 0 : total - (invoice.amountPaid || 0);
  return { total, due };
}

/**
 * ReceivePaymentModal
 *
 * Props:
 * - invoice: the invoice object the payment is for (required — modal is
 *   hidden by rendering `null` when this is falsy, so parents can do
 *   `{paymentInvoice && <ReceivePaymentModal invoice={paymentInvoice} .../>}`
 *   or just always render it and pass invoice={null} when closed)
 * - onClose: () => void — called on Cancel / backdrop click / X button
 * - onSave: (invoice, paymentData) => void — called with the invoice and
 *   { amount, method, referenceNo } when "Save Payment" is clicked
 */
export default function ReceivePaymentModal({ invoice, onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [referenceNo, setReferenceNo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!invoice) return null;

  const { total, due } = calcTotals(invoice);
  const alreadyPaid = invoice.amountPaid || 0;

  const handleSave = async () => {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    if (amt > due) {
      setError(`Amount can't exceed the remaining balance of ₹${due.toLocaleString()}.`);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave(invoice, { amount: amt, method, referenceNo });
      // Reset local form state for next time the modal opens
      setAmount("");
      setMethod("UPI");
      setReferenceNo("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(15,23,42,0.8)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#fff", borderRadius: "16px", width: "100%", maxWidth: "420px",
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center px-4 py-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 32, height: 32, background: "#fef3c7", color: "#b45309" }}
            >
              <FaMoneyBillWave size={14} />
            </div>
            <div className="fw-bold" style={{ color: "#0f172a", fontSize: "1.05rem" }}>Receive Payment</div>
          </div>
          <button
            onClick={onClose}
            className="border-0 rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 32, height: 32, backgroundColor: "#f1f5f9", color: "#64748b", cursor: "pointer" }}
          >
            <FaTimes size={12} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {/* Summary block */}
          <div style={{ backgroundColor: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            <SummaryRow label="Invoice" value={invoice.invoiceNo} />
            <SummaryRow label="Invoice Total" value={`₹${total.toLocaleString()}`} />
            <SummaryRow label="Already Paid" value={`₹${alreadyPaid.toLocaleString()}`} />
            <SummaryRow label="Remaining" value={`₹${due.toLocaleString()}`} bold last />
          </div>

          {/* Payment Amount */}
          <Field label="Payment Amount">
            <input
              type="number"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError(""); }}
              placeholder={`Up to ₹${due.toLocaleString()}`}
              min={0}
              max={due}
              style={inputStyle}
              autoFocus
            />
          </Field>

          {/* Payment Method */}
          <Field label="Payment Method">
            <select value={method} onChange={e => setMethod(e.target.value)} style={inputStyle}>
              {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>

          {/* Reference No. */}
          <Field label="Reference No." optional>
            <input
              type="text"
              value={referenceNo}
              onChange={e => setReferenceNo(e.target.value)}
              placeholder="Transaction / UTR / cheque no."
              style={inputStyle}
            />
          </Field>

          {error && (
            <div style={{ color: "#ef4444", fontSize: "0.78rem", fontWeight: 600, marginTop: 4, marginBottom: 4 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="d-flex gap-2 px-4 pb-4 pt-1">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-fill fw-semibold border-0"
            style={{ background: "#f1f5f9", color: "#334155", borderRadius: 8, padding: "10px", fontSize: "0.85rem", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-fill fw-semibold border-0"
            style={{
              background: "linear-gradient(135deg,#1F6F5C,#134A3E)",
              color: "#fff",
              borderRadius: 8,
              padding: "10px",
              fontSize: "0.85rem",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold, last }) {
  return (
    <div
      className="d-flex justify-content-between align-items-center"
      style={{ padding: "4px 0", borderBottom: last ? "none" : "1px dashed #e2e8f0" }}
    >
      <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: bold ? "0.95rem" : "0.85rem", fontWeight: bold ? 700 : 600, color: bold ? "#1F6F5C" : "#0f172a" }}>
        {value}
      </span>
    </div>
  );
}

function Field({ label, optional, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: 6 }}>
        {label} {optional && <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  border: "1.5px solid #e2e8f0",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: "0.85rem",
  color: "#0f172a",
  outline: "none",
  backgroundColor: "#fff",
};