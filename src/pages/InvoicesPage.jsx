import { useState, useEffect } from "react";
import InvoiceList from "../components/invoices/InvoiceList";
import InvoiceForm from "../components/invoices/InvoiceForm";
import InvoiceDocument from "../components/invoices/InvoiceDocument";

const API = `${import.meta.env.VITE_API_URL}/invoices`;
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  // Load from DB
  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setInvoices(data))
      .catch(err => console.error('Failed to load invoices:', err));
  }, []);

  const handleNew = () => { setSelected(null); setView("form"); };
  const handleEdit = (inv) => { setSelected(inv); setView("form"); };
  const handleView = (inv) => { setSelected(inv); setView("document"); };

  // Save to DB
  const handleSave = async (updated) => {
    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setInvoices(prev => {
        const exists = prev.find(i => i.id === updated.id);
        return exists
          ? prev.map(i => i.id === updated.id ? updated : i)
          : [...prev, updated];
      });
      setSelected(updated);
      setView("document");
    } catch (err) {
      console.error('Save failed:', err);
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

  const handleBack = () => { setSelected(null); setView("list"); };

  if (view === "form") {
    return (
      <InvoiceForm
        invoice={selected}
        onSave={handleSave}
        onBack={handleBack}
      />
    );
  }

  if (view === "document") {
    return (
      <InvoiceDocument
        invoice={selected}
        onBack={handleBack}
        onEdit={() => handleEdit(selected)}
      />
    );
  }

  return (
    <InvoiceList
      invoices={invoices}
      search={search}
      setSearch={setSearch}
      onNew={handleNew}
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}