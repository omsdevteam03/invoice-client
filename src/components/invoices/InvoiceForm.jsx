import { useState } from "react";
import { FaArrowLeft, FaSave, FaPlus, FaTrash } from "react-icons/fa";
import { companyInfo } from "../../data/invoiceData";

const inp = {
  border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px",
  fontSize: "0.875rem", color: "#0f172a", width: "100%", outline: "none",
  backgroundColor: "#fff", fontFamily: "inherit",
};

export default function InvoiceForm({ invoice, onSave, onBack }) {
  const isEdit = !!invoice;

  const [form, setForm] = useState(invoice || {
    invoiceNo: `2026-OMS${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().split("T")[0],
    dueDate: "",
    status: "Draft",
    buyerName: "",
    buyerAddress: "",
    buyerMobile: "",
    buyerGSTIN: "",
    amountPaid: 0,
    notes: "",
    items: [{ sl: 1, description: "", qty: 1, rate: 0, amount: 0 }],
  });

  const updateField = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    if (field === "qty" || field === "rate") {
      items[i].amount = Number(items[i].qty) * Number(items[i].rate);
    }
    setForm(prev => ({ ...prev, items }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { sl: prev.items.length + 1, description: "", qty: 1, rate: 0, amount: 0 }],
    }));
  };

  const removeItem = (i) => {
    const items = form.items.filter((_, idx) => idx !== i).map((item, idx) => ({ ...item, sl: idx + 1 }));
    setForm(prev => ({ ...prev, items }));
  };

  const subtotal = form.items.reduce((a, b) => a + Number(b.amount), 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;
  const due = total - Number(form.amountPaid || 0);

const handleSave = () => {
  if (!form.buyerName || !form.invoiceNo) {
    alert("Please fill Invoice No and Buyer Name.");
    return;
  }
  const subtotal = form.items.reduce((a, b) => a + Number(b.amount), 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;
  const amountDue = total - Number(form.amountPaid || 0);

  onSave({ 
    ...form, 
    id: invoice?.id || `INV-${Date.now()}`,
    total,
    amountDue,
  });
};

  return (
    <div style={{ maxWidth: "900px" }}>

      {/* Top Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <button onClick={onBack}
          className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
          style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "#e2e8f0"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "#f1f5f9"}
        >
          <FaArrowLeft size={12} /> Back
        </button>
        <div>
          <h5 className="fw-bold mb-0" style={{ color: "#0f172a" }}>{isEdit ? "Edit Invoice" : "New Invoice"}</h5>
        </div>
        <button onClick={handleSave}
          className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-4 py-2"
          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", cursor: "pointer", fontSize: "0.85rem", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }}
        >
          <FaSave size={12} /> {isEdit ? "Update Invoice" : "Generate Invoice"}
        </button>
      </div>

      <div className="card border-0 shadow-sm" style={{ borderRadius: "16px" }}>
        <div className="p-4">

          {/* Invoice Meta */}
        {/* Invoice Meta */}
<div className="row g-3 mb-4 p-3 rounded-3" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
  <div className="col-12 d-flex justify-content-between align-items-center">
    <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.9rem" }}>Invoice Details</div>

    {/* Logo Upload */}
    <div className="d-flex align-items-center gap-3">
      {companyInfo.logo
        ? <img src={companyInfo.logo} alt="Logo" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }} />
        : <div style={{ width: 48, height: 48, backgroundColor: "#f97316", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.65rem" }}>OMS</span>
          </div>
      }
      <div>
        <label htmlFor="logo-upload"
          style={{ fontSize: "0.78rem", fontWeight: 600, color: "#f97316", cursor: "pointer", border: "1.5px solid #f97316", borderRadius: "8px", padding: "4px 12px" }}>
          {companyInfo.logo ? "Change Logo" : "Upload Logo"}
        </label>
        <input
          id="logo-upload"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                companyInfo.logo = reader.result;
                setForm(prev => ({ ...prev, _logoUpdate: Date.now() }));
              };
              reader.readAsDataURL(file);
            }
          }}
        />
        {companyInfo.logo && (
          <button
            onClick={() => { companyInfo.logo = null; setForm(prev => ({ ...prev, _logoUpdate: Date.now() })); }}
            className="border-0 bg-transparent ms-2"
            style={{ fontSize: "0.75rem", color: "#ef4444", cursor: "pointer" }}>
            Remove
          </button>
        )}
        <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 2 }}>PNG, JPG up to 2MB</div>
      </div>
    </div>
  </div>
            <div className="col-12 col-md-4">
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Invoice No *</label>
              <input value={form.invoiceNo} onChange={e => updateField("invoiceNo", e.target.value)} style={inp} placeholder="2026-OMS6001" />
            </div>
            <div className="col-12 col-md-4">
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Invoice Date *</label>
              <input type="date" value={form.date} onChange={e => updateField("date", e.target.value)} style={inp} />
            </div>
            <div className="col-12 col-md-4">
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => updateField("dueDate", e.target.value)} style={inp} />
            </div>
            <div className="col-12 col-md-4">
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Status</label>
              <select value={form.status} onChange={e => updateField("status", e.target.value)} style={inp}>
                <option>Draft</option>
                <option>Unpaid</option>
                <option>Paid</option>
                <option>Overdue</option>
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Amount Paid (₹)</label>
              <input type="number" value={form.amountPaid} onChange={e => updateField("amountPaid", e.target.value)} style={inp} placeholder="0" />
            </div>
          </div>

          {/* Buyer Details */}
          <div className="row g-3 mb-4 p-3 rounded-3" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div className="col-12">
              <div className="fw-bold mb-2" style={{ color: "#0f172a", fontSize: "0.9rem" }}>Buyer Details (Bill To)</div>
            </div>
            <div className="col-12 col-md-6">
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Buyer Name *</label>
              <input value={form.buyerName} onChange={e => updateField("buyerName", e.target.value)} style={inp} placeholder="Client / Company Name" />
            </div>
            <div className="col-12 col-md-6">
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Mobile Number</label>
              <input value={form.buyerMobile} onChange={e => updateField("buyerMobile", e.target.value)} style={inp} placeholder="9876543210" />
            </div>
            <div className="col-12 col-md-8">
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Address</label>
              <textarea rows={2} value={form.buyerAddress} onChange={e => updateField("buyerAddress", e.target.value)} style={{ ...inp, resize: "vertical" }} placeholder="Full address..." />
            </div>
            <div className="col-12 col-md-4">
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>GSTIN (optional)</label>
              <input value={form.buyerGSTIN} onChange={e => updateField("buyerGSTIN", e.target.value)} style={inp} placeholder="33AABCA1234B1ZX" />
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-4">
            <div className="fw-bold mb-3" style={{ color: "#0f172a", fontSize: "0.9rem" }}>Services / Items</div>
            <div className="rounded-3 overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
              <div className="row g-0 px-3 py-2" style={{ backgroundColor: "#0f172a" }}>
                {["Sl.", "Description of Services", "Qty", "Rate (₹)", "Amount (₹)", ""].map((h, i) => (
                  <div key={i}
                    className={i === 1 ? "col-5" : i === 5 ? "col-1" : "col"}
                    style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em" }}>
                    {h}
                  </div>
                ))}
              </div>

              {form.items.map((item, i) => (
                <div key={i} className="row g-0 px-3 py-2 align-items-center" style={{ borderTop: "1px solid #f1f5f9" }}>
                  <div className="col" style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{item.sl}</div>
                  <div className="col-5 pe-2">
                    <textarea rows={2} value={item.description} onChange={e => updateItem(i, "description", e.target.value)}
                      style={{ ...inp, resize: "vertical", fontSize: "0.82rem" }} placeholder="Service description..." />
                  </div>
                  <div className="col pe-2">
                    <input type="number" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} style={{ ...inp, fontSize: "0.82rem" }} />
                  </div>
                  <div className="col pe-2">
                    <input type="number" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} style={{ ...inp, fontSize: "0.82rem" }} />
                  </div>
                  <div className="col fw-semibold" style={{ fontSize: "0.82rem", color: "#0f172a" }}>
                    ₹{Number(item.amount).toLocaleString()}
                  </div>
                  <div className="col-1 text-end">
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="border-0 bg-transparent p-0" style={{ color: "#ef4444", cursor: "pointer" }}>
                        <FaTrash size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addItem}
              className="d-flex align-items-center gap-2 border-0 rounded-3 px-3 py-2 mt-2"
              style={{ backgroundColor: "#f1f5f9", color: "#475569", fontSize: "0.82rem", cursor: "pointer" }}>
              <FaPlus size={10} /> Add Item
            </button>
          </div>

          {/* Totals */}
          <div className="d-flex justify-content-end mb-4">
            <div style={{ minWidth: "280px" }}>
              {[
                { label: "Sub Total", value: `₹${subtotal.toLocaleString()}` },
                { label: "GST @ 18%", value: `₹${tax.toLocaleString()}` },
                { label: "Total Invoice Value", value: `₹${total.toLocaleString()}`, bold: true },
                { label: "Amount Paid", value: `₹${Number(form.amountPaid || 0).toLocaleString()}` },
              ].map(({ label, value, bold }) => (
                <div key={label} className="d-flex justify-content-between py-2" style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "0.85rem", color: bold ? "#0f172a" : "#64748b", fontWeight: bold ? 700 : 400 }}>{label}</span>
                  <span style={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: bold ? 700 : 600 }}>{value}</span>
                </div>
              ))}
              <div className="d-flex justify-content-between py-3 px-3 rounded-3 mt-2" style={{ backgroundColor: "#0f172a" }}>
                <span className="fw-bold" style={{ color: "#fff", fontSize: "0.9rem" }}>Amount Due</span>
                <span className="fw-bold" style={{ color: "#f97316", fontSize: "1.1rem" }}>₹{due.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
        {/* Notes */}
<div className="mb-4">
  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Notes (optional)</label>
  <textarea rows={2} value={form.notes} onChange={e => updateField("notes", e.target.value)}
    style={{ ...inp, resize: "vertical" }} placeholder="Additional notes for the client..." />
</div>

{/* Signature Upload */}
<div>
  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 8 }}>
    Authorized Signature
  </label>
  <div className="d-flex align-items-center gap-4 p-3 rounded-3" style={{ backgroundColor: "#f8fafc", border: "1.5px dashed #e2e8f0" }}>

    {/* Preview */}
    <div style={{
      width: 180, height: 70, border: "1px solid #e2e8f0", borderRadius: 8,
      backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, overflow: "hidden",
    }}>
      {form.signature
        ? <img src={form.signature} alt="Signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        : <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>No signature uploaded</span>
      }
    </div>

    {/* Buttons */}
    <div>
      <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 8 }}>
        Upload your signature image (PNG with transparent background recommended)
      </div>
      <div className="d-flex gap-2">
        <label htmlFor="sig-upload"
          style={{
            fontSize: "0.78rem", fontWeight: 600, color: "#f97316",
            border: "1.5px solid #f97316", borderRadius: 8,
            padding: "6px 14px", cursor: "pointer", display: "inline-block"
          }}>
          {form.signature ? "Change Signature" : "Upload Signature"}
        </label>
        <input id="sig-upload" type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => updateField("signature", reader.result);
              reader.readAsDataURL(file);
            }
          }}
        />
        {form.signature && (
          <button onClick={() => updateField("signature", null)}
            className="border-0 rounded-3 fw-semibold px-3 py-1"
            style={{ backgroundColor: "#fef2f2", color: "#ef4444", fontSize: "0.78rem", cursor: "pointer" }}>
            Remove
          </button>
        )}
      </div>
      <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 4 }}>PNG, JPG, SVG up to 2MB</div>
    </div>

  </div>
</div>

        </div>
      </div>
    </div>
  );
}