import { useState } from "react";
import { FaMoneyBillWave, FaPlus, FaSearch, FaTrash, FaEdit, FaTag } from "react-icons/fa";

// ✅ ConfirmDialog Component (same style as Quotations)
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
        <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>Delete Expense?</h5>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
          Are you sure you want to delete this expense? This cannot be undone.
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

export default function ExpenseList({ expenses, search, setSearch, onNew, onEdit, onDelete }) {
  const filtered = expenses.filter(e =>
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const thisMonth = expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth())
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // ✅ Confirm Dialog State
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (deleteId != null) onDelete(deleteId);
    setShowConfirm(false);
    setDeleteId(null);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setDeleteId(null);
  };

  return (
    <div style={{ maxWidth: 1100 }}>

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
              style={{ width: 34, height: 34, background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}>
              <FaMoneyBillWave size={15} color="#fff" />
            </div>
            <h4 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.2rem" }}>Expenses</h4>
          </div>
          <p className="mb-0 small ms-1" style={{ color: "#94a3b8" }}>
            {expenses.length} expenses · ₹{totalExpenses.toLocaleString()} total
          </p>
        </div>
        <button onClick={onNew}
          className="d-flex align-items-center gap-2 border-0 fw-semibold px-3 py-2"
          style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", fontSize: "0.82rem", cursor: "pointer", borderRadius: 10, boxShadow: "0 4px 12px rgba(220,38,38,0.35)" }}>
          <FaPlus size={12} /> Add Expense
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: "Total Expenses", value: `₹${totalExpenses.toLocaleString()}`, bg: "linear-gradient(135deg,#ef4444,#b91c1c)" },
          { label: "This Month", value: `₹${thisMonth.toLocaleString()}`, bg: "linear-gradient(135deg,#f87171,#dc2626)" },
          { label: "Entries", value: expenses.length, bg: "linear-gradient(135deg,#fb923c,#ea580c)" },
        ].map(({ label, value, bg }) => (
          <div className="col-4" key={label}>
            <div className="card border-0 h-100" style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
              <div className="p-3">
                <div className="fw-bold" style={{ fontSize: "1.2rem", color: "#0f172a" }}>{value}</div>
                <div style={{ color: "#94a3b8", fontSize: "0.7rem" }}>{label}</div>
              </div>
              <div style={{ height: 3, background: bg }} />
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="d-flex align-items-center gap-2 mb-3"
        style={{ backgroundColor: "#fff", border: "1.5px solid #fecaca", borderRadius: 10, padding: "8px 14px" }}>
        <FaSearch size={13} color="#94a3b8" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or category..."
          style={{ border: "none", outline: "none", fontSize: "0.85rem", color: "#0f172a", width: "100%", backgroundColor: "transparent" }} />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center"
          style={{ borderRadius: 20, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", backgroundColor: "#fff", padding: "60px 20px", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#fef2f2,#fee2e2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, border: "2px dashed #fecaca" }}>
            <FaMoneyBillWave size={32} color="#ef4444" />
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a", marginBottom: 8 }}>No expenses yet</div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Add your first expense to get started</div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {filtered.map(e => (
            <div key={e.id} className="card border-0 p-3" style={{ borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#fef2f2,#fee2e2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FaTag size={14} color="#dc2626" />
                  </div>
                  <div>
                    <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.9rem" }}>{e.title}</div>
                    <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{e.category} · {e.date}</div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <div className="fw-bold" style={{ color: "#dc2626", fontSize: "0.95rem" }}>-₹{Number(e.amount).toLocaleString()}</div>

                  {/* ✅ Edit / Delete - labeled pill buttons, Delete now opens confirm dialog */}
                  <div className="d-flex gap-2">
                    <button
                      onClick={() => onEdit(e)}
                      className="d-flex align-items-center justify-content-center gap-2 border-0 fw-semibold"
                      style={{
                        background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", fontSize: "0.78rem",
                        cursor: "pointer", borderRadius: 10, padding: "8px 14px"
                      }}
                    >
                      <FaEdit size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(e.id)}
                      className="d-flex align-items-center justify-content-center gap-2 border-0 fw-semibold"
                      style={{
                        backgroundColor: "#ef4444", color: "#fff", fontSize: "0.78rem",
                        cursor: "pointer", borderRadius: 10, padding: "8px 14px"
                      }}
                      onMouseEnter={ev => ev.currentTarget.style.backgroundColor = "#efe944"}
                      onMouseLeave={ev => ev.currentTarget.style.backgroundColor = "#dc2626"}
                    >
                      <FaTrash size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center mt-3" style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
        Showing {filtered.length} of {expenses.length} expenses
      </p>
    </div>
  );
}