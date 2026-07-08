import { useState } from "react";
import { FaArrowLeft, FaSave, FaTimes } from "react-icons/fa";

const categories = ["Rent", "Salary", "Utilities", "Supplies", "Travel", "Software", "Marketing", "Other"];

export default function ExpenseForm({ expense, onSave, onCancel }) {
  const [form, setForm] = useState(expense || {
    id: `EXP-${Date.now()}`, title: "", category: "Rent", amount: "", date: new Date().toISOString().slice(0, 10), note: "",
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const inp = { border: "1.5px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", width: "100%", outline: "none", backgroundColor: "#fff" };
  const label = { fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 };

  return (
    <div style={{ maxWidth: 560 }}>
      <button onClick={onCancel} className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2 mb-4"
        style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}>
        <FaArrowLeft size={12} /> Back
      </button>

      <div className="card border-0 p-4" style={{ borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <h5 className="fw-bold mb-4" style={{ color: "#0f172a" }}>{expense ? "Edit Expense" : "Add Expense"}</h5>

        <div className="mb-3">
          <label style={label}>Title</label>
          <input value={form.title} onChange={e => update("title", e.target.value)} style={inp} placeholder="e.g. Office Rent - July" />
        </div>

        <div className="row g-3 mb-3">
          <div className="col-6">
            <label style={label}>Category</label>
            <select value={form.category} onChange={e => update("category", e.target.value)} style={inp}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-6">
            <label style={label}>Amount (₹)</label>
            <input type="number" value={form.amount} onChange={e => update("amount", e.target.value)} style={inp} placeholder="0" />
          </div>
        </div>

        <div className="mb-3">
          <label style={label}>Date</label>
          <input type="date" value={form.date} onChange={e => update("date", e.target.value)} style={inp} />
        </div>

        <div className="mb-4">
          <label style={label}>Note (optional)</label>
          <textarea rows={3} value={form.note} onChange={e => update("note", e.target.value)} style={{ ...inp, resize: "vertical" }} placeholder="Additional details..." />
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button onClick={onCancel} className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
            style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}>
            <FaTimes size={12} /> Cancel
          </button>
          <button onClick={() => onSave({ ...form, amount: Number(form.amount) })}
            className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
            style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", cursor: "pointer", fontSize: "0.85rem", boxShadow: "0 4px 12px rgba(220,38,38,0.35)" }}>
            <FaSave size={12} /> Save Expense
          </button>
        </div>
      </div>
    </div>
  );
}