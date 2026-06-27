import { useState } from "react";
import { FaArrowLeft, FaPrint, FaEdit, FaSave, FaTimes, FaPlus, FaTrash } from "react-icons/fa";

export default function QuotationDetail({
  quotation, editMode, isNewTemplate,
  onBack, onEdit, onSave, onCancelEdit
}) {
  const [form, setForm] = useState({
    ...quotation,
    customSections: quotation.customSections || [], // [{heading, content}]
  });

  const tax = Math.round(form.amount * 0.18);
  const total = form.amount + tax;

  const updateField = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    if (field === "qty" || field === "rate") {
      items[i].total = Number(items[i].qty) * Number(items[i].rate);
    }
    const amount = items.reduce((sum, it) => sum + it.total, 0);
    setForm(prev => ({ ...prev, items, amount }));
  };

  const addItem = () =>
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { description: "", qty: 1, rate: 0, total: 0 }],
    }));

  const removeItem = (i) => {
    const items = form.items.filter((_, idx) => idx !== i);
    const amount = items.reduce((sum, it) => sum + it.total, 0);
    setForm(prev => ({ ...prev, items, amount }));
  };

  // ── Custom section helpers ──
  const addCustomSection = () =>
    setForm(prev => ({
      ...prev,
      customSections: [...prev.customSections, { heading: "", content: "" }],
    }));

  const updateCustomSection = (i, field, value) => {
    const sections = [...form.customSections];
    sections[i] = { ...sections[i], [field]: value };
    setForm(prev => ({ ...prev, customSections: sections }));
  };

  const removeCustomSection = (i) =>
    setForm(prev => ({
      ...prev,
      customSections: prev.customSections.filter((_, idx) => idx !== i),
    }));

  const inp = {
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    padding: "5px 10px",
    fontSize: "0.92rem",
    color: "#1e293b",
    width: "100%",
    outline: "none",
    backgroundColor: "#f8fafc",
    fontFamily: "Georgia, serif",
    lineHeight: 1.8,
  };

  const headingInp = {
    ...inp,
    fontWeight: 700,
    fontSize: "1rem",
    color: "#0f172a",
    backgroundColor: "#fff7ed",
    border: "1px solid #fed7aa",
  };

  const sectionTitle = {
    fontWeight: 700,
    fontSize: "1rem",
    color: "#0f172a",
    marginBottom: 6,
    fontFamily: "Georgia, serif",
    textAlign: "left",
  };

  const sectionText = {
    fontSize: "0.92rem",
    color: "#334155",
    lineHeight: 1.9,
    fontFamily: "Georgia, serif",
    margin: 0,
    textAlign: "left",
  };

  return (
    <div style={{ maxWidth: "800px" }}>

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

        <div className="d-flex gap-2">
          {!editMode && (
            <button onClick={onEdit}
              className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
              style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f97316"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#475569"; }}
            >
              <FaEdit size={12} /> Edit
            </button>
          )}
                  </div>
      </div>

      {/* DOCUMENT */}
      <div className="bg-white print-doc"
        style={{ borderRadius: "12px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", padding: "48px 56px", fontFamily: "Georgia, serif" }}
      >
        {/* Company name */}
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f97316", marginBottom: 8, fontFamily: "Georgia, serif" }}>
          Orange Mega Software
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: "2.4rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px" }}>
            QUOTATION
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#334155", marginTop: 4 }}>
            {editMode
              ? <input value={form.company} onChange={e => updateField("company", e.target.value)}
                style={{ ...inp, fontSize: "1rem", fontWeight: 700 }} placeholder="Project / Company Title" />
              : form.company
            }
          </div>
          <div style={{ height: 2, backgroundColor: "#0f172a", marginTop: 16 }} />
        </div>

        {/* Quotation Meta */}
        <div style={{ marginBottom: 28, fontSize: "0.88rem", color: "#64748b", fontFamily: "Georgia, serif" }}>
          <span style={{ marginRight: 24 }}>
            <strong style={{ color: "#0f172a" }}>Quotation No:</strong>
            {editMode ? (
              <input value={form.id} onChange={e => updateField("id", e.target.value)}
                style={{ ...inp, width: "120px", display: "inline-block", marginLeft: "5px" }} />
            ) : form.id}
          </span>
          <span style={{ marginRight: 24 }}>
            <strong style={{ color: "#0f172a" }}>Date: </strong>
            {editMode
              ? <input type="date" value={form.date} onChange={e => updateField("date", e.target.value)}
                style={{ ...inp, width: "auto", display: "inline-block" }} />
              : form.date
            }
          </span><span style={{ marginRight: 24 }}>
    <strong style={{ color: "#0f172a" }}>Status: </strong>
    {editMode ? (
      <select
        value={form.status}
        onChange={e => updateField("status", e.target.value)}
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: "4px",
          padding: "4px 8px",
          fontSize: "0.88rem",
          color: "#1e293b",
          backgroundColor: "#f8fafc",
          marginLeft: "5px",
        }}
      >
        <option value="Draft">Draft</option>
        <option value="Pending">Pending</option>
        <option value="Approved">Approved</option>
      </select>
    ) : (
      <span style={{
        marginLeft: 5,
        padding: "2px 10px",
        borderRadius: "20px",
        fontSize: "0.8rem",
        fontWeight: 600,
        backgroundColor: form.status === "Approved" ? "#ecfdf5" : form.status === "Pending" ? "#fff7ed" : "#f8fafc",
        color: form.status === "Approved" ? "#059669" : form.status === "Pending" ? "#ea580c" : "#64748b",
      }}>
        {form.status}
      </span>
    )}
  </span>
