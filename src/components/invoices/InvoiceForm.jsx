import { useState, useEffect } from "react";
import { FaArrowLeft, FaSave, FaPlus, FaTrash, FaEye } from "react-icons/fa";
import { companyInfo } from "../../data/invoiceData";

const inp = {
  border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px",
  fontSize: "0.875rem", color: "#0f172a", width: "100%", outline: "none",
  backgroundColor: "#fff", fontFamily: "inherit",
};

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${day}-${months[parseInt(m) - 1]}-${y}`;
}

const cell = (content, style = {}) => (
  <td style={{ border: "1px solid #000", padding: "5px 7px", fontSize: "0.7rem", verticalAlign: "top", ...style }}>
    {content}
  </td>
);

// ── Hook: track viewport for responsive layout ──────────────────────────────
function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= breakpoint);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}

// ── Live Preview (mini version of InvoiceDocument) ──────────────────────────
function InvoicePreview({ form, isMobile }) {
  const subtotal = form.items.reduce((a, b) => a + Number(b.amount || 0), 0);
  const tax = form.gstType === "With GST" ? Math.round(subtotal * 0.18)
    : form.gstType === "Without GST" ? Math.round(subtotal - subtotal / 1.18)
    : 0;
  const total = form.gstType === "With GST" ? subtotal + tax : subtotal;
  const due = total - Number(form.amountPaid || 0);

  const panelStyle = isMobile
    ? { ...styles.previewPanel, width: "100%", position: "static", maxHeight: "70vh" }
    : styles.previewPanel;

  return (
    <div style={panelStyle}>
      <div style={styles.previewHeader}>
        <FaEye size={14} color="#f97316" />
        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>Live Preview</span>
        <span style={{ fontSize: "0.7rem", color: "#94a3b8", marginLeft: "auto" }}>Updates as you type</span>
      </div>

      <div style={{ padding: "14px", overflowY: "auto", flex: 1, backgroundColor: "#f1f5f9" }}>
        <div style={{ backgroundColor: "#fff", padding: "14px", fontFamily: "Arial, sans-serif", transform: "scale(0.92)", transformOrigin: "top left", width: "108%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
            <tbody>
              <tr>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "8px 10px", width: "60%" }}>
                  <div className="d-flex align-items-start gap-2">
                    {companyInfo.logo
                      ? <img src={companyInfo.logo} alt="Logo" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 36, height: 36, backgroundColor: "#f97316", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.55rem" }}>OMS</span>
                        </div>
                    }
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#0f172a" }}>{companyInfo.name}</div>
                      <div style={{ fontSize: "0.62rem", color: "#334155" }}>GSTIN: {companyInfo.gstin}</div>
                    </div>
                  </div>
                </td>
                <td style={{ border: "1px solid #000", padding: "8px 10px", verticalAlign: "top", width: "25%" }}>
                  <div style={{ fontSize: "0.62rem", color: "#64748b" }}>Invoice No.</div>
                  <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#0f172a" }}>{form.invoiceNo || "—"}</div>
                </td>
                <td style={{ border: "1px solid #000", padding: "8px 10px", verticalAlign: "top", width: "15%" }}>
                  <div style={{ fontSize: "0.62rem", color: "#64748b" }}>Dated</div>
                  <div style={{ fontWeight: 700, fontSize: "0.7rem", color: "#0f172a" }}>{formatDate(form.date)}</div>
                </td>
              </tr>

              <tr>
                <td colSpan={4} style={{ border: "1px solid #000", padding: "6px 10px" }}>
                  <div style={{ fontSize: "0.6rem", color: "#64748b" }}>Buyer (Bill to)</div>
                  <div style={{ fontWeight: 700, fontSize: "0.72rem", color: "#0f172a" }}>
                    {form.buyerName || <span style={{ color: "#cbd5e1" }}>Buyer Name</span>}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "#334155" }}>{form.buyerAddress}</div>
                  <div style={{ fontSize: "0.65rem", color: "#334155" }}>Mobile: {form.buyerMobile}</div>
                </td>
              </tr>

              <tr style={{ backgroundColor: "#f1f5f9" }}>
                {cell("Sl.", { fontWeight: 700, textAlign: "center", width: "6%" })}
                {cell("Description", { fontWeight: 700, width: "50%" })}
                {cell("Qty", { fontWeight: 700, textAlign: "center", width: "10%" })}
                {cell("Rate", { fontWeight: 700, textAlign: "right", width: "17%" })}
                {cell("Amount", { fontWeight: 700, textAlign: "right", width: "17%" })}
              </tr>

              {form.items.map((item, i) => (
                <tr key={i}>
                  {cell(item.sl, { textAlign: "center" })}
                  {cell(item.description || <span style={{ color: "#cbd5e1" }}>—</span>)}
                  {cell(item.qty, { textAlign: "center" })}
                  {cell(Number(item.rate).toFixed(0), { textAlign: "right" })}
                  {cell(Number(item.amount).toFixed(0), { textAlign: "right" })}
                </tr>
              ))}

              <tr>
                {cell("")}{cell(<strong>Sub Total</strong>)}{cell("")}{cell("")}
                {cell(<strong>{subtotal.toFixed(0)}</strong>, { textAlign: "right" })}
              </tr>
              {form.gstType !== "No GST" && (
                <tr>
                  {cell("")}{cell(<strong>{form.gstType === "With GST" ? "GST @ 18%" : "GST (included)"}</strong>)}{cell("")}{cell("")}
                  {cell(<strong>{tax.toFixed(0)}</strong>, { textAlign: "right" })}
                </tr>
              )}
              <tr style={{ backgroundColor: "#fff7ed" }}>
                {cell("")}{cell(<strong>Amount Due</strong>)}{cell("")}{cell("")}
                {cell(<strong style={{ color: "#ea580c" }}>{due.toFixed(0)}</strong>, { textAlign: "right" })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceForm({ invoice, onSave, onBack }) {
  const isEdit = !!invoice;
  const isMobile = useIsMobile(900);

  const [form, setForm] = useState(invoice || {
    invoiceNo: `2026-OMS${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().split("T")[0],
    dueDate: "",
    status: "Draft",
     gstType: "With GST",
    buyerName: "",
    buyerAddress: "",
    buyerMobile: "",
    buyerGSTIN: "",
    amountPaid: 0,
    notes: "",
    items: [{ sl: 1, description: "", qty: 1, rate: 0, amount: 0 }],
  });

  // ✅ Keep the form in sync with whatever invoice was passed in.
  // Without this, if InvoiceForm's instance is reused (not remounted) between
  // "Edit" clicks, useState's initial value is only applied once and the form
  // can end up showing stale or blank data instead of the saved invoice.
  useEffect(() => {
    if (invoice) {
      setForm(invoice);
    }
  }, [invoice]);

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
  const tax = form.gstType === "With GST" ? Math.round(subtotal * 0.18)
    : form.gstType === "Without GST" ? Math.round(subtotal - subtotal / 1.18)
    : 0;
  const total = form.gstType === "With GST" ? subtotal + tax : subtotal;
  const due = total - Number(form.amountPaid || 0);

  const handleSave = () => {
    if (!form.buyerName || !form.invoiceNo) {
      alert("Please fill Invoice No and Buyer Name.");
      return;
    }
    const subtotal = form.items.reduce((a, b) => a + Number(b.amount), 0);
    const tax = form.gstType === "With GST" ? Math.round(subtotal * 0.18)
      : form.gstType === "Without GST" ? Math.round(subtotal - subtotal / 1.18)
      : 0;
    const total = form.gstType === "With GST" ? subtotal + tax : subtotal;
    const amountDue = total - Number(form.amountPaid || 0);

    onSave({
      ...form,
      id: invoice?.id || `INV-${Date.now()}`,
      total,
      amountDue,
    });
  };

  return (
    <div style={isMobile ? styles.splitContainerMobile : styles.splitContainer}>

      {/* ══ LEFT: Form ══ */}
      <div style={styles.formSide}>

        <div className="d-flex justify-content-between align-items-center mb-4 no-print" style={{ flexWrap: "wrap", gap: 10 }}>
          <button onClick={onBack}
            className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
            style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#e2e8f0"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "#f1f5f9"}
          >
            <FaArrowLeft size={12} /> Back
          </button>
          {!isMobile && (
            <div>
              <h5 className="fw-bold mb-0" style={{ color: "#0f172a" }}>{isEdit ? "Edit Invoice" : "New Invoice"}</h5>
            </div>
          )}
          <button onClick={handleSave}
            className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-4 py-2"
            style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", cursor: "pointer", fontSize: "0.85rem", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }}
          >
            <FaSave size={12} /> {isEdit ? "Update Invoice" : "Generate Invoice"}
          </button>
        </div>

        {isMobile && (
          <h5 className="fw-bold mb-3" style={{ color: "#0f172a" }}>{isEdit ? "Edit Invoice" : "New Invoice"}</h5>
        )}

        <div className="card border-0 shadow-sm" style={{ borderRadius: "16px" }}>
          <div className="p-4">

            {/* Invoice Meta */}
            <div className="row g-3 mb-4 p-3 rounded-3" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div
                className="col-12 d-flex justify-content-between align-items-center"
                style={{ flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 12 : 0 }}
              >
                <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.9rem" }}>Invoice Details</div>

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
                      id="logo-upload" type="file" accept="image/*" style={{ display: "none" }}
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
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>GST Type</label>
                <select value={form.gstType} onChange={e => updateField("gstType", e.target.value)} style={inp}>
                  <option>With GST</option>
                  <option>Without GST</option>
                  <option>No GST</option>
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

              {isMobile ? (
                // ── Stacked card layout for items on mobile ──────────────
                <div className="d-flex flex-column gap-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="rounded-3 p-3" style={{ border: "1px solid #e2e8f0", backgroundColor: "#fff" }}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8" }}>Item #{item.sl}</span>
                        {form.items.length > 1 && (
                          <button onClick={() => removeItem(i)} className="border-0 bg-transparent p-0" style={{ color: "#ef4444", cursor: "pointer" }}>
                            <FaTrash size={12} />
                          </button>
                        )}
                      </div>
                      <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Description</label>
                      <textarea rows={2} value={item.description} onChange={e => updateItem(i, "description", e.target.value)}
                        style={{ ...inp, resize: "vertical", fontSize: "0.82rem", marginBottom: 8 }} placeholder="Service description..." />
                      <div className="row g-2">
                        <div className="col-4">
                          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Qty</label>
                          <input type="number" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} style={{ ...inp, fontSize: "0.82rem" }} />
                        </div>
                        <div className="col-4">
                          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Rate</label>
                          <input type="number" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} style={{ ...inp, fontSize: "0.82rem" }} />
                        </div>
                        <div className="col-4">
                          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Amount</label>
                          <div className="fw-semibold" style={{ fontSize: "0.85rem", color: "#0f172a", padding: "8px 0" }}>
                            ₹{Number(item.amount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // ── Table layout for items on desktop ────────────────────
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
              )}

              <button onClick={addItem}
                className="d-flex align-items-center gap-2 border-0 rounded-3 px-3 py-2 mt-2"
                style={{ backgroundColor: "#f1f5f9", color: "#475569", fontSize: "0.82rem", cursor: "pointer" }}>
                <FaPlus size={10} /> Add Item
              </button>
            </div>

            {/* Totals */}
            <div className="d-flex justify-content-end mb-4">
              <div style={{ minWidth: isMobile ? "100%" : "280px", width: isMobile ? "100%" : "auto" }}>
                {[
                  { label: "Sub Total", value: `₹${subtotal.toLocaleString()}` },
                  ...(form.gstType !== "No GST" ? [{
                    label: form.gstType === "With GST" ? "GST @ 18%" : "GST (included)",
                    value: `₹${tax.toLocaleString()}`
                  }] : []),
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
              <div
                className="d-flex align-items-center gap-4 p-3 rounded-3"
                style={{
                  backgroundColor: "#f8fafc", border: "1.5px dashed #e2e8f0",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "center",
                }}
              >
                <div style={{
                  width: isMobile ? "100%" : 180, height: 70, border: "1px solid #e2e8f0", borderRadius: 8,
                  backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, overflow: "hidden",
                }}>
                  {form.signature
                    ? <img src={form.signature} alt="Signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    : <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>No signature uploaded</span>
                  }
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 8 }}>
                    Upload your signature image (PNG with transparent background recommended)
                  </div>
                  <div className="d-flex gap-2" style={{ flexWrap: "wrap" }}>
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

      {/* ══ RIGHT (or BELOW on mobile): Preview ══ */}
      <InvoicePreview form={form} isMobile={isMobile} />

    </div>
  );
}

const styles = {
  splitContainer: { display: "flex", gap: "24px", alignItems: "flex-start", width: "100%" },
  splitContainerMobile: { display: "flex", flexDirection: "column", gap: "20px", width: "100%" },
  formSide: { flex: "1 1 0", minWidth: 0, maxWidth: "700px" },
  previewPanel: {
    width: "380px", flexShrink: 0, position: "sticky", top: "20px",
    backgroundColor: "#fff", borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1.5px solid #f1f5f9",
    display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 100px)", overflow: "hidden",
  },
  previewHeader: {
    display: "flex", alignItems: "center", gap: 8, padding: "14px 16px",
    borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa", borderRadius: "16px 16px 0 0",
  },
};