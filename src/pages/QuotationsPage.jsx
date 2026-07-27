import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QuotationDetail from "../components/quotations/QuotationDetail";
import QuotationFirst from "../components/quotations/QuotationFirst";
import QuotationTemplate from "../components/quotations/QuotationTemplate";
import { templates } from "../components/quotations/QuotationTable";

const API = `${import.meta.env.VITE_API_URL}/quotations`;
const SETTINGS_API = `${import.meta.env.VITE_API_URL}/settings/company`;
const DOC_SETTINGS_API = `${import.meta.env.VITE_API_URL}/settings/invoice`;

export default function QuotationsPage() {
  const location = useLocation();
  const navigate = useNavigate();

const [quotations, setQuotations] = useState([]);
const [selected, setSelected] = useState(null);
const [editMode, setEditMode] = useState(false);
const [showTemplates, setShowTemplates] = useState(false);
const [search, setSearch] = useState("");
// Holds the customer picked via "Choose Customer" while the templates
// modal is open, so the chosen template can be prefilled with their
// details once selected. Cleared once a template is picked or the
// templates modal is closed without picking one.
const [pendingCustomer, setPendingCustomer] = useState(null);

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
  const [companyInfoLoaded, setCompanyInfoLoaded] = useState(false);

  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setQuotations(data))
      .catch(err => console.error('Failed to load:', err));
  }, []);

  // Load current company settings — used only to prefill NEW quotation
  // drafts. Once a quotation is saved, its own issuer* fields are the
  // permanent snapshot and are never re-synced with Settings.
useEffect(() => {
    fetch(SETTINGS_API)
      .then(res => res.json())
      .then(data => setCompanyInfo(prev => ({ ...prev, ...data })))
      .catch(err => console.error('Failed to load company settings:', err));
  }, []);

  useEffect(() => {
    fetch(DOC_SETTINGS_API)
      .then(res => res.json())
      .then(data => setDocSettings(prev => ({ ...prev, ...data })))
      .catch(err => console.error('Failed to load invoice/quotation settings:', err));
  }, []);

  // ✅ No longer auto-creates/saves a quotation in the database on arrival.
  // It only opens a pre-filled, *unsaved* draft in the editor — nothing is
  // written to the DB (and nothing appears in the quotations list) until
  // the user actually clicks "Save" on the QuotationDetail screen.
  useEffect(() => {
    const prefillCustomer = location.state?.prefillCustomer;
    if (prefillCustomer) {
      openDraftFromCustomer(prefillCustomer);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const handleSave = async (updated) => {
    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updated, isTemplate: false }),
      });
      setQuotations(prev =>
        prev.some(q => q.id === updated.id)
          ? prev.map(q => q.id === updated.id ? { ...updated, isTemplate: false } : q)
          : [...prev, { ...updated, isTemplate: false }]
      );
      setSelected({ ...updated, isTemplate: false });
      setEditMode(false);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

 
  // NEW — after a quotation is converted, jump to the invoice's edit form
  const handleInvoiceCreated = (invoice) => {
    if (!invoice) return;
    navigate("/invoices", { state: { editInvoice: invoice } });
  };

  // ── Opens a pre-filled quotation draft for a given customer, in edit mode.
  // Does NOT hit the API and does NOT add anything to the quotations list —
  // it only becomes real once the user reviews it and clicks "Save".
 const openDraftFromCustomer = (customer) => {
    // Don't build the quotation yet — remember the customer, then let
    // them pick a template. handleNewFromTemplate below does the actual
    // prefill once a template is chosen.
    setPendingCustomer(customer);
    setShowTemplates(true);
  };

const handleNewFromTemplate = (tpl) => {
    const tax = Math.round(tpl.amount * 0.18);
    const qPrefix = docSettings.quotationPrefix || "QT-";
    const customer = pendingCustomer; // may be null if opened via "New Quotation"

    const newQ = {
      id: `${qPrefix}${String(quotations.filter(q => !q.isTemplate).length + 1).padStart(3, "0")}`,
      customerId: customer?.id || null,
      name: customer?.name || "New Client",
      company: customer?.company || "",
      projectTitle: tpl.title,
      templateStyle: tpl.templateStyle || "classic",
      email: customer?.email || "client@example.com",
      phone: customer?.phone || "9000000000",
      clientAddress: customer?.address || "",
      date: new Date().toISOString().split("T")[0],
      validUntil: "",
      status: "Draft",
      amount: tpl.amount,
      // Prefilled from Settings ➜ Company (snapshot happens on Save)
      issuerName: companyInfo.companyName || "",
      issuerAddress: companyInfo.companyAddress || "",
      issuerPhone: companyInfo.companyPhone || "",
      issuerEmail: companyInfo.companyEmail || "",
     logo: companyInfo.logo || null,
      // Default signature — still fully replaceable via "Upload Signature"
      // in edit mode, this just avoids showing an empty "No signature" box.
      signature: "/default-signature.png",
      timeline: tpl.timeline,
      description: "",
      scopeOfWork: "Responsive Website Design\n5 Website Pages\nContact Form Integration\nMobile Optimization\nBasic SEO Setup",
      deliverables: "Fully responsive website\nSource code delivery\nAdmin panel access\nDocumentation\n30 days support",
      technologyUsed: "React.js / Next.js (Frontend)\nNode.js & Express.js (Backend)\nMongoDB (Database)\nCloud Hosting (Deployment)",
      timelineDesc: "Completed within 7–14 working days from project confirmation\nDevelopment carried out in phases\nRegular progress updates shared with client",
      projectCost: `${tpl.title}: ₹${tpl.amount.toLocaleString()}\nDeployment & Setup: Included\nGST (18%): ₹${tax.toLocaleString()}\nTotal Project Cost: ₹${(tpl.amount + tax).toLocaleString()}`,
      paymentTerms: "50% advance payment required before project commencement\nRemaining 50% after preview approval and before final delivery",
      terms: "This quotation is valid for 30 days from the date of issue\nAny additional work outside the agreed scope will be charged separately\n50% advance payment is required before project commencement\nFinal deliverables handed over after full payment is received",
      notes: "",
      items: [{ description: tpl.title, qty: 1, rate: tpl.amount, total: tpl.amount }],
     // NEW
      customSections: [],
      isTemplate: !customer, // only a real "template" starting point when there's no customer behind it
    };
    setSelected(newQ);
    setEditMode(true);
    setShowTemplates(false);
    setPendingCustomer(null);
  };

  // ── Opens a completely blank quotation draft — same flow as picking a
  // template, but with empty scope/deliverables/pricing so the user fills
  // in everything themselves instead of starting from preset content.
 const handleCustomQuotation = () => {
    const qPrefix = docSettings.quotationPrefix || "QT-";
    const customer = pendingCustomer; // may be null if opened via "New Quotation"

    const newQ = {
      id: `${qPrefix}${String(quotations.filter(q => !q.isTemplate).length + 1).padStart(3, "0")}`,
      customerId: customer?.id || null,
      name: customer?.name || "New Client",
      company: customer?.company || "",
      projectTitle: "",
      templateStyle: "classic",
      email: customer?.email || "client@example.com",
      phone: customer?.phone || "9000000000",
      clientAddress: customer?.address || "",
      date: new Date().toISOString().split("T")[0],
      validUntil: "",
      status: "Draft",
      amount: 0,
      // Prefilled from Settings ➜ Company (snapshot happens on Save)
      issuerName: companyInfo.companyName || "",
      issuerAddress: companyInfo.companyAddress || "",
      issuerPhone: companyInfo.companyPhone || "",
      issuerEmail: companyInfo.companyEmail || "",
      logo: companyInfo.logo || null,
      timeline: "7–14 working days",
      description: "",
      // Same generic starter content used by the template flow — gives the
      // user something to edit/delete instead of a blank textarea, while
      // still being a fully "custom" quotation (no template price/items).
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
 if (selected) {
    return (
      <QuotationDetail
        quotation={selected}
        companyInfo={companyInfo}
        isNew={!quotations.some(q => q.id === selected.id)}
        editMode={editMode}
        isNewTemplate={selected.isTemplate}
        onBack={() => {
          setSelected(null);
          setEditMode(false);
          if (selected?.isTemplate) setShowTemplates(true);
        }}
        onEdit={() => setEditMode(true)}
        onSave={handleSave}
        onCancelEdit={() => setEditMode(false)}
      />
    );
  }
  return (
    <>
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