</div>
        </div>

        {/* Edit meta fields */}
        {editMode && (
          <div className="row g-2 mb-4 p-3 rounded-3" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
            {[
              { label: "Client Name", field: "name" },
              { label: "Email", field: "email" },
              { label: "Phone", field: "phone" },
              { label: "Timeline", field: "timeline" },
            ].map(({ label, field }) => (
              <div className="col-12 col-md-6" key={field}>
                <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 2, fontFamily: "sans-serif" }}>{label}</label>
                <input value={form[field] || ""} onChange={e => updateField(field, e.target.value)} style={inp} placeholder={label} />
              </div>
            ))}
          </div>
        )}

        {/* SECTION 1 — Project Description */}
        <div style={{ marginBottom: 24 }}>
          <div style={sectionTitle}>Project Description</div>
          {editMode
            ? <textarea rows={4} value={form.description || `This proposal outlines the scope of work agreed upon between Orange Mega Software and ${form.company}.`}
              onChange={e => updateField("description", e.target.value)}
              style={{ ...inp, resize: "vertical" }} />
            : <div style={sectionText}>{form.description || `This proposal outlines the scope of work agreed upon between Orange Mega Software and ${form.company}.`}</div>
          }
        </div>

        {/* SECTION 2 — Client Details */}
        <div style={{ marginBottom: 24 }}>
          <div style={sectionTitle}>Client Details</div>
          <div style={sectionText}>
            <div>Client Name: {form.name}</div>
            <div>Company: {form.company}</div>
            <div>Email: {form.email}</div>
            <div>Phone: {form.phone}</div>
          </div>
        </div>

        {/* SECTION 3 — Scope of Work */}
        {(editMode || form.scopeOfWork?.trim()) && (
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>Scope of Work</div>
            {editMode ? (
              <textarea rows={5} value={form.scopeOfWork || ""} onChange={e => updateField("scopeOfWork", e.target.value)} style={{ ...inp, resize: "vertical" }} />
            ) : (
              <div style={sectionText}>
                {form.scopeOfWork?.split("\n").filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4 — Deliverables */}
        {(editMode || form.deliverables?.trim()) && (
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>Deliverables</div>
            {editMode ? (
              <textarea rows={5} value={form.deliverables || ""} onChange={e => updateField("deliverables", e.target.value)} style={{ ...inp, resize: "vertical" }} placeholder="Enter deliverables..." />
            ) : (
              <div style={sectionText}>
                {form.deliverables?.split("\n").filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 5 — Technology Used */}
        {(editMode || form.technologyUsed?.trim()) && (
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>Technology Used</div>
            {editMode ? (
              <textarea rows={5} value={form.technologyUsed || ""} onChange={e => updateField("technologyUsed", e.target.value)} style={{ ...inp, resize: "vertical" }} />
            ) : (
              <div style={sectionText}>
                {form.technologyUsed?.split("\n").filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 6 — Project Timeline */}
        {(editMode || form.timelineDesc?.trim()) && (
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>Project Timeline</div>
            {editMode ? (
              <textarea rows={5} value={form.timelineDesc || ""} onChange={e => updateField("timelineDesc", e.target.value)} style={{ ...inp, resize: "vertical" }} />
            ) : (
              <div style={sectionText}>
                {form.timelineDesc?.split("\n").filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 7 — Project Cost */}
        <div style={{ marginBottom: 24 }}>
          <div style={sectionTitle}>Project Cost</div>
          {editMode ? (
            <textarea rows={6} value={form.projectCost || ""} onChange={e => updateField("projectCost", e.target.value)}
              style={{ ...inp, resize: "vertical" }} placeholder="Enter project cost details..." />
          ) : (
            <div style={sectionText}>
              {form.projectCost?.split("\n").filter(l => l.trim()).map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 8 — Terms & Conditions */}
        {(editMode || form.terms) && (
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>Terms & Conditions</div>
            {editMode ? (
              <textarea rows={6} value={form.terms || ""} onChange={e => updateField("terms", e.target.value)} style={{ ...inp, resize: "vertical" }} />
            ) : (
              <div style={sectionText}>
                {form.terms?.split("\n").filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {(form.notes || editMode) && (
          <div style={{ marginBottom: 24, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
            <div style={sectionTitle}>Note:</div>
            {editMode
              ? <textarea rows={2} value={form.notes} onChange={e => updateField("notes", e.target.value)}
                style={{ ...inp, resize: "vertical" }} placeholder="Additional notes..." />
              : <div style={sectionText}>{form.notes}</div>
            }
          </div>
        )}

        {/* ── CUSTOM SECTIONS ── */}
        {form.customSections.map((sec, i) => (
          <div key={i} style={{
            marginBottom: 24,
            paddingTop: 16,
            borderTop: "1px solid #e2e8f0",
            position: "relative",
          }}>
            {/* Heading */}
            {editMode ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input
                  value={sec.heading}
                  onChange={e => updateCustomSection(i, "heading", e.target.value)}
                  placeholder="Section Heading (e.g. Payment Terms)"
                  style={headingInp}
                />
                {/* Remove section button */}
                <button
                  onClick={() => removeCustomSection(i)}
                  title="Remove this section"
                  style={{
                    flexShrink: 0,
                    width: 30, height: 30,
                    border: "none",
                    borderRadius: 6,
                    backgroundColor: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <FaTrash size={12} />
                </button>
              </div>
            ) : (
              sec.heading && <div style={sectionTitle}>{sec.heading}</div>
            )}

            {/* Content */}
            {editMode ? (
              <textarea
                rows={4}
                value={sec.content}
                onChange={e => updateCustomSection(i, "content", e.target.value)}
                placeholder="Type section content here..."
                style={{ ...inp, resize: "vertical" }}
              />
            ) : (
              <div style={sectionText}>
                {sec.content?.split("\n").filter(l => l.trim()).map((line, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <span>•</span><span>{line}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* ── Add Section Button (edit mode only) ── */}
        {editMode && (
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={addCustomSection}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                border: "2px dashed #f97316",
                borderRadius: 8,
                backgroundColor: "rgba(249,115,22,0.05)",
                color: "#f97316",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                fontFamily: "sans-serif",
                transition: "all 0.18s",
                width: "100%",
                justifyContent: "center",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = "rgba(249,115,22,0.12)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = "rgba(249,115,22,0.05)";
              }}
            >
              <FaPlus size={12} /> Add Custom Section
            </button>
          </div>
        )}

        {/* Signature */}
{/* Signature */}
<div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 32, marginTop: 32 }}>
  <div className="row g-3">
    <div className="col-6">
      <div style={{ fontFamily: "Georgia, serif" }}>
       <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 8 }}>Client Signature</div>
<div style={{ height: 60, marginBottom: 8 }} />
<div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 6, fontSize: "0.88rem", color: "#475569", wordBreak: "break-word" }}>
  {form.name}
</div>
      </div>
    </div>

    <div className="col-6 text-end">
      <div style={{ fontFamily: "Georgia, serif" }}>
        <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 8 }}>Authorized Signature</div>

        {/* Signature image or upload */}
        {editMode ? (
          <div className="d-flex flex-column align-items-end gap-2 mb-2">
            <div style={{
              width: 180, height: 60, border: "1px solid #e2e8f0", borderRadius: 8,
              backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
            }}>
              {form.signature
                ? <img src={form.signature} alt="Signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                : <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>No signature</span>
              }
            </div>
            <div className="d-flex gap-2">
              <label htmlFor="qt-sig-upload"
                style={{ fontSize: "0.72rem", fontWeight: 600, color: "#f97316", border: "1px solid #f97316", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                {form.signature ? "Change" : "Upload Signature"}
              </label>
              <input id="qt-sig-upload" type="file" accept="image/*" style={{ display: "none" }}
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
                  className="border-0 rounded-3 px-2 py-1"
                  style={{ backgroundColor: "#fef2f2", color: "#ef4444", fontSize: "0.68rem", cursor: "pointer" }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ minHeight: 60, display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 8 }}>
            {form.signature
              ? <img src={form.signature} alt="Signature" style={{ maxHeight: 60, maxWidth: 180, objectFit: "contain" }} />
             : <div style={{ width: 180, height: 52 }} />
            }
          </div>
        )}

        <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 6, fontSize: "0.88rem", color: "#475569", textAlign: "right", wordBreak: "break-word" }}>
          Orange Mega Software
        </div>
      </div>
    </div>
  </div>
</div>
{editMode && (
  <div className="no-print mt-3 d-flex justify-content-end gap-2">
    <button onClick={() => { setForm({ ...quotation, customSections: quotation.customSections || [] }); onCancelEdit(); onBack(); }}
      className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
      style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}>
      <FaTimes size={12} /> Cancel
    </button>
    <button onClick={() => onSave(form)}
      className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
      style={{ backgroundColor: "#059669", color: "#fff", cursor: "pointer", fontSize: "0.85rem" }}>
      <FaSave size={12} /> Save
    </button>
  </div>
)}

{!editMode && (
  <div className="no-print mt-3 d-flex justify-content-end">
    <button onClick={() => window.print()}
      className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-4 py-2"
      style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", cursor: "pointer", fontSize: "0.85rem", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }}>
      <FaPrint size={12} /> Print / Download PDF
    </button>
  </div>
)}

 

    
      </div>
   
  );
}
