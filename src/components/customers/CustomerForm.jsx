// src/components/customers/CustomerForm.jsx
import { useState, useCallback } from "react";
import {
  FaArrowLeft, FaSave, FaUser, FaBuilding, FaEnvelope,
  FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaStickyNote, FaTags,
  FaEye, FaCheckCircle,
} from "react-icons/fa";
import { customerTags } from "../../data/customerData.jsx";

const EMPTY_FORM = {
  fullName: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  type: "Business",
  status: "Active",
  since: new Date().toISOString().split("T")[0],
  notes: "",
  tags: [],
};

function buildFormFromCustomer(c) {
  if (!c) return EMPTY_FORM;
  return {
    fullName: c.name ?? "",
    company: c.company ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    type: c.type ?? "Business",
    status: c.status ?? "Active",
    since: c.since ?? new Date().toISOString().split("T")[0],
    notes: c.notes ?? "",
    tags: c.tags ?? [],
  };
}

function generateId(allCustomers) {
  const max = allCustomers.reduce((m, c) => {
    const n = parseInt(c.id?.replace("CUST-", "") || "0", 10);
    return Math.max(m, n);
  }, 0);
  return `CUST-${String(max + 1).padStart(3, "0")}`;
}

function Field({ label, required, icon, children }) {
  return (
    <div>
      <label style={styles.label}>
        {icon && <span style={{ marginRight: 6, opacity: 0.6 }}>{icon}</span>}
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Live Preview Panel (Customer only) ──────────────────────────────────────
function CustomerPreview({ form, customerId }) {
  const statusColor = {
    Active: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
    Inactive: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
    Lead: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  }[form.status] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };

  return (
    <div className="cf-preview-panel">
      {/* Preview Header */}
      <div style={styles.previewHeader}>
        <FaEye size={14} color="#f97316" />
        <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>Live Preview</span>
        <span style={{ fontSize: "0.72rem", color: "#94a3b8", marginLeft: "auto" }}>Updates as you type</span>
      </div>

      <div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>

        {/* Avatar + Name */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={styles.avatar}>
            {form.fullName ? form.fullName.charAt(0).toUpperCase() : "?"}
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a", marginTop: 8 }}>
            {form.fullName || <span style={{ color: "#cbd5e1" }}>Full Name</span>}
          </div>
          {form.company && (
            <div style={{ fontSize: "0.82rem", color: "#64748b" }}>{form.company}</div>
          )}
          <span style={{
            display: "inline-block", marginTop: 6, padding: "3px 12px",
            borderRadius: 20, fontSize: "0.72rem", fontWeight: 600,
            backgroundColor: statusColor.bg, color: statusColor.color,
            border: `1px solid ${statusColor.border}`,
          }}>
            {form.status}
          </span>
        </div>

        {/* Info Rows */}
        <div style={styles.infoCard}>
          {[
            { icon: <FaEnvelope size={11} />, label: "Email", value: form.email },
            { icon: <FaPhone size={11} />, label: "Phone", value: form.phone },
            { icon: <FaMapMarkerAlt size={11} />, label: "Address", value: form.address },
            { icon: <FaBuilding size={11} />, label: "Type", value: form.type },
            { icon: <FaCalendarAlt size={11} />, label: "Since", value: form.since },
          ].map(({ icon, label, value }) => (
            <div key={label} style={styles.infoRow}>
              <span style={styles.infoIcon}>{icon}</span>
              <span style={styles.infoLabel}>{label}</span>
              <span style={styles.infoValue}>{value || <span style={{ color: "#cbd5e1" }}>—</span>}</span>
            </div>
          ))}
        </div>

        {/* Tags */}
        {form.tags.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>TAGS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {form.tags.map(tag => (
                <span key={tag} style={styles.tagChip}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {form.notes && (
          <div style={{ marginTop: 12, padding: 12, backgroundColor: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#92400e", marginBottom: 4 }}>NOTES</div>
            <div style={{ fontSize: "0.8rem", color: "#78350f", lineHeight: 1.5 }}>{form.notes}</div>
          </div>
        )}

        {/* Auto-create notice */}
        {!customerId && (
          <div style={styles.autoNotice}>
            <FaCheckCircle size={12} color="#059669" />
            <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>
              A Quotation & Invoice will be auto-created on save
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Main Form ─────────────────────────────────────────────────────────────────
export default function CustomerForm({ customer, allCustomers = [], onSave, onBack }) {
  const isEdit = Boolean(customer);
  const [form, setForm] = useState(() => buildFormFromCustomer(customer));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const toggleTag = useCallback((tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }, []);

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email address";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ""))) e.phone = "Enter a valid 10-digit number";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    const saved = {
      id: customer?.id ?? generateId(allCustomers),
      name: form.fullName.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      type: form.type,
      status: form.status,
      since: form.since,
      totalBilled: customer?.totalBilled ?? 0,
      notes: form.notes.trim(),
      tags: form.tags,
    };
    setTimeout(() => { setSaving(false); onSave(saved); }, 300);
  };

  const SectionHead = ({ icon, title }) => (
    <div style={styles.sectionHead}>
      <span style={styles.sectionIcon}>{icon}</span>
      <span style={styles.sectionTitle}>{title}</span>
    </div>
  );

  return (
    <>
      {/* Responsive layout rules — inline styles can't do media queries, so this
          handles the split-column -> stacked-column breakpoint. */}
      <style>{`
        .cf-split {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          width: 100%;
          flex-wrap: wrap;
        }
        .cf-form-side {
          flex: 1 1 320px;
          min-width: 280px;
          max-width: 620px;
        }
        .cf-preview-panel {
          width: 340px;
          flex: 0 1 340px;
          position: sticky;
          top: 20px;
          background-color: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border: 1.5px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 100px);
          overflow: hidden;
        }
        @media (max-width: 900px) {
          .cf-form-side { max-width: 100%; }
          .cf-preview-panel {
            width: 100%;
            flex: 1 1 100%;
            position: static;
            max-height: none;
          }
        }
        @media (max-width: 480px) {
          .cf-preview-panel .row.g-3 > div { flex: 0 0 100%; max-width: 100%; }
        }
      `}</style>

      <div className="cf-split">

        {/* ══ LEFT: Form ══════════════════════════════════════════════════ */}
        <div className="cf-form-side">

          {/* Top Bar */}
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <button
              onClick={onBack}
              className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
              style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#e2e8f0"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#f1f5f9"}
            >
              <FaArrowLeft size={12} /> Back
            </button>
            <h4 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.2rem" }}>
              {isEdit ? "Edit Customer" : "New Customer"}
            </h4>
            <div />
          </div>

          {/* Basic Info */}
          <div className="card border-0 mb-3 p-4" style={styles.card}>
            <SectionHead icon={<FaUser size={13} />} title="Basic Information" />
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Field label="Full Name" required icon={<FaUser size={11} />}>
                  <input type="text" name="fullName" value={form.fullName} onChange={handleChange}
                    placeholder="e.g. Arjun Mehta"
                    style={{ ...styles.input, ...(errors.fullName ? styles.inputError : {}) }} autoComplete="off" />
                  {errors.fullName && <div style={styles.errorMsg}>{errors.fullName}</div>}
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Company" icon={<FaBuilding size={11} />}>
                  <input type="text" name="company" value={form.company} onChange={handleChange}
                    placeholder="e.g. Mehta Enterprises" style={styles.input} autoComplete="off" />
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Email Address" required icon={<FaEnvelope size={11} />}>
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="client@example.com"
                    style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }} autoComplete="off" />
                  {errors.email && <div style={styles.errorMsg}>{errors.email}</div>}
                </Field>
              </div>
              <div className="col-12 col-md-6">
                <Field label="Phone Number" required icon={<FaPhone size={11} />}>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                    placeholder="9876543210"
                    style={{ ...styles.input, ...(errors.phone ? styles.inputError : {}) }}
                    autoComplete="off" maxLength={10} />
                  {errors.phone && <div style={styles.errorMsg}>{errors.phone}</div>}
                </Field>
              </div>
              <div className="col-12">
                <Field label="Address" icon={<FaMapMarkerAlt size={11} />}>
                  <input type="text" name="address" value={form.address} onChange={handleChange}
                    placeholder="Street, City, State, PIN" style={styles.input} autoComplete="off" />
                </Field>
              </div>
            </div>
          </div>

          {/* Status & Type */}
          <div className="card border-0 mb-3 p-4" style={styles.card}>
            <SectionHead icon={<FaCalendarAlt size={13} />} title="Status & Type" />
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <Field label="Type">
                  <select name="type" value={form.type} onChange={handleChange} style={styles.select}>
                    <option value="Business">Business</option>
                    <option value="Individual">Individual</option>
                    <option value="Government">Government</option>
                  </select>
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Status">
                  <select name="status" value={form.status} onChange={handleChange} style={styles.select}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Lead">Lead</option>
                  </select>
                </Field>
              </div>
              <div className="col-12 col-md-4">
                <Field label="Customer Since" icon={<FaCalendarAlt size={11} />}>
                  <input type="date" name="since" value={form.since} onChange={handleChange} style={styles.input} />
                </Field>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="card border-0 mb-3 p-4" style={styles.card}>
            <SectionHead icon={<FaTags size={13} />} title="Tags" />
            <div className="d-flex flex-wrap gap-2">
              {customerTags.map((tag) => {
                const active = form.tags.includes(tag);
                return (
                  <button key={tag} onClick={() => toggleTag(tag)}
                    className="border-0 rounded-pill fw-semibold"
                    style={{
                      padding: "6px 16px", fontSize: "0.78rem", cursor: "pointer", transition: "all 0.15s",
                      border: active ? "2px solid #f97316" : "1.5px solid #e2e8f0",
                      backgroundColor: active ? "#fff7ed" : "#f8fafc",
                      color: active ? "#ea580c" : "#64748b",
                      boxShadow: active ? "0 2px 8px rgba(249,115,22,0.2)" : "none",
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = "#f1f5f9"; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2" style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                {form.tags.length} tag{form.tags.length > 1 ? "s" : ""} selected
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="card border-0 mb-3 p-4" style={{ ...styles.card, backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
            <SectionHead icon={<FaStickyNote size={13} />} title="Notes" />
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={4}
              placeholder="Add any notes about this customer — preferences, follow-ups, special requirements…"
              style={{ ...styles.input, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, backgroundColor: "#fff" }} />
          </div>

          {/* Footer */}
          <div className="d-flex justify-content-end gap-3 mb-4 flex-wrap">
            <button onClick={onBack} className="border-0 rounded-3 fw-semibold px-4 py-2"
              style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#e2e8f0"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#f1f5f9"}
            >
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-4 py-2"
              style={{
                background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff",
                cursor: saving ? "not-allowed" : "pointer", fontSize: "0.85rem",
                boxShadow: "0 4px 12px rgba(249,115,22,0.3)",
              }}
            >
              <FaSave size={12} />
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Customer"}
            </button>
          </div>
        </div>

        {/* ══ RIGHT: Preview ══  */}
        <CustomerPreview form={form} customerId={customer?.id} />

      </div>
    </>
  );
}

// ── Styles ──
const styles = {
  previewHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 16px",
    borderBottom: "1px solid #f1f5f9",
    backgroundColor: "#fafafa",
    borderRadius: "16px 16px 0 0",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#f97316,#ea580c)",
    color: "#fff",
    fontWeight: 700,
    fontSize: "1.4rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
    boxShadow: "0 4px 12px rgba(249,115,22,0.3)",
  },
  infoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid #f1f5f9",
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "0.78rem",
  },
  infoIcon: { color: "#94a3b8", width: 16, flexShrink: 0 },
  infoLabel: { color: "#94a3b8", width: 60, flexShrink: 0 },
  infoValue: { color: "#0f172a", fontWeight: 500, flex: 1, wordBreak: "break-all" },
  tagChip: {
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: "0.7rem",
    fontWeight: 600,
    backgroundColor: "#fff7ed",
    color: "#ea580c",
    border: "1px solid #fed7aa",
  },
  autoNotice: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    padding: "10px 12px",
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    border: "1px solid #a7f3d0",
  },
  card: {
    borderRadius: "16px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  },
  sectionHead: {
    display: "flex", alignItems: "center", gap: 8,
    marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #f1f5f9",
  },
  sectionIcon: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: 8,
    background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff",
  },
  sectionTitle: { fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" },
  label: {
    display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em",
  },
  input: {
    width: "100%", boxSizing: "border-box", padding: "10px 12px",
    border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: "0.88rem",
    color: "#0f172a", outline: "none", backgroundColor: "#fff", transition: "border-color 0.15s",
  },
  inputError: { borderColor: "#fca5a5", backgroundColor: "#fef2f2" },
  select: {
    width: "100%", boxSizing: "border-box", padding: "10px 12px",
    border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: "0.88rem",
    color: "#0f172a", outline: "none", backgroundColor: "#fff", cursor: "pointer", appearance: "auto",
  },
  errorMsg: { marginTop: 4, fontSize: "0.75rem", color: "#ef4444", fontWeight: 500 },
};