import { useState } from "react";
import { FaFileAlt, FaPlus, FaRupeeSign, FaSearch, FaEye, FaCalendarAlt, FaUser, FaCheckCircle, FaClock, FaFileSignature, FaChevronRight, FaTrash } from "react-icons/fa";

const statusConfig = {
  Pending: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa", icon: <FaClock size={10} /> },
  Approved: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0", icon: <FaCheckCircle size={10} /> },
  Draft: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", icon: <FaFileSignature size={10} /> },
};

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
        <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>Delete Quotation?</h5>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
          Are you sure you want to delete this quotation? This cannot be undone.
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

export default function QuotationFirst({ quotations, setQuotations, search, setSearch, setSelected, setEditMode, setShowTemplates }) {

  // ✅ Confirm Dialog State
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    setDeleteId(id);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    const res = await fetch(`http://localhost:3000/api/quotations/${deleteId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setQuotations(prev => prev.filter(item => item.id !== deleteId));
    }
    setShowConfirm(false);
    setDeleteId(null);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setDeleteId(null);
  };

  const filtered = quotations.filter(q =>
    !q.isTemplate &&
    (q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.company.toLowerCase().includes(search.toLowerCase()) ||
      q.id.toLowerCase().includes(search.toLowerCase()))
  );

  const totalValue = quotations.filter(q => !q.isTemplate).reduce((a, b) => a + b.amount, 0);

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
              <FaFileAlt size={15} color="#fff" />
            </div>
            <h4 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.2rem" }}>Quotations</h4>
          </div>
          <p className="mb-0 small ms-1" style={{ color: "#94a3b8" }}>
            {quotations.filter(q => !q.isTemplate).length} quotations · ₹{totalValue.toLocaleString()} total
          </p>
        </div>
        <button
          onClick={() => setShowTemplates(true)}
          className="d-flex align-items-center gap-2 border-0 fw-semibold px-3 py-2"
          style={{
            background: "linear-gradient(135deg,#f97316,#ea580c)",
            color: "#fff", fontSize: "0.82rem", cursor: "pointer",
            borderRadius: "10px", boxShadow: "0 4px 12px rgba(249,115,22,0.35)",
          }}
        >
          <FaPlus size={12} /> New Quotation
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: "Total", value: quotations.filter(q => !q.isTemplate).length, bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)", icon: <FaFileAlt size={16} /> },
          { label: "Approved", value: quotations.filter(q => q.status === "Approved").length, bg: "linear-gradient(135deg,#10b981,#059669)", icon: <FaCheckCircle size={16} /> },
          { label: "Pending", value: quotations.filter(q => q.status === "Pending").length, bg: "linear-gradient(135deg,#f97316,#ea580c)", icon: <FaClock size={16} /> },
          { label: "Total Value", value: `₹${totalValue.toLocaleString()}`, bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)", icon: <FaRupeeSign size={16} /> },
        ].map(({ label, value, bg, icon }) => (
          <div className="col-6 col-lg-3" key={label}>
            <div className="card border-0 h-100" style={{ borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
              <div className="p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                    style={{ width: 40, height: 40, background: bg, color: "#fff" }}>
                    {icon}
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize: "1.4rem", color: "#0f172a", lineHeight: 1 }}>{value}</div>
                    <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{label}</div>
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
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search quotations..."
          style={{ border: "none", outline: "none", fontSize: "0.85rem", color: "#0f172a", width: "100%", backgroundColor: "transparent" }}
        />
      </div>

      {/* Cards */}
      <div className="row g-3">
        {filtered.map((q) => {
          const sc = statusConfig[q.status];
          return (
            <div className="col-12 col-md-6 col-xl-4" key={q.id}>
              <div
                className="card border-0 h-100"
                style={{ borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", transition: "all 0.2s", overflow: "hidden" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; }}
              >
                <div style={{ height: 3, background: "linear-gradient(90deg,#f97316,#ea580c)" }} />
                <div className="p-3">

                  {/* Card Header */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="fw-bold" style={{ color: "#f97316", fontSize: "0.72rem", letterSpacing: "0.05em" }}>{q.id}</div>
                      <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.95rem" }}>{q.name}</div>
                      <div style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{q.company}</div>
                    </div>
                    <span className="d-flex align-items-center gap-1 fw-semibold rounded-pill px-2 py-1"
                      style={{ fontSize: "0.68rem", backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>
                      {sc.icon} {q.status}
                    </span>
                  </div>

                  <div style={{ height: 1, backgroundColor: "#f1f5f9", margin: "10px 0" }} />

                  {/* Card Info */}
                  <div className="d-flex flex-column gap-1 mb-3">
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      <FaCalendarAlt size={11} color="#cbd5e1" />
                      {q.date} → {q.validUntil}
                    </div>
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      <FaUser size={11} color="#cbd5e1" />
                      {q.email}
                    </div>
                    <div className="d-flex align-items-center gap-1 mt-1">
                      <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Total</span>
                      <span className="fw-bold ms-1" style={{ color: "#0f172a", fontSize: "1.05rem" }}>
                        ₹{q.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => { setSelected(q); setEditMode(false); }}
                    className="d-flex align-items-center justify-content-between w-100 border-0 rounded-3 fw-semibold px-3 py-2"
                    style={{ backgroundColor: "#0f172a", color: "#fff", fontSize: "0.82rem", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg,#f97316,#ea580c)"}
                    onMouseLeave={e => e.currentTarget.style.background = "#0f172a"}
                  >
                    <span className="d-flex align-items-center gap-2"><FaEye size={12} /> View Quotation</span>
                    <FaChevronRight size={10} />
                  </button>

                  {/* ✅ Delete Button - now uses handleDeleteClick */}
                  <button
                    onClick={(e) => handleDeleteClick(e, q.id)}
                    className="d-flex align-items-center justify-content-center w-100 border-0 rounded-3 fw-semibold px-3 py-2 mt-2"
                    style={{ backgroundColor: "#fef2f2", color: "#ef4444", fontSize: "0.82rem", cursor: "pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#ef4444"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#fef2f2"; e.currentTarget.style.color = "#ef4444"; }}
                  >
                    <FaTrash size={12} className="me-2" /> Delete
                  </button>

                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
