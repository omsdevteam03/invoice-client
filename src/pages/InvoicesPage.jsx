import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import InvoiceList from "../components/invoices/InvoiceList";
import InvoiceForm from "../components/invoices/InvoiceForm";
import InvoiceDocument from "../components/invoices/InvoiceDocument";
import ReceivePaymentModal from "../components/invoices/ReceivePaymentModal";
import { FaFileInvoiceDollar } from "react-icons/fa";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import { getCostItems } from "../components/quotations/quotationLayoutUtils";
import { validateForEwayBill, GSTIN_REGEX, VEHICLE_REGEX } from "../components/invoices/EwayBillChecklist";
import { invoiceHasGoods, invoiceTotals } from "../components/invoices/invoiceLang";

const API = `${import.meta.env.VITE_API_URL}/invoices`;
const SETTINGS_API = `${import.meta.env.VITE_API_URL}/settings/company`;
const DOC_SETTINGS_API = `${import.meta.env.VITE_API_URL}/settings/invoice`;
const QUOTATIONS_API = `${import.meta.env.VITE_API_URL}/quotations`;
const CUSTOMERS_API = `${import.meta.env.VITE_API_URL}/customers`;
const COMPANIES_API = `${import.meta.env.VITE_API_URL}/settings/companies`;
const PRODUCTS_API = `${import.meta.env.VITE_API_URL}/products`;

// Reduces stock for every item that came from the Products list (has a productId).
// Services are skipped. Call only for NEW Final invoices.
const deductStock = async (invoice) => {
  const note = `Sold via invoice ${invoice.invoiceNo}`;
  const needed = {};
  (invoice.items || []).forEach((it) => {
    if (it.productId) needed[it.productId] = (needed[it.productId] || 0) + (Number(it.qty) || 1);
  });
  const ids = Object.keys(needed);
  if (!ids.length) return;
  try {
    const all = await (await fetch(PRODUCTS_API)).json();
    await Promise.all(ids.map(async (pid) => {
      const p = all.find((x) => x.id === pid);
      if (!p || p.type === "Service") return;
      const next = Math.max(0, (Number(p.stock_qty) || 0) - needed[pid]);
      await fetch(PRODUCTS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, stock_qty: next }),
      });
    }));
  } catch (err) {
    console.error("Failed to update stock:", err);
  }
};

// ── Numbering helpers ────────────────────────────────────────────────────
// A record is Proforma if it's explicitly tagged that way, OR — for older
// records saved before invoiceType existed — if its number carries the
// "PI-" prefix. Anything else counts as Final. Defined once here and reused
// everywhere in this file (openDraftFromCustomer, openDraftFromQuotation,
// handleConvertToFinal) so the two numbering series can never drift out of
// sync with each other or with InvoiceForm.jsx, which uses the same check.
const isProformaRecord = (i) =>
  i.invoiceType === "Proforma" || (i.invoiceNo || "").startsWith("PI-");
const isFinalRecord = (i) => !isProformaRecord(i);

function ConvertToFinalModal({ invoiceNo, onCancel, onConfirm }) {
  if (!invoiceNo) return null;
  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, padding: 16 }}
      onClick={onCancel}
    >
      <div
        className="bg-white"
        style={{ borderRadius: 14, padding: "24px", width: "90%", maxWidth: 340, boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="d-flex align-items-center justify-content-center mx-auto mb-3"
          style={{ width: 48, height: 48, borderRadius: "50%", background: "#ede9fe", color: "#7c3aed" }}
        >
          <FaFileInvoiceDollar size={18} />
        </div>
        <div className="text-center fw-bold mb-1" style={{ fontSize: "1rem", color: "#0f172a" }}>
          Convert {invoiceNo} into a Final Invoice?
        </div>
        <div className="text-center mb-4" style={{ fontSize: "0.85rem", color: "#64748b" }}>
          This creates a new Final Invoice from this proforma and marks the original as Converted.
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={onCancel}
            className="flex-fill fw-semibold border-0"
            style={{ background: "#f1f5f9", color: "#334155", borderRadius: 8, padding: "10px", fontSize: "0.85rem" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-fill fw-semibold border-0"
            style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)", color: "#fff", borderRadius: 8, padding: "10px", fontSize: "0.85rem" }}
          >
            Convert
          </button>
        </div>
      </div>
    </div>
  );
}

function EwayBillModal({ invoice, onCancel, onSubmit }) {
  const [vehicleNo, setVehicleNo] = useState("");
  const [transporterId, setTransporterId] = useState("");
  const [error, setError] = useState("");
  if (!invoice) return null;

  const submit = () => {
    const cleanVehicle = vehicleNo.toUpperCase().replace(/[\s-]/g, "");
    const cleanTransporter = transporterId.trim().toUpperCase();
    if (!VEHICLE_REGEX.test(cleanVehicle)) {
      setError("Invalid vehicle number. Example: TN01AB1234");
      return;
    }
    if (cleanTransporter && !GSTIN_REGEX.test(cleanTransporter)) {
      setError("Transporter ID must be a valid 15-character GSTIN.");
      return;
    }
    onSubmit(invoice, cleanVehicle, cleanTransporter);
  };

  const inputStyle = {
    width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 12px",
    fontSize: "0.85rem", color: "#0f172a", outline: "none", textTransform: "uppercase",
  };
  const labelStyle = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: 6 };

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, padding: 16 }}
      onClick={onCancel}
    >
      <div
        className="bg-white"
        style={{ borderRadius: 14, padding: 24, width: "90%", maxWidth: 380, boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="d-flex align-items-center justify-content-center mx-auto mb-3"
          style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef3c7", color: "#b45309" }}
        >
          <FaFileInvoiceDollar size={18} />
        </div>
        <div className="text-center fw-bold mb-1" style={{ fontSize: "1rem", color: "#0f172a" }}>
          Generate E-Way Bill
        </div>
        <div className="text-center mb-3" style={{ fontSize: "0.85rem", color: "#64748b" }}>
          Invoice <strong>{invoice.invoiceNo}</strong> — enter the transport details
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Vehicle Number *</label>
          <input
            autoFocus
            value={vehicleNo}
            onChange={(e) => { setVehicleNo(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="e.g. TN01AB1234"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>
            Transporter ID / GSTIN <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            value={transporterId}
            maxLength={15}
            onChange={(e) => { setTransporterId(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="15-character GSTIN"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{ color: "#ef4444", fontSize: "0.78rem", fontWeight: 600, marginBottom: 10 }}>{error}</div>
        )}

        <div className="d-flex gap-2 mt-3">
          <button
            onClick={onCancel}
            className="flex-fill fw-semibold border-0"
            style={{ background: "#f1f5f9", color: "#334155", borderRadius: 8, padding: "10px", fontSize: "0.85rem" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-fill fw-semibold border-0"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", borderRadius: 8, padding: "10px", fontSize: "0.85rem" }}
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelEwbModal({ invoice, onClose, onConfirm }) {
  const [reason, setReason] = useState("3");
  if (!invoice) return null;

  // Cancel is allowed only within 24 hours of generating the e-way bill
  const generatedAt = invoice.ewayBillDate ? new Date(invoice.ewayBillDate) : null;
  const deadline = generatedAt ? new Date(generatedAt.getTime() + 24 * 60 * 60 * 1000) : null;
  const expired = deadline ? Date.now() > deadline.getTime() : false;
  const fmt = (d) => d.toLocaleString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, padding: 16 }}
      onClick={onClose}
    >
      <div
        className="bg-white"
        style={{ borderRadius: 14, padding: 24, width: "90%", maxWidth: 380, boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="d-flex align-items-center justify-content-center mx-auto mb-3"
          style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef2f2", color: "#ef4444", fontSize: 20, fontWeight: 700 }}
        >
          !
        </div>
        <div className="text-center fw-bold mb-1" style={{ fontSize: "1rem", color: "#0f172a" }}>
          Cancel E-Way Bill?
        </div>
        <div className="text-center mb-2" style={{ fontSize: "0.85rem", color: "#64748b" }}>
          E-Way Bill <strong>{invoice.ewayBillNo}</strong> will be cancelled. This cannot be undone.
        </div>

        {deadline && (
          <div
            className="mb-3"
            style={{
              fontSize: "0.78rem", fontWeight: 600, borderRadius: 8, padding: "8px 10px",
              backgroundColor: expired ? "#fef2f2" : "#fffbeb",
              color: expired ? "#b91c1c" : "#b45309",
              border: `1px solid ${expired ? "#fecaca" : "#fde68a"}`,
            }}
          >
            {expired
              ? `Cancel time is over. It was allowed only until ${fmt(deadline)} (24 hours after generating).`
              : `You can cancel only until ${fmt(deadline)} (within 24 hours of generating).`}
          </div>
        )}

        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: 6 }}>
          Reason
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{
            width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 12px",
            fontSize: "0.85rem", color: "#0f172a", outline: "none", cursor: "pointer",
          }}
        >
          <option value="1">Duplicate</option>
          <option value="2">Order cancelled</option>
          <option value="3">Data entry mistake</option>
          <option value="4">Others</option>
        </select>

        <div className="d-flex gap-2 mt-3">
          <button
            onClick={onClose}
            className="flex-fill fw-semibold border-0"
            style={{ background: "#f1f5f9", color: "#334155", borderRadius: 8, padding: "10px", fontSize: "0.85rem" }}
          >
            Keep it
          </button>
          <button
            onClick={() => onConfirm(invoice, reason)}
            disabled={expired}
            title={expired ? "24 hours are over, cancel is not allowed" : ""}
            className="flex-fill fw-semibold border-0"
            style={{
              background: "linear-gradient(135deg,#f87171,#ef4444)", color: "#fff", borderRadius: 8,
              padding: "10px", fontSize: "0.85rem",
              opacity: expired ? 0.45 : 1, cursor: expired ? "not-allowed" : "pointer",
            }}
          >
            Cancel E-Way Bill
          </button>
        </div>
      </div>
    </div>
  );
}

// Appends one entry to an invoice's activity log. Used everywhere an
// // invoice is created, edited, has its status changed, receives a payment,
// or is converted — so the Activity Log tab always has a full history.
const logActivity = (invoice, message) => ({
  ...invoice,
  activityLog: [...(invoice.activityLog || []), { message, date: new Date().toISOString() }],
});

export default function InvoicesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  // Remembers if this page was opened from the AI chat's "View" button
  const aiReturnRef = useRef(
    location.state?.fromAI ? location.state.returnTo || "/ai" : null
  );

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);
  const [singleInvoice, setSingleInvoice] = useState(null);
  // Only used for an UNSAVED draft (New / Choose Customer / Choose Quotation
  // flows) — once an invoice is saved it's identified purely by URL :id,
  // so a page refresh always re-derives the correct screen from invoices[].
  const [draftInvoice, setDraftInvoice] = useState(null);
  const [search, setSearch] = useState("");
  const [newInvoiceType, setNewInvoiceType] = useState("Final"); // "Final" | "Proforma" — used when creating a new invoice
  const [paymentInvoice, setPaymentInvoice] = useState(null); // invoice currently open in the Receive Payment modal

  // ── Derive which screen to show from the URL, not from local state ──────
  const isNewRoute = location.pathname === "/invoices/new";
  const isEditRoute = Boolean(id) && location.pathname.endsWith("/edit");
  const isDocRoute = Boolean(id) && !isEditRoute;
  const selected = id
    ? invoices.find((i) => i.id === id) || (singleInvoice?.id === id ? singleInvoice : null)
    : draftInvoice;

  const [companyInfo, setCompanyInfo] = useState({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyAddress: "",
    gstin: "",
    website: "",
    logo: null,
  });
  const [docSettings, setDocSettings] = useState({
    invoicePrefix: "INV-",
    quotationPrefix: "QT-",
    gstPercent: 18,
    currency: "INR",
    defaultPaymentTerms: "",
    defaultNotes: "",
  });
  const [approvedQuotations, setApprovedQuotations] = useState([]);
  const [allQuotations, setAllQuotations] = useState([]);
  const [toast, setToast] = useState(null); // { message } | null
  const saveTimer = useRef(null);

  // Load invoices from DB
  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setInvoices(data))
      .catch(err => console.error('Failed to load invoices:', err))
      .finally(() => setInvoicesLoaded(true));
  }, []);

  // Fetch just the opened invoice so the page doesn't wait for the full list
  useEffect(() => {
    if (!id) { setSingleInvoice(null); return; }
    let cancelled = false;
    fetch(`${API}/${id}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (!cancelled && data && data.id) setSingleInvoice(data); })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [id]);
  // Load customers (used by the Buyer Name picker in the invoice form)
  useEffect(() => {
    fetch(CUSTOMERS_API)
      .then(res => res.json())
      .then(data => setCustomers(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load customers:', err));
  }, []);

  // Load company profiles from Settings (same list the Quotation page uses)
  useEffect(() => {
    axiosInstance.get('/settings/companies')
      .then(res => setCompanies(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to load companies:', err));
  }, []);

  // If someone lands on /invoices/:id (view or edit) for an invoice that
  // doesn't exist once loading has finished, send them back to the list
  // instead of showing a blank/broken screen.
  useEffect(() => {
    if (!invoicesLoaded || !id) return;
    if (!invoices.find((i) => i.id === id)) {
      navigate("/invoices", { replace: true });
    }
  }, [invoicesLoaded, id, invoices, navigate]);

  // Load quotations — only the Approved ones are offered as an invoice
  // starting point in the "Choose Customer" picker's Quotations tab.
  useEffect(() => {
    fetch(QUOTATIONS_API)
      .then(res => res.json())
      .then(data => {
        setAllQuotations(data);
        setApprovedQuotations(data.filter(q => q.status === "Approved" && !q.isTemplate));
      })
      .catch(err => console.error('Failed to load quotations:', err));
  }, []);

  // Load company settings from DB
  useEffect(() => {
    fetch(SETTINGS_API)
      .then(res => res.json())
      .then(data => setCompanyInfo(prev => ({ ...prev, ...data })))
      .catch(err => console.error('Failed to load company settings:', err));
  }, []);

  // Load invoice/quotation numbering + GST settings from DB
  useEffect(() => {
    fetch(DOC_SETTINGS_API)
      .then(res => res.json())
      .then(data => setDocSettings(prev => ({ ...prev, ...data })))
      .catch(err => console.error('Failed to load invoice/quotation settings:', err));
  }, []);

  // NEW — Jump straight to the edit form when arriving from a quotation conversion.
  // The invoice was just saved by QuotationsPage, so it's already in the DB —
  // route straight to its edit URL instead of holding it in local state.
  useEffect(() => {
    const editInvoice = location.state?.editInvoice;
    if (editInvoice) {
      navigate(`/invoices/${editInvoice.id}/edit`, { replace: true, state: {} });
    }
  }, []);

  // NEW — Jump straight to ONE invoice when arriving via
  // /invoices?fromQuotationId=QT-xxx (the "View Invoice" button on the
  // Quotations page). Finds the invoice that was created from that
  // quotation (matched on the fromQuotationId field saved at conversion
  // time) and redirects to its own /invoices/:id URL — so only that
  // person's invoice is shown, never the full list.
  useEffect(() => {
    if (!invoicesLoaded) return;
    const params = new URLSearchParams(location.search);
    const fromQuotationId = params.get("fromQuotationId");
    if (!fromQuotationId) return;
    const match = invoices.find(i => i.fromQuotationId === fromQuotationId);
    if (match) {
      navigate(`/invoices/${match.id}`, { replace: true });
    } else {
      navigate("/invoices", { replace: true });
    }
  }, [invoicesLoaded, location.search, invoices, navigate]);

  // NEW — Jump straight into a prefilled draft invoice when arriving from
  // the Quotations page's "Create Invoice" button (shown in the Invoice
  // Selector when a quotation has zero linked invoices yet). Reuses the
  // same openDraftFromQuotation flow as the "Choose Customer ➜ Quotations"
  // tab, so numbering/company/buyer prefill logic only lives in one place.
  useEffect(() => {
    const chooseQuotation = location.state?.chooseQuotation;
    if (chooseQuotation) {
      openDraftFromQuotation(chooseQuotation);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Called whenever the company fields are edited in the form.
  // Updates the screen instantly, and saves to the database after
  // a short pause (600ms) so we're not sending a request on every keystroke.
  const handleCompanyChange = (updated) => {
    setCompanyInfo(updated);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(SETTINGS_API, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
        const saved = await res.json();
        setCompanyInfo(prev => ({ ...prev, ...saved }));
      } catch (err) {
        console.error('Failed to save company settings:', err);
      }
    }, 600);
  };

  const handleNew = (type = "Final") => {
    setDraftInvoice(null);
    setNewInvoiceType(type);
    navigate("/invoices/new");
  };

  // If this invoice is a Converted proforma, redirect to the Final Invoice
  // it was converted into instead of opening the old proforma record.
  const resolveConverted = (inv) => {
    if (inv?.status === "Converted" && inv?.convertedInvoiceId) {
      const finalInv = invoices.find(i => i.id === inv.convertedInvoiceId);
      if (finalInv) return finalInv;
    }
    return inv;
  };

  const handleEdit = (inv) => navigate(`/invoices/${resolveConverted(inv).id}/edit`);
  const handleView = (inv) => navigate(`/invoices/${resolveConverted(inv).id}`);

  // Opens a pre-filled, unsaved invoice draft for a given customer, straight
  // into the edit form — nothing is saved until "Generate Invoice" is clicked.
  const openDraftFromCustomer = async (customer) => {
    // Always fetch the latest active company profile right before creating
    // a document, instead of relying on whatever was fetched at page load —
    // this way switching the active company takes effect immediately, with
    // no page refresh required.
    let freshCompanyInfo = companyInfo;
    try {
      const res = await fetch(SETTINGS_API);
      if (res.ok) {
        const data = await res.json();
        freshCompanyInfo = { ...companyInfo, ...data };
        setCompanyInfo(freshCompanyInfo);
      }
    } catch (err) {
      console.error("Failed to refresh company info before creating invoice:", err);
    }

    const prefix = docSettings.invoicePrefix || "INV-";
    // Final and Proforma are separate numbering series — must count only
    // same-type invoices, or the two series eat into each other's numbers
    // (e.g. a Proforma save bumps what looks like the Final count too,
    // producing gaps like INV-002, INV-004 instead of INV-001, INV-002).
    const finalInvoiceNumbers = invoices
      .filter(isFinalRecord)
      .map(i => parseInt((i.invoiceNo || "").match(/(\d+)$/)?.[1] || "0", 10));
    const nextNum = (finalInvoiceNumbers.length ? Math.max(...finalInvoiceNumbers) : 0) + 1;
    const nextInvoiceNo = `${prefix}${String(nextNum).padStart(3, "0")}`;

    const draftInvoice = {
      invoiceNo: nextInvoiceNo,
      date: new Date().toISOString().split("T")[0],
      dueDate: "",
      status: "Unpaid",
      gstType: "No GST",
      gstPercent: docSettings.gstPercent ?? 18,
      companyName: freshCompanyInfo.companyName,
      companyAddress: freshCompanyInfo.companyAddress,
      companyMobile: freshCompanyInfo.companyPhone || "",
      companyEmail: freshCompanyInfo.companyEmail || "",
      companyGSTIN: freshCompanyInfo.gstin,
      logo: freshCompanyInfo.logo || null,
      signature: "/signature.png",
      buyerName: customer.name || customer.company || "",
      buyerCompanyName: customer.company || "",
      buyerAddress: customer.address || "",
      buyerMobile: customer.phone || "",
      buyerGSTIN: customer.gst_number || customer.gstNumber || customer.gstin || "",
      amountPaid: 0,
      notes: docSettings.defaultNotes || "",
      invoiceType: "Final",
      items: [{ sl: 1, description: "", qty: 1, unit: "Nos", rate: 0, amount: 0 }],
    };
    setDraftInvoice(draftInvoice);
    navigate("/invoices/new");
  };

  // Opens a pre-filled, unsaved invoice draft from an Approved quotation —
  // carries over the buyer's details AND the quotation's line items/amount,
  // similar to the "Convert to Invoice" action on the Quotations page.
  // Also reused by the "Create Invoice" button in the Quotations page's
  // Invoice Selector (see the chooseQuotation effect above), so a quotation
  // with zero linked invoices can get its first one started from either page.
  const openDraftFromQuotation = async (quotation) => {
    let freshCompanyInfo = companyInfo;
    try {
      const res = await fetch(SETTINGS_API);
      if (res.ok) {
        const data = await res.json();
        freshCompanyInfo = { ...companyInfo, ...data };
        setCompanyInfo(freshCompanyInfo);
      }
    } catch (err) {
      console.error("Failed to refresh company info before creating invoice:", err);
    }

    const prefix = docSettings.invoicePrefix || "INV-";
    // Max-of-existing-numbers, not a .length count — a count silently
    // produces duplicate invoice numbers the moment any Final invoice is
    // deleted, since the array shrinks but past numbers stay issued.
    const finalInvoiceNumbers = invoices
      .filter(isFinalRecord)
      .map(i => parseInt((i.invoiceNo || "").match(/(\d+)$/)?.[1] || "0", 10));
    const nextNum = (finalInvoiceNumbers.length ? Math.max(...finalInvoiceNumbers) : 0) + 1;
    const nextInvoiceNo = `${prefix}${String(nextNum).padStart(3, "0")}`;
    // Same helper the Quotation page uses, so older / AI-created quotations also work
    const normalizedItems = getCostItems(quotation);
    const costItems = Array.isArray(normalizedItems) && normalizedItems.length
      ? normalizedItems
      : (Array.isArray(quotation.costItems) ? quotation.costItems : []);
    const items = costItems.length
      ? costItems.map((it, i) => {
        const qty = Number(it.qty) || 1;
        // new quotations store `rate`; older ones only have `amount` (qty × unit price)
        const rate = it.rate !== undefined
          ? Number(it.rate) || 0
          : (Number(it.amount) || 0) / qty;
        return {
          sl: i + 1,
          description: it.name || it.description || it.label || "",
          productId: it.productId,
          qty,
          rate,
          discount: Number(it.discount) || 0,
          discountType: it.discountType || "percent",
          ...(it.gstPercent !== undefined && { gstPercent: Number(it.gstPercent) || 0 }),
          amount: Number(it.amount) || 0, // already the final amount after discount
        };
      })
      : [{
        sl: 1,
        description: quotation.projectTitle || "Service",
        qty: 1,
        rate: Number(quotation.amount) || 0,
        amount: Number(quotation.amount) || 0,
      }];
    // Map the quotation's GST style onto the invoice's gstType — the
    // quotation stores this as gstMode ("with" / "without" / "inclusive"),
    // so all three states need to carry over, not just with/without.
    const quotationGstType =
      quotation.gstMode === "inclusive" ? "GST Included" :
        quotation.gstMode === "without" ? "No GST" :
          quotation.gstMode === "with" ? "With GST" :
            quotation.includeGst === true ? "With GST" : "No GST"; // fallback for older quotations without gstMode

    const draftInvoice = {
      invoiceNo: nextInvoiceNo,
      date: new Date().toISOString().split("T")[0],
      dueDate: "",
      status: "Unpaid",
      gstType: quotationGstType,
      gstPercent: Number(quotation.gstPercent ?? docSettings.gstPercent ?? 18),

      companyName: freshCompanyInfo.companyName,
      companyAddress: freshCompanyInfo.companyAddress,
      companyMobile: freshCompanyInfo.companyPhone || "",
      companyEmail: freshCompanyInfo.companyEmail || "",
      companyGSTIN: freshCompanyInfo.gstin,
      logo: freshCompanyInfo.logo || null,
      signature: "/signature.png",
      buyerName: quotation.name || quotation.company || "",
      buyerCompanyName: quotation.company || "",
      buyerAddress: quotation.clientAddress || "",
      buyerMobile: quotation.phone || "",
      buyerGSTIN: "",
      amountPaid: 0,
      notes: docSettings.defaultNotes || "",
      invoiceType: "Final",
      fromQuotationId: quotation.id,
      items,
    };
    setDraftInvoice(draftInvoice);
    navigate("/invoices/new");
  };

  // Save to DB — logs "Invoice created" for new records, "Invoice details
  // updated" when editing an existing one.
  const handleSave = async (updated) => {
    try {
      const old = invoices.find(i => i.id === updated.id);
      const isNew = !old;
      const withLog = logActivity(
        isNew ? { ...updated, createdBy: user?.id, createdByName: user?.name } : updated,
        isNew ? "Invoice created" : "Invoice details updated"
      );

      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withLog),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Save failed with status ${res.status}`);
      }
      const saved = await res.json();
      if (!isProformaRecord(updated)) {
        const oldItems = isNew || isProformaRecord(old) ? [] : old.items || [];
        await adjustStock(oldItems, updated.items, isNew ? `Sold via invoice ${updated.invoiceNo}` : `Invoice ${updated.invoiceNo} edited`);
      }

      setInvoices(prev => {
        const exists = prev.find(i => i.id === saved.id);
        return exists
          ? prev.map(i => i.id === saved.id ? saved : i)
          : [saved, ...prev];
      });
      setDraftInvoice(null);
      setToast({ message: "Invoice generated successfully!" });
      setTimeout(() => setToast(null), 2500);
      navigate(`/invoices/${saved.id}`, { replace: true });
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save invoice: ' + err.message);
    }
  };

  // Delete from DB
  const handleDelete = async (id) => {
    try {
      const inv = invoices.find(i => i.id === id);
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed with status ${res.status}`);
      if (inv && !isProformaRecord(inv)) await adjustStock(inv.items || [], [], `Invoice ${inv.invoiceNo} deleted (stock returned)`);
      setInvoices(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Totals used only for deciding whether a payment fully settles the
  // invoice, or a status change should reset amountPaid — kept local/simple
  // here; InvoiceList has its own copy for display purposes.
  const calcInvoiceTotal = (invoice) => invoiceTotals(invoice).total;

  // Update just the status (from the dropdown in the table), save to DB.
  // Also resyncs amountPaid so it never contradicts the manually-chosen
  // status: "Paid" implies fully paid, "Unpaid"/"Overdue" implies nothing
  // recorded as paid yet — otherwise a Due amount can be left stuck at ₹0
  // after switching a previously-Paid invoice back to Unpaid.
  const handleStatusChange = async (invoice, newStatus) => {
    const total = calcInvoiceTotal(invoice);
    const newAmountPaid =
      newStatus === "Paid" ? total :
        (newStatus === "Unpaid" || newStatus === "Overdue") ? 0 :
          invoice.amountPaid;

    const withLog = logActivity(
      { ...invoice, status: newStatus, amountPaid: newAmountPaid },
      `Status changed to ${newStatus}`
    );

    // Optimistic UI update
    setInvoices(prev => prev.map(i => i.id === invoice.id ? withLog : i));
    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withLog),
      });
    } catch (err) {
      console.error('Status update failed:', err);
      // Roll back on failure
      setInvoices(prev => prev.map(i => i.id === invoice.id ? invoice : i));
    }
  };

  // Called by ReceivePaymentModal's "Save Payment" button. Adds the new
  // payment to amountPaid, flips status to "Paid" once fully covered, keeps
  // a payments[] history entry (Payment History tab) and an activityLog
  // entry (Activity Log tab), and persists to the DB.
  const handleSavePayment = async (invoice, { amount, method, referenceNo }) => {
    const total = calcInvoiceTotal(invoice);
    const newAmountPaid = (invoice.amountPaid || 0) + amount;
    const newStatus = newAmountPaid >= total ? "Paid" : "Unpaid";

    const payments = [
      ...(invoice.payments || []),
      { amount, method, referenceNo, date: new Date().toISOString() },
    ];

    const withLog = logActivity(
      { ...invoice, amountPaid: newAmountPaid, status: newStatus, payments },
      `Payment of ₹${amount.toLocaleString()} received via ${method}${referenceNo ? ` (Ref: ${referenceNo})` : ""}`
    );

    // Optimistic UI update
    setInvoices(prev => prev.map(i => (i.id === invoice.id ? withLog : i)));

    try {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withLog),
      });
      setPaymentInvoice(null);
      setToast({ message: "Payment recorded successfully!" });
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error("Save payment failed:", err);
      // Roll back on failure
      setInvoices(prev => prev.map(i => (i.id === invoice.id ? invoice : i)));
      alert("Failed to save payment: " + err.message);
    }
  };

  // Step 1: validate, then open the popup
  const handleGenerateEWB = (invoice) => {
    if (invoice.ewayBillNo) return;
    if (!invoiceHasGoods(invoice)) {
      alert("E-Way Bill is not applicable for service-only invoices.\n\nAdd at least one goods item to generate it.");
      return;
    }
    const errors = validateForEwayBill(invoice);
    if (errors.length > 0) {
      alert("Fix these before generating the E-Way Bill:\n\n• " + errors.join("\n• "));
      return;
    }
    setEwbTarget(invoice);
  };

  // Step 2: called by the popup's Generate button
  const submitGenerateEWB = async (invoice, vehicleNo, transporterId) => {
    setEwbTarget(null);
    try {
      setToast({ message: "Generating E-Way Bill..." });

      const response = await axiosInstance.post("/ewaybill/generate", {
        invoiceId: invoice.id,
        vehicleNo,
        transporterId,
      });

      const { ewayBillNo, ewayBillDate, validUpto, ewayBillDetails } = response.data;
      const applyEwb = (i) => i.id === invoice.id
        ? { ...i, ewayBillNo, ewayBillDate, ewayBillValidUpto: validUpto, ewayBillDetails,
            activityLog: [...(i.activityLog || []), { message: "E-Way Bill generated", date: new Date().toISOString() }] }
        : i;
      setInvoices(prev => prev.map(applyEwb));
      setSingleInvoice(prev => (prev ? applyEwb(prev) : prev));

      setToast({ message: `E-Way Bill generated: ${ewayBillNo}` });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("EWB generation failed:", error);
      const detail = error.response?.data?.details
        || error.response?.data?.error
        || error.response?.data?.message
        || error.message;
      alert("Failed to generate E-Way Bill:\n\n" + (Array.isArray(detail) ? "• " + detail.join("\n• ") : JSON.stringify(detail, null, 2)));
      setToast(null);
    }
  };

  const handleUpdateEwbVehicle = async (invoice) => {
    const vehicleNo = prompt("New vehicle number (e.g., KA01AB1234):");
    if (!vehicleNo) return;
    const fromPlace = prompt("Current place / city:");
    if (!fromPlace) return;
    try {
      setToast({ message: "Updating vehicle..." });
      const res = await axiosInstance.post("/ewaybill/vehicle", {
        invoiceId: invoice.id, vehicleNo: vehicleNo.toUpperCase(), fromPlace,
      });
      const log = { message: `E-Way Bill vehicle updated to ${vehicleNo.toUpperCase()}`, date: new Date().toISOString() };
      const cleanVehicle = vehicleNo.toUpperCase().replace(/[\s-]/g, "");
      const apply = (i) => i.id === invoice.id
        ? {
            ...i,
            ewayBillDetails: res.data?.ewayBillDetails
              || { ...(i.ewayBillDetails || {}), vehicleNo: cleanVehicle, fromPlace },
            activityLog: [...(i.activityLog || []), log],
          }
        : i;
      setInvoices(prev => prev.map(apply));
      setSingleInvoice(prev => (prev ? apply(prev) : prev));
      setToast({ message: "Vehicle updated" });
      setTimeout(() => setToast(null), 2500);
    } catch (error) {
      setToast(null);
      alert("Vehicle update failed:\n\n" + (error.response?.data?.error || error.message));
    }
  };

  // Step 1: just open the modal
  const handleCancelEwb = (invoice) => setCancelTarget(invoice);

  // Step 2: called by the modal's red button
  const submitCancelEwb = async (invoice, reason) => {
    setCancelTarget(null);
    try {
      setToast({ message: "Cancelling E-Way Bill..." });
      await axiosInstance.post("/ewaybill/cancel", { invoiceId: invoice.id, reasonCode: Number(reason) });
      const log = { message: `E-Way Bill ${invoice.ewayBillNo} cancelled`, date: new Date().toISOString() };
      const apply = (i) => i.id === invoice.id
        ? { ...i, ewayBillNo: null, ewayBillDate: null, ewayBillValidUpto: null, ewayBillDetails: null, activityLog: [...(i.activityLog || []), log] }
        : i;
      setInvoices(prev => prev.map(apply));
      setSingleInvoice(prev => (prev ? apply(prev) : prev));
      setToast({ message: "E-Way Bill cancelled" });
      setTimeout(() => setToast(null), 2500);
    } catch (error) {
      setToast({ message: "Cancel failed: " + (error.response?.data?.error || error.message) });
      setTimeout(() => setToast(null), 4000);
    }
  };

  // Generic persist handler used by the Invoice Details tabs (Notes /
  // Attachments) — the tab component builds the full updated invoice
  // object and passes an activity message describing the change; this
  // just appends the log entry, saves to the DB, and updates local state.
  const handleUpdateInvoice = async (updatedInvoice, activityMessage) => {
    const previous = invoices.find(i => i.id === updatedInvoice.id) || updatedInvoice;
    const withLog = activityMessage ? logActivity(updatedInvoice, activityMessage) : updatedInvoice;

    setInvoices(prev => prev.map(i => (i.id === withLog.id ? withLog : i)));
    try {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withLog),
      });
    } catch (err) {
      console.error("Update invoice failed:", err);
      setInvoices(prev => prev.map(i => (i.id === previous.id ? previous : i)));
      alert("Failed to save: " + err.message);
    }
  };

  // Converts a Proforma invoice into a new Final invoice: creates a fresh
  // INV-00x record copying the buyer/items/totals, marks the original
  // proforma as "Converted" (kept for records, no longer editable back to
  // Draft/Sent), and opens the new Final invoice for review. Both records
  // get their own activity log entry.
  const handleConvertToFinal = async (proforma) => {
    // Derive the next number from the HIGHEST existing Final invoiceNo,

    // not a count of how many exist — a count drifts out of sync the
    // moment any Final invoice is deleted or numbering has ever skipped,
    // producing duplicates or gaps like INV-002 appearing as "the first".
    const finalInvoiceNumbers = invoices
      .filter(isFinalRecord)
      .map(i => parseInt((i.invoiceNo || "").match(/(\d+)$/)?.[1] || "0", 10));
    const nextNum = (finalInvoiceNumbers.length ? Math.max(...finalInvoiceNumbers) : 0) + 1;

    const prefix = docSettings.invoicePrefix || "INV-";
    const newFinalInvoiceNo = `${prefix}${String(nextNum).padStart(3, "0")}`;
    const newFinalInvoice = logActivity(
      {
        ...proforma,
        id: `INV-${Date.now()}`,
        invoiceNo: newFinalInvoiceNo,
        invoiceType: "Final",
        status: "Unpaid",
        convertedFromId: proforma.id,
        payments: [],
      },
      `Converted from Proforma ${proforma.invoiceNo}`
    );

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFinalInvoice),
      });
      const saved = res.ok ? await res.json() : newFinalInvoice;
      await deductStock(newFinalInvoice);

      const updatedProforma = logActivity(
        { ...proforma, status: "Converted", convertedInvoiceId: saved.id },
        `Converted to Final Invoice ${newFinalInvoiceNo}`
      );
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProforma),
      });

      setInvoices(prev => {
        const withUpdatedProforma = prev.map(i => i.id === proforma.id ? updatedProforma : i);
        return [saved, ...withUpdatedProforma];
      });
      navigate(`/invoices/${saved.id}`, { replace: true });
    } catch (err) {
      console.error('Convert to final invoice failed:', err);
      alert('Failed to convert invoice: ' + err.message);
    }
  };

  // Compares the OLD items with the NEW items and fixes stock by the difference.
  // adjustStock([], items)  -> deduct (new invoice)
  // adjustStock(items, [])  -> give back (invoice deleted)
  // adjustStock(old, new)   -> only the difference (invoice edited)
  const adjustStock = async (oldItems = [], newItems = [], note = "Invoice stock update") => {
    const delta = {}; // positive = stock goes down, negative = stock goes up
    newItems.forEach((it) => {
      if (it.productId) delta[it.productId] = (delta[it.productId] || 0) + (Number(it.qty) || 1);
    });
    oldItems.forEach((it) => {
      if (it.productId) delta[it.productId] = (delta[it.productId] || 0) - (Number(it.qty) || 1);
    });
    const ids = Object.keys(delta).filter((pid) => delta[pid] !== 0);
    if (!ids.length) return;
    try {
      const all = await (await fetch(PRODUCTS_API)).json();
      await Promise.all(ids.map(async (pid) => {
        const p = all.find((x) => x.id === pid);
        if (!p || p.type === "Service") return;
        const next = Math.max(0, (Number(p.stock_qty) || 0) - delta[pid]);
        await fetch(PRODUCTS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...p, stock_qty: next, stock_note: note }),
        });
      }));
    } catch (err) {
      console.error("Failed to update stock:", err);
    }
  };

  // Holds the proforma pending conversion confirmation, or null when the
  // modal is closed
  const [convertTarget, setConvertTarget] = useState(null);
const [ewbTarget, setEwbTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const handleBack = () => { setDraftInvoice(null); navigate("/invoices"); };

  // Back button on the invoice view page only
  const handleDocBack = () => {
    if (aiReturnRef.current) navigate(aiReturnRef.current);
    else handleBack();
  };

  const toastEl = toast && (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 2000,
        backgroundColor: "#0f172a",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "10px",
        fontSize: "0.85rem",
        fontWeight: 600,
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#34d399", flexShrink: 0 }} />
      {toast.message}
    </div>
  );

  const loadingEl = (
    <div className="d-flex align-items-center justify-content-center" style={{ height: "60vh" }}>
      <div className="text-center">
        <div className="spinner-border" style={{ color: "#1F6F5C" }} />
        <div className="mt-2 small" style={{ color: "#8A8578" }}>Loading invoice…</div>
      </div>
    </div>
  );

  if (isNewRoute) {
    return (
      <>
        {toastEl}
        <InvoiceForm
          key={draftInvoice?.id || "new"}
          invoice={draftInvoice}
          invoices={invoices}
          customers={customers}
          companies={companies}
          onSave={handleSave}
          onBack={handleBack}
          companyInfo={companyInfo}
          onCompanyChange={handleCompanyChange}
          docSettings={docSettings}
          invoiceType={draftInvoice?.invoiceType || newInvoiceType}
        />
      </>
    );
  }

  if (isEditRoute) {
    if (!invoicesLoaded) return <>{toastEl}{loadingEl}</>;
    if (!selected) return null; // redirect effect above will kick in
    return (
      <>
        {toastEl}
        <InvoiceForm
          key={selected?.id || "new"}
          invoice={selected}
          invoices={invoices}
          customers={customers}
          companies={companies}
          onSave={handleSave}
          onBack={handleBack}
          companyInfo={companyInfo}
          onCompanyChange={handleCompanyChange}
          docSettings={docSettings}
          invoiceType={selected?.invoiceType || newInvoiceType}
        />
      </>
    );
  }

  if (isDocRoute) {
    if (!selected) return invoicesLoaded ? null : <>{toastEl}{loadingEl}</>;
    return (
      <>
        {toastEl}
        <InvoiceDocument
          invoice={selected}
          onBack={handleDocBack}
          onEdit={() => handleEdit(selected)}
          companyInfo={companyInfo}
          onUpdateInvoice={handleUpdateInvoice}
          onConvertToFinal={setConvertTarget}
          onGenerateEWB={handleGenerateEWB}
          onUpdateEwbVehicle={handleUpdateEwbVehicle}
          onCancelEwb={handleCancelEwb}
        />

        <EwayBillModal
          key={ewbTarget?.id || "closed"}
          invoice={ewbTarget}
          onCancel={() => setEwbTarget(null)}
          onSubmit={submitGenerateEWB}
        />

        <CancelEwbModal
          key={cancelTarget?.id || "closed-cancel"}
          invoice={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={submitCancelEwb}
        />

        <ConvertToFinalModal
          invoiceNo={convertTarget?.invoiceNo}
          onCancel={() => setConvertTarget(null)}
          onConfirm={() => {
            const proforma = convertTarget;
            setConvertTarget(null);
            handleConvertToFinal(proforma);
          }}
        />
      </>
    );
  }


  return (
    <>
      {toastEl}
      <InvoiceList
        invoices={invoices}
        search={search}
        setSearch={setSearch}
        onNew={handleNew}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onChooseCustomer={openDraftFromCustomer}
        approvedQuotations={approvedQuotations}
        allQuotations={allQuotations}
        onChooseQuotation={openDraftFromQuotation}
        onConvertToFinal={setConvertTarget}
        onReceivePayment={setPaymentInvoice}
      />
      <ReceivePaymentModal
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onSave={handleSavePayment}
      />
      <ConvertToFinalModal
        invoiceNo={convertTarget?.invoiceNo}
        onCancel={() => setConvertTarget(null)}
        onConfirm={() => {
          const proforma = convertTarget;
          setConvertTarget(null);
          handleConvertToFinal(proforma);
        }}
      />
    </>
  );
}