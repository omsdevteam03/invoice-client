import { useState } from "react";
import { FaPlus, FaFileInvoiceDollar, FaRupeeSign, FaCheckCircle, FaClock, FaSearch, FaExclamationCircle, FaTrash } from "react-icons/fa";
import InvoiceCard from "./InvoiceCard";

// ✅ ConfirmDialog Component
function ConfirmDialog({ show, onConfirm, onCancel }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        backgroundColor: "#fff", borderRadius: "16px",
        padding: "32px", maxWidth: "400px", width: "90%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center"
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "#fef2f2", display: "flex",
          alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px"
        }}>
          <FaTrash size={24} color="#ef4444" />
        </div>
        <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>Delete Invoice?</h5>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
          Are you sure you want to delete this invoice? This cannot be undone.
        </p>
        <div className="d-flex gap-3 justify-content-center">
          <button onClick={onCancel}
            className="border-0 fw-semibold px-4 py-2"
            style={{ backgroundColor: "#f1f5f9", color: "#475569", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="border-0 fw-semibold px-4 py-2"
            style={{ backgroundColor: "#ef4444", color: "#fff", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceList({ invoices, search, setSearch, onNew, onView, onEdit, onDelete }) {
  const [activeTab, setActiveTab] = useState("All");

  // ✅ Confirm Dialog State
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    onDelete(deleteId);
    setShowConfirm(false);
    setDeleteId(null);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setDeleteId(null);
  };

  const filtered = invoices.filter(inv => {
    const matchesSearch =
      inv.buyerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.status.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "All" || inv.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const calcTotal = (inv) => {
    const sub = inv.items.reduce((x, y) => x + Number(y.amount), 0);
    return inv.gstType === "With GST" ? sub + Math.round(sub * 0.18) : sub;
  };

  const totalRevenue = invoices.reduce((a, b) => a + calcTotal(b), 0);

  const totalDue = invoices.reduce((a, b) => {
    return a + (calcTotal(b) - Number(b.amountPaid || 0));
  }, 0);

  return (
    <div style={{ maxWidth: "1200px" }}>

      {/* ✅ Confirm Dialog */}
      <ConfirmDialog
        show={showConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <div className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 34, height: 34, background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
              <FaFileInvoiceDollar size={15} color="#fff" />
            </div>
            <h4 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.2rem" }}>Invoices</h4>
          </div>
          <p className="mb-0 small ms-1" style={{ color: "#94a3b8" }}>
            {invoices.length} invoices · ₹{totalRevenue.toLocaleString()} total revenue
          </p>
        </div>
        <button onClick={onNew}
          className="d-flex align-items-center gap-2 border-0 fw-semibold px-3 py-2"
          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", fontSize: "0.82rem", cursor: "pointer", borderRadius: "10px", boxShadow: "0 4px 12px rgba(249,115,22,0.35)" }}>
          <FaPlus size={12} /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: "Total Invoices", value: invoices.length, bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)", icon: <FaFileInvoiceDollar size={16} /> },
          { label: "Paid", value: invoices.filter(i => i.status === "Paid").length, bg: "linear-gradient(135deg,#10b981,#059669)", icon: <FaCheckCircle size={16} /> },
          { label: "Unpaid", value: invoices.filter(i => i.status === "Unpaid").length, bg: "linear-gradient(135deg,#f97316,#ea580c)", icon: <FaClock size={16} /> },
          { label: "Overdue", value: invoices.filter(i => i.status === "Overdue").length, bg: "linear-gradient(135deg,#ef4444,#dc2626)", icon: <FaExclamationCircle size={16} /> },
          { label: "Total Due", value: `₹${totalDue.toLocaleString()}`, bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)", icon: <FaRupeeSign size={16} /> },
        ].map(({ label, value, bg, icon }) => (
          <div className="col-6 col-lg" key={label}>
            <div className="card border-0 h-100" style={{ borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
              <div className="p-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                    style={{ width: 36, height: 36, background: bg, color: "#fff" }}>
                    {icon}
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize: "1.2rem", color: "#0f172a", lineHeight: 1 }}>{value}</div>
                    <div style={{ color: "#94a3b8", fontSize: "0.7rem" }}>{label}</div>
                  </div>
                </div>
              </div>
              <div style={{ height: 3, background: bg }} />
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="d-flex align-items-center gap-2 mb-4"
        style={{ backgroundColor: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "8px 14px" }}>
        <FaSearch size={13} color="#94a3b8" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by buyer name, invoice no or status..."
          style={{ border: "none", outline: "none", fontSize: "0.85rem", color: "#0f172a", width: "100%", backgroundColor: "transparent" }} />
      </div>

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {["All", "Paid", "Unpaid", "Overdue", "Draft"].map(s => (
          <button key={s}
            onClick={() => setActiveTab(s)}
            className="border-0 rounded-pill px-3 py-1 fw-semibold"
            style={{
              fontSize: "0.78rem",
              backgroundColor: activeTab === s ? "#f97316" : "#f1f5f9",
              color: activeTab === s ? "#fff" : "#475569",
              cursor: "pointer",
            }}>
            {s}
          </button>
        ))}
      </div>

      {/* Invoice Cards */}
      <div className="row g-3">
        {filtered.length === 0 ? (
          <div className="col-12 text-center py-5" style={{ color: "#94a3b8" }}>
            <FaFileInvoiceDollar size={36} style={{ marginBottom: 8 }} />
            <div>No invoices found</div>
          </div>
        ) : (
          filtered.map(inv => (
            <div className="col-12 col-md-6 col-xl-4" key={inv.id}>
              <InvoiceCard
                invoice={inv}
                onView={onView}
                onEdit={onEdit}
                onDelete={handleDeleteClick}
              />
            </div>
          ))
        )}
      </div>

    </div>
  );
}
