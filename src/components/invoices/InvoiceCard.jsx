import { FaEye, FaEdit, FaTrash, FaChevronRight, FaCalendarAlt, FaUser } from "react-icons/fa";

const statusConfig = {
  Paid: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  Unpaid: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  Overdue: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
  Draft: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
};

export default function InvoiceCard({ invoice, onView, onEdit, onDelete }) {
  const sc = statusConfig[invoice.status] || statusConfig.Draft;
 // InvoiceCard.jsx
const subtotal = invoice.items.reduce((a, b) => a + b.amount, 0);
const tax = invoice.gstType === "With GST" ? Math.round(subtotal * 0.18)
  : invoice.gstType === "Without GST" ? Math.round(subtotal - subtotal / 1.18)
  : 0;
const total = invoice.gstType === "With GST" ? subtotal + tax : subtotal;

// Status "Paid" ஆ இருந்தா due = 0
const due = invoice.status === "Paid" ? 0 : total - (invoice.amountPaid || 0);
  return (
    <div
      className="card border-0 h-100"
      style={{ borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", transition: "all 0.2s", overflow: "hidden" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; }}
    >
      <div style={{ height: 3, background: "linear-gradient(90deg,#f97316,#ea580c)" }} />
      <div className="p-3">

        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <div className="fw-bold" style={{ color: "#f97316", fontSize: "0.72rem", letterSpacing: "0.05em" }}>{invoice.invoiceNo}</div>
            <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.95rem" }}>{invoice.buyerName}</div>
          </div>
          <span className="fw-semibold rounded-pill px-2 py-1"
            style={{ fontSize: "0.68rem", backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>
            {invoice.status}
          </span>
        </div>

        <div style={{ height: 1, backgroundColor: "#f1f5f9", margin: "10px 0" }} />

        {/* Info */}
        <div className="d-flex flex-column gap-1 mb-3">
          <div className="d-flex align-items-center gap-2" style={{ fontSize: "0.78rem", color: "#64748b" }}>
            <FaCalendarAlt size={11} color="#cbd5e1" />
            {invoice.date} · Due: {invoice.dueDate}
          </div>
          <div className="d-flex align-items-center gap-2" style={{ fontSize: "0.78rem", color: "#64748b" }}>
            <FaUser size={11} color="#cbd5e1" />
            {invoice.buyerMobile}
          </div>
          <div className="d-flex justify-content-between align-items-center mt-1">
            <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Total</span>
            <span className="fw-bold" style={{ color: "#0f172a", fontSize: "1.05rem" }}>₹{total.toLocaleString()}</span>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Amount Due</span>
            <span className="fw-bold" style={{ color: due > 0 ? "#ef4444" : "#059669", fontSize: "0.9rem" }}>₹{due.toLocaleString()}</span>
          </div>
        </div>

        {/* Actions - View / Edit / Delete (small gradient buttons, no icons) */}
        <div className="d-flex gap-2">
          <button
            onClick={() => onView(invoice)}
            className="d-flex align-items-center justify-content-center border-0 fw-semibold flex-fill"
            style={{
              background: "linear-gradient(135deg,#1e293b,#0f172a)", color: "#fff", fontSize: "0.72rem",
              cursor: "pointer", borderRadius: "8px", padding: "6px 8px",
              transition: "all 0.15s"
            }}
          >
            View
          </button>

          <button
            onClick={() => onEdit(invoice)}
            className="d-flex align-items-center justify-content-center border-0 fw-semibold flex-fill"
            style={{
              background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", fontSize: "0.72rem",
              cursor: "pointer", borderRadius: "8px", padding: "6px 8px",
              transition: "all 0.15s"
            }}
          >
            Edit
          </button>

          <button
            onClick={() => onDelete(invoice.id)}
            className="d-flex align-items-center justify-content-center border-0 fw-semibold flex-fill"
            style={{
              background: "linear-gradient(135deg,#f87171,#ef4444)", color: "#fff", fontSize: "0.72rem",
              cursor: "pointer", borderRadius: "8px", padding: "6px 8px",
              transition: "all 0.15s"
            }}
          >
            Delete
          </button>
        </div>

      </div>
    </div>
  );
}