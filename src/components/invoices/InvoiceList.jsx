import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaRupeeSign,
  FaSearch,
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaTimes,
  FaAddressBook,
  FaFileAlt,
  FaFileSignature,
  FaMoneyBillWave,
  FaFilter,
} from "react-icons/fa";

const statusConfig = {
  Paid: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  Unpaid: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  Overdue: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
  Draft: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  Sent: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  Converted: { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
};

const finalStatusOptions = ["Paid", "Unpaid", "Overdue"];
const proformaStatusOptions = ["Draft", "Sent", "Converted"];

const invoiceStyles = `
.inv-header-row { gap: 12px; }
.inv-header-actions { display: flex; gap: 8px; }
.inv-search-box { flex: 1 1 220px; min-width: 220px; }
.inv-table { width: 100%; min-width: 760px; border-collapse: collapse; }
.inv-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.inv-cell-label { display: none; }

/* ---------- Icon-only action buttons (always, like the quotes list) ---------- */
.inv-action-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 !important;
  cursor: pointer;
}
.inv-action-view { background: #e6f4ec !important; color: #059669 !important; box-shadow: none !important; }
.inv-action-edit { background: #fff2e0 !important; color: #ea580c !important; box-shadow: none !important; }
.inv-action-delete { background: #fee2e2 !important; color: #ef4444 !important; box-shadow: none !important; }
.inv-action-convert { background: #ede9fe !important; color: #7c3aed !important; box-shadow: none !important; }
.inv-action-payment { background: #fef3c7 !important; color: #b45309 !important; box-shadow: none !important; }

/* ---------- Quotation-linked reference chip under invoice number ---------- */
.inv-quote-ref {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  font-size: 0.68rem;
  font-weight: 700;
  color: #7c3aed;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 999px;
  padding: 1px 8px;
  cursor: pointer;
  white-space: nowrap;
  width: fit-content;
}
.inv-quote-ref:hover { background: #ede9fe; text-decoration: underline; }

/* ---------- "Related to Quotation" result banner ---------- */
.inv-quote-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  background: #f5f3ff;
  border: 1.5px solid #ddd6fe;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 14px;
}
.inv-quote-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1.5px solid #ddd6fe;
  background: #fff;
  color: #7c3aed;
  font-weight: 700;
  font-size: 0.78rem;
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  white-space: nowrap;
}
.inv-quote-clear-btn:hover { background: #7c3aed; color: #fff; border-color: #7c3aed; }

/* ---------- Tablet (~761px–1024px) ---------- */
@media (max-width: 1024px) {
  .inv-table th, .inv-table td { padding: 10px 12px !important; font-size: 0.8rem !important; }
  .inv-stats-grid { gap: 10px !important; }
  .inv-stat-card { flex: 1 1 calc(50% - 5px) !important; max-width: none !important; }
  .inv-search-box { flex: 1 1 200px; min-width: 180px; }
}

/* ---------- Small tablets / phones: table becomes a card list ---------- */
@media (max-width: 860px) {
  .inv-table thead { display: none; }
  .inv-table, .inv-table tbody { display: block; width: 100%; }
  .inv-table { min-width: 0; }
  .inv-table-scroll { overflow-x: hidden; }

  .inv-table tbody tr {
    display: grid !important;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "checkbox amount"
      "buyer due"
      "invoice invoice"
      "status status"
      "actions actions";
    row-gap: 6px;
    column-gap: 10px;
    align-items: start;
    padding: 14px 16px !important;
    margin: 0 0 12px 0 !important;
    border: 1px solid #eef1f5 !important;
    border-radius: 14px !important;
    box-shadow: 0 1px 4px rgba(15,23,42,0.05);
  }

  .inv-table td { display: block; width: auto; padding: 0 !important; border: none !important; }
  .inv-cell-label { display: none !important; }

  /* map table columns (in DOM order) to grid areas for the card layout */
  .inv-table td:nth-child(1) { grid-area: checkbox; align-self: flex-start; }
  .inv-table td:nth-child(2) { grid-area: invoice; font-size: 0.7rem !important; color: #94a3b8 !important; font-weight: 700 !important; }
  .inv-table td:nth-child(3) { grid-area: buyer; }
  .inv-table td:nth-child(4), .inv-table td:nth-child(5) { display: none !important; }
  .inv-table td:nth-child(6) { grid-area: status; }
  .inv-table td:nth-child(7) { grid-area: amount; text-align: right; font-size: 0.95rem !important; }
  .inv-table td:nth-child(8) { grid-area: due; text-align: right; font-size: 0.72rem !important; }
  .inv-table td:nth-child(9) { grid-area: actions; margin-top: 4px; }

  .inv-checkbox-cell { display: flex !important; align-items: center; }
  .inv-actions-cell { display: flex !important; }
  .inv-actions-cell > div { justify-content: flex-start !important; }
}

/* ---------- Phones ---------- */
@media (max-width: 640px) {
  .inv-header-row { flex-direction: column; align-items: stretch !important; }

  /* CHANGED: Choose Customer + New Invoice now sit side-by-side (2 in one line) */
  .inv-header-actions {
    flex-direction: row !important;
    width: 100%;
    gap: 8px;
  }
  .inv-new-btn {
    flex: 1 1 0 !important;
    width: auto !important;
    justify-content: center;
    padding-left: 8px !important;
    padding-right: 8px !important;
    font-size: 0.76rem !important;
    white-space: nowrap;
  }

  .inv-toolbar { justify-content: stretch !important; }
  .inv-toolbar > * { width: 100%; }
  .inv-search-box { min-width: 0 !important; width: 100%; }
  .inv-bulk-btn { justify-content: center !important; }

  /* Stat cards: 2 per line on phones */
  .inv-stats-grid { gap: 8px !important; }
  .inv-stat-card { flex: 1 1 calc(50% - 4px) !important; max-width: none !important; }

  .inv-quote-banner { flex-direction: column; align-items: flex-start !important; }
  .inv-quote-clear-btn { width: 100%; justify-content: center; }
}

/* REMOVED: the old @media (max-width: 420px) block that forced
   .inv-stat-card to flex: 1 1 100% (1 per line) on small phones.
   Deleting it lets the 640px rule above (2 per line) keep applying
   at all phone widths. */

/* ---------- Modals ---------- */
.inv-modal-card { width: 90%; max-width: 340px; }
@media (max-width: 480px) {
  .inv-modal-card { padding: 20px !important; width: 92%; }
}
`;

function calcTotals(invoice) {
  const subtotal = invoice.items.reduce((a, b) => a + b.amount, 0);
  const gstPercent = Number(invoice.gstPercent || 18);
  const tax = invoice.gstType === "With GST" ? Math.round(subtotal * (gstPercent / 100)) : 0;
  const total = invoice.gstType === "With GST" ? subtotal + tax : subtotal;
  const due = invoice.status === "Paid" ? 0 : total - (invoice.amountPaid || 0);
  return { total, due };
}

function isDueDatePast(dueDate, status) {
  if (!dueDate || status === "Paid") return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function StatCard({ icon, iconBg, iconColor, count, label, onClick, active }) {
  return (
    <div
      className="inv-stat-card"
      onClick={onClick}
      style={{
        borderRadius: "12px",
        background: "#fff",
        boxShadow: active ? `0 0 0 2px ${iconColor}` : "0 2px 8px rgba(15,23,42,0.06)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flex: "0 1 200px",
        maxWidth: 220,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
        style={{ width: 30, height: 30, background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div style={{ lineHeight: 1.15, minWidth: 0 }}>
        <div className="fw-bold" style={{ fontSize: "1rem", color: "#0f172a" }}>{count}</div>
        <div style={{ color: "#334155", fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</div>
      </div>
    </div>
  );
}

export default function InvoiceList({
  invoices,
  search,
  setSearch,
  onNew,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onChooseCustomer,
  approvedQuotations = [],
  onChooseQuotation,
  onConvertToFinal,
  onReceivePayment,
}) {
  const navigate = useNavigate();

  const [deleteTarget, setDeleteTarget] = useState(null); // single invoice pending delete confirmation
  const [bulkDeleteIds, setBulkDeleteIds] = useState(null); // array of ids pending bulk delete confirmation

 // Row selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const headerCheckboxRef = useRef(null);

 // Which tab is active: "all" | "final" | "proforma"
  const [activeTab, setActiveTab] = useState("all");

  // Which status filter is active: "all" | "Paid" | "Unpaid" | "Overdue"
  const [statusFilter, setStatusFilter] = useState("all");
  // Customer picker state
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  // Which source the picker modal is showing: saved Customers, or
  // Approved Quotations (so an invoice can be started from either).
  const [pickerTab, setPickerTab] = useState("customers");

  useEffect(() => {
    if (!showCustomerPicker) return;
    setPickerTab("customers");
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

  const filteredQuotations = approvedQuotations.filter(qt => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (qt.name || "").toLowerCase().includes(q) ||
      (qt.company || "").toLowerCase().includes(q) ||
      (qt.id || "").toLowerCase().includes(q)
    );
  });

  const handleCustomerSelect = (customer) => {
    setShowCustomerPicker(false);
    setCustomerSearch("");
    if (onChooseCustomer) onChooseCustomer(customer);
  };

  const handleQuotationSelect = (quotation) => {
    setShowCustomerPicker(false);
    setCustomerSearch("");
    if (onChooseQuotation) onChooseQuotation(quotation);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const confirmBulkDelete = () => {
    if (bulkDeleteIds) {
      bulkDeleteIds.forEach(id => onDelete(id));
      setSelectedIds(prev => prev.filter(id => !bulkDeleteIds.includes(id)));
      setBulkDeleteIds(null);
    }
  };

  // Proforma invoices are drafts/quotes, not real revenue — excluded from money stats
  const isProformaInvoice = (i) => i.invoiceType === "Proforma" || (i.invoiceNo || "").startsWith("PI-");
  const finalInvoices = invoices.filter(i => !isProformaInvoice(i));
  const proformaCount = invoices.filter(isProformaInvoice).length;

  const totalInvoices = finalInvoices.length;
  const paidCount = finalInvoices.filter(i => i.status === "Paid").length;
  const unpaidCount = finalInvoices.filter(i => i.status === "Unpaid").length;
  const overdueCount = finalInvoices.filter(i => i.status === "Overdue").length;
  const totalDue = finalInvoices.reduce((sum, inv) => sum + calcTotals(inv).due, 0);
  const totalRevenue = finalInvoices.reduce((sum, inv) => sum + calcTotals(inv).total, 0);

  const q = search.trim().toLowerCase();

  // ── Quotation-number search ──────────────────────────────────────────
  // If the search text exactly matches a known quotation number (either a
  // quotation that has invoices linked to it via `fromQuotationId`, or an
  // Approved quotation that doesn't have any invoices yet), we switch into
  // "quotation result" mode: the table is narrowed to just that
  // quotation's invoices and a small banner is shown above it. This is on
  // top of — not instead of — the normal buyer/invoice/status search below.
  const matchingInvoicesForQuote = q
    ? invoices.filter(inv => (inv.fromQuotationId || "").toLowerCase() === q)
    : [];
  const matchingApprovedQuotation = q
    ? approvedQuotations.find(qt => (qt.id || "").toLowerCase() === q)
    : null;
  const isQuotationSearch = Boolean(q) && (matchingInvoicesForQuote.length > 0 || matchingApprovedQuotation);
  const quotationSearchId = isQuotationSearch
    ? (matchingInvoicesForQuote[0]?.fromQuotationId || matchingApprovedQuotation?.id)
    : null;

  const filtered = isQuotationSearch
    ? matchingInvoicesForQuote
    : invoices.filter(inv => {
        const isProformaInv = isProformaInvoice(inv);
        if (activeTab === "final" && isProformaInv) return false;
        if (activeTab === "proforma" && !isProformaInv) return false;
        if (statusFilter !== "all" && inv.status !== statusFilter) return false;
        if (!q) return true;
        return (
          (inv.buyerName || "").toLowerCase().includes(q) ||
          (inv.invoiceNo || "").toLowerCase().includes(q) ||
          (inv.status || "").toLowerCase().includes(q) ||
          (inv.fromQuotationId || "").toLowerCase().includes(q)
        );
      });

  const handleStatusSelect = (inv, newStatus) => {
    if (onStatusChange) onStatusChange(inv, newStatus);
  };

  // Clicking a quotation reference chip (or the "Create Invoice" flow)
  // jumps straight into quotation-result mode for that quote number.
  const handleQuoteRefClick = (quotationId) => {
    setSearch(quotationId);
  };

  const clearQuotationSearch = () => setSearch("");

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : filtered.map(inv => inv.id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div style={{ width: "100%" }}>
      <style>{invoiceStyles}</style>

      {/* Header */}
      <div className="inv-header-row d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <div
              className="d-flex align-items-center justify-content-center rounded-3"
              style={{ width: 34, height: 34, background: "linear-gradient(135deg,#1F6F5C,#134A3E)", flexShrink: 0 }}
            >
              <FaFileInvoiceDollar size={15} color="#fff" />
            </div>
            <h4 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.25rem" }}>Invoices</h4>
          </div>
          <p className="mb-0 small ms-1" style={{ color: "#94a3b8" }}>
            {totalInvoices} invoices · ₹{totalRevenue.toLocaleString()} total revenue
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
            <span style={{ color: "#64748b", fontWeight: 500 }}>Invoices</span>
          </div>
        </div>

        <div className="d-flex gap-2 inv-header-actions">
          <button
            onClick={() => navigate("/trash?tab=invoices")}
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

          <button
            onClick={() => setShowCustomerPicker(true)}
            className="inv-new-btn d-flex align-items-center gap-2 fw-semibold px-3 py-2"
            style={{
              background: "#fff",
              color: "#1F6F5C",
              fontSize: "0.82rem",
              cursor: "pointer",
              borderRadius: "10px",
              border: "1.5px solid #BFDED2",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <FaAddressBook size={12} /> Choose Customer
          </button>

          <button
            onClick={() => onNew("Final")}
            className="inv-new-btn d-flex align-items-center gap-2 border-0 fw-semibold px-3 py-2"
            style={{
              background: "linear-gradient(135deg,#1F6F5C,#134A3E)",
              color: "#fff",
              fontSize: "0.82rem",
              cursor: "pointer",
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(31,111,92,0.35)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <FaPlus size={12} /> New Invoice
          </button>
        </div>
      </div>

      {/* Toolbar: Delete selected (only when rows are checked) / Search — right-aligned, above stats */}
      <div className="inv-toolbar d-flex align-items-center justify-content-end gap-2 mb-3 flex-wrap">
        {selectedIds.length > 0 && (
          <button
            onClick={() => setBulkDeleteIds(selectedIds)}
            className="inv-bulk-btn d-flex align-items-center gap-2 border-0 fw-semibold"
            style={{
              background: "linear-gradient(135deg,#f87171,#dc2626)",
              color: "#fff",
              fontSize: "0.8rem",
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: 10,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(220,38,38,0.3)",
            }}
          >
            <FaTrash size={12} /> Delete Selected ({selectedIds.length})
          </button>
        )}
        <div
          className="inv-search-box d-flex align-items-center gap-2"
          style={{ backgroundColor: "#fff", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "8px 12px" }}
        >
          <FaSearch size={13} color="#94a3b8" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by buyer name, invoice no, quotation no or status..."
            style={{ border: "none", outline: "none", fontSize: "0.85rem", color: "#0f172a", width: "100%", backgroundColor: "transparent" }}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="d-flex flex-wrap inv-stats-grid mb-4" style={{ gap: 12 }}>
        <StatCard icon={<FaFileInvoiceDollar size={14} />} iconBg="#E6F1EC" iconColor="#1F6F5C" count={totalInvoices} label="Total Invoices" />
       <StatCard icon={<FaCheckCircle size={14} />} iconBg="#ecfdf5" iconColor="#059669" count={paidCount} label="Paid" onClick={() => setStatusFilter("Paid")} active={statusFilter === "Paid"} />
        <StatCard icon={<FaClock size={14} />} iconBg="#fff7ed" iconColor="#ea580c" count={unpaidCount} label="Unpaid" onClick={() => setStatusFilter("Unpaid")} active={statusFilter === "Unpaid"} />
        <StatCard icon={<FaExclamationCircle size={14} />} iconBg="#fef2f2" iconColor="#dc2626" count={overdueCount} label="Overdue" onClick={() => setStatusFilter("Overdue")} active={statusFilter === "Overdue"} />
        <StatCard icon={<FaRupeeSign size={14} />} iconBg="#E6F1EC" iconColor="#1F6F5C" count={`₹${totalDue.toLocaleString()}`} label="Total Due" />
        <StatCard icon={<FaFileAlt size={14} />} iconBg="#f5f3ff" iconColor="#7c3aed" count={proformaCount} label="Proforma" />
      </div>

      {/* "Related to Quotation" result banner — only shown when the search
          text matches a known quotation number */}
      {isQuotationSearch && (
        <div className="inv-quote-banner">
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
              style={{ width: 34, height: 34, background: "#ede9fe", color: "#7c3aed" }}
            >
              <FaFileInvoiceDollar size={14} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>
                Related to Quotation {quotationSearchId}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#7c3aed", fontWeight: 600 }}>
                {filtered.length} {filtered.length === 1 ? "invoice" : "invoices"} found
              </div>
            </div>
          </div>
          <button className="inv-quote-clear-btn" onClick={clearQuotationSearch}>
            <FaTimes size={11} /> Clear
          </button>
        </div>
      )}

      {/* Tabs: All / Invoices / Proforma — hidden while viewing a
          quotation's invoices, since that's already a fixed result set */}
      {!isQuotationSearch && (
        <div className="d-flex gap-2 mb-3 flex-wrap justify-content-between">
          <div className="d-flex gap-2 flex-wrap">
            {[
              { key: "all", label: "All", count: invoices.length },
              { key: "final", label: "Invoices", count: finalInvoices.length },
              { key: "proforma", label: "Proforma", count: proformaCount },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="border-0 fw-semibold d-flex align-items-center gap-2"
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  backgroundColor: activeTab === tab.key ? "#1F6F5C" : "#fff",
                  color: activeTab === tab.key ? "#fff" : "#475569",
                  boxShadow: activeTab === tab.key ? "0 4px 12px rgba(31,111,92,0.3)" : "0 1px 4px rgba(15,23,42,0.06)",
                }}
              >
                {tab.label}
                <span
                  style={{
                    backgroundColor: activeTab === tab.key ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                    color: activeTab === tab.key ? "#fff" : "#64748b",
                    borderRadius: 999,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Status filter: All / Paid / Unpaid / Overdue */}
          <div className="d-flex align-items-center gap-2" style={{ backgroundColor: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "4px 6px" }}>
            <FaFilter size={11} color="#94a3b8" style={{ marginLeft: 6 }} />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="fw-semibold"
              style={{
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                fontSize: "0.8rem",
                color: "#0f172a",
                padding: "6px 4px",
                cursor: "pointer",
              }}
            >
              <option value="all">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Overdue">Overdue</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Converted">Converted</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white" style={{ borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div className="inv-table-scroll table-responsive">
          <table className="inv-table">
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <th style={{ padding: "14px 16px", width: 40 }}>
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={filtered.length === 0}
                    style={{ width: 16, height: 16, accentColor: "#059669", cursor: "pointer" }}
                  />
                </th>
                {["INVOICE", "BUYER", "DATE", "DUE DATE", "STATUS", "TOTAL", "DUE", "ACTION"].map((h, i) => (
                  <th
                    key={h}
                    className="text-uppercase"
                    style={{
                      fontSize: "0.7rem",
                      color: "#94a3b8",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      padding: "14px 16px",
                      textAlign: i === 7 ? "right" : "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const sc = statusConfig[inv.status] || statusConfig.Draft;
                const { total, due } = calcTotals(inv);
                const overdue = isDueDatePast(inv.dueDate, inv.status);
                const isProforma = inv.invoiceType === "Proforma" || (inv.invoiceNo || "").startsWith("PI-");
                return (
                  <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td className="inv-checkbox-cell" style={{ padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
                      <span className="inv-cell-label">Select</span>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(inv.id)}
                        onChange={() => toggleSelectOne(inv.id)}
                        style={{ width: 16, height: 16, accentColor: "#059669", cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", fontWeight: 700, color: "#1F6F5C" }}>
                      <span className="inv-cell-label">Invoice</span>
                      <div>
                        {inv.invoiceNo}
                        {isProforma && (
                          <span style={{
                            marginLeft: 8, fontSize: "0.62rem", fontWeight: 700, color: "#7c3aed",
                            backgroundColor: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 999,
                            padding: "2px 8px", verticalAlign: "middle",
                          }}>
                            PROFORMA
                          </span>
                        )}
                      </div>
                      {inv.fromQuotationId && (
                        <span
                          className="inv-quote-ref"
                          title={`Show all invoices from ${inv.fromQuotationId}`}
                          onClick={(e) => { e.stopPropagation(); handleQuoteRefClick(inv.fromQuotationId); }}
                        >
                          From {inv.fromQuotationId}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className="inv-cell-label">Buyer</span>
                      <div className="fw-bold" style={{ fontSize: "0.88rem", color: "#0f172a" }}>{inv.buyerName}</div>
                      <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>{inv.buyerMobile}</div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#64748b", whiteSpace: "nowrap" }}>
                      <span className="inv-cell-label">Date</span>
                      {inv.date}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "0.8rem",
                        whiteSpace: "nowrap",
                        color: overdue ? "#ef4444" : "#64748b",
                        fontWeight: overdue ? 700 : 400,
                      }}
                    >
                      <span className="inv-cell-label" style={{ color: overdue ? "#ef4444" : undefined }}>Due Date</span>
                      {inv.dueDate}
                    </td>
                    <td style={{ padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
                      <span className="inv-cell-label">Status</span>
                      {(() => {
                        // Fall back to checking the invoice number prefix (PI-xxx) in case
                        // invoiceType wasn't saved correctly on older/edited records.
                        const opts = isProforma ? proformaStatusOptions : finalStatusOptions;
                        return (
                          <select
                            value={inv.status}
                            onChange={e => handleStatusSelect(inv, e.target.value)}
                            className="fw-semibold"
                            style={{
                              fontSize: "0.7rem",
                              backgroundColor: sc.bg,
                              color: sc.color,
                              border: `1px solid ${sc.border}`,
                              borderRadius: 999,
                              padding: "5px 10px",
                              cursor: "pointer",
                              outline: "none",
                              appearance: "auto",
                            }}
                          >
                            {!opts.includes(inv.status) && (
                              <option value={inv.status}>{inv.status}</option>
                            )}
                            {opts.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>
                      <span className="inv-cell-label">Total</span>
                      ₹{total.toLocaleString()}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 700, fontSize: "0.85rem", color: due > 0 ? "#ef4444" : "#059669" }}>
                      <span className="inv-cell-label" style={{ color: due > 0 ? "#ef4444" : "#059669" }}>Due</span>
                      ₹{due.toLocaleString()}
                    </td>
                    <td className="inv-actions-cell" style={{ padding: "14px 16px" }}>
                      <span className="inv-cell-label">Action</span>
                     <div className="d-flex gap-2 justify-content-end flex-wrap">
                        {!isProforma && due > 0 && (
                          <button
                            onClick={() => onReceivePayment && onReceivePayment(inv)}
                            title="Receive Payment"
                            className="inv-action-btn inv-action-payment border-0"
                          >
                            <FaMoneyBillWave size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => onView(inv)}
                          title="View"
                          className="inv-action-btn inv-action-view border-0"
                        >
                          <FaEye size={13} />
                        </button>
                        <button
                          onClick={() => onEdit(inv)}
                          title="Edit"
                          className="inv-action-btn inv-action-edit border-0"
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(inv)}
                          title="Delete"
                          className="inv-action-btn inv-action-delete border-0"
                        >
                          <FaTrash size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center" style={{ padding: "40px 16px", color: "#94a3b8", fontSize: "0.88rem" }}>
                    {isQuotationSearch
                      ? `No invoices found for ${quotationSearchId}.`
                      : "No invoices found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="d-flex align-items-center justify-content-center"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.5)",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white inv-modal-card"
            style={{
              borderRadius: 14,
              padding: "24px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef2f2", color: "#ef4444" }}
            >
              <FaTrash size={18} />
            </div>
            <div className="text-center fw-bold mb-1" style={{ fontSize: "1rem", color: "#0f172a" }}>
              Delete invoice?
            </div>
            <div className="text-center mb-4" style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Invoice <strong>{deleteTarget.invoiceNo}</strong> for {deleteTarget.buyerName} will be permanently deleted. This can't be undone.
            </div>
            <div className="d-flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-fill fw-semibold border-0"
                style={{
                  background: "#f1f5f9",
                  color: "#334155",
                  borderRadius: 8,
                  padding: "10px",
                  fontSize: "0.85rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-fill fw-semibold border-0"
                style={{
                  background: "linear-gradient(135deg,#f87171,#ef4444)",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "10px",
                  fontSize: "0.85rem",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation modal */}
      {bulkDeleteIds && (
        <div
          className="d-flex align-items-center justify-content-center"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.5)",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setBulkDeleteIds(null)}
        >
          <div
            className="bg-white inv-modal-card"
            style={{
              borderRadius: 14,
              padding: "24px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef2f2", color: "#ef4444" }}
            >
              <FaTrash size={18} />
            </div>
            <div className="text-center fw-bold mb-1" style={{ fontSize: "1rem", color: "#0f172a" }}>
              Delete {bulkDeleteIds.length} invoices?
            </div>
            <div className="text-center mb-4" style={{ fontSize: "0.85rem", color: "#64748b" }}>
              These invoices will be permanently deleted. This can't be undone.
            </div>
            <div className="d-flex gap-2">
              <button
                onClick={() => setBulkDeleteIds(null)}
                className="flex-fill fw-semibold border-0"
                style={{
                  background: "#f1f5f9",
                  color: "#334155",
                  borderRadius: 8,
                  padding: "10px",
                  fontSize: "0.85rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="flex-fill fw-semibold border-0"
                style={{
                  background: "linear-gradient(135deg,#f87171,#ef4444)",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "10px",
                  fontSize: "0.85rem",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Choose Customer modal */}
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

            {/* Tabs: Customers vs Approved Quotations */}
            <div className="d-flex gap-2 px-4 pt-3">
              <button
                onClick={() => setPickerTab("customers")}
                className="border-0 fw-semibold"
                style={{
                  padding: "6px 14px", borderRadius: 999, fontSize: "0.8rem", cursor: "pointer",
                  backgroundColor: pickerTab === "customers" ? "#1F6F5C" : "#f1f5f9",
                  color: pickerTab === "customers" ? "#fff" : "#475569",
                }}
              >
                Customers
              </button>
              <button
                onClick={() => setPickerTab("quotations")}
                className="border-0 fw-semibold d-flex align-items-center gap-1"
                style={{
                  padding: "6px 14px", borderRadius: 999, fontSize: "0.8rem", cursor: "pointer",
                  backgroundColor: pickerTab === "quotations" ? "#1F6F5C" : "#f1f5f9",
                  color: pickerTab === "quotations" ? "#fff" : "#475569",
                }}
              >
                Approved Quotations
                {approvedQuotations.length > 0 && (
                  <span style={{
                    backgroundColor: pickerTab === "quotations" ? "rgba(255,255,255,0.25)" : "#dbe4e0",
                    color: pickerTab === "quotations" ? "#fff" : "#1F6F5C",
                    borderRadius: 999, fontSize: "0.68rem", fontWeight: 700, padding: "1px 7px",
                  }}>
                    {approvedQuotations.length}
                  </span>
                )}
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
                  placeholder={pickerTab === "customers" ? "Search name, company, or phone..." : "Search name, company, or quote no..."}
                  style={{ border: "none", outline: "none", fontSize: "0.85rem", width: "100%", backgroundColor: "transparent" }}
                />
              </div>
            </div>

            <div style={{ overflowY: "auto", padding: "10px 20px 18px", flex: 1 }}>
              {pickerTab === "customers" ? (
                customersLoading ? (
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
                )
              ) : (
                filteredQuotations.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: "0.85rem" }}>No approved quotations found.</div>
                ) : (
                  filteredQuotations.map(qt => (
                    <div key={qt.id} onClick={() => handleQuotationSelect(qt)}
                      className="d-flex align-items-center justify-content-between mb-2"
                      style={{ border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.backgroundColor = "#f5f3ff"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.backgroundColor = "#fff"; }}
                    >
                      <div>
                        <div className="fw-semibold" style={{ color: "#0f172a", fontSize: "0.85rem" }}>{qt.name || qt.company}</div>
                        <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{qt.company}</div>
                      </div>
                      <div className="text-end">
                        <div style={{ color: "#7c3aed", fontSize: "0.72rem", fontWeight: 700 }}>{qt.id}</div>
                        <div style={{ color: "#475569", fontSize: "0.78rem" }}>₹{Number(qt.amount || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}