import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFileAlt, FaPlus, FaRupeeSign, FaSearch, FaEye, FaCalendarAlt, FaUser,
  FaCheckCircle, FaFileSignature, FaTrash, FaEdit, FaHistory,
  FaFileInvoiceDollar, FaExchangeAlt, FaTimes, FaAddressBook,
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
  } catch {}
return list.sort((a, b) => (b.lastEdited || 0) - (a.lastEdited || 0));}

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

const statusConfig = {
  Approved: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0", icon: <FaCheckCircle size={10} /> },
  Draft: { bg: "#E6F1EC", color: "#1F6F5C", border: "#BFDED2", icon: <FaFileSignature size={10} /> },
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

.qt-header-row { gap: 12px; }
.qt-header-actions { display: flex; gap: 8px; }
.qt-search-box { flex: 1 1 220px; min-width: 220px; }

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
    flex-direction: column;
    width: 100%;
  }
  .qt-new-btn {
    width: 100%;
    justify-content: center;
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
  .qt-stat-card {
    flex: 1 1 calc(50% - 6px);
    max-width: none;
  }
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

/* ---------- Recovered drafts panel ---------- */
.qt-recovered-item {
  background: #fff;
  border: 1px solid #FDE68A;
  border-radius: 10px;
}
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

// Confirm dialog for converting an approved quotation into an invoice
function ConvertConfirmDialog({ show, quotation, onConfirm, onCancel, converting }) {
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
          background: "#ecfdf5", display: "flex",
          alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px"
        }}>
          <FaFileInvoiceDollar size={24} color="#059669" />
        </div>
        <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>
          Convert to Invoice?
        </h5>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
          {quotation
            ? `This will create a new invoice from ${quotation.id} (${quotation.name}) for ₹${quotation.amount.toLocaleString()}.`
            : "This will create a new invoice from this quotation."}
        </p>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <button onClick={onCancel} disabled={converting}
            className="border-0 fw-semibold px-4 py-2"
            style={{ backgroundColor: "#f1f5f9", color: "#475569", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={converting}
            className="border-0 fw-semibold px-4 py-2"
            style={{ backgroundColor: "#059669", color: "#fff", borderRadius: "10px", cursor: converting ? "not-allowed" : "pointer", fontSize: "0.9rem" }}>
            {converting ? "Converting…" : "Convert"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline-editable Status pill
function EditableStatus({ value, onChange }) {
  const sc = statusConfig[value] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
      className="qt-status-select"
      style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
    >
      <option value="Draft">Draft</option>
      <option value="Approved">Approved</option>
    </select>
  );
}

export default function QuotationFirst({ quotations, setQuotations, search, setSearch, setSelected, setEditMode, setShowTemplates, onInvoiceCreated, onChooseCustomer }) {
  const navigate = useNavigate();

  // Confirm Dialog State — deleteIds holds either one id (row delete) or many (bulk delete)
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteIds, setDeleteIds] = useState([]);

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
  try { localStorage.removeItem(draft.key); } catch {}
  setRecoveredDrafts(prev => prev.filter(d => d.key !== draft.key));
};

// Convert-to-invoice state
  const [convertTarget, setConvertTarget] = useState(null);
  const [converting, setConverting] = useState(false);

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

  const handleCustomerSelect = (customer) => {
    setShowCustomerPicker(false);
    setCustomerSearch("");
    if (onChooseCustomer) onChooseCustomer(customer);
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

  // ── Convert an Approved quotation into a new Invoice ──
  const handleConvertClick = (q) => setConvertTarget(q);
  const handleConvertCancel = () => { if (!converting) setConvertTarget(null); };

 const handleConvertConfirm = async () => {
    if (!convertTarget) return;
    setConverting(true);
    try {
      // Look up how many invoices already exist so we can assign the next
      // sequential number — mirrors the INV-00X logic used in InvoiceForm.
      let nextInvoiceNo = "INV-001";
      try {
        const existingRes = await fetch(`${import.meta.env.VITE_API_URL}/invoices`);
        const existing = existingRes.ok ? await existingRes.json() : [];
        nextInvoiceNo = `INV-${String(existing.length + 1).padStart(3, "0")}`;
      } catch (numErr) {
        console.error('Failed to compute next invoice number:', numErr);
      }

      const invoicePayload = {
        isNew: true,
        invoiceNo: nextInvoiceNo,
        name: convertTarget.name,
        company: convertTarget.company,
        amount: convertTarget.amount,
        date: new Date().toISOString().split("T")[0],
        status: "Unpaid",
        fromQuotationId: convertTarget.id,
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });
      const createdInvoice = res.ok ? await res.json() : null;

      // Mark the quotation as converted so the button doesn't show again
      const updatedQuotation = { ...convertTarget, convertedInvoiceId: createdInvoice?.id ?? true };
      setQuotations(prev => prev.map(q => q.id === convertTarget.id ? updatedQuotation : q));
      await fetch(`${import.meta.env.VITE_API_URL}/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedQuotation, isNew: false }),
      });

      if (onInvoiceCreated) onInvoiceCreated(createdInvoice);
    } catch (err) {
      console.error('Convert to invoice failed:', err);
    } finally {
      setConverting(false);
      setConvertTarget(null);
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

  const filtered = quotations.filter(q =>
    !q.isTemplate &&
    (q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.company.toLowerCase().includes(search.toLowerCase()) ||
      q.id.toLowerCase().includes(search.toLowerCase()))
  );

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

  return (
    <div style={{ width: "100%" }}>
      <style>{tableStyles}</style>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        show={showConfirm}
        count={deleteIds.length}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
     <ConvertConfirmDialog
        show={Boolean(convertTarget)}
        quotation={convertTarget}
        onConfirm={handleConvertConfirm}
        onCancel={handleConvertCancel}
        converting={converting}
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
            onClick={() => setShowCustomerPicker(true)}
            className="qt-new-btn d-flex align-items-center gap-2 fw-semibold px-3 py-2"
            style={{
              background: "#fff", color: "#1F6F5C", fontSize: "0.82rem", cursor: "pointer",
              borderRadius: "10px", border: "1.5px solid #BFDED2", flexShrink: 0,
            }}
          >
            <FaAddressBook size={12} /> Choose Customer
          </button>

          <button
            onClick={() => setShowTemplates(true)}
            className="qt-new-btn d-flex align-items-center gap-2 border-0 fw-semibold px-3 py-2"
            style={{
              background: "linear-gradient(135deg,#1F6F5C,#134A3E)",
              color: "#fff", fontSize: "0.82rem", cursor: "pointer",
              borderRadius: "10px", boxShadow: "0 4px 12px rgba(31,111,92,0.35)",
              flexShrink: 0,
            }}
          >
            <FaPlus size={12} /> New Quotation
          </button>
        </div>
      </div>

      {/* Toolbar: Recovered Drafts toggle + Delete Selected (only when rows are checked) + Search */}
      <div className="qt-toolbar d-flex align-items-center justify-content-end gap-2 mb-4 flex-wrap">
        {recoveredDrafts.length > 0 && (
          <button
            onClick={() => setShowRecoveredPanel(s => !s)}
            className="qt-drafts-btn"
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
            placeholder="Search quotations..."
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

  {/* Table — headers always render on desktop/tablet; collapses to compact cards on phones/small tablets; empty state is a single row inside tbody */}
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8", fontSize: "0.9rem" }}>
                  {search ? `No quotations found.` : "No quotations found."}
                </td>
              </tr>
            ) : (
              filtered.map(q => (
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
                    <span className="fw-semibold" style={{ color: "#1F6F5C" }}>{q.id}</span>
                  </td>
                  <td>
                    <span className="qt-cell-label">Customer</span>
                    <div className="fw-semibold" style={{ color: "#0f172a", fontSize: "0.85rem" }}>{q.name}</div>
                    <div style={{ color: "#94a3b8", fontSize: "0.72rem" }}>{q.company}</div>
                    <div className="qt-mobile-id">{q.id}</div>
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
                    <EditableStatus value={q.status} onChange={(val) => handleStatusChange(q, val)} />
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
                      <button onClick={() => { setSelected(q); setEditMode(true); }} title="Edit" className="qt-action-btn qt-action-edit">
                        <FaEdit size={13} />
                      </button>
                      <button onClick={() => handleDeleteClick(q.id)} title="Delete" className="qt-action-btn qt-action-delete">
                        <FaTrash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}