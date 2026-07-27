import { useState, useEffect, useRef } from "react";
import {
  FaArrowLeft, FaPrint, FaEdit, FaSave, FaTimes, FaPlus, FaTrash, FaCheck,
} from "react-icons/fa";
import { FiMapPin, FiPhone, FiMail, FiUser } from "react-icons/fi";

/* ── Design tokens: navy headings, orange accent, thin borders, Inter ── */
const T = {
  navy: "#0F172A",
  slate: "#334155",
  muted: "#64748B",
  faint: "#94A3B8",
  border: "#E5E7EB",
  bgSoft: "#F8FAFC",
  white: "#FFFFFF",
  orange: "#F97316",
  green: "#16A34A",
  greenSoft: "#F0FDF4",
  amber: "#D97706",
  amberSoft: "#FFFBEB",
  red: "#DC2626",
  redSoft: "#FEF2F2",
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ── Auto-saved quotation drafts (crash/navigate-away recovery) ─────────────
const QUOTE_DRAFT_PREFIX = "quotation_draft_";
function saveDraft(key, data, meta = {}) {
  if (!key) return;
  try {
    localStorage.setItem(`${QUOTE_DRAFT_PREFIX}${key}`, JSON.stringify({ ...data, lastEdited: Date.now(), ...meta }));
  } catch (err) { console.error("Failed to persist autosaved quotation draft:", err); }
}
function removeDraft(key) {
  if (!key) return;
  try { localStorage.removeItem(`${QUOTE_DRAFT_PREFIX}${key}`); }
  catch (err) { console.error("Failed to remove autosaved quotation draft:", err); }
}

const TERMS_TEMPLATES = [
  { label: "Standard", text: "50% advance payment required to begin work, balance due on delivery.\nDelivery timelines are estimates and may shift with scope changes.\nRevisions beyond the agreed scope will be billed separately.\nThis quotation is valid for 15 days from the date of issue." },
  { label: "Project-based", text: "This quotation is valid for 30 days from the date of issue.\nAny additional work outside the agreed scope will be charged separately.\n50% advance payment is required before project commencement.\nFinal deliverables handed over after full payment is received." },
  { label: "Retainer / Service", text: "This agreement covers services rendered on a monthly retainer basis.\nInvoices are due within 15 days of receipt.\nEither party may terminate this agreement with 30 days' written notice.\nUnused hours do not roll over to the following month." },
];

function shadeColor(hex, percent) {
  const h = (hex || "#f97316").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  let r = (num >> 16) + percent, g = ((num >> 8) & 0x00ff) + percent, b = (num & 0x0000ff) + percent;
  r = Math.max(Math.min(255, r), 0); g = Math.max(Math.min(255, g), 0); b = Math.max(Math.min(255, b), 0);
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function useIsMobile(breakpoint = 1100) {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= breakpoint : false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= breakpoint);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);
  return isMobile;
}

