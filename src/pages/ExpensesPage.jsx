import { useState, useEffect } from "react";
import ExpenseList from "../components/expenses/ExpenseList";
import ExpenseForm from "../components/expenses/ExpenseForm";

const API = `${import.meta.env.VITE_API_URL}/expenses`;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setExpenses(data))
      .catch(err => console.error('Failed to load expenses:', err));
  }, []);

  const handleNew = () => { setSelected(null); setView("form"); };
  const handleEdit = (exp) => { setSelected(exp); setView("form"); };
  const handleBack = () => { setSelected(null); setView("list"); };

  const handleSave = async (updated) => {
    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setExpenses(prev => {
        const exists = prev.find(e => e.id === updated.id);
        return exists ? prev.map(e => e.id === updated.id ? updated : e) : [...prev, updated];
      });
      handleBack();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (view === "form") {
    return (
      <ExpenseForm
        expense={selected}
        onSave={handleSave}
        onCancel={handleBack}
      />
    );
  }

  return (
    <ExpenseList
      expenses={expenses}
      search={search}
      setSearch={setSearch}
      onNew={handleNew}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}