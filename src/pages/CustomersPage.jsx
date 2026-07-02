import { useState, useEffect } from "react";
import CustomerList from "../components/customers/CustomerList.jsx";
import CustomerForm from "../components/customers/CustomerForm.jsx";
import CustomerDetail from "../components/customers/CustomerDetail.jsx";

const API = `${import.meta.env.VITE_API_URL}/customers`;
export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // Load from DB
  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(err => console.error('Failed to load customers:', err));
  }, []);

  const handleNew = () => { setSelected(null); setView("form"); };
  const handleEdit = (customer) => { setSelected(customer); setView("form"); };
  const handleView = (customer) => { setSelected(customer); setView("detail"); };

// Save to DB
const handleSave = async (updated) => {
    const isNew = !customers.find(c => c.id === updated.id);
    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updated, isNew }),
      });
      const res = await fetch(API);
      const freshData = await res.json();
      setCustomers(freshData);
      const freshSelected = freshData.find(c => c.id === updated.id);
      setSelected(freshSelected);
      setView("detail");
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  // Delete from DB
  const handleDelete = async (id) => {
   try {
  await fetch(`${API}/${id}`, { method: 'DELETE' });
  setCustomers(prev => prev.filter(c => c.id !== id));
} catch (err) {
  console.error('Delete failed:', err);
}};

  const handleBack = () => { setSelected(null); setView("list"); };

  if (view === "form") {
    return (
      <CustomerForm
        customer={selected}
        allCustomers={customers}
        onSave={handleSave}
        onBack={handleBack}
      />
    );
  }

  if (view === "detail") {
    return (
      <CustomerDetail
        customer={selected}
        onBack={handleBack}
        onEdit={() => handleEdit(selected)}
      />
    );
  }

  return (
    <CustomerList
      customers={customers}
      search={search}
      setSearch={setSearch}
      filterStatus={filterStatus}
      setFilterStatus={setFilterStatus}
      onNew={handleNew}
      onView={handleView}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
