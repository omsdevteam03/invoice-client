import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CustomerList from "../components/customers/CustomerList.jsx";
import CustomerForm from "../components/customers/CustomerForm.jsx";
import CustomerDetail from "../components/customers/CustomerDetail.jsx";

const API = `${import.meta.env.VITE_API_URL}/customers`;
const QUOTATIONS_API = `${import.meta.env.VITE_API_URL}/quotations`;
const INVOICES_API = `${import.meta.env.VITE_API_URL}/invoices`;

export default function CustomersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [customers, setCustomers] = useState([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
   const [draftId, setDraftId] = useState(null);

  // ── Derive which screen to show from the URL, not from local state ──────
  const isNewRoute = location.pathname === "/customers/new";
  const isEditRoute = Boolean(id) && location.pathname.endsWith("/edit");
  const isDetailRoute = Boolean(id) && !isEditRoute;
  const selected = id ? customers.find((c) => c.id === id) : null;

  // Load from DB
  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(err => console.error('Failed to load customers:', err))
      .finally(() => setCustomersLoaded(true));
  }, []);

  // If someone lands on /customers/:id (detail or edit) for a customer that
  // doesn't exist once loading has finished, send them back to the list
  // instead of showing a blank/broken screen.
  useEffect(() => {
    if (!customersLoaded || !id) return;
    if (!customers.find((c) => c.id === id)) {
      navigate("/customers", { replace: true });
    }
  }, [customersLoaded, id, customers, navigate]);

  // Load quotations & invoices — used on the Customer Detail page to show
  // how many of each belong to the customer being viewed.
  useEffect(() => {
    fetch(QUOTATIONS_API)
      .then(res => res.json())
      .then(data => setQuotations(data))
      .catch(err => console.error('Failed to load quotations:', err));

    fetch(INVOICES_API)
      .then(res => res.json())
      .then(data => setInvoices(data))
      .catch(err => console.error('Failed to load invoices:', err));
  }, []);

   const handleNew = (existingDraftId) => {
    setDraftId(typeof existingDraftId === "string" ? existingDraftId : null);
    navigate("/customers/new");
  };

   const handleEdit = (customer) => {
    setDraftId(null); // editing an existing customer never uses a "new" draft id
    navigate(`/customers/${customer.id}/edit`);
  };

    const handleView = (customer) => navigate(`/customers/${customer.id}`);

  // ── Recompute "Billed" from real invoices, excluding proformas ─────────────
  // Proformas are draft/dummy invoices, not actual revenue — once converted,
  // the real invoice already carries that amount. Counting both double-counts
  // the same money. This mirrors the same exclusion CustomerDetail.jsx uses.
  const isProformaInvoice = (i) => i.invoiceType === "Proforma" || (i.invoiceNo || "").startsWith("PI-");

  const belongsToCustomer = (rec, cust) => {
    if (rec.customerId && cust.id) return rec.customerId === cust.id;
    const recName = (rec.buyerName || rec.name || "").toLowerCase().trim();
    const recCompany = (rec.company || "").toLowerCase().trim();
    const custName = (cust.name || "").toLowerCase().trim();
    const custCompany = (cust.company || "").toLowerCase().trim();
    return (recName && recName === custName) || (recCompany && custCompany && recCompany === custCompany);
  };

  const customersWithComputedBilled = customers.map(cust => {
    const realInvoices = invoices.filter(inv => !isProformaInvoice(inv) && belongsToCustomer(inv, cust));
    const invoiceAmount = (inv) => {
      const subtotal = (inv.items || []).reduce((a, b) => a + Number(b.amount || 0), 0);
      const gstPercent = Number(inv.gstPercent || 18);
      const tax = inv.gstType === "With GST" ? Math.round(subtotal * (gstPercent / 100)) : 0;
      return inv.gstType === "With GST" ? subtotal + tax : subtotal;
    };
    const totalBilled = realInvoices.reduce((sum, inv) => sum + invoiceAmount(inv), 0);
    const totalReceived = realInvoices
      .filter(inv => inv.status === "Paid")
      .reduce((sum, inv) => sum + invoiceAmount(inv), 0);
    return { ...cust, totalBilled, totalReceived };
  });

    // Save to DB
  const handleSave = async (updated) => {
    const isNew = !customers.find(c => c.id === updated.id);
    try {
      const saveRes = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updated, isNew }),
      });

      // 🔽 NEW: check the response before assuming it worked
      if (!saveRes.ok) {
        const errBody = await saveRes.json().catch(() => ({}));
        throw new Error(errBody.error || `Save failed (${saveRes.status})`);
      }

      const res = await fetch(API);
      const freshData = await res.json();
      setCustomers(freshData);
          const freshSelected = freshData.find(c => c.id === updated.id);
      setDraftId(null);
      navigate(freshSelected ? `/customers/${freshSelected.id}` : "/customers", { replace: true });
    } catch (err) {
      console.error('Save failed:', err);
      alert(`Couldn't save customer: ${err.message}`); // 🔽 NEW: surfaces the failure to you instead of failing silently
    }
  };

  // ✅ Quick inline update (used for the Status/Type badges on the list page).
  // Saves a single field without navigating away from the list.
  const handleQuickUpdate = async (customer, field, value) => {
    const updated = { ...customer, [field]: value };

    // Optimistic UI update so the badge switches instantly
    setCustomers(prev => prev.map(c => (c.id === customer.id ? updated : c)));

    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updated, isNew: false }),
      });
    } catch (err) {
      console.error('Quick update failed:', err);
      // roll back on failure
      setCustomers(prev => prev.map(c => (c.id === customer.id ? customer : c)));
    }
  };

  // Delete from DB
  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleBack = () => {
    setDraftId(null);
    navigate("/customers");
  };

  if (isNewRoute) {
    return (
      <CustomerForm
        key={draftId ?? "new"}
        customer={null}
        allCustomers={customers}
        onSave={handleSave}
        onBack={handleBack}
        draftId={draftId}
      />
    );
  }

  if (isEditRoute) {
    if (!customersLoaded) return null; // brief loading pause while customers fetch
    if (!selected) return null; // redirect effect above will kick in
    return (
      <CustomerForm
        key={selected.id}
        customer={selected}
        allCustomers={customers}
        onSave={handleSave}
        onBack={handleBack}
        draftId={null}
      />
    );
  }

  if (isDetailRoute) {
    if (!customersLoaded) return null;
    if (!selected) return null;
    return (
      <CustomerDetail
        customer={customersWithComputedBilled.find(c => c.id === selected.id) ?? selected}
        onBack={handleBack}
        onEdit={() => handleEdit(selected)}
        quotations={quotations}
        invoices={invoices}
      />
    );
  }

 return (
    <CustomerList
      customers={customersWithComputedBilled}
      search={search}
      setSearch={setSearch}
      filterStatus={filterStatus}
      setFilterStatus={setFilterStatus}
      onNew={handleNew}
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
          onQuickUpdate={handleQuickUpdate}
    />
  );
}