import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import InvoiceDocument from "../invoices/InvoiceDocument";
import {
  FaFileAlt, FaPlus, FaRupeeSign, FaSearch, FaEye, FaCalendarAlt, FaUser,
  FaCheckCircle, FaFileSignature, FaTrash, FaEdit, FaHistory, FaCopy,
  FaFileInvoiceDollar, FaExchangeAlt, FaTimes, FaAddressBook, FaUndo,
} from "react-icons/fa";
// ── Auto-saved quotation drafts (crash/navigate-away recovery) ─────────────
// NOT the quotation's business "status" (Draft/Approved) — this is a
// Google-Docs-style safety net. QuotationDetail persists the in-progress
// form to the backend while editing; once Saved (or Cancelled) it's removed.
// Mirrors your existing /quotations fetch pattern.
const QUOTE_DRAFT_PREFIX = "quotation_draft_";

function readQuotationDrafts() {
  const list = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(QUOTE_DRAFT_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!parsed?.name?.trim() && !parsed?.company?.trim()) continue;
      list.push({ key, ...parsed });
    }
  } catch { }
  return list.sort((a, b) => (b.lastEdited || 0) - (a.lastEdited || 0));
}

function timeAgo(ts) {
  if (!ts) return "a while ago";
  const diffMs = Date.now() - ts;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

// Adapter — timeAgo() above takes a JS ms timestamp; ISO date strings from
// the backend (updatedAt) need converting first.
function timeAgoIso(isoString) {
  if (!isoString) return "a while ago";
  const ms = new Date(isoString).getTime();
  if (Number.isNaN(ms)) return "a while ago";
  return timeAgo(ms);
}

// Same internal-id shape as QuotationsPage.jsx — a duplicated quotation is
// a brand-new draft, so it needs its own fresh internal id, never the
// source quotation's id and never its official number.
function generateInternalId() {
  return `qt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
const statusConfig = {
  Draft: { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0", icon: <FaFileSignature size={10} /> },
  Sent: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", icon: <FaExchangeAlt size={10} /> },
  Approved: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0", icon: <FaCheckCircle size={10} /> },
  Rejected: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", icon: <FaTimes size={10} /> },
  Expired: { bg: "#fffbeb", color: "#d97706", border: "#fde68a", icon: <FaHistory size={10} /> },
};
const tableStyles = `
.qt-table-wrap {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(15,23,42,0.06);
  overflow: hidden;
  border: 1px solid #f1f5f9;
}
.qt-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.qt-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
}
.qt-table thead th {
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
.qt-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s ease;
}
.qt-table tbody tr:last-child { border-bottom: none; }
.qt-table tbody tr:hover { background-color: #faf9ff; }
.qt-table tbody tr.qt-row-selected { background-color: #E6F1EC; }
.qt-table td {
  padding: 12px 16px;
  vertical-align: middle;
  font-size: 0.85rem;
  color: #334155;
}
.qt-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #1F6F5C;
  cursor: pointer;
}
.qt-action-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease;
  flex-shrink: 0;
}
.qt-action-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }
.qt-action-btn:active { transform: translateY(0) scale(0.94); }
.qt-action-view { background: #E6F1EC; color: #1F6F5C; }
.qt-action-edit { background: #fff7ed; color: #ea580c; }
.qt-action-delete { background: #fef2f2; color: #dc2626; }
.qt-action-convert { background: #ecfdf5; color: #059669; }
.qt-search-input:focus {
  border-color: #6FA894 !important;
  box-shadow: 0 0 0 3px rgba(31,111,92,0.12);
}
.qt-status-select {
  border-radius: 999px;
  padding: 4px 24px 4px 10px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='3'><polyline points='6 9 12 15 18 9'/></svg>");
}
.qt-cell-label { display: none !important; }
.qt-stat-card { flex: 0 1 200px; max-width: 220px; }

/* Mobile-only bits — hidden on desktop, switched on inside the 860px block below */
.qt-mobile-id { display: none; }
.qt-status-dot { display: none; }

.qt-bulk-delete-btn {
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
.qt-bulk-delete-btn:hover { transform: translateY(-1px); }

.qt-drafts-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.qt-drafts-btn:hover { transform: translateY(-1px); }

/* Mobile-only copy of Drafts (shown inside the header row on phones) */
.qt-drafts-mobile { display: none !important; }

.qt-header-row { gap: 12px; }
.qt-header-actions { display: flex; gap: 8px; }
.qt-search-box { flex: 1 1 220px; min-width: 220px; }

/* ---------- "Related to Invoice" result banner ---------- */
.qt-invoice-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  background: #eff6ff;
  border: 1.5px solid #bfdbfe;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 14px;
}
.qt-invoice-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1.5px solid #bfdbfe;
  background: #fff;
  color: #2563eb;
  font-weight: 700;
  font-size: 0.78rem;
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  white-space: nowrap;
}
.qt-invoice-clear-btn:hover { background: #2563eb; color: #fff; border-color: #2563eb; }

/* ---------- Tablet (portrait / landscape, ~761px–1024px) ---------- */
@media (max-width: 1024px) {
  .qt-table thead th,
  .qt-table td {
    padding: 10px 12px;
    font-size: 0.8rem;
  }
  .qt-stat-card {
    flex: 1 1 calc(50% - 6px);
    max-width: none;
  }
  .qt-search-box {
    flex: 1 1 200px;
    min-width: 180px;
  }
}

/* ---------- Small tablets / large phones: compact card layout (matches Customers page) ---------- */
@media (max-width: 860px) {
  .qt-table thead { display: none; }
  .qt-table, .qt-table tbody {
    display: block;
    width: 100%;
  }
  .qt-table { min-width: 0; }
  .qt-table-scroll { overflow-x: hidden; }

  /* Each row = one card, laid out as a flex box so we can reorder cells */
  .qt-table tr {
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
  .qt-table td {
    display: block;
    padding: 0;
    border: none;
  }
  .qt-cell-label { display: none !important; }

  /* Checkbox: top-left corner, out of flow */
  .qt-table td:nth-child(1) {
    position: absolute;
    top: 14px;
    left: 14px;
  }

  /* Quote id: dropped as its own row — shown as a small line under the customer instead */
  .qt-table td:nth-child(2) {
    display: none;
  }

  /* Customer: name + company, with the quote id folded in as a small extra line */
  .qt-table td:nth-child(3) {
    order: 1;
    width: 100%;
    padding-left: 22px;
    margin-bottom: 2px;
  }
  .qt-mobile-id {
    display: block;
    color: #94a3b8;
    font-size: 0.72rem;
    margin-top: 2px;
  }

  /* Valid dates: dropped on mobile to keep the card short */
  .qt-table td:nth-child(4) {
    display: none;
  }

  /* Total: pinned top-right, where it's easy to scan */
  .qt-table td:nth-child(5) {
    order: 2;
    position: absolute;
    top: 14px;
    right: 16px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #0f172a;
  }

  /* Status select: dropped in favor of a small dot next to the actions */
  .qt-table td:nth-child(6) {
    display: none;
  }
  .qt-status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: auto;
  }

  /* Actions: status dot on the left, icon-only buttons flush right */
  .qt-actions-cell {
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
}

/* ---------- Phones ---------- */
@media (max-width: 640px) {
  .qt-header-row {
    flex-direction: column;
    align-items: stretch !important;
  }
  .qt-header-actions {
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
  }
  .qt-new-btn {
    justify-content: center;
    min-width: 0;
  }
  /* Row 1: Drafts (left) + Choose Customer (right), half each */
  .qt-choose-btn {
    order: 2;
    flex: 1 1 calc(50% - 4px) !important;
    width: auto;
  }
  /* Row 2: trash (fixed size) + New Quotation (fills the rest) */
  .qt-trash-btn {
    order: 3;
    flex: 0 0 38px !important;
  }
  .qt-main-btn {
    order: 4;
    flex: 1 1 0 !important;
  }
  .qt-toolbar {
    justify-content: stretch !important;
  }
  .qt-toolbar > * { width: 100%; }
  .qt-search-box {
    min-width: 0 !important;
    width: 100%;
  }
  .qt-drafts-btn, .qt-bulk-delete-btn {
    justify-content: center;
    width: 100%;
  }
  /* Must stay AFTER the rule above so it overrides width: 100% */
  .qt-drafts-mobile {
    display: inline-flex !important;
    order: 1;
    flex: 1 1 calc(50% - 4px);
    width: auto;
  }
  .qt-drafts-desktop { display: none !important; }
  .qt-stat-card {
    flex: 1 1 calc(50% - 6px);
    max-width: none;
  }
  .qt-invoice-banner { flex-direction: column; align-items: flex-start !important; }
  .qt-invoice-clear-btn { width: 100%; justify-content: center; }
}

@media (max-width: 420px) {
  .qt-stat-card {
    flex: 1 1 100%;
  }
}

/* ---------- Modals ---------- */
.qt-modal-card {
  max-width: 400px;
  width: 90%;
  padding: 32px;
}
@media (max-width: 480px) {
  .qt-modal-card {
    padding: 22px 18px;
    width: 92%;
  }
}

/* ---------- Invoice selector (multi-invoice preview) ---------- */
.qt-inv-tab {
  border: 1.5px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-weight: 700;
  font-size: 0.82rem;
  border-radius: 999px;
  padding: 7px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.qt-inv-tab:hover { transform: translateY(-1px); }
.qt-inv-tab.active {
  border-color: #1F6F5C;
  background: #E6F1EC;
  color: #1F6F5C;
}
.qt-inv-table {
  width: 100%;
  border-collapse: collapse;
}
.qt-inv-table th {
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
  white-space: nowrap;
}
.qt-inv-table td {
  padding: 10px 14px;
  font-size: 0.82rem;
  color: #334155;
  border-bottom: 1px solid #f8fafc;
}
.qt-inv-view-btn {
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  background: #f1f5f9;
  color: #475569;
  white-space: nowrap;
}
.qt-inv-view-btn.active {
  background: #1F6F5C;
  color: #fff;
}

/* ---------- Recovered drafts panel ---------- */
.qt-recovered-item {
  background: #fff;
  border: 1px solid #FDE68A;
  border-radius: 10px;
}

/* ---------- Saved draft quotations section ---------- */
.qt-draft-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s ease;
}
.qt-draft-row:last-child { border-bottom: none; }
.qt-draft-row:hover { background-color: #faf9ff; }
.qt-draft-row.qt-row-selected { background-color: #E6F1EC; }
.qt-draft-info { flex: 1 1 220px; min-width: 0; }
.qt-draft-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
`;

// ConfirmDialog Component — handles single-row delete and bulk delete
function ConfirmDialog({ show, count = 1, onConfirm, onCancel }) {
  if (!show) return null;
  const isBulk = count > 1;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div className="qt-modal-card" style={{
        backgroundColor: "#fff", borderRadius: "16px",
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
          {isBulk ? `Delete ${count} quotations?` : "Delete Quotation?"}
        </h5>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
          {isBulk
            ? "Are you sure you want to delete these quotations? This cannot be undone."
            : "Are you sure you want to delete this quotation? This cannot be undone."}
        </p>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
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

// ResetNumberingDialog Component — styled confirm for the "Reset Numbering" action
function ResetNumberingDialog({ show, onConfirm, onCancel }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div className="qt-modal-card" style={{
        backgroundColor: "#fff", borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center"
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "#fef2f2", display: "flex",
          alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px"
        }}>
          <FaUndo size={22} color="#dc2626" />
        </div>
        <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>
          Reset quotation numbering?
        </h5>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
          This will reset the next quotation number back to 0001. This cannot be undone.
        </p>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <button onClick={onCancel}
            className="border-0 fw-semibold px-4 py-2"
            style={{ backgroundColor: "#f1f5f9", color: "#475569", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="border-0 fw-semibold px-4 py-2"
            style={{ backgroundColor: "#dc2626", color: "#fff", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// EditApprovedDialog Component — styled confirm shown when editing an
// already-approved quotation, replacing window.confirm for the same
// visual language as ConfirmDialog/ResetNumberingDialog above.
function EditApprovedDialog({ show, onConfirm, onCancel }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div className="qt-modal-card" style={{
        backgroundColor: "#fff", borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center"
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "#fff7ed", display: "flex",
          alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px"
        }}>
          <FaEdit size={22} color="#ea580c" />
        </div>
        <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>
          Edit approved quotation?
        </h5>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
          This quotation has already been approved. Editing it will require client approval again.
        </p>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <button onClick={onCancel}
            className="border-0 fw-semibold px-4 py-2"
            style={{ backgroundColor: "#f1f5f9", color: "#475569", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="border-0 fw-semibold px-4 py-2"
            style={{ backgroundColor: "#ea580c", color: "#fff", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline-editable Status pill
function EditableStatus({ value, onChange, hasNumber }) {
  const sc = statusConfig[value] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };

  // A quotation with no official number yet can only ever be "Draft" here.
  // Sent/Approved/Rejected only make sense once it's been through /send —
  // changing those from Draft belongs to the Send action, not this dropdown.
  if (!hasNumber) {
    return (
      <span className="qt-status-select" style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, cursor: "default" }}>
        Draft
      </span>
    );
  }

  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
      className="qt-status-select"
      style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
    >
      <option value="Sent">Sent</option>
      <option value="Approved">Approved</option>
      <option value="Rejected">Rejected</option>
      <option value="Expired">Expired</option>
    </select>
  );
}
function formatInvoiceDate(d) {
  if (!d) return "—";
  try {
    const [y, m, day] = d.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[parseInt(m, 10) - 1]} ${y}`;
  } catch {
    return d;
  }
}

// ── Invoice Selector Panel ──────────────────────────────────────────────
// Shown above the invoice preview whenever a quotation has more than one
// linked invoice, so the user can switch between them without leaving the
// modal. Tabs and the details table both drive the same selection, and the
// currently-viewed invoice is clearly highlighted in both.
function InvoiceSelectorPanel({ quotation, invoiceList, selectedIndex, onSelect }) {
  return (
    <div className="no-print" style={{ marginBottom: 4 }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Quotation #{quotation.id}
      </div>
      <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
        Invoices ({invoiceList.length})
      </div>

      {/* Tabs */}
      <div className="d-flex gap-2 flex-wrap mb-3">
        {invoiceList.map((inv, idx) => (
          <button
            key={inv.invoiceNo || idx}
            onClick={() => onSelect(idx)}
            className={`qt-inv-tab${idx === selectedIndex ? " active" : ""}`}
          >
            Invoice {idx + 1}
          </button>
        ))}
      </div>

      {/* Details table */}
      <div style={{ border: "1px solid #f1f5f9", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
        <table className="qt-inv-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoiceList.map((inv, idx) => {
              const active = idx === selectedIndex;
              const amount = inv.total ?? (inv.items || []).reduce((a, b) => a + Number(b.amount || 0), 0);
              return (
                <tr key={inv.invoiceNo || idx} style={{ backgroundColor: active ? "#E6F1EC" : "#fff" }}>
                  <td style={{ fontWeight: 700, color: "#1F6F5C" }}>{inv.invoiceNo || `Invoice ${idx + 1}`}</td>
                  <td>{formatInvoiceDate(inv.date)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                    ₹{Number(amount).toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => onSelect(idx)}
                      className={`qt-inv-view-btn${active ? " active" : ""}`}
                    >
                      {active ? "Viewing" : "View Invoice"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
        Invoice #{invoiceList[selectedIndex]?.invoiceNo || selectedIndex + 1}
      </div>
    </div>
  );
}

// ── No Invoices Panel ────────────────────────────────────────────────────
// Shown when a quotation explicitly has zero linked invoices.
function NoInvoicesPanel({ quotation, onClose, onCreateInvoice }) {
  return (
    <div style={{ padding: "44px 24px", textAlign: "center" }}>
      <div style={{
        width: 60, height: 60, borderRadius: "50%", background: "#f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
      }}>
        <FaFileInvoiceDollar size={24} color="#94a3b8" />
      </div>
      <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>
        No invoices created for this quotation.
      </h5>
      <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: 22 }}>
        Quotation #{quotation.id} doesn't have any invoices yet.
      </p>
      <div className="d-flex gap-3 justify-content-center flex-wrap">
        <button onClick={onClose}
          className="border-0 fw-semibold px-4 py-2"
          style={{ backgroundColor: "#f1f5f9", color: "#475569", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
          Close
        </button>
        {onCreateInvoice && (
          <button onClick={onCreateInvoice}
            className="border-0 fw-semibold px-4 py-2"
            style={{ backgroundColor: "#1F6F5C", color: "#fff", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
            Create Invoice
          </button>
        )}
      </div>
    </div>
  );
}

export default function QuotationFirst({
  quotations, setQuotations, search, setSearch, setSelected, setEditMode,
  setShowTemplates, onInvoiceCreated, onChooseCustomer, companyInfo, docSettings,
  invoices = [], onCreateInvoiceFromQuotation,
  onResetNumbering,
  onSend,
}) {
  const navigate = useNavigate();

  // Confirm Dialog State — deleteIds holds either one id (row delete) or many (bulk delete)
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteIds, setDeleteIds] = useState([]);

  // Reset Numbering confirm dialog state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Which saved draft is currently being sent (disables its dropdown)
  const [sendingId, setSendingId] = useState(null);

  // Same action as the Send button inside the quotation editor
  const handleSendDraft = async (q) => {
    if (!onSend || sendingId) return;
    setSendingId(q.id);
    try {
      await onSend(q.id);
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSendingId(null);
    }
  };

  // "Edit approved quotation?" confirm dialog state — holds the quotation
  // pending confirmation, or null when the dialog is closed.
  const [editApprovedTarget, setEditApprovedTarget] = useState(null);
  // Row selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const headerCheckboxRef = useRef(null);

  // ── Recovered (auto-saved) drafts — crash/navigate-away recovery, NOT a
  // manually-created draft store. Populated from localStorage; entries are
  // removed automatically once their quotation is actually saved.
  const [recoveredDrafts, setRecoveredDrafts] = useState(() => readQuotationDrafts());
  const [showRecoveredPanel, setShowRecoveredPanel] = useState(false);

  const handleContinueDraft = (draft) => {
    // Strip draft-only bookkeeping (localStorage key, label, timestamp,
    // etc.) so it's never sent to the backend as part of the real
    // quotation. _draftId is kept — QuotationDetail needs it to keep
    // updating the SAME localStorage entry instead of creating a new one.
    const { key, label, lastEdited, quotationId, isNewQuotation, ...quotationData } = draft;
    setSelected(quotationData);
    setEditMode(true);
  };

  const handleDiscardDraft = (draft) => {
    try { localStorage.removeItem(draft.key); } catch { }
    setRecoveredDrafts(prev => prev.filter(d => d.key !== draft.key));
  };

  // ── Invoice preview / selector popup state ──────────────────────────────
  // Holds { quotation, invoiceList, selectedIndex, isSynthetic }.
  // invoiceList is always REAL saved invoices — quotation.invoices if the
  // record carries one directly, otherwise invoices matching
  // fromQuotationId in the `invoices` prop. Empty invoiceList ([]) means
  // "no invoices created yet" and shows that panel; `isSynthetic` is kept
  // in the shape only so InvoiceSelectorPanel's future/legacy callers stay
  // compatible, but this component no longer sets it to true.
  const [invoicePreview, setInvoicePreview] = useState(null);

  // Customer picker state
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  useEffect(() => {
    if (!showCustomerPicker) return;
    setCustomersLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/customers`)
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(err => console.error("Failed to load customers:", err))
      .finally(() => setCustomersLoading(false));
  }, [showCustomerPicker]);

  const activeCustomers = customers.filter(c => (c.status ?? "Active") === "Active");

  const filteredCustomers = activeCustomers.filter(c => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    const digitsOnly = q.replace(/\D/g, "");
    const phoneMatch = digitsOnly && (c.phone || "").replace(/\D/g, "").includes(digitsOnly);
    return (
      phoneMatch ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q)
    );
  });

  // Opens the preview popup for a given quotation.
  // Real invoices only — matched via `fromQuotationId` (or a `q.invoices`
  // array if the quotation record carries one directly). No synthetic
  // fallback: if nothing is actually linked yet, that IS the "no invoices"
  // state, and the panel below tells the user to create one.
  // - 0 linked invoices → "No invoices created" panel.
  // - 1 linked invoice → opens straight into the preview, no selector.
  // - 2+ linked invoices → selector panel + preview.
  const handlePreviewInvoice = (q) => {
    const linkedFromProp = invoices.filter(inv => inv.fromQuotationId === q.id);
    const invoiceList = Array.isArray(q.invoices) ? q.invoices : linkedFromProp;

    setInvoicePreview({
      quotation: q,
      invoiceList,
      selectedIndex: invoiceList.length ? 0 : null,
      isSynthetic: false,
    });
  };

  const handleCustomerSelect = (customer) => {
    setShowCustomerPicker(false);
    setCustomerSearch("");
    if (onChooseCustomer) onChooseCustomer(customer);
  };

  // Requirement #5 — Duplicate: creates a brand-new Draft carrying over
  // the useful content (customer, scope, pricing, terms, etc.), but never
  // the source's official number, sent/approval status, or history. Works
  // on ANY quotation (draft, sent, approved) — duplicating an approved one
  // is exactly how you'd start a similar new deal without touching the
  // original record.
  const handleDuplicateDraft = async (q) => {
    const {
      id, quotationNumber, sentAt, status, versionHistory, updatedAt,
      ...copyable
    } = q;

    const newDraft = {
      ...copyable,
      id: generateInternalId(),
      status: "Draft",
      date: new Date().toISOString().split("T")[0],
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newDraft, isNew: true, isTemplate: false }),
      });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const saved = await res.json();
      setQuotations(prev => [...prev, saved]);
    } catch (err) {
      console.error("Failed to duplicate quotation:", err);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteIds([id]);
    setShowConfirm(true);
  };

  const handleBulkDeleteClick = () => {
    setDeleteIds(selectedIds);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    await Promise.all(deleteIds.map(id =>
      fetch(`${import.meta.env.VITE_API_URL}/quotations/${id}`, { method: 'DELETE' })
    ));
    setQuotations(prev => prev.filter(item => !deleteIds.includes(item.id)));
    setSelectedIds(prev => prev.filter(id => !deleteIds.includes(id)));
    setShowConfirm(false);
    setDeleteIds([]);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setDeleteIds([]);
  };

  // Inline status update — same POST-to-list pattern as the Customers page
  const handleStatusChange = async (quotation, newStatus) => {
    const updated = { ...quotation, status: newStatus };

    // Optimistic UI update so the badge switches instantly
    setQuotations(prev => prev.map(q => q.id === quotation.id ? updated : q));

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updated, isNew: false }),
      });
    } catch (err) {
      console.error('Status update failed:', err);
      // roll back on failure
      setQuotations(prev => prev.map(q => q.id === quotation.id ? quotation : q));
    }
  };

  // One-time cleanup: any quotation left over from before with status
  // "Pending" is silently migrated to "Draft" so that status never appears
  // in the UI again.
  useEffect(() => {
    const legacyPending = quotations.filter(q => q.status === "Pending");
    if (legacyPending.length === 0) return;
    legacyPending.forEach(q => { handleStatusChange(q, "Draft"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Invoice-number search ────────────────────────────────────────────
  // If the search text exactly matches a saved invoice number, we switch
  // into "invoice result" mode: the table narrows to just the ONE
  // quotation that invoice was created from, and a small banner is shown
  // above the table (mirrors the "Related to Quotation" banner on the
  // Invoices page, in reverse). This is on top of — not instead of — the
  // normal name/company/quote-id search below.
  const searchTrim = search.trim();
  const searchLower = searchTrim.toLowerCase();

  const matchedInvoice = searchTrim
    ? invoices.find(inv => (inv.invoiceNo || "").toLowerCase() === searchLower)
    : null;
  const isInvoiceSearch = Boolean(matchedInvoice);
  const invoiceSearchQuotationId = matchedInvoice?.fromQuotationId || null;

  const filtered = (isInvoiceSearch
    ? quotations.filter(q => !q.isTemplate && q.id === invoiceSearchQuotationId)
    : quotations.filter(q =>
      !q.isTemplate &&
      (q.name.toLowerCase().includes(searchLower) ||
        q.company.toLowerCase().includes(searchLower) ||
        (q.quotationNumber || "").toLowerCase().includes(searchLower) ||
        (searchLower && invoices.some(inv =>
          inv.fromQuotationId === q.id && (inv.invoiceNo || "").toLowerCase().includes(searchLower)
        )))
    )
  ).sort((a, b) => {
    // Numbered ones first (newest QT number first), drafts after (newest first)
    if (!a.quotationNumber && !b.quotationNumber) return new Date(b.date) - new Date(a.date);
    if (!a.quotationNumber) return 1;
    if (!b.quotationNumber) return -1;
    const numA = parseInt((a.quotationNumber.match(/(\d+)$/) || [0])[0], 10) || 0;
    const numB = parseInt((b.quotationNumber.match(/(\d+)$/) || [0])[0], 10) || 0;
    return numB - numA;
  });

  const clearInvoiceSearch = () => setSearch("");

  const savedDrafts = filtered.filter(q => !q.quotationNumber);
  const numberedQuotations = filtered.filter(q => q.quotationNumber);

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : filtered.map(q => q.id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const totalValue = quotations.filter(q => !q.isTemplate).reduce((a, b) => a + b.amount, 0);
  const realQuotationCount = quotations.filter(q => !q.isTemplate).length;
  const canResetNumbering = realQuotationCount === 0;

  return (
    <div style={{ width: "100%" }}>
      <style>{tableStyles}</style>

      <div className="no-print">
        {/* Confirm Dialog */}
        <ConfirmDialog
          show={showConfirm}
          count={deleteIds.length}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />

        {/* Reset Numbering Confirm Dialog */}
        <ResetNumberingDialog
          show={showResetConfirm}
          onConfirm={() => {
            setShowResetConfirm(false);
            onResetNumbering?.();
          }}
          onCancel={() => setShowResetConfirm(false)}
        />

        {/* Edit Approved Quotation Confirm Dialog */}
        <EditApprovedDialog
          show={Boolean(editApprovedTarget)}
          onConfirm={() => {
            setSelected(editApprovedTarget);
            setEditMode(true);
            setEditApprovedTarget(null);
          }}
          onCancel={() => setEditApprovedTarget(null)}
        />

        {showCustomerPicker && (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(15,23,42,0.8)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setShowCustomerPicker(false)}
          >
            <div
              style={{
                backgroundColor: "#fff", borderRadius: "16px", width: "100%", maxWidth: "520px",
                maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column",
                boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="d-flex justify-content-between align-items-center px-4 py-3"
                style={{ borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <div className="fw-bold" style={{ color: "#0f172a", fontSize: "1.05rem" }}>Choose a Customer</div>
                  <div className="small" style={{ color: "#94a3b8" }}>Search by name or phone number</div>
                </div>
                <button onClick={() => setShowCustomerPicker(false)}
                  className="border-0 rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 32, height: 32, backgroundColor: "#f1f5f9", color: "#64748b", cursor: "pointer" }}>
                  <FaTimes size={12} />
                </button>
              </div>

              <div style={{ padding: "14px 20px 6px" }}>
                <div className="d-flex align-items-center gap-2"
                  style={{ backgroundColor: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "8px 12px" }}>
                  <FaSearch size={12} color="#94a3b8" />
                  <input
                    autoFocus
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="Search name, company, or phone..."
                    style={{ border: "none", outline: "none", fontSize: "0.85rem", width: "100%", backgroundColor: "transparent" }}
                  />
                </div>
              </div>

              <div style={{ overflowY: "auto", padding: "10px 20px 18px", flex: 1 }}>
                {customersLoading ? (
                  <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: "0.85rem" }}>Loading...</div>
                ) : filteredCustomers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: "0.85rem" }}>No active customers found.</div>
                ) : (
                  filteredCustomers.map(c => (
                    <div key={c.id} onClick={() => handleCustomerSelect(c)}
                      className="d-flex align-items-center justify-content-between mb-2"
                      style={{ border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#1F6F5C"; e.currentTarget.style.backgroundColor = "#E6F1EC"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.backgroundColor = "#fff"; }}
                    >
                      <div>
                        <div className="fw-semibold" style={{ color: "#0f172a", fontSize: "0.85rem" }}>{c.name}</div>
                        <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{c.company}</div>
                      </div>
                      <div style={{ color: "#475569", fontSize: "0.78rem" }}>{c.phone}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="qt-header-row d-flex justify-content-between align-items-start mb-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <div className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: 34, height: 34, background: "linear-gradient(135deg,#1F6F5C,#134A3E)", flexShrink: 0 }}>
                <FaFileAlt size={15} color="#fff" />
              </div>
              <h4 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.2rem" }}>Quotations</h4>
            </div>
            <p className="mb-0 small ms-1" style={{ color: "#94a3b8" }}>
              {quotations.filter(q => !q.isTemplate).length} quotations · ₹{totalValue.toLocaleString()} total
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
              <span style={{ color: "#64748b", fontWeight: 500 }}>Quotations</span>
            </div>
          </div>
          <div className="d-flex gap-2 qt-header-actions">
            <button
              onClick={() => navigate("/trash?tab=quotations")}
              title="Trash"
              aria-label="Trash"
              className="qt-trash-btn d-flex align-items-center justify-content-center"
              style={{
                background: "#fff", color: "#64748b", cursor: "pointer",
                borderRadius: "10px", border: "1.5px solid #e2e8f0", flexShrink: 0,
                width: 38, height: 38, padding: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#fecaca"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
            >
              <FaTrash size={13} />
            </button>

            <button
              onClick={() => setShowCustomerPicker(true)}
              className="qt-new-btn qt-choose-btn d-flex align-items-center gap-2 fw-semibold px-3 py-2"
              style={{
                background: "#fff", color: "#1F6F5C", fontSize: "0.82rem", cursor: "pointer",
                borderRadius: "10px", border: "1.5px solid #BFDED2", flexShrink: 0,
              }}
            >
              <FaAddressBook size={12} /> Choose Customer
            </button>

            <button
              onClick={() => setShowTemplates(true)}
              className="qt-new-btn qt-main-btn d-flex align-items-center gap-2 border-0 fw-semibold px-3 py-2"
              style={{
                background: "linear-gradient(135deg,#1F6F5C,#134A3E)",
                color: "#fff", fontSize: "0.82rem", cursor: "pointer",
                borderRadius: "10px", boxShadow: "0 4px 12px rgba(31,111,92,0.35)",
                flexShrink: 0,
              }}
            >
              <FaPlus size={12} /> New Quotation
            </button>

            {recoveredDrafts.length > 0 && (
              <button
                onClick={() => setShowRecoveredPanel(s => !s)}
                className="qt-drafts-btn qt-drafts-mobile"
                style={{
                  backgroundColor: showRecoveredPanel ? "#FDE68A" : "#FFFBEB",
                  color: "#92400E",
                  border: "1.5px solid #FDE68A",
                }}
              >
                <FaHistory size={12} /> Drafts
                <span style={{
                  backgroundColor: "#92400E", color: "#fff", borderRadius: "999px",
                  fontSize: "0.68rem", fontWeight: 700, padding: "1px 8px", lineHeight: "16px",
                }}>
                  {recoveredDrafts.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Toolbar: Recovered Drafts toggle + Reset Numbering (only when there
          are zero real quotations) + Delete Selected (only when rows are
          checked) + Search. */}
        <div className="qt-toolbar d-flex align-items-center justify-content-end gap-2 mb-4 flex-wrap">
          {recoveredDrafts.length > 0 && (
            <button
              onClick={() => setShowRecoveredPanel(s => !s)}
              className="qt-drafts-btn qt-drafts-desktop"
              style={{
                backgroundColor: showRecoveredPanel ? "#FDE68A" : "#FFFBEB",
                color: "#92400E",
                border: "1.5px solid #FDE68A",
              }}
            >
              <FaHistory size={12} /> Drafts
              <span style={{
                backgroundColor: "#92400E", color: "#fff", borderRadius: "999px",
                fontSize: "0.68rem", fontWeight: 700, padding: "1px 8px", lineHeight: "16px",
              }}>
                {recoveredDrafts.length}
              </span>
            </button>
          )}
          {canResetNumbering && onResetNumbering && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="qt-drafts-btn"
              title="Only available while there are zero quotations"
              style={{
                backgroundColor: "#fff",
                color: "#dc2626",
                border: "1.5px solid #fecaca",
              }}
            >
              <FaUndo size={11} /> Reset Numbering
            </button>
          )}
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDeleteClick} className="qt-bulk-delete-btn">
              <FaTrash size={12} /> Delete Selected ({selectedIds.length})
            </button>
          )}
          <div className="qt-search-box d-flex align-items-center gap-2"
            style={{ backgroundColor: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "9px 14px" }}>
            <FaSearch size={13} color="#94a3b8" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              className="qt-search-input"
              placeholder="Search by customer, quote no or invoice no..."
              style={{ border: "none", outline: "none", fontSize: "0.85rem", color: "#0f172a", width: "100%", backgroundColor: "transparent" }}
            />
          </div>
        </div>

        {/* Recovered (auto-saved) drafts panel — unsaved work only, never a manual draft store */}
        {showRecoveredPanel && recoveredDrafts.length > 0 && (
          <div className="d-flex flex-column gap-2 mb-4">
            {recoveredDrafts.map(draft => (
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
                      Unsaved quotation draft: {draft.label || "Untitled"}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#92400e" }}>
                      {draft.isNewQuotation ? "Never saved" : `Editing ${draft.quotationId}`} — last typed {timeAgo(draft.lastEdited)}
                    </div>
                  </div>
                </div>
                <div className="d-flex gap-2 flex-shrink-0">
                  <button onClick={() => handleDiscardDraft(draft)}
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
        <div className="d-flex flex-wrap gap-3 mb-4">
          {[
            { label: "Total", value: quotations.filter(q => !q.isTemplate).length, iconBg: "#E6F1EC", iconColor: "#1F6F5C", icon: <FaFileAlt size={14} /> },
            { label: "Approved", value: quotations.filter(q => q.status === "Approved").length, iconBg: "#ecfdf5", iconColor: "#059669", icon: <FaCheckCircle size={14} /> },
            { label: "Draft", value: quotations.filter(q => q.status === "Draft").length, iconBg: "#E6F1EC", iconColor: "#1F6F5C", icon: <FaFileSignature size={14} /> },
            { label: "Total Value", value: `₹${totalValue.toLocaleString()}`, iconBg: "#E6F1EC", iconColor: "#1F6F5C", icon: <FaRupeeSign size={14} /> },
          ].map(({ label, value, iconBg, iconColor, icon }) => (
            <div className="qt-stat-card" key={label}
              style={{ borderRadius: "12px", background: "#fff", boxShadow: "0 2px 8px rgba(15,23,42,0.06)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                style={{ width: 30, height: 30, background: iconBg, color: iconColor }}>{icon}</div>
              <div style={{ lineHeight: 1.15, minWidth: 0 }}>
                <div className="fw-bold" style={{ fontSize: "1rem", color: "#0f172a" }}>{value}</div>
                <div style={{ color: "#334155", fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* "Related to Invoice" result banner — shown when the search text
          matches a known invoice number */}
        {isInvoiceSearch && (
          <div className="qt-invoice-banner">
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                style={{ width: 34, height: 34, background: "#dbeafe", color: "#2563eb" }}
              >
                <FaFileInvoiceDollar size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>
                  Related to Invoice {matchedInvoice.invoiceNo}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#2563eb", fontWeight: 600 }}>
                  {invoiceSearchQuotationId
                    ? `Quotation ${invoiceSearchQuotationId} found`
                    : "No quotation is linked to this invoice"}
                </div>
              </div>
            </div>
            <button className="qt-invoice-clear-btn" onClick={clearInvoiceSearch}>
              <FaTimes size={11} /> Clear
            </button>
          </div>
        )}

        {/* Saved drafts — backend drafts with no QT number yet */}
        {savedDrafts.length > 0 && (
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <h5 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1rem" }}>
                Draft Quotations
              </h5>
              <span style={{
                backgroundColor: "#E6F1EC", color: "#1F6F5C", borderRadius: 999,
                fontSize: "0.72rem", fontWeight: 700, padding: "2px 10px",
              }}>
                {savedDrafts.length}
              </span>
            </div>

            <div className="qt-table-wrap">
              {savedDrafts.map(q => (
                <div key={q.id} className={`qt-draft-row${selectedIds.includes(q.id) ? " qt-row-selected" : ""}`}>
                  <input
                    type="checkbox"
                    className="qt-checkbox"
                    checked={selectedIds.includes(q.id)}
                    onChange={() => toggleSelectOne(q.id)}
                  />
                  <div className="qt-draft-info">
                    <div className="fw-semibold" style={{ color: "#0f172a", fontSize: "0.9rem" }}>
                      {q.company || q.name}
                    </div>
                    <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      {q.projectTitle || "Untitled quotation"}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "0.78rem", marginTop: 2 }}>
                      ₹{q.amount.toLocaleString()} · Last edited {timeAgoIso(q.updatedAt)}
                    </div>
                  </div>

                  {/* Status: Draft / Sent */}
                  <select
                    value="Draft"
                    disabled={sendingId === q.id}
                    onChange={(e) => {
                      if (e.target.value === "Sent") handleSendDraft(q);
                    }}
                    className="qt-status-select"
                    style={{
                      backgroundColor: statusConfig.Draft.bg,
                      color: statusConfig.Draft.color,
                      border: `1px solid ${statusConfig.Draft.border}`,
                      opacity: sendingId === q.id ? 0.6 : 1,
                    }}
                  >
                    <option value="Draft">{sendingId === q.id ? "Sending..." : "Draft"}</option>
                    <option value="Sent">Sent</option>
                  </select>

                  <div className="qt-draft-actions">
                    <button
                      onClick={() => { setSelected(q); setEditMode(true); }}
                      className="d-flex align-items-center gap-1 border-0 fw-semibold px-3 py-2 rounded-3"
                      style={{ backgroundColor: "#E6F1EC", color: "#1F6F5C", cursor: "pointer", fontSize: "0.78rem", whiteSpace: "nowrap" }}
                    >
                      Continue Editing
                    </button>
                    <button
                      onClick={() => handleDuplicateDraft(q)}
                      title="Duplicate"
                      className="qt-action-btn"
                      style={{ background: "#f1f5f9", color: "#475569" }}
                    >
                      <FaCopy size={12} />
                    </button>
                    <button onClick={() => handleDeleteClick(q.id)} title="Delete" className="qt-action-btn qt-action-delete">
                      <FaTrash size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table — numbered quotations only. Hidden when there are only drafts. */}
        {(numberedQuotations.length > 0 || savedDrafts.length === 0) && (
          <div className="qt-table-wrap">
            <div className="qt-table-scroll">
              <table className="qt-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        className="qt-checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        disabled={filtered.length === 0}
                      />
                    </th>
                    <th>Quote</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {numberedQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8", fontSize: "0.9rem" }}>
                        {isInvoiceSearch
                          ? `No quotation found for invoice ${matchedInvoice.invoiceNo}.`
                          : search ? `No quotations found.` : "No quotations found."}
                      </td>
                    </tr>
                  ) : (
                    numberedQuotations.map(q => {
                      return (
                        <tr key={q.id} className={selectedIds.includes(q.id) ? "qt-row-selected" : ""}>
                          <td onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="qt-checkbox"
                              checked={selectedIds.includes(q.id)}
                              onChange={() => toggleSelectOne(q.id)}
                            />
                          </td>
                          <td>
                            <span className="qt-cell-label">Quote</span>
                            <span className="fw-semibold" style={{ color: "#1F6F5C" }}>{q.quotationNumber}</span>
                          </td>
                          <td>
                            <span className="qt-cell-label">Customer</span>
                            <div className="fw-semibold" style={{ color: "#0f172a", fontSize: "0.85rem" }}>{q.name}</div>
                            <div style={{ color: "#94a3b8", fontSize: "0.72rem" }}>{q.company}</div>
                            {q.projectTitle && (
                              <div style={{ color: "#64748b", fontSize: "0.72rem" }}>{q.projectTitle}</div>
                            )}
                            <div className="qt-mobile-id">{q.quotationNumber}</div>
                          </td>
                          <td>
                            <span className="qt-cell-label">Date</span>
                            {(() => {
                              const isExpired = q.status !== "Approved" && new Date(q.validUntil) < new Date();
                              return (
                                <span style={{
                                  color: isExpired ? "#dc2626" : "#64748b",
                                  fontWeight: isExpired ? 600 : 400,
                                  fontSize: "0.8rem",
                                }}>
                                  {q.date}
                                  {isExpired && " (expired)"}
                                </span>
                              );
                            })()}
                          </td>
                          <td>
                            <span className="qt-cell-label">Total</span>
                            <span className="fw-semibold" style={{ color: "#0f172a" }}>₹{q.amount.toLocaleString()}</span>
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <span className="qt-cell-label">Status</span>
                            <EditableStatus value={q.status} onChange={(val) => handleStatusChange(q, val)} hasNumber={Boolean(q.quotationNumber)} />
                          </td>
                          <td className="qt-actions-cell" style={{ textAlign: "right" }}>
                            <span className="qt-cell-label">Action</span>
                            <span
                              className="qt-status-dot"
                              style={{ backgroundColor: (statusConfig[q.status] || {}).color }}
                              aria-hidden="true"
                            ></span>
                            <div className="d-flex gap-2 justify-content-end">
                              <button onClick={() => { setSelected(q); setEditMode(false); }} title="View" className="qt-action-btn qt-action-view">
                                <FaEye size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (q.status === "Approved") {
                                    setEditApprovedTarget(q);
                                    return;
                                  }
                                  setSelected(q);
                                  setEditMode(true);
                                }}
                                title="Edit"
                                className="qt-action-btn qt-action-edit"
                              >
                                <FaEdit size={13} />
                              </button>
                              {q.status === "Approved" && (
                                <button
                                  onClick={() => handlePreviewInvoice(q)}
                                  title="Preview Invoice"
                                  className="qt-action-btn qt-action-convert"
                                >
                                  <FaFileInvoiceDollar size={13} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDuplicateDraft(q)}
                                title="Duplicate"
                                className="qt-action-btn"
                                style={{ background: "#f1f5f9", color: "#475569" }}
                              >
                                <FaCopy size={13} />
                              </button>
                              <button onClick={() => handleDeleteClick(q.id)} title="Delete" className="qt-action-btn qt-action-delete">
                                <FaTrash size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {/* end no-print wrapper — everything above is hidden when printing */}

      {/* Invoice preview / selector popup */}
      {invoicePreview && (
        <div
          className="print-modal-backdrop"
          style={{
            position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(15,23,42,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setInvoicePreview(null)}
        >
          <div
            className="print-modal-card"
            style={{
              backgroundColor: "#fff", borderRadius: "16px", width: "100%", maxWidth: "900px",
              maxHeight: "90vh", overflow: "auto", position: "relative",
              boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {invoicePreview.invoiceList.length === 0 ? (
              <NoInvoicesPanel
                quotation={invoicePreview.quotation}
                onClose={() => setInvoicePreview(null)}
                onCreateInvoice={
                  onCreateInvoiceFromQuotation
                    ? () => {
                      const q = invoicePreview.quotation;
                      setInvoicePreview(null);
                      onCreateInvoiceFromQuotation(q);
                    }
                    : undefined
                }
              />
            ) : (
              <div style={{ padding: "20px" }}>
                {/* Only show the selector when there's more than one REAL
                    invoice to choose from — the single synthetic preview
                    (legacy quotations) skips straight to the document. */}
                {invoicePreview.invoiceList.length > 1 && !invoicePreview.isSynthetic && (
                  <InvoiceSelectorPanel
                    quotation={invoicePreview.quotation}
                    invoiceList={invoicePreview.invoiceList}
                    selectedIndex={invoicePreview.selectedIndex}
                    onSelect={(idx) => setInvoicePreview(prev => ({ ...prev, selectedIndex: idx }))}
                  />
                )}
                <InvoiceDocument
                  invoice={invoicePreview.invoiceList[invoicePreview.selectedIndex]}
                  onBack={() => setInvoicePreview(null)}
                  onEdit={() => { }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

