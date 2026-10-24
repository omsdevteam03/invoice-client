import { useState, useEffect } from "react";
import ProductList from "../components/products/ProductList";
import ProductForm from "../components/products/ProductForm";

const API = `${import.meta.env.VITE_API_URL}/products`;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [newType, setNewType] = useState("Product");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // product being edited, or null for a new one
  const [toast, setToast] = useState(null);

  // Load products from DB
  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(err => console.error("Failed to load products:", err));
  }, []);

  // Load invoices (used for each item's Transactions table)
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/invoices`)
      .then(res => res.json())
      .then(data => setInvoices(Array.isArray(data) ? data : []))
      .catch(err => console.error("Failed to load invoices:", err));
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleNew = (type = "Product") => { setEditing(null); setNewType(type); setShowForm(true); };
  const handleEdit = (p) => { setEditing(p); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditing(null); };

  // Save (create or update) — same POST-upsert style as invoices
  const handleSave = async (product) => {
    const payload = { ...product, id: product.id || `PRD-${Date.now()}` };
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Save failed with status ${res.status}`);
      const saved = await res.json();
      setProducts(prev =>
        prev.find(p => p.id === saved.id)
          ? prev.map(p => (p.id === saved.id ? saved : p))
          : [saved, ...prev]
      );
      handleClose();
      showToast(editing ? "Product updated!" : "Product added!");
    } catch (err) {
      console.error("Save product failed:", err);
      alert("Failed to save product: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast("Product deleted");
    } catch (err) {
      console.error("Delete product failed:", err);
    }
  };

  return (
    <>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 2000, backgroundColor: "#0f172a", color: "#fff",
          padding: "12px 20px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#34d399" }} />
          {toast}
        </div>
      )}

      <ProductList
        products={products}
        invoices={invoices}
        search={search}
        setSearch={setSearch}
        onNew={handleNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {showForm && (
        <ProductForm product={editing} defaultType={newType} onSave={handleSave} onClose={handleClose} />
      )}
    </>
  );
}