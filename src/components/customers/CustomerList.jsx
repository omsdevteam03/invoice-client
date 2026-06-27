import { useState } from "react";
import { FaUsers, FaPlus, FaSearch, FaEdit, FaTrash, FaEye, FaCheckCircle, FaPauseCircle, FaDotCircle, FaRupeeSign } from "react-icons/fa";

const statusConfig = {
  Active: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  Inactive: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  Lead: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
};

const avatarGradients = [
  "linear-gradient(135deg,#f97316,#ea580c)",
  "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#ec4899,#db2777)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
];

function Avatar({ name, size = 44 }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const grad = avatarGradients[name.charCodeAt(0) % avatarGradients.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "12px",
      background: grad, display: "flex", alignItems: "center",
      justifyContent: "center", color: "#fff", fontWeight: 700,
      fontSize: size > 40 ? "1rem" : "0.82rem", flexShrink: 0,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    }}>
      {initials}
    </div>
  );
}

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
        <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>Delete Customer?</h5>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
          Are you sure you want to delete this customer? This cannot be undone.
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

export default function CustomerList({ customers, search, setSearch, filterStatus, setFilterStatus, onNew, onView, onEdit, onDelete }) {
  
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

  const filtered = customers.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalBilled = customers.reduce((sum, c) => sum + c.totalBilled, 0);

  return (
    <div style={{ maxWidth: "1100px" }}>

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
              <FaUsers size={15} color="#fff" />
            </div>
            <h4 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.2rem" }}>Customers</h4>
          </div>
          <p className="mb-0 small ms-1" style={{ color: "#94a3b8" }}>
            {customers.length} customers · ₹{totalBilled.toLocaleString()} total billed
          </p>
        </div>
        <button onClick={onNew}
          className="d-flex align-items-center gap-2 border-0 fw-semibold px-3 py-2"
          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", fontSize: "0.82rem", cursor: "pointer", borderRadius: "10px", boxShadow: "0 4px 12px rgba(249,115,22,0.35)" }}>
          <FaPlus size={12} /> New Customer
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: "Total", value: customers.length, bg: "linear-gradient(135deg,#f97316,#ea580c)", icon: <FaUsers size={16} /> },
          { label: "Active", value: customers.filter(c => c.status === "Active").length, bg: "linear-gradient(135deg,#10b981,#059669)", icon: <FaCheckCircle size={16} /> },
          { label: "Inactive", value: customers.filter(c => c.status === "Inactive").length, bg: "linear-gradient(135deg,#64748b,#475569)", icon: <FaPauseCircle size={16} /> },
          { label: "Leads", value: customers.filter(c => c.status === "Lead").length, bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)", icon: <FaDotCircle size={16} /> },
          { label: "Total Billed", value: `₹${totalBilled.toLocaleString()}`, bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)", icon: <FaRupeeSign size={16} /> },
        ].map(({ label, value, bg, icon }) => (
          <div className="col-6 col-lg" key={label}>
            <div className="card border-0 h-100" style={{ borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
              <div className="p-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                    style={{ width: 36, height: 36, background: bg, color: "#fff" }}>{icon}</div>
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
      <div className="d-flex align-items-center gap-2 mb-3"
        style={{ backgroundColor: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "8px 14px" }}>
        <FaSearch size={13} color="#94a3b8" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, company or email..."
          style={{ border: "none", outline: "none", fontSize: "0.85rem", color: "#0f172a", width: "100%", backgroundColor: "transparent" }} />
      </div>

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {["All", "Active", "Inactive", "Lead"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className="border-0 rounded-pill px-3 py-1 fw-semibold"
            style={{
              fontSize: "0.78rem", cursor: "pointer", transition: "all 0.15s",
              backgroundColor: filterStatus === s ? "#f97316" : "#f1f5f9",
              color: filterStatus === s ? "#fff" : "#475569",
            }}>
            {s}
            <span className="ms-1" style={{ fontSize: "0.7rem", opacity: 0.8 }}>
              ({s === "All" ? customers.length : customers.filter(c => c.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {/* Customer List */}
      {filtered.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center"
          style={{
            borderRadius: "20px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            backgroundColor: "#fff",
            padding: "60px 20px",
            textAlign: "center",
          }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg,#fff7ed,#ffedd5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20, border: "2px dashed #fed7aa",
          }}>
            <FaUsers size={32} color="#f97316" />
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a", marginBottom: 8 }}>
            {search || filterStatus !== "All" ? "No results found" : "No customers yet"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: 24, maxWidth: 280 }}>
            {search
              ? `No customers match "${search}"`
              : filterStatus !== "All"
              ? `No ${filterStatus} customers found`
              : "Add your first customer to get started"}
          </div>
          {!search && filterStatus === "All" && (
            <button onClick={onNew}
              className="d-flex align-items-center gap-2 border-0 fw-semibold px-4 py-2"
              style={{
                background: "linear-gradient(135deg,#f97316,#ea580c)",
                color: "#fff", fontSize: "0.85rem", cursor: "pointer",
                borderRadius: "10px", boxShadow: "0 4px 12px rgba(249,115,22,0.35)",
              }}>
              <FaPlus size={12} /> Add First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filtered.map(c => {
            const sc = statusConfig[c.status];
            return (
              <div key={c.id}
                className="card border-0"
                style={{ borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", transition: "all 0.2s", overflow: "hidden", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; }}
                onClick={() => onView(c)}
              >
                <div style={{ height: 3, background: avatarGradients[c.name.charCodeAt(0) % avatarGradients.length] }} />
                <div className="p-3">
                  <div className="d-flex align-items-center gap-3">

                    <Avatar name={c.name} size={48} />

                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <span className="fw-bold" style={{ color: "#0f172a", fontSize: "0.95rem" }}>{c.name}</span>
                        <span className="rounded-pill px-2 py-1 fw-semibold"
                          style={{ fontSize: "0.68rem", backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {c.status}
                        </span>
                        <span className="rounded-pill px-2 py-1 fw-semibold"
                          style={{ fontSize: "0.68rem", backgroundColor: c.type === "Business" ? "#f5f3ff" : "#fff7ed", color: c.type === "Business" ? "#8b5cf6" : "#f97316" }}>
                          {c.type}
                        </span>
                      </div>
                      {c.company && <div style={{ color: "#64748b", fontSize: "0.78rem" }}>🏢 {c.company}</div>}
                      <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>📧 {c.email} · 📞 {c.phone}</div>
                      {c.tags?.length > 0 && (
                        <div className="d-flex gap-1 flex-wrap mt-1">
                          {c.tags.map(tag => (
                            <span key={tag} className="rounded-pill px-2 py-0"
                              style={{ fontSize: "0.65rem", backgroundColor: "#fff7ed", color: "#f97316", border: "1px solid #fed7aa" }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-end flex-shrink-0">
                      <div className="fw-bold mb-1" style={{ color: "#0f172a", fontSize: "1rem" }}>
                        {c.totalBilled > 0 ? `₹${c.totalBilled.toLocaleString()}` : "—"}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "0.68rem", marginBottom: 8 }}>Billed</div>
                      <div className="d-flex gap-2 justify-content-end" onClick={e => e.stopPropagation()}>
                        <button onClick={() => onView(c)}
                          className="d-flex align-items-center gap-1 border-0 rounded-3 fw-semibold px-3 py-1"
                          style={{ backgroundColor: "#0f172a", color: "#fff", fontSize: "0.75rem", cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg,#f97316,#ea580c)"}
                          onMouseLeave={e => e.currentTarget.style.background = "#0f172a"}>
                          <FaEye size={11} /> View
                        </button>
                        <button onClick={() => onEdit(c)}
                          className="d-flex align-items-center gap-1 border-0 rounded-3 fw-semibold px-2 py-1"
                          style={{ backgroundColor: "#f1f5f9", color: "#475569", fontSize: "0.75rem", cursor: "pointer" }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#e2e8f0"; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#f1f5f9"; }}>
                          <FaEdit size={11} />
                        </button>
                        {/* ✅ Changed onDelete to handleDeleteClick */}
                        <button onClick={() => handleDeleteClick(c.id)}
                          className="d-flex align-items-center gap-1 border-0 rounded-3 fw-semibold px-2 py-1"
                          style={{ backgroundColor: "#fef2f2", color: "#ef4444", fontSize: "0.75rem", cursor: "pointer" }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#fee2e2"; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#fef2f2"; }}>
                          <FaTrash size={11} />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center mt-3" style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
        Showing {filtered.length} of {customers.length} customers
      </p>
    </div>
  );
}