// ── Toggle switch (Live Preview) ────────────────────────────────────────
function ToggleSwitch({ checked, onChange, accent, label }) {
  return (
    <label className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
      <span onClick={() => onChange(!checked)} style={{ width: 42, height: 24, borderRadius: 999, position: "relative", backgroundColor: checked ? accent : "#cbd5e1", transition: "background-color 0.18s", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 20, height: 20, borderRadius: "50%", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.18s" }} />
      </span>
      {label && <span style={{ fontWeight: 600, fontSize: 14, color: T.slate }}>{label}</span>}
    </label>
  );
}

// ── Logo box ─────────────────────────────────────────────────────────────
function LogoBox({ form, editMode, accent, onUpload, onRemove }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
      <label htmlFor={editMode ? "qt-logo-upload" : undefined} style={{
        width: 88, height: 60, borderRadius: 10, border: `1.5px dashed ${form.logo ? "transparent" : `${accent}55`}`,
        backgroundColor: form.logo ? "transparent" : "#f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
        cursor: editMode ? "pointer" : "default",
      }}>
        {form.logo
          ? <img src={form.logo} alt="Company logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          : <span style={{ fontSize: 12, color: T.faint, fontWeight: 600 }}>{editMode ? "+ Logo" : "Logo"}</span>}
      </label>
      {editMode && <input id="qt-logo-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={onUpload} />}
      {editMode && form.logo && (
        <button onClick={onRemove} className="no-print border-0" style={{ background: "none", color: T.red, fontSize: 11, cursor: "pointer" }}>Remove</button>
      )}
    </div>
  );
}

// ── From / To cards ─────────────────────────────────────────────────────
function PartyCard({ heading, accent, editMode, compact, name, onNameChange, namePlaceholder, lines }) {
  const cardPad = compact ? "10px 12px" : "14px 16px";
  const lineGap = compact ? 3 : 5;
  const fontBase = compact ? "10.5px" : "13.5px";
  const cellInp = { border: `1px solid ${T.border}`, borderRadius: 6, padding: compact ? "3px 6px" : "6px 9px", fontSize: fontBase, width: "100%", outline: "none", backgroundColor: T.bgSoft, fontFamily: T.font };

  return (
    <div style={{ flex: "1 1 220px", minWidth: compact ? 150 : 220, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ backgroundColor: accent, color: "#fff", textAlign: "center", fontWeight: 700, padding: compact ? "5px 0" : "8px 0", fontSize: compact ? "10px" : "12.5px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {heading}
      </div>
      <div style={{ padding: cardPad, backgroundColor: "#fff" }}>
        {editMode ? (
          <input style={{ ...cellInp, fontWeight: 700, fontSize: compact ? "11px" : "14px", marginBottom: lineGap + 2 }} value={name ?? ""} placeholder={namePlaceholder} onChange={(e) => onNameChange(e.target.value)} />
        ) : (
          <div style={{ fontWeight: 700, fontSize: compact ? "11.5px" : "14.5px", color: T.navy, marginBottom: lineGap + 2 }}>{name || namePlaceholder}</div>
        )}
        {lines.map((ln, i) => (
          editMode ? (
            <input key={i} style={{ ...cellInp, marginBottom: lineGap }} value={ln.value ?? ""} placeholder={ln.placeholder} onChange={(e) => ln.onChange(e.target.value)} />
          ) : (
            ln.value && (
              <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: fontBase, color: T.slate, lineHeight: 1.6, marginBottom: lineGap, whiteSpace: "pre-line" }}>
                <span style={{ color: "#2563EB", marginTop: 2, flexShrink: 0, opacity: 0.85 }}>{ln.icon}</span>
                <span>{ln.value}</span>
              </div>
            )
          )
        ))}
      </div>
    </div>
  );
}

function PartyCards({ form, editMode, accent, updateField, compact }) {
  return (
    <div style={{ display: "flex", gap: compact ? 10 : 20, flexWrap: "wrap" }}>
      <PartyCard heading="From" accent={accent} editMode={editMode} compact={compact}
        name={form.issuerName} namePlaceholder="Your Company LLC" onNameChange={(v) => updateField("issuerName", v)}
        lines={[
          { icon: <FiMapPin size={12} />, value: form.issuerAddress, placeholder: "Company address", onChange: (v) => updateField("issuerAddress", v) },
          { icon: <FiPhone size={12} />, value: form.issuerPhone, placeholder: "Phone", onChange: (v) => updateField("issuerPhone", v) },
          { icon: <FiMail size={12} />, value: form.issuerEmail, placeholder: "Email", onChange: (v) => updateField("issuerEmail", v) },
          { icon: <FiUser size={12} />, value: form.issuerContact, placeholder: "Contact person", onChange: (v) => updateField("issuerContact", v) },
        ]}
      />
      <PartyCard heading="To" accent={accent} editMode={editMode} compact={compact}
        name={form.company} namePlaceholder="Client Company Name" onNameChange={(v) => updateField("company", v)}
        lines={[
          { icon: <FiMapPin size={12} />, value: form.clientAddress, placeholder: "Client address", onChange: (v) => updateField("clientAddress", v) },
          { icon: <FiPhone size={12} />, value: form.phone, placeholder: "Phone", onChange: (v) => updateField("phone", v) },
          { icon: <FiMail size={12} />, value: form.email, placeholder: "Email", onChange: (v) => updateField("email", v) },
          { icon: <FiUser size={12} />, value: form.name, placeholder: "Contact person", onChange: (v) => updateField("name", v) },
        ]}
      />
    </div>
  );
}

// ── Theme color picker ──────────────────────────────────────────────────
const THEME_COLORS = ["#F97316", "#2563EB", "#16A34A", "#DC2626", "#0F172A", "#8b5cf6", "#14b8a6", "#ec4899", "#6366f1", "#92400e", "#84cc16", "#06b6d4", "#f59e0b", "#f43f5e"];

function ThemeColorPicker({ accent, onChange }) {
  const isActive = (c) => c.toLowerCase() === (accent || "").toLowerCase();
  return (
    <div className="no-print" style={{ backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: `1.5px solid #f1f5f9`, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Theme Color</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {THEME_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} title={c} style={{
            width: 30, height: 30, borderRadius: "50%", backgroundColor: c, border: "none",
            boxShadow: isActive(c) ? `0 0 0 2.5px #fff, 0 0 0 4.5px ${c}` : "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0,
          }}>
            {isActive(c) && <FaCheck color="#fff" size={11} />}
          </button>
        ))}
        <label title="Custom color" style={{
          width: 30, height: 30, borderRadius: "50%", cursor: "pointer", position: "relative", flexShrink: 0,
          background: "conic-gradient(from 180deg, #f97316, #eab308, #22c55e, #06b6d4, #6366f1, #ec4899, #f97316)",
          display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
        }}>
          <input type="color" value={accent || "#F97316"} onChange={(e) => onChange(e.target.value)} style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", border: "none" }} />
        </label>
      </div>
    </div>
  );
}

export default function QuotationDetail({
  quotation, companyInfo, isNew, editMode, isNewTemplate,
  onBack, onEdit, onSave, onCancelEdit,
}) {
  const [form, setForm] = useState({ ...quotation, customSections: quotation.customSections || [] });

  const draftKeyRef = useRef(
    !isNew && quotation.id ? quotation.id : quotation._draftId || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  );
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!isNew) return;
    setForm((prev) => ({
      ...prev,
      logo: prev.logo || companyInfo?.logo || null,
      issuerName: prev.issuerName || companyInfo?.companyName || "",
      issuerAddress: prev.issuerAddress || companyInfo?.companyAddress || "",
      issuerPhone: prev.issuerPhone || companyInfo?.companyPhone || "",
      issuerEmail: prev.issuerEmail || companyInfo?.companyEmail || "",
    }));
  }, [companyInfo, isNew]);

  useEffect(() => {
    if (!editMode || !dirtyRef.current) return;
    const timer = setTimeout(() => {
      saveDraft(draftKeyRef.current, { ...form, _draftId: draftKeyRef.current }, {
        label: form.company || form.name || form.projectTitle || "Untitled quotation",
        quotationId: quotation.id || null,
        isNewQuotation: isNew,
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [form, editMode]);

  const [showPreview, setShowPreview] = useState(true);
  const isMobile = useIsMobile(1100);
  const accent = form.accentColor || T.orange;
  const accentBg = form.accentBg || `linear-gradient(135deg, ${accent}, ${shadeColor(accent, -25)})`;
  const accentSoftBg = `${accent}0d`;
  const accentBorder = `${accent}55`;
  const issuerName = form.issuerName || companyInfo?.companyName || "Your Company";

  const updateField = (field, value) => { dirtyRef.current = true; setForm((prev) => ({ ...prev, [field]: value })); };

  const handleThemeColorChange = (color) => {
    dirtyRef.current = true;
    setForm((prev) => ({ ...prev, accentColor: color, accentBg: `linear-gradient(135deg, ${color}, ${shadeColor(color, -25)})` }));
  };

  const addCustomSection = () => { dirtyRef.current = true; setForm((prev) => ({ ...prev, customSections: [...prev.customSections, { heading: "", content: "" }] })); };
  const updateCustomSection = (i, field, value) => {
    dirtyRef.current = true;
    const sections = [...form.customSections];
    sections[i] = { ...sections[i], [field]: value };
    setForm((prev) => ({ ...prev, customSections: sections }));
  };
  const removeCustomSection = (i) => { dirtyRef.current = true; setForm((prev) => ({ ...prev, customSections: prev.customSections.filter((_, idx) => idx !== i) })); };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => updateField("logo", reader.result); reader.readAsDataURL(file); }
  };

  const handleSaveClick = () => {
    const { _draftId, ...cleanForm } = form;
    onSave(cleanForm);
    removeDraft(draftKeyRef.current);
  };
  const handleCancelClick = () => {
    removeDraft(draftKeyRef.current);
    setForm({ ...quotation, customSections: quotation.customSections || [] });
    onCancelEdit();
    onBack();
  };

  const inp = { border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 14, color: T.navy, width: "100%", outline: "none", backgroundColor: T.bgSoft, fontFamily: T.font, lineHeight: 1.75 };
  const headingInp = { ...inp, fontWeight: 700, fontSize: 15, color: T.navy, backgroundColor: accentSoftBg, border: `1px solid ${accentBorder}` };
  const sectionTitle = { fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 8, fontFamily: T.font };
  const sectionText = { fontSize: 13.5, color: T.slate, lineHeight: 1.85, fontFamily: T.font, margin: 0 };

  const printHeaderBlock = (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 10 }}>
        <LogoBox form={form} editMode={editMode} accent={accent} onUpload={handleLogoUpload} onRemove={() => updateField("logo", null)} />
        {editMode ? (
          <input value={form.issuerName || ""} onChange={(e) => updateField("issuerName", e.target.value)} placeholder="Your Company Name"
            style={{ ...inp, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: T.navy, maxWidth: 360, border: `1px solid ${accentBorder}`, backgroundColor: accentSoftBg }} />
        ) : (
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: T.navy }}>{form.issuerName || "Your Company Name"}</div>
        )}
      </div>

      <div style={{ textAlign: "center", fontSize: isMobile ? 28 : 36, fontWeight: 700, color: T.navy, letterSpacing: "-0.5px", marginBottom: 4 }}>QUOTATION</div>

      <div style={{ fontSize: 13, color: T.muted, marginTop: 4, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 16px" }}>
        <span>
          <strong style={{ color: T.navy }}>Quotation No:</strong>{" "}
          {editMode ? <input value={form.id} onChange={(e) => updateField("id", e.target.value)} style={{ ...inp, width: 130, display: "inline-block", fontSize: 13, padding: "3px 8px" }} /> : form.id}
        </span>
        <span>
          <strong style={{ color: T.navy }}>Status:</strong>{" "}
          {editMode ? (
            <select value={form.status} onChange={(e) => updateField("status", e.target.value)} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 6px", fontSize: 13, backgroundColor: T.bgSoft }}>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
            </select>
          ) : (
            <span style={{
              padding: "1px 9px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              backgroundColor: form.status === "Approved" ? T.greenSoft : form.status === "Pending" ? T.amberSoft : T.bgSoft,
              color: form.status === "Approved" ? T.green : form.status === "Pending" ? T.amber : T.muted,
            }}>{form.status}</span>
          )}
        </span>
      </div>

      <div style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: accent, marginTop: 10 }}>
        {editMode
          ? <input value={form.projectTitle || ""} onChange={(e) => updateField("projectTitle", e.target.value)} style={{ ...inp, fontSize: 17, fontWeight: 700, color: accent, maxWidth: 340, textAlign: "center", margin: "0 auto" }} placeholder="Project / Quotation Title" />
          : form.projectTitle}
      </div>
    </div>
  );

  const docContent = (
    <div className="bg-white print-doc" style={{ borderRadius: 16, boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.04)", border: `1px solid ${T.border}`, padding: isMobile ? "24px 18px" : "48px 56px", fontFamily: T.font }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @media print {
          .qt-print-table { display: table; width: 100%; }
          .qt-print-header { display: table-header-group; }
          .qt-print-body { display: table-row-group; }
          .qt-avoid-break { page-break-inside: avoid; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="qt-print-table">
        <div className="qt-print-header">{printHeaderBlock}</div>

        <div className="qt-print-body">
          <div className="qt-avoid-break" style={{ marginBottom: 24 }}>
            <PartyCards form={form} editMode={editMode} accent={accent} updateField={updateField} />
          </div>

          <div className="qt-avoid-break" style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 10 : 32, marginBottom: 24, fontSize: 14, color: T.muted }}>
            <span>
              <strong style={{ color: T.navy }}>Issue Date: </strong>
              {editMode ? <input type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} style={{ ...inp, width: "auto", display: "inline-block" }} /> : form.date}
            </span>
          </div>

          <div className="qt-avoid-break" style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>Project Description</div>
            {editMode
              ? <textarea rows={4} value={form.description || `This proposal outlines the scope of work agreed upon between ${issuerName} and ${form.company || "the client"}.`} onChange={(e) => updateField("description", e.target.value)} style={{ ...inp, resize: "vertical" }} />
              : <div style={sectionText}>{form.description || `This proposal outlines the scope of work agreed upon between ${issuerName} and ${form.company || "the client"}.`}</div>}
          </div>

          {(editMode || form.scopeOfWork?.trim()) && (
            <div className="qt-avoid-break" style={{ marginBottom: 24 }}>
              <div style={sectionTitle}>Scope of Work</div>
              {editMode ? (
                <textarea rows={5} value={form.scopeOfWork || ""} onChange={(e) => updateField("scopeOfWork", e.target.value)} style={{ ...inp, resize: "vertical" }} />
              ) : (
                <div style={sectionText}>{form.scopeOfWork?.split("\n").filter((l) => l.trim()).map((line, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>)}</div>
              )}
            </div>
          )}

          {(editMode || form.deliverables?.trim()) && (
            <div className="qt-avoid-break" style={{ marginBottom: 24 }}>
              <div style={sectionTitle}>Deliverables</div>
              {editMode ? (
                <textarea rows={5} value={form.deliverables || ""} onChange={(e) => updateField("deliverables", e.target.value)} style={{ ...inp, resize: "vertical" }} placeholder="Enter deliverables..." />
              ) : (
                <div style={sectionText}>{form.deliverables?.split("\n").filter((l) => l.trim()).map((line, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>)}</div>
              )}
            </div>
          )}

          {(editMode || form.technologyUsed?.trim()) && (
            <div className="qt-avoid-break" style={{ marginBottom: 24 }}>
              <div style={sectionTitle}>Technology Used</div>
              {editMode ? (
                <textarea rows={5} value={form.technologyUsed || ""} onChange={(e) => updateField("technologyUsed", e.target.value)} style={{ ...inp, resize: "vertical" }} />
              ) : (
                <div style={sectionText}>{form.technologyUsed?.split("\n").filter((l) => l.trim()).map((line, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>)}</div>
              )}
            </div>
          )}

          {(editMode || form.projectCost?.trim()) && (
            <div className="qt-avoid-break" style={{ marginBottom: 24 }}>
              <div style={sectionTitle}>Project Cost</div>
              {editMode ? (
                <textarea rows={5} value={form.projectCost || ""} onChange={(e) => updateField("projectCost", e.target.value)} style={{ ...inp, resize: "vertical" }} placeholder={"One cost line per line, e.g.\nWebsite Development: ₹25,000\nGST (18%): ₹4,500\nTotal Project Cost: ₹29,500"} />
              ) : (
                <div style={sectionText}>{form.projectCost?.split("\n").filter((l) => l.trim()).map((line, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>)}</div>
              )}
            </div>
          )}

          {(editMode || form.timelineDesc?.trim()) && (
            <div className="qt-avoid-break" style={{ marginBottom: 24 }}>
              <div style={sectionTitle}>Project Timeline</div>
              {editMode ? (
                <textarea rows={5} value={form.timelineDesc || ""} onChange={(e) => updateField("timelineDesc", e.target.value)} style={{ ...inp, resize: "vertical" }} />
              ) : (
                <div style={sectionText}>{form.timelineDesc?.split("\n").filter((l) => l.trim()).map((line, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>)}</div>
              )}
            </div>
          )}

          {(editMode || form.terms?.trim()) && (
            <div className="qt-avoid-break" style={{ marginBottom: 24 }}>
              <div style={{ ...sectionTitle, marginBottom: 6 }}>Terms &amp; Conditions</div>
              {editMode && (
                <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {TERMS_TEMPLATES.map((tpl) => (
                    <button key={tpl.label} onClick={() => updateField("terms", tpl.text)} title={`Use "${tpl.label}" terms template`} style={{
                      border: form.terms === tpl.text ? `1.5px solid ${accent}` : `1px solid ${T.border}`, borderRadius: 20, padding: "4px 12px",
                      backgroundColor: form.terms === tpl.text ? accentSoftBg : "#fff", color: form.terms === tpl.text ? accent : T.muted,
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>
                      {tpl.label}
                    </button>
                  ))}
                </div>
              )}
              {editMode ? (
                <textarea rows={6} value={form.terms || ""} onChange={(e) => updateField("terms", e.target.value)} style={{ ...inp, resize: "vertical" }} placeholder="One term per line, or pick a template above... (leave empty to remove this section)" />
              ) : (
                <div style={sectionText}>{(form.terms || "").split("\n").filter((l) => l.trim()).map((line, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>)}</div>
              )}
            </div>
          )}

          {(form.notes || editMode) && (
            <div className="qt-avoid-break" style={{ marginBottom: 24, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <div style={sectionTitle}>Note:</div>
              {editMode
                ? <textarea rows={2} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} style={{ ...inp, resize: "vertical" }} placeholder="Additional notes..." />
                : <div style={sectionText}>{form.notes}</div>}
            </div>
          )}

          {form.customSections.map((sec, i) => (
            <div key={i} className="qt-avoid-break" style={{ marginBottom: 24, paddingTop: 16, borderTop: `1px solid ${T.border}`, position: "relative" }}>
              {editMode ? (
                <div style={{ display: "flex", alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row", gap: 8, marginBottom: 8 }}>
                  <input value={sec.heading} onChange={(e) => updateCustomSection(i, "heading", e.target.value)} placeholder="Section Heading (e.g. Payment Terms)" style={headingInp} />
                  <button onClick={() => removeCustomSection(i)} title="Remove this section" style={{
                    flexShrink: 0, width: isMobile ? "100%" : 30, height: 30, border: "none", borderRadius: 6,
                    backgroundColor: T.redSoft, color: T.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <FaTrash size={12} />
                  </button>
                </div>
              ) : (
                sec.heading && <div style={sectionTitle}>{sec.heading}</div>
              )}
              {editMode ? (
                <textarea rows={4} value={sec.content} onChange={(e) => updateCustomSection(i, "content", e.target.value)} placeholder="Type section content here..." style={{ ...inp, resize: "vertical" }} />
              ) : (
                <div style={sectionText}>{sec.content?.split("\n").filter((l) => l.trim()).map((line, j) => <div key={j} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span>•</span><span>{line}</span></div>)}</div>
              )}
            </div>
          ))}

          {editMode && (
            <div className="no-print" style={{ marginBottom: 24 }}>
              <button onClick={addCustomSection} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", border: `2px dashed ${accent}`, borderRadius: 10,
                backgroundColor: accentSoftBg, color: accent, fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%", justifyContent: "center",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${accent}20`; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = accentSoftBg; }}>
                <FaPlus size={12} /> Add Custom Section
              </button>
            </div>
          )}

          <div className="qt-avoid-break" style={{ borderTop: `1px solid ${T.border}`, paddingTop: 32, marginTop: 32 }}>
            <div style={{ display: "flex", gap: 24, flexWrap: "nowrap" }}>
              <div style={{ flex: "1 1 50%", minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.faint, marginBottom: 8 }}>Client Signature</div>
                <div style={{ height: 60, marginBottom: 8 }} />
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 6, fontSize: 14, color: T.slate, wordBreak: "break-word" }}>{form.name}</div>
              </div>

              <div style={{ flex: "1 1 50%", minWidth: 0, textAlign: "end" }}>
                <div style={{ fontSize: 13, color: T.faint, marginBottom: 8 }}>Authorized Signature</div>

                {editMode ? (
                  <div className={`d-flex flex-column gap-2 mb-2 ${isMobile ? "align-items-start" : "align-items-end"}`}>
                    <div style={{ width: isMobile ? "100%" : 180, maxWidth: 180, height: 60, border: `1px solid ${T.border}`, borderRadius: 8, backgroundColor: T.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {form.signature ? <img src={form.signature} alt="Signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 10.5, color: T.faint }}>No signature</span>}
                    </div>
                    <div className="d-flex gap-2">
                      <label htmlFor="qt-sig-upload" style={{ fontSize: 11.5, fontWeight: 600, color: accent, border: `1px solid ${accent}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                        {form.signature ? "Change" : "Upload Signature"}
                      </label>
                      <input id="qt-sig-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) { const reader = new FileReader(); reader.onloadend = () => updateField("signature", reader.result); reader.readAsDataURL(file); }
                      }} />
                      {form.signature && (
                        <button onClick={() => updateField("signature", null)} className="border-0 rounded-3 px-2 py-1" style={{ backgroundColor: T.redSoft, color: T.red, fontSize: 11, cursor: "pointer" }}>Remove</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ minHeight: 60, display: "flex", justifyContent: isMobile ? "flex-start" : "flex-end", alignItems: "center", marginBottom: 8 }}>
                    {form.signature ? <img src={form.signature} alt="Signature" style={{ maxHeight: 60, maxWidth: 180, objectFit: "contain" }} /> : <div style={{ width: 180, height: 52 }} />}
                  </div>
                )}

                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 6, fontSize: 14, color: T.slate, textAlign: isMobile ? "left" : "right", wordBreak: "break-word" }}>{issuerName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Live preview: mirrors every section of docContent in compact form ──
  const previewPanel = (
    <div style={isMobile ? { ...styles.previewPanel, width: "100%", position: "static", maxHeight: "80vh" } : styles.previewPanel}>
      <div style={styles.previewHeader}>
        <span style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>Live Preview</span>
        <span style={{ fontSize: 11, color: T.faint, marginLeft: "auto" }}>Updates as you type</span>
      </div>

      <div style={{ padding: 16, overflowY: "auto", flex: 1, backgroundColor: T.bgSoft }}>
        <div style={{ backgroundColor: "#fff", borderRadius: 10, padding: "18px 18px", fontFamily: T.font, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>

          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 10 }}>
            {form.issuerName || <span style={{ color: T.faint }}>Your Company Name</span>}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.navy, letterSpacing: "-0.3px" }}>QUOTATION</div>
              <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>
                Quotation No: {form.id} · <span style={{
                  padding: "1px 7px", borderRadius: 20, fontWeight: 600,
                  backgroundColor: form.status === "Approved" ? T.greenSoft : form.status === "Pending" ? T.amberSoft : T.bgSoft,
                  color: form.status === "Approved" ? T.green : form.status === "Pending" ? T.amber : T.muted,
                }}>{form.status}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginTop: 6 }}>
                {form.projectTitle || <span style={{ color: T.faint }}>Project / Quotation Title</span>}
              </div>
            </div>
            <div style={{ width: 52, height: 36, borderRadius: 6, flexShrink: 0, border: form.logo ? "none" : `1px dashed ${T.border}`, backgroundColor: form.logo ? "transparent" : T.bgSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {form.logo ? <img src={form.logo} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 9, color: T.faint }}>Logo</span>}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <PartyCards form={form} editMode={false} accent={accent} updateField={updateField} compact />
          </div>

          <div style={{ marginBottom: 12, fontSize: 10.5, color: T.muted, display: "flex", gap: 14 }}>
            <span><strong style={{ color: T.navy }}>Issue:</strong> {form.date}</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: T.navy, marginBottom: 4 }}>Project Description</div>
            <div style={{ fontSize: 11, color: T.slate, lineHeight: 1.6 }}>
              {form.description || `This proposal outlines the scope of work agreed upon between ${issuerName} and ${form.company || "the client"}.`}
            </div>
          </div>

          {form.scopeOfWork?.trim() && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: T.navy, marginBottom: 4 }}>Scope of Work</div>
              <div style={{ fontSize: 11, color: T.slate, lineHeight: 1.6 }}>{form.scopeOfWork.split("\n").filter((l) => l.trim()).map((line, i) => <div key={i}>• {line}</div>)}</div>
            </div>
          )}

          {form.deliverables?.trim() && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: T.navy, marginBottom: 4 }}>Deliverables</div>
              <div style={{ fontSize: 11, color: T.slate, lineHeight: 1.6 }}>{form.deliverables.split("\n").filter((l) => l.trim()).map((line, i) => <div key={i}>• {line}</div>)}</div>
            </div>
          )}

          {form.technologyUsed?.trim() && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: T.navy, marginBottom: 4 }}>Technology Used</div>
              <div style={{ fontSize: 11, color: T.slate, lineHeight: 1.6 }}>{form.technologyUsed.split("\n").filter((l) => l.trim()).map((line, i) => <div key={i}>• {line}</div>)}</div>
            </div>
          )}

          {form.projectCost?.trim() && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: T.navy, marginBottom: 4 }}>Project Cost</div>
              <div style={{ fontSize: 11, color: T.slate, lineHeight: 1.6 }}>{form.projectCost.split("\n").filter((l) => l.trim()).map((line, i) => <div key={i}>• {line}</div>)}</div>
            </div>
          )}

          {form.timelineDesc?.trim() && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: T.navy, marginBottom: 4 }}>Project Timeline</div>
              <div style={{ fontSize: 11, color: T.slate, lineHeight: 1.6 }}>{form.timelineDesc.split("\n").filter((l) => l.trim()).map((line, i) => <div key={i}>• {line}</div>)}</div>
            </div>
          )}

          {form.terms?.trim() && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: T.navy, marginBottom: 4 }}>Terms &amp; Conditions</div>
              <div style={{ fontSize: 11, color: T.slate, lineHeight: 1.6 }}>{form.terms.split("\n").filter((l) => l.trim()).map((line, i) => <div key={i}>• {line}</div>)}</div>
            </div>
          )}

          {form.notes && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: T.navy, marginBottom: 4 }}>Note:</div>
              <div style={{ fontSize: 11, color: T.slate, lineHeight: 1.6 }}>{form.notes}</div>
            </div>
          )}

          {form.customSections?.map((sec, i) => (sec.heading || sec.content ? (
            <div key={i} style={{ marginBottom: 12 }}>
              {sec.heading && <div style={{ fontWeight: 700, fontSize: 12, color: T.navy, marginBottom: 4 }}>{sec.heading}</div>}
              <div style={{ fontSize: 11, color: T.slate, lineHeight: 1.6 }}>{sec.content?.split("\n").filter((l) => l.trim()).map((line, j) => <div key={j}>• {line}</div>)}</div>
            </div>
          ) : null))}

          <div style={{ textAlign: "center", padding: 6, fontSize: 10, color: T.faint, fontStyle: "italic", borderTop: `1px solid ${T.border}`, marginTop: 10 }}>
            Live preview — actual document may paginate differently
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: T.font, ...(editMode ? (isMobile ? styles.splitContainerMobile : styles.splitContainer) : { maxWidth: 900 }) }}>

      <div style={editMode ? styles.formSide : {}}>
        <div className="d-flex justify-content-between align-items-center mb-4 no-print" style={{ flexWrap: "wrap", gap: 10 }}>
          <button onClick={onBack} className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
            style={{ backgroundColor: T.bgSoft, color: T.slate, cursor: "pointer", fontSize: 14 }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = T.bgSoft)}>
            <FaArrowLeft size={12} /> Back
          </button>

          <div className="d-flex align-items-center gap-3">
            {editMode && <ToggleSwitch checked={showPreview} onChange={setShowPreview} accent={accent} label="Live Preview" />}
            {!editMode && (
              <button onClick={onEdit} className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
                style={{ backgroundColor: T.bgSoft, color: T.slate, cursor: "pointer", fontSize: 14 }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accent; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = T.bgSoft; e.currentTarget.style.color = T.slate; }}>
                <FaEdit size={12} /> Edit
              </button>
            )}
          </div>
        </div>

        {editMode && <ThemeColorPicker accent={accent} onChange={handleThemeColorChange} />}

        {docContent}

        {editMode && (
          <div className="no-print mt-3 d-flex justify-content-end gap-2" style={{ flexWrap: "wrap" }}>
            <button onClick={handleCancelClick} className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2" style={{ backgroundColor: T.bgSoft, color: T.slate, cursor: "pointer", fontSize: 14 }}>
              <FaTimes size={12} /> Cancel
            </button>
            <button onClick={handleSaveClick} className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2" style={{ backgroundColor: T.green, color: "#fff", cursor: "pointer", fontSize: 14 }}>
              <FaSave size={12} /> Save
            </button>
          </div>
        )}

        {!editMode && (
          <div className="no-print mt-3 d-flex justify-content-end">
            <button onClick={() => window.print()} className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-4 py-2"
              style={{ background: accentBg, color: "#fff", cursor: "pointer", fontSize: 14, boxShadow: `0 4px 12px ${accent}4d` }}>
              <FaPrint size={12} /> Print / Download PDF
            </button>
          </div>
        )}
      </div>

      {editMode && showPreview && previewPanel}
    </div>
  );
}

const styles = {
  splitContainer: { display: "flex", gap: 24, alignItems: "flex-start", width: "100%" },
  splitContainerMobile: { display: "flex", flexDirection: "column", gap: 20, width: "100%" },
  formSide: { flex: "1 1 0", minWidth: 0, maxWidth: 900 },
  previewPanel: {
    width: 380, flexShrink: 0, position: "sticky", top: 24, backgroundColor: "#fff", borderRadius: 16,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1.5px solid #f1f5f9", display: "flex", flexDirection: "column",
    maxHeight: "calc(100vh - 48px)", overflow: "hidden",
  },
  previewHeader: { display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa", borderRadius: "16px 16px 0 0" },
};