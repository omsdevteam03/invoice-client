import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  FaUsers, FaPlus, FaSearch, FaEdit, FaTrash, FaEye, FaCheckCircle,
  FaPauseCircle, FaRupeeSign, FaUserPlus, FaChevronDown, FaHistory, FaTimes,
} from "react-icons/fa";
import { DRAFT_PREFIX, timeAgo } from "./CustomerForm";

// ── Read every leftover, unsaved customer-form draft out of localStorage ───
function readDrafts() {
  const list = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(DRAFT_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      // Skip blank/empty drafts — nothing worth recovering.
      if (!parsed?.fullName?.trim() && !parsed?.company?.trim()) continue;
      list.push({ key, ...parsed });
    }
  } catch {}
  return list.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

const statusConfig = {
  Active: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  Inactive: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

const avatarGradients = [
  "linear-gradient(135deg,#1F6F5C,#134A3E)",
  "linear-gradient(135deg,#3D9481,#1F6F5C)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#ec4899,#db2777)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
];

// ✅ Table + action styles + responsive layout rules
const tableStyles = `
.cl-table-wrap {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(15,23,42,0.06);
  overflow: hidden;
  border: 1px solid #f1f5f9;
}
.cl-table {
  width: 100%;
  border-collapse: collapse;
}
.cl-table thead th {
  text-align: left;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  background: #f8fafc;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
}
.cl-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s ease;
  cursor: pointer;
}
.cl-table tbody tr:last-child {
  border-bottom: none;
}
.cl-table tbody tr:hover {
  background-color: #faf9ff;
}
.cl-table tbody tr.cl-row-selected {
  background-color: #E6F1EC;
}
.cl-table td {
  padding: 12px 16px;
  vertical-align: middle;
  font-size: 0.85rem;
  color: #334155;
}
.cl-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #1F6F5C;
  cursor: pointer;
}

/* Mobile-only bits — hidden on desktop by default, switched on inside the
   @media block below so this file behaves identically on desktop. */
.cl-avatar-wrap {
  display: contents;
}
.cl-desktop-id {
  display: block;
}
.cl-mobile-company {
  display: none;
}
.cl-status-dot {
  display: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.action-flag-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #fff;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  height: 26px;
  padding: 0 12px 0 22px;
  transition: transform 0.15s ease;
  flex-shrink: 0;
  overflow: visible; /* let the badge sit outside without being clipped */
}
.action-flag-btn:hover {
  transform: translateY(-2px);
}
.action-flag-btn:active {
  transform: translateY(0);
}

/* The clipped, drop-shadowed background shape — separate layer from content */
.action-flag-btn::before {
  content: "";
  position: absolute;
  inset: 0;
  clip-path: polygon(10px 0, 100% 0, 100% 100%, 0 100%);
  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.18));
  z-index: 0;
}
.action-flag-btn:hover::before {
  filter: drop-shadow(0 5px 10px rgba(0,0,0,0.22));
}

.action-flag-btn .flag-badge {
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  z-index: 2; /* above the clipped shape */
}
.action-flag-btn .flag-label {
  position: relative;
  z-index: 1;
  margin-left: 4px;
}

.action-flag-view::before { background: linear-gradient(135deg, #3D9481, #1F6F5C); }
.action-flag-view .flag-badge { color: #1F6F5C; }

.action-flag-edit::before { background: linear-gradient(135deg, #fb923c, #ea580c); }
.action-flag-edit .flag-badge { color: #ea580c; }

.action-flag-delete::before { background: linear-gradient(135deg, #f87171, #dc2626); }
.action-flag-delete .flag-badge { color: #dc2626; }


.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease;
}
.toolbar-btn:hover {
  background-color: #f8fafc;
}

.toolbar-delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: linear-gradient(135deg,#f87171,#dc2626);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(220,38,38,0.3);
  transition: transform 0.15s ease;
}
.toolbar-delete-btn:hover {
  transform: translateY(-1px);
}

/* ── Badge selects (inline-editable Status) ── */
.badge-select {
  border: none;
  border-radius: 999px;
  padding: 4px 24px 4px 12px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background-repeat: no-repeat;
  background-position: right 8px center;
}
.badge-select.status-select {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='3'><polyline points='6 9 12 15 18 9'/></svg>");
}

.cl-search-input:focus {
  border-color: #6FA894 !important;
  box-shadow: 0 0 0 3px rgba(31,111,92,0.12);
}

.cl-cell-label {
  display: none !important;
}

.cl-stat-card {
  flex: 0 1 200px;
  max-width: 220px;
}
@media (max-width: 640px) {
  .cl-stat-card {
    flex: 1 1 calc(50% - 8px);
    max-width: none;
  }
}

/* ── Responsive: proper stacked cards on small screens ── */
@media (max-width: 760px) {
  .cl-header {
    flex-direction: column;
    align-items: stretch !important;
    gap: 12px;
  }
  .cl-toolbar {
    justify-content: flex-start !important;
  }

  .cl-table-wrap {
    background: transparent;
    box-shadow: none;
    border: none;
  }
  .cl-table thead { display: none; }
  .cl-table, .cl-table tbody {
    display: block;
    width: 100%;
  }

  /* Each row = one card, laid out as a flex box so we can reorder cells */
  .cl-table tr {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 2px 10px rgba(15,23,42,0.06);
    border: 1px solid #f1f5f9;
    padding: 14px 16px 12px;
    margin-bottom: 12px;
  }
  .cl-table td {
    display: block;
    padding: 0;
    border: none;
  }
  .cl-cell-label { display: none !important; }

  /* Checkbox: small, top-left corner, out of flow */
  .cl-table td:nth-child(1) {
    position: absolute;
    top: 14px;
    left: 14px;
  }

  /* Customer: name only — no avatar, no ID, just a slim company line below */
  .cl-table td:nth-child(2) {
    order: 1;
    width: 100%;
    padding-left: 22px;
    margin-bottom: 2px;
  }
  .cl-avatar-wrap {
    display: none;
  }
  .cl-desktop-id {
    display: none;
  }
  .cl-mobile-company {
    display: block;
    color: #94a3b8;
    font-size: 0.78rem;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 220px;
  }

  /* Company + Contact columns: dropped — company already folded into the name line */
  .cl-table td:nth-child(3),
  .cl-table td:nth-child(4) {
    display: none;
  }

  /* Status select: dropped in favor of the small dot next to the actions */
  .cl-table td:nth-child(5) {
    display: none;
  }

  /* Billed: pinned top-right, where the status badge used to sit */
  .cl-table td:nth-child(6) {
    order: 2;
    position: absolute;
    top: 14px;
    right: 16px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #0f172a;
  }

  /* Received: dropped on mobile cards to save space — still visible on
     desktop and on the Customer Detail page's Activity Summary. */
  .cl-table td:nth-child(7) {
    display: none;
  }

  /* Actions row: status dot + icon-only buttons, both anchored to the right
     so they line up under the Billed amount above them */
  .cl-actions-cell {
    order: 4;
    display: flex !important;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    width: 100%;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #f1f5f9;
  }
  .cl-status-dot {
    display: inline-block;
    margin-right: auto;
  }
.cl-actions-cell > div { gap: 6px; }
.action-flag-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 6px;
  }
  .action-flag-btn::before { content: none; }
  .action-flag-btn .flag-badge {
    position: static;
    width: 100%; height: 100%;
    background: transparent;
    box-shadow: none;
    transform: none;
    left: auto; top: auto;
    font-size: 9px;
  }
  .action-flag-view { background: #E6F1EC !important; }
  .action-flag-view .flag-badge { color: #1F6F5C !important; }
  .action-flag-edit { background: #fff7ed !important; }
  .action-flag-edit .flag-badge { color: #ea580c !important; }
  .action-flag-delete { background: #fef2f2 !important; }
  .action-flag-delete .flag-badge { color: #dc2626 !important; }
 .action-flag-btn .flag-label { display: none; }

 /* Header: stack Add Customer full-width, same as Quotations' buttons */
  .cl-header {
    flex-direction: column;
    align-items: stretch !important;
    gap: 12px;
  }
  .cl-header button {
    width: 100% !important;
    justify-content: center !important;
    padding: 9px 14px !important;
    font-size: 0.78rem !important;
  }

/* Toolbar: Drafts / Delete Selected / Search stack full-width too */
  .cl-toolbar {
    flex-direction: column;
    align-items: stretch !important;
  }
.cl-toolbar > button {
    width: 100% !important;
    justify-content: center !important;
    padding: 8px 12px !important;
    font-size: 0.76rem !important;
  }
  .cl-search-wrap {
    flex: none !important;
    width: 100% !important;
    justify-content: flex-start !important;
  }
}
/* ── Small phones: prevent action buttons overflowing ── */
@media (max-width: 420px) {
  .cl-actions-cell > div {
    flex-wrap: wrap;
    row-gap: 4px;
    gap: 6px;
  }
  .action-flag-btn {
    width: 22px;
    height: 22px;
  }
}
`;


function Avatar({ name, size = 40 }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const grad = avatarGradients[name.charCodeAt(0) % avatarGradients.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "10px",
      background: grad, display: "flex", alignItems: "center",
      justifyContent: "center", color: "#fff", fontWeight: 700,
      fontSize: size > 36 ? "0.85rem" : "0.72rem", flexShrink: 0,
      boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
    }}>
      {initials}
    </div>
  );
}

// ✅ ConfirmDialog Component — now handles both single-row delete and bulk delete
function ConfirmDialog({ show, count, onConfirm, onCancel }) {
  if (!show) return null;
  const isBulk = count > 1;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(15,23,42,0.5)", zIndex: 9999,
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
          <FaTrash size={24} color="#dc2626" />
        </div>
        <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>
          {isBulk ? `Delete ${count} customers?` : "Delete customer?"}
        </h5>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
          {isBulk
            ? "Are you sure you want to delete these customers? This cannot be undone."
            : "Are you sure you want to delete this customer? This cannot be undone."}
        </p>
        <div className="d-flex gap-3 justify-content-center">
          <button onClick={onCancel}
            className="border-0 fw-semibold px-4 py-2"
            style={{ backgroundColor: "#f1f5f9", color: "#475569", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="border-0 fw-semibold px-4 py-2"
            style={{ backgroundColor: "#dc2626", color: "#fff", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ Inline-editable pill (Status). Renders as a <select> styled like a badge.
function EditableBadge({ value, options, config, onChange, variant }) {
  const c = config[value] || { bg: "#f8fafc", color: "#64748b" };
  return (
    <select
      className={`badge-select ${variant}-select`}
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

// NEW
export default function CustomerList({ customers, search, setSearch, filterStatus, setFilterStatus, onNew, onView, onEdit, onDelete, onQuickUpdate, onQuickAdd, onUseProfile }) {    const navigate = useNavigate();


  // ✅ Confirm Dialog State — deleteIds holds either one id (row delete) or many (bulk delete)
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteIds, setDeleteIds] = useState([]);
 // ✅ Unsaved customer-form drafts — surfaced here so nothing typed is ever lost
  const [drafts, setDrafts] = useState(() => readDrafts());
  const [showDrafts, setShowDrafts] = useState(false);

 const handleContinueDraft = (draft) => {
    if (draft.key.startsWith(`${DRAFT_PREFIX}new_`)) {
      onNew(draft.key.replace(`${DRAFT_PREFIX}new_`, ""));
      return;
    }
    const id = draft.key.replace(`${DRAFT_PREFIX}edit_`, "");
    const existing = customers.find(c => c.id === id);
    if (existing) onEdit(existing); else onNew();
  };

  const handleDiscardDraft = (key) => {
    try { localStorage.removeItem(key); } catch {}
    setDrafts(prev => prev.filter(d => d.key !== key));
  };

  // ✅ Row selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const headerCheckboxRef = useRef(null);

  const handleDeleteClick = (id) => {
    setDeleteIds([id]);
    setShowConfirm(true);
  };

  const handleBulkDeleteClick = () => {
    setDeleteIds(selectedIds);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    deleteIds.forEach(id => onDelete(id));
    setSelectedIds([]);
    setShowConfirm(false);
    setDeleteIds([]);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setDeleteIds([]);
  };

  const filtered = customers.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : filtered.map(c => c.id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const totalBilled = customers.reduce((sum, c) => sum + (c.totalBilled || 0), 0);
  const totalReceived = customers.reduce((sum, c) => sum + (c.totalReceived || 0), 0);

  const now = new Date();
  const newThisMonth = customers.filter(c => {
    if (!c.since) return false;
    const d = new Date(c.since);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div style={{ width: "100%" }}>
      <style>{tableStyles}</style>

     {/* ✅ Confirm Dialog */}
      <ConfirmDialog
        show={showConfirm}
        count={deleteIds.length}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* Header */}
      <div className="cl-header d-flex justify-content-between align-items-start mb-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <div className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 34, height: 34, background: "linear-gradient(135deg,#1F6F5C,#134A3E)" }}>
              <FaUsers size={15} color="#fff" />
            </div>
            <h4 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.25rem" }}>Customer Management</h4>
          </div>
       <p className="mb-0 small ms-1" style={{ color: "#94a3b8" }}>
            {customers.length} customers · ₹{totalBilled.toLocaleString()} billed · ₹{totalReceived.toLocaleString()} received
          </p>
          <div className="ms-1 mt-1 d-flex align-items-center gap-1" style={{ fontSize: "0.78rem" }}>
            <span
              onClick={() => navigate("/")}
              style={{ color: "#1F6F5C", fontWeight: 600, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
            >
              Home
            </span>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ color: "#64748b", fontWeight: 500 }}>Customer</span>
          </div>
        </div>
        
           <div className="d-flex gap-2">
          <button
            onClick={() => navigate("/trash?tab=customers")}
            title="Trash"
            aria-label="Trash"
            className="d-flex align-items-center justify-content-center border-0"
            style={{
              background: "#fff", color: "#64748b", cursor: "pointer",
              borderRadius: "10px", border: "1.5px solid #e2e8f0",
              width: 38, height: 38, padding: 0, flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#fecaca"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
          >
            <FaTrash size={13} />
          </button>

          <button onClick={onNew}
            className="d-flex align-items-center gap-2 border-0 fw-semibold px-3 py-2"
            style={{ background: "linear-gradient(135deg,#1F6F5C,#134A3E)", color: "#fff", fontSize: "0.82rem", cursor: "pointer", borderRadius: "10px", boxShadow: "0 4px 12px rgba(31,111,92,0.35)" }}>
            <FaPlus size={12} /> Add Customer <FaChevronDown size={10} style={{ opacity: 0.8 }} />
          </button>
        </div>
      </div>

      {/* ✅ Saved Customer Profiles — quick-fill templates for the Create
          Customer form. Clicking "Use Profile" on a card takes the user to
          the New Customer form with all these details already filled in. */}

   {/* Toolbar: Drafts / Delete selected (only when rows are checked) / Search
          — search box grows to fill remaining width, matching Quotations page,
          so Drafts sits flush at the left instead of the whole group floating
          on the right with empty space beside it. */}
      <div className="cl-toolbar d-flex align-items-center justify-content-end gap-2 mb-3 flex-wrap">
        {drafts.length > 0 && (
          <button onClick={() => setShowDrafts(s => !s)}
            className="d-flex align-items-center gap-2 border-0 fw-semibold px-3 py-2 rounded-3"
            style={{
              backgroundColor: showDrafts ? "#fde68a" : "#fffbeb",
              color: "#92400e",
              border: "1.5px solid #fde68a",
              cursor: "pointer", fontSize: "0.8rem",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
            <FaHistory size={12} /> Drafts
            <span style={{
              backgroundColor: "#92400e", color: "#fff", borderRadius: "999px",
              fontSize: "0.68rem", fontWeight: 700, padding: "1px 7px", marginLeft: 2,
            }}>{drafts.length}</span>
          </button>
        )}
        {selectedIds.length > 0 && (
          <button onClick={handleBulkDeleteClick} className="toolbar-delete-btn" style={{ flexShrink: 0 }}>
            <FaTrash size={12} /> Delete Selected ({selectedIds.length})
          </button>
        )}
    <div className="cl-search-wrap d-flex align-items-center gap-2"
          style={{ backgroundColor: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "8px 12px", flex: "1 1 220px", minWidth: 220 }}>
          <FaSearch size={13} color="#94a3b8" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="cl-search-input"
            placeholder="Search customer..."
            style={{ border: "none", outline: "none", fontSize: "0.85rem", color: "#0f172a", width: "100%", backgroundColor: "transparent" }} />
        </div>
      </div>

      {/* Drafts panel — hidden until the Drafts button above is clicked */}
      {showDrafts && drafts.length > 0 && (
        <div className="d-flex flex-column gap-2 mb-4">
          {drafts.map(draft => (
            <div key={draft.key} className="d-flex align-items-center justify-content-between flex-wrap gap-2"
              style={{
                backgroundColor: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 12,
                padding: "12px 16px",
              }}>
              <div className="d-flex align-items-center gap-2">
                <div className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 30, height: 30, borderRadius: 8, background: "#fde68a", color: "#92400e" }}>
                  <FaHistory size={13} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "#92400e" }}>
Unsaved customer draft{draft.key.startsWith(`${DRAFT_PREFIX}new_`) ? "" : " (edit)"}: {draft.fullName || draft.company}                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#92400e" }}>
                    Never saved — last typed {timeAgo(draft.savedAt)}
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2 flex-shrink-0">
                <button onClick={() => handleDiscardDraft(draft.key)}
                  className="d-flex align-items-center gap-1 border-0 fw-semibold px-3 py-2 rounded-3"
                  style={{ backgroundColor: "#fff", color: "#92400e", border: "1.5px solid #fde68a", cursor: "pointer", fontSize: "0.78rem" }}>
                  <FaTimes size={11} /> Discard
                </button>
                <button onClick={() => handleContinueDraft(draft)}
                  className="border-0 fw-semibold px-3 py-2 rounded-3"
                  style={{ backgroundColor: "#92400e", color: "#fff", cursor: "pointer", fontSize: "0.78rem" }}>
                  Continue Editing
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="cl-stats-row d-flex flex-wrap gap-3 mb-4">
        {[
          { label: "Total Customers", sub: "All Customers", value: customers.length, iconBg: "#E6F1EC", iconColor: "#1F6F5C", icon: <FaUsers size={14} /> },
          { label: "Active Customers", sub: "Currently Active", value: customers.filter(c => c.status === "Active").length, iconBg: "#ecfdf5", iconColor: "#059669", icon: <FaCheckCircle size={14} /> },
          { label: "New Customers", sub: "This Month", value: newThisMonth, iconBg: "#fff7ed", iconColor: "#ea580c", icon: <FaUserPlus size={14} /> },
          { label: "Inactive Customers", sub: "Not Active", value: customers.filter(c => c.status === "Inactive").length, iconBg: "#fef2f2", iconColor: "#dc2626", icon: <FaPauseCircle size={14} /> },
        ].map(({ label, sub, value, iconBg, iconColor, icon }) => (
          <div className="cl-stat-card" key={label}
            style={{ borderRadius: "12px", background: "#fff", boxShadow: "0 2px 8px rgba(15,23,42,0.06)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
              style={{ width: 30, height: 30, background: iconBg, color: iconColor }}>{icon}</div>
            <div style={{ lineHeight: 1.15 }}>
              <div className="fw-bold" style={{ fontSize: "1rem", color: "#0f172a" }}>{value}</div>
              <div style={{ color: "#334155", fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

     {/* Customer Table — headers always render; empty state is a single row inside tbody */}
      <div className="cl-table-wrap">
        <table className="cl-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  className="cl-checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={filtered.length === 0}
                />
              </th>
              <th>Customer</th>
              <th>Company</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Billed</th>
              <th>Received</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8", fontSize: "0.9rem" }}>
                  No customers found.
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id} className={selectedIds.includes(c.id) ? "cl-row-selected" : ""} onClick={() => onView(c)}>
                  <td onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="cl-checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelectOne(c.id)}
                    />
                  </td>
                  <td>
                    <span className="cl-cell-label">Customer</span>
                    <div className="d-flex align-items-center gap-2">
                      <span className="cl-avatar-wrap">
                        <Avatar name={c.name} size={38} />
                      </span>
                      <div>
                        <div className="fw-semibold" style={{ color: "#0f172a", fontSize: "0.85rem" }}>{c.name}</div>
                        <div className="cl-desktop-id" style={{ color: "#94a3b8", fontSize: "0.72rem" }}>{c.id}</div>
                        <div className="cl-mobile-company">{c.company || ""}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Company">
  <span style={{ color: "#334155" }}>{c.company || "—"}</span>
</td>
                  <td>
                    <span className="cl-cell-label">Contact</span>
                    <div style={{ fontSize: "0.8rem", color: "#334155" }}>{c.email}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{c.phone}</div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <span className="cl-cell-label">Status</span>
                    <EditableBadge
                      value={c.status}
                      options={["Active", "Inactive"]}
                      config={statusConfig}
                      onChange={(val) => onQuickUpdate(c, "status", val)}
                      variant="status"
                    />
                  </td>
                  <td>
                    <span className="cl-cell-label">Billed</span>
                    <span className="fw-semibold" style={{ color: "#0f172a" }}>
                      {c.totalBilled > 0 ? `₹${c.totalBilled.toLocaleString()}` : "—"}
                    </span>
                  </td>
                  <td>
                    <span className="cl-cell-label">Received</span>
                    <span className="fw-semibold" style={{ color: "#059669" }}>
                      {c.totalReceived > 0 ? `₹${c.totalReceived.toLocaleString()}` : "—"}
                    </span>
                  </td>
                  <td className="cl-actions-cell" style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                    <span className="cl-cell-label">Action</span>
                    <span
                      className="cl-status-dot"
                      style={{ backgroundColor: (statusConfig[c.status] || {}).color }}
                      aria-hidden="true"
                    ></span>
                 <div className="d-flex gap-2 justify-content-end">
  <button onClick={() => onView(c)} className="action-flag-btn action-flag-view">
    <span className="flag-badge"><FaEye size={10} /></span>
    <span className="flag-label">View</span>
  </button>
  <button onClick={() => onEdit(c)} className="action-flag-btn action-flag-edit">
    <span className="flag-badge"><FaEdit size={10} /></span>
    <span className="flag-label">Edit</span>
  </button>
  <button onClick={() => handleDeleteClick(c.id)} className="action-flag-btn action-flag-delete">
    <span className="flag-badge"><FaTrash size={10} /></span>
    <span className="flag-label">Delete</span>
  </button>
</div>
               </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-center mt-3" style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
        Showing {filtered.length} of {customers.length} customers
      </p>
    </div>
  );
  
}