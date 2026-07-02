import { useState, useEffect } from "react";
import QuotationDetail from "../components/quotations/QuotationDetail";
import QuotationFirst from "../components/quotations/QuotationFirst";
import QuotationTemplate from "../components/quotations/QuotationTemplate";
import { templates } from "../components/quotations/QuotationTable";

const API = `${import.meta.env.VITE_API_URL}/quotations`;
export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setQuotations(data))
      .catch(err => console.error('Failed to load:', err));
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

  const handleNewFromTemplate = (tpl) => {
    const tax = Math.round(tpl.amount * 0.18);
    const newQ = {
      id: `QT-00${quotations.filter(q => !q.isTemplate).length + 1}`,
      name: "New Client",
      company: tpl.title,
      email: "client@example.com",
      phone: "9000000000",
      date: new Date().toISOString().split("T")[0],
      validUntil: "",
      status: "Draft",
      amount: tpl.amount,
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
      customSections: [],
      isTemplate: true,
    };
    setQuotations(prev => [...prev, newQ]);
    setSelected(newQ);
    setEditMode(true);
    setShowTemplates(false);
  };

  if (selected) {
    return (
      <QuotationDetail
        quotation={selected}
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
      />
      {showTemplates && (
        <QuotationTemplate
          templates={templates}
          onClose={() => setShowTemplates(false)}
          onSelect={handleNewFromTemplate}
        />
      )}
    </>
  );
}