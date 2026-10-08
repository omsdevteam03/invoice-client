import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import QuotationDetail from "../components/quotations/QuotationDetail";
import QuotationFirst from "../components/quotations/QuotationFirst";
import QuotationTemplate from "../components/quotations/QuotationTemplate";
import { templates } from "../components/quotations/QuotationTable";

const API = `${import.meta.env.VITE_API_URL}/quotations`;
const SETTINGS_API = `${import.meta.env.VITE_API_URL}/settings/company`;
const DOC_SETTINGS_API = `${import.meta.env.VITE_API_URL}/settings/invoice`;
const INVOICES_API = `${import.meta.env.VITE_API_URL}/invoices`;
const CUSTOMERS_API = `${import.meta.env.VITE_API_URL}/customers`;

const DRAFT_STORAGE_PREFIX = "quotation_draft_";
const TEMPLATE_MODAL_STORAGE_KEY = "quotation_show_templates";
const PENDING_CUSTOMER_STORAGE_KEY = "quotation_pending_customer";

const saveDraftToStorage = (quotation) => {
  if (!quotation?.id) return;
  try {
    sessionStorage.setItem(DRAFT_STORAGE_PREFIX + quotation.id, JSON.stringify(quotation));
  } catch (err) {
    console.error("Failed to persist draft quotation:", err);
  }
};

const loadDraftFromStorage = (id) => {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Failed to read draft quotation:", err);
    return null;
  }
};

const clearDraftFromStorage = (id) => {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_PREFIX + id);
  } catch (err) {
    console.error("Failed to clear draft quotation:", err);
  }
};

function buildNextNumberPreview(settings) {
  const prefix = (settings.quotationPrefix || "QT").trim().replace(/-+$/, "");
  const len = Math.max(1, Number(settings.quotationNumberLength) || 4);
  const nextSeq = (Number(settings.quotationCurrentSequence) || 0) + 1;
  const seqStr = String(nextSeq).padStart(len, "0");
  if (settings.quotationYearlyReset) {
    const year = settings.quotationCurrentYear || new Date().getFullYear();
    return `${prefix}-${year}-${seqStr}`;
  }
  return `${prefix}-${seqStr}`;
}

// NEW — internal id for drafts. Never shown to the user as "the
// quotation number"; a real QT-xxxx is only minted by POST /:id/send.
function generateInternalId() {
  return `qt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function SaveErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        backgroundColor: "#FEF2F2",
        border: "1px solid #FCA5A5",
        color: "#B91C1C",
        borderRadius: 10,
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        maxWidth: "90vw",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 14,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <span style={{ fontWeight: 600 }}>Save failed:</span>
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          border: "none",
          background: "none",
          color: "#B91C1C",
          fontWeight: 700,
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          marginLeft: 4,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export default function QuotationsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  // Remembers if this page was opened from the AI chat's "View" button
  const aiReturnRef = useRef(
    location.state?.fromAI ? location.state.returnTo || "/ai" : null
  );

  const [quotations, setQuotations] = useState([]);
  const [quotationsLoaded, setQuotationsLoaded] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(() => {
    try {
      return sessionStorage.getItem(TEMPLATE_MODAL_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [search, setSearch] = useState("");
  const [pendingCustomer, setPendingCustomer] = useState(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_CUSTOMER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const hydratingFromUrl = useRef(false);
  const [initialized, setInitialized] = useState(false);

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
    quotationNumberLength: 4,
    quotationYearlyReset: true,
    quotationCurrentSequence: 0,
    quotationCurrentYear: new Date().getFullYear(),
  });
  const [companyInfoLoaded, setCompanyInfoLoaded] = useState(false);

  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setQuotations(data))
      .catch(err => console.error('Failed to load:', err))
      .finally(() => setQuotationsLoaded(true));
  }, []);

  useEffect(() => {
    fetch(INVOICES_API)
      .then(res => res.json())
      .then(data => setInvoices(data))
      .catch(err => console.error('Failed to load invoices:', err));
  }, []);

  useEffect(() => {
    fetch(CUSTOMERS_API)
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(err => console.error('Failed to load customers:', err));
  }, []);

  useEffect(() => {
    fetch(SETTINGS_API)
      .then(res => res.json())
      .then(data => setCompanyInfo(prev => ({ ...prev, ...data })))
      .catch(err => console.error('Failed to load company settings:', err))
      .finally(() => setCompanyInfoLoaded(true));
  }, []);

  useEffect(() => {
    fetch(DOC_SETTINGS_API)
      .then(res => res.json())
      .then(data => setDocSettings(prev => ({ ...prev, ...data })))
      .catch(err => console.error('Failed to load invoice/quotation settings:', err));
  }, []);

  useEffect(() => {
    const prefillCustomer = location.state?.prefillCustomer;
    if (prefillCustomer) {
      openDraftFromCustomer(prefillCustomer);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!quotationsLoaded) return;

    if (!id) {
      if (selected) { setSelected(null); setEditMode(false); }
      setInitialized(true);
      return;
    }

    if (selected?.id === id) { setInitialized(true); return; }

    const found = quotations.find(q => q.id === id);
    if (found) {
      hydratingFromUrl.current = true;
      setSelected(found);
      setEditMode(location.pathname.endsWith("/edit"));
      setInitialized(true);
      return;
    }

    const draft = loadDraftFromStorage(id);
    if (draft) {
      hydratingFromUrl.current = true;
      setSelected(draft);
      setEditMode(location.pathname.endsWith("/edit"));
      setInitialized(true);
      return;
    }

    navigate("/quotations", { replace: true });
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, quotationsLoaded, quotations, location.pathname]);

  useEffect(() => {
    if (!initialized) return;
    if (hydratingFromUrl.current) { hydratingFromUrl.current = false; return; }

    if (selected) {
      const target = editMode ? `/quotations/${selected.id}/edit` : `/quotations/${selected.id}`;
      if (location.pathname !== target) navigate(target, { replace: true });
    } else if (location.pathname !== "/quotations") {
      navigate("/quotations", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editMode, initialized]);

  useEffect(() => {
    if (selected?._isNewQuotation) {
      saveDraftToStorage(selected);
    }
  }, [selected]);

  useEffect(() => {
    try {
      sessionStorage.setItem(TEMPLATE_MODAL_STORAGE_KEY, String(showTemplates));
    } catch (err) {
      console.error("Failed to persist template modal state:", err);
    }
  }, [showTemplates]);

  useEffect(() => {
    try {
      if (pendingCustomer) {
        sessionStorage.setItem(PENDING_CUSTOMER_STORAGE_KEY, JSON.stringify(pendingCustomer));
      } else {
        sessionStorage.removeItem(PENDING_CUSTOMER_STORAGE_KEY);
      }
    } catch (err) {
      console.error("Failed to persist pending customer:", err);
    }
  }, [pendingCustomer]);

  const refreshNumberPreview = async () => {
    try {
      const res = await fetch(DOC_SETTINGS_API);
      if (res.ok) {
        const data = await res.json();
        setDocSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error("Failed to refresh quotation numbering preview:", err);
    }
  };

  // NEW: reset quotation numbering back to 0001. Only safe (and only shown
  // in the UI) when there are zero real quotations — the backend enforces
  // this too.
  // Confirmation now happens via a styled modal in QuotationFirst,
  // so this just performs the actual reset when called.
  const handleResetNumbering = async () => {
    try {
      const res = await fetch(`${DOC_SETTINGS_API}/reset-quotation-numbering`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDocSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error("Failed to reset quotation numbering:", err);
    }
  };

   const handleSave = async (updated) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const { _isNewQuotation, ...payload } = updated;
      const isNewSave = _isNewQuotation === true;

      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          id: payload.id,   // always the internal id — backend never invents one
          isNew: isNewSave,
          isTemplate: false,
        }),
      });

      if (!res.ok) {
        let detail = "";
           try {
          const body = await res.json();
          detail = body?.error || body?.message || "";
        } catch {
          // response wasn't JSON — ignore, fall back to status text
        }
        throw new Error(detail || `Request failed with status ${res.status} ${res.statusText || ""}`.trim());
      }

      const saved = await res.json();
      setQuotations(prev =>
        prev.some(q => q.id === saved.id)
          ? prev.map(q => q.id === saved.id ? saved : q)
          : [...prev, saved]
      );

      if (isNewSave) {
        clearDraftFromStorage(updated.id);
      }

      setSelected(saved);
      setEditMode(false);

      if (isNewSave) {
        refreshNumberPreview();
      }
    } catch (err) {
      console.error('Save failed:', err);
      setSaveError(err.message || "Something went wrong while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvoiceCreated = (invoice) => {
    if (!invoice) return;
    navigate("/invoices", { state: { editInvoice: invoice } });
  };

  const handleCreateInvoiceFromQuotation = (quotation) => {
    navigate("/invoices", { state: { chooseQuotation: quotation } });
  };

  // Same activity-log helper as InvoicesPage.jsx
  const logInvoiceActivity = (invoice, message) => ({
    ...invoice,
    activityLog: [...(invoice.activityLog || []), { message, date: new Date().toISOString() }],
  });

  // Called by the invoice popup in QuotationFirst (Edit → Update Invoice,
  // and Convert to Invoice). Saves to the DB and keeps this page's
  // `invoices` state in sync so the popup list updates instantly.
  const handleSaveInvoice = async (inv, isNew, message) => {
    const withLog = logInvoiceActivity(
      inv,
      message || (isNew ? "Invoice created" : "Invoice details updated")
    );

    const res = await fetch(INVOICES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withLog),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Save failed with status ${res.status}`);
    }
    const saved = await res.json();

    setInvoices(prev =>
      prev.some(i => i.id === saved.id)
        ? prev.map(i => (i.id === saved.id ? saved : i))
        : [saved, ...prev]
    );
    return saved;
  };

  const openDraftFromCustomer = (customer) => {
    setPendingCustomer(customer);
    setShowTemplates(true);
  };

  const handleNewFromTemplate = async (tpl) => {
    // Always fetch the latest active company profile right before creating
    // a document, instead of relying on whatever was fetched at page load —
    // this way switching the active company takes effect immediately,
    // with no page refresh required.
    let freshCompanyInfo = companyInfo;
    try {
      const res = await fetch(SETTINGS_API);
      if (res.ok) {
        const data = await res.json();
        freshCompanyInfo = { ...companyInfo, ...data };
        setCompanyInfo(freshCompanyInfo);
      }
    } catch (err) {
      console.error("Failed to refresh company info before creating quotation:", err);
    }

    const tax = Math.round(tpl.amount * 0.18);
    const customer = pendingCustomer;

    const newQ = {
      id: generateInternalId(),
      _isNewQuotation: true,
      customerId: customer?.id || null,
      name: customer?.name || "New Client",
      company: customer?.company || "",
      projectTitle: "",
      templateStyle: tpl.templateStyle || "classic",
      email: customer?.email || "client@example.com",
      phone: customer?.phone || "9000000000",
      clientAddress: customer?.address || "",
      date: new Date().toISOString().split("T")[0],
      validUntil: "",
      status: "Draft",
      amount: tpl.amount + tax,
      issuerName: freshCompanyInfo.companyName || "",
      issuerAddress: freshCompanyInfo.companyAddress || "",
      issuerPhone: freshCompanyInfo.companyPhone || "",
      issuerEmail: freshCompanyInfo.companyEmail || "",
      logo: freshCompanyInfo.logo || null,

      signature: "/signature.png",
      timeline: tpl.timeline,
      description: "",
      scopeOfWork: "Responsive Website Design\n5 Website Pages\nContact Form Integration\nMobile Optimization\nBasic SEO Setup",
      deliverables: "Fully responsive website\nSource code delivery\nAdmin panel access\nDocumentation\n30 days support",
      technologyUsed: "React.js / Next.js (Frontend)\nNode.js & Express.js (Backend)\nMongoDB (Database)\nCloud Hosting (Deployment)",
      timelineDesc: "Completed within 7–14 working days from project confirmation\nDevelopment carried out in phases\nRegular progress updates shared with client",
      projectCost: `Project Cost: ₹${tpl.amount.toLocaleString()}\nDeployment & Setup: Included\nGST (18%): ₹${tax.toLocaleString()}\nTotal Project Cost: ₹${(tpl.amount + tax).toLocaleString()}`,
      paymentTerms: "50% advance payment required before project commencement\nRemaining 50% after preview approval and before final delivery",
      terms: "This quotation is valid for 30 days from the date of issue\nAny additional work outside the agreed scope will be charged separately\n50% advance payment is required before project commencement\nFinal deliverables handed over after full payment is received",
      notes: "",
      items: [{ description: "Project Cost", qty: 1, rate: tpl.amount, total: tpl.amount }],
      customSections: [],
      isTemplate: !customer,
    };
    setSelected(newQ);
    setEditMode(true);
    setShowTemplates(false);
    setPendingCustomer(null);
  };

  const handleCustomQuotation = async () => {
    let freshCompanyInfo = companyInfo;
    try {
      const res = await fetch(SETTINGS_API);
      if (res.ok) {
        const data = await res.json();
        freshCompanyInfo = { ...companyInfo, ...data };
        setCompanyInfo(freshCompanyInfo);
      }
    } catch (err) {
      console.error("Failed to refresh company info before creating quotation:", err);
    }

    const customer = pendingCustomer;

    const newQ = {
      id: generateInternalId(),
      _isNewQuotation: true,
      customerId: customer?.id || null,
      name: customer?.name || "New Client",
      company: customer?.company || "",
      projectTitle: "",
      templateStyle: "default",
      email: customer?.email || "client@example.com",
      phone: customer?.phone || "9000000000",
      clientAddress: customer?.address || "",
      date: new Date().toISOString().split("T")[0],
      validUntil: "",
      status: "Draft",
      amount: 0,
      issuerName: freshCompanyInfo.companyName || "",
      issuerAddress: freshCompanyInfo.companyAddress || "",
      issuerPhone: freshCompanyInfo.companyPhone || "",
      issuerEmail: freshCompanyInfo.companyEmail || "",
      logo: freshCompanyInfo.logo || null,

      signature: "/signature.png",
      timeline: "7–14 working days",
      description: "",
      scopeOfWork: "Responsive Website Design\n5 Website Pages\nContact Form Integration\nMobile Optimization\nBasic SEO Setup",
      deliverables: "Fully responsive website\nSource code delivery\nAdmin panel access\nDocumentation\n30 days support",
      technologyUsed: "React.js / Next.js (Frontend)\nNode.js & Express.js (Backend)\nMongoDB (Database)\nCloud Hosting (Deployment)",
      timelineDesc: "Completed within 7–14 working days from project confirmation\nDevelopment carried out in phases\nRegular progress updates shared with client",
      projectCost: "Project Cost: ₹0\nGST (18%): ₹0\nTotal Project Cost: ₹0",
      paymentTerms: "50% advance payment required before project commencement\nRemaining 50% after preview approval and before final delivery",
      terms: "This quotation is valid for 30 days from the date of issue\nAny additional work outside the agreed scope will be charged separately\n50% advance payment is required before project commencement\nFinal deliverables handed over after full payment is received",
      notes: "",
      items: [{ description: "", qty: 1, rate: 0, total: 0 }],
      customSections: [],
      isTemplate: false,
    };
    setSelected(newQ);
    setEditMode(true);
    setShowTemplates(false);
    setPendingCustomer(null);
  };

  if (id && !initialized) {
    return null;
  }

    const handleSend = async (quotationId) => {
    try {
      const res = await fetch(`${API}/${quotationId}/send`, { method: 'POST' });
      if (!res.ok) {
        let detail = "";
        try { const body = await res.json(); detail = body?.error || body?.message || ""; } catch {}
                throw new Error(detail || `Request failed with status ${res.status}`);
      }
      const sent = await res.json();
      setQuotations(prev => prev.map(q => q.id === sent.id ? sent : q));
      setSelected(sent);
      setEditMode(false);
      return sent;
    } catch (err) {
      console.error('Send failed:', err);
      setSaveError(err.message || "Failed to send quotation.");
      throw err;
    }
  };

  if (selected) {
    return (
      <>
        <SaveErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />
        <QuotationDetail
          key={selected.id}
          quotation={selected}
          companyInfo={companyInfo}
          docSettings={docSettings}
          customers={customers}
          isNew={Boolean(selected._isNewQuotation) || !quotations.some(q => q.id === selected.id)}
          editMode={editMode}
          isNewTemplate={selected.isTemplate}
          isSaving={isSaving}
          onBack={() => {
            if (aiReturnRef.current) {
              navigate(aiReturnRef.current);
              return;
            }
            setSelected(null);
            setEditMode(false);
            setSaveError(null);
            if (selected?.isTemplate) setShowTemplates(true);
          }}
          onEdit={() => setEditMode(true)}
          onSave={handleSave}
          onSend={handleSend}
          onCancelEdit={() => { setEditMode(false); setSaveError(null); }}
        />
      </>
    );
  }

  return (
    <>
      <SaveErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />
      <QuotationFirst
        quotations={quotations}
        setQuotations={setQuotations}
        search={search}
        setSearch={setSearch}
        setSelected={setSelected}
        setEditMode={setEditMode}
        setShowTemplates={setShowTemplates}
        onInvoiceCreated={handleInvoiceCreated}
        onChooseCustomer={openDraftFromCustomer}
        companyInfo={companyInfo}
        docSettings={docSettings}
        invoices={invoices}
        onCreateInvoiceFromQuotation={handleCreateInvoiceFromQuotation}
        onSaveInvoice={handleSaveInvoice}
        onResetNumbering={handleResetNumbering}
        onSend={handleSend}
      />

      {showTemplates && (
        <QuotationTemplate
          templates={templates}
          onClose={() => { setShowTemplates(false); setPendingCustomer(null); }}
          onSelect={handleNewFromTemplate}
          onCustom={handleCustomQuotation}
        />
      )}
    </>
  );
}