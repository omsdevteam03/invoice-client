import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import InvoiceList from "../components/invoices/InvoiceList";
import InvoiceForm from "../components/invoices/InvoiceForm";
import InvoiceDocument from "../components/invoices/InvoiceDocument";
const API = `${import.meta.env.VITE_API_URL}/invoices`;
const SETTINGS_API = `${import.meta.env.VITE_API_URL}/settings/company`;
const DOC_SETTINGS_API = `${import.meta.env.VITE_API_URL}/settings/invoice`;
const QUOTATIONS_API = `${import.meta.env.VITE_API_URL}/quotations`;

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

export default function InvoicesPage() {
  const location = useLocation();
  const navigate = useNavigate();

 const [invoices, setInvoices] = useState([]);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [newInvoiceType, setNewInvoiceType] = useState("Final"); // "Final" | "Proforma" — used when creating a new invoice

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
  const [toast, setToast] = useState(null); // { message } | null
  const saveTimer = useRef(null);
  // Load invoices from DB
  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setInvoices(data))
      .catch(err => console.error('Failed to load invoices:', err));
  }, []);

  // Load quotations — only the Approved ones are offered as an invoice
  // starting point in the "Choose Customer" picker's Quotations tab.
  useEffect(() => {
    fetch(QUOTATIONS_API)
      .then(res => res.json())
      .then(data => setApprovedQuotations(data.filter(q => q.status === "Approved" && !q.isTemplate)))
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

  // NEW — Jump straight to the edit form when arriving from a quotation conversion
  useEffect(() => {
    const editInvoice = location.state?.editInvoice;
    if (editInvoice) {
      setSelected(editInvoice);
      setView("form");
      navigate(location.pathname, { replace: true, state: {} });
    }
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
    setSelected(null);
    setNewInvoiceType(type);
    setView("form");
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

  const handleEdit = (inv) => { setSelected(resolveConverted(inv)); setView("form"); };
  const handleView = (inv) => { setSelected(resolveConverted(inv)); setView("document"); };
  // Opens a pre-filled, unsaved invoice draft for a given customer, straight
  // into the edit form — nothing is saved until "Generate Invoice" is clicked.
 const openDraftFromCustomer = (customer) => {
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
      gstType: "With GST",
      gstPercent: docSettings.gstPercent ?? 18,
   companyName: companyInfo.companyName,
      companyAddress: companyInfo.companyAddress,
      companyGSTIN: companyInfo.gstin,
      logo: companyInfo.logo || null,
      signature: "/default-signature.png",
      buyerName: customer.name || customer.company || "",
      buyerAddress: customer.address || "",
      buyerMobile: customer.phone || "",
      buyerGSTIN: "",
      amountPaid: 0,
      notes: docSettings.defaultNotes || "",
      invoiceType: "Final",
      items: [{ sl: 1, description: "", qty: 1, rate: 0, amount: 0 }],
    };
    setSelected(draftInvoice);
    setView("form");
  };

  // Opens a pre-filled, unsaved invoice draft from an Approved quotation —
  // Opens a pre-filled, unsaved invoice draft from an Approved quotation —
  // carries over the buyer's details AND the quotation's line items/amount,
  // similar to the "Convert to Invoice" action on the Quotations page.
const openDraftFromQuotation = (quotation) => {
    const prefix = docSettings.invoicePrefix || "INV-";
    // Max-of-existing-numbers, not a .length count — a count silently
    // produces duplicate invoice numbers the moment any Final invoice is
    // deleted, since the array shrinks but past numbers stay issued.
    const finalInvoiceNumbers = invoices
      .filter(isFinalRecord)
      .map(i => parseInt((i.invoiceNo || "").match(/(\d+)$/)?.[1] || "0", 10));
    const nextNum = (finalInvoiceNumbers.length ? Math.max(...finalInvoiceNumbers) : 0) + 1;
    const nextInvoiceNo = `${prefix}${String(nextNum).padStart(3, "0")}`;
    const items = quotation.items?.length
      ? quotation.items.map((it, i) => ({
          sl: i + 1,
          description: it.description || "",
          qty: it.qty || 1,
          rate: it.rate || 0,
          amount: it.total ?? (Number(it.qty || 1) * Number(it.rate || 0)),
        }))
      : [{ sl: 1, description: quotation.projectTitle || "Service", qty: 1, rate: quotation.amount || 0, amount: quotation.amount || 0 }];

    const draftInvoice = {
      invoiceNo: nextInvoiceNo,
      date: new Date().toISOString().split("T")[0],
      dueDate: "",
      status: "Unpaid",
      gstType: "With GST",
      gstPercent: docSettings.gstPercent ?? 18,
   companyName: companyInfo.companyName,
      companyAddress: companyInfo.companyAddress,
      companyGSTIN: companyInfo.gstin,
      logo: companyInfo.logo || null,
      signature: "/default-signature.png",
      buyerName: quotation.name || quotation.company || "",
      buyerAddress: quotation.clientAddress || "",
      buyerMobile: quotation.phone || "",
      buyerGSTIN: "",
      amountPaid: 0,
      notes: docSettings.defaultNotes || "",
      invoiceType: "Final",
      fromQuotationId: quotation.id,
      items,
    };
    setSelected(draftInvoice);
    setView("form");
  };
  // Save to DB
const handleSave = async (updated) => {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Save failed with status ${res.status}`);
      }
    const saved = await res.json();
      setInvoices(prev => {
        const exists = prev.find(i => i.id === saved.id);
        return exists
          ? prev.map(i => i.id === saved.id ? saved : i)
          : [...prev, saved];
      });
      setSelected(saved);
      setToast({ message: "Invoice generated successfully!" });
      setTimeout(() => setToast(null), 2500);
      setView("document");
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save invoice: ' + err.message);
    }
  };

  // Delete from DB
  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setInvoices(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Update just the status (from the dropdown in the table), save to DB
  const handleStatusChange = async (invoice, newStatus) => {
    const updated = { ...invoice, status: newStatus };
    // Optimistic UI update
    setInvoices(prev => prev.map(i => i.id === invoice.id ? updated : i));
    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Status update failed:', err);
      // Roll back on failure
      setInvoices(prev => prev.map(i => i.id === invoice.id ? invoice : i));
    }
  };

// Converts a Proforma invoice into a new Final invoice: creates a fresh
  // INV-00x record copying the buyer/items/totals, marks the original
  // proforma as "Converted" (kept for records, no longer editable back to
  // Draft/Sent), and opens the new Final invoice for review.
  const handleConvertToFinal = async (proforma) => {
    if (!window.confirm(`Convert ${proforma.invoiceNo} into a Final Invoice?`)) return;

    // Derive the next number from the HIGHEST existing Final invoiceNo,
    // not a count of how many exist — a count drifts out of sync the
    // moment any Final invoice is deleted or numbering has ever skipped,
    // producing duplicates or gaps like INV-002 appearing as "the first".
    const finalInvoiceNumbers = invoices
      .filter(isFinalRecord)
      .map(i => parseInt((i.invoiceNo || "").match(/(\d+)$/)?.[1] || "0", 10));
    const nextNum = (finalInvoiceNumbers.length ? Math.max(...finalInvoiceNumbers) : 0) + 1;

    const prefix = docSettings.invoicePrefix || "INV-";
    const newFinalInvoice = {
      ...proforma,
      id: `INV-${Date.now()}`,
      invoiceNo: `${prefix}${String(nextNum).padStart(3, "0")}`,
      invoiceType: "Final",
      status: "Unpaid",
      convertedFromId: proforma.id,
      
    };

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFinalInvoice),
      });
      const saved = res.ok ? await res.json() : newFinalInvoice;

      const updatedProforma = { ...proforma, status: "Converted", convertedInvoiceId: saved.id };
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProforma),
      });

      setInvoices(prev => {
        const withUpdatedProforma = prev.map(i => i.id === proforma.id ? updatedProforma : i);
        return [...withUpdatedProforma, saved];
      });
      setSelected(saved);
      setView("document");
    } catch (err) {
      console.error('Convert to final invoice failed:', err);
      alert('Failed to convert invoice: ' + err.message);
    }
  };

  const handleBack = () => { setSelected(null); setView("list"); };

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

  if (view === "form") {
    return (
      <>
        {toastEl}
        <InvoiceForm
          invoice={selected}
          invoices={invoices}
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

  if (view === "document") {
    return (
      <>
        {toastEl}
        <InvoiceDocument
          invoice={selected}
          onBack={handleBack}
          onEdit={() => handleEdit(selected)}
          companyInfo={companyInfo}
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
        onChooseQuotation={openDraftFromQuotation}
        onConvertToFinal={handleConvertToFinal}
      />
    </>
  );
}