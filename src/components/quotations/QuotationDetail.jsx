import { useState, useEffect, useRef } from "react";
import {
  FaArrowLeft, FaPrint, FaEdit, FaSave, FaTimes, FaPlus, FaTrash, FaCheck, FaThLarge, FaEye,
} from "react-icons/fa";
import { FiMapPin, FiPhone, FiMail, FiUser } from "react-icons/fi";
import DOMPurify from "dompurify";
import ClassicLayout from "./Classiclayout";
import CreativeLayout from "./Creativelayout";
import BoldLayout from "./Boldlayout";
import ModernLayout from "./Modernlayout";
import CorporateLayout from "./Corporatelayout";
import MinimalLayout from "./Minimallayout";
import { CompanySelectField, CostItemsTable, CustomerSelectField } from "./EditableField";
import { getCostItems, getCostLines, computeCostTotals, getGstMode } from "./quotationLayoutUtils";
import { templates } from "./QuotationTable";
import TinyMCEEditor from "./TinyMCEEditor";

function capitalizeWords(text) {
  const s = String(text || "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function logoStyle(shape, size) {
  if (shape === "circle") return { width: size, height: size, borderRadius: "50%", objectFit: "cover" };
  if (shape === "square") return { width: size, height: size, borderRadius: 8, objectFit: "contain" };
  return { height: size, width: "auto", maxWidth: size * 3, objectFit: "contain" }; // original
}

const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Miss", "Dr."];

const STYLE_LABELS = {
  classic: "Classic Formal",
  creative: "Warm Friendly",
  bold: "Bold Editorial",
  modern: "Dark Tech",
  corporate: "Corporate Blue",
  minimal: "Minimal",
};

const QUOTATION_LAYOUTS = {
  classic: ClassicLayout,
  creative: CreativeLayout,
  bold: BoldLayout,
  modern: ModernLayout,
  corporate: CorporateLayout,
  minimal: MinimalLayout,
};

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

// ── HTML helpers ────────────────────────────────────────────────────────
// Multi-line fields are now rich HTML. These helpers convert legacy plain
// text ("line1\nline2") into HTML, and detect whether a value is already
// HTML so we don't double-wrap it.
const HTML_RE = /<[a-z][\s\S]*>/i;
function isHtml(v) { return typeof v === "string" && HTML_RE.test(v); }
function plainTextToHtml(text) {
  if (!text) return "";
  return String(text)
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}
// Lines like "Item one\nItem two" become a bulleted list; paragraphs become <p>.
function linesToHtmlList(text) {
  if (!text) return "";
  const lines = String(text).split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  return `<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
}

// Normalizes the incoming `quotation` for the form: every rich-text field
// that arrives as plain text gets converted to HTML once, so TinyMCE always
// receives HTML.
function normalizeFormQuotation(quotation) {
  const initial = { ...quotation, customSections: quotation.customSections || [] };

  // Canonicalize GST mode the moment data enters the form, so a stale or
  // missing `gstMode` on the saved record (e.g. from before this field
  // existed, or a save that only persisted the old `includeGst` boolean)
  // doesn't cause the GST% selector to reappear after a reload.
  initial.gstMode = getGstMode(initial);
  initial.projectTitle = capitalizeWords(initial.projectTitle || "");

  const paraFields = ["terms", "description", "notes"];

  paraFields.forEach((f) => {
    if (initial[f] && !isHtml(initial[f])) initial[f] = plainTextToHtml(initial[f]);
  });

  const listFields = ["scopeOfWork", "deliverables", "timelineDesc"];
  listFields.forEach((f) => {
    if (initial[f] && !isHtml(initial[f])) initial[f] = linesToHtmlList(initial[f]);
  });

  initial.customSections = initial.customSections.map((s) => {
    const base = {
      ...s,
      heading: s.heading || s.title || "",
      content: s.type === "table"
        ? (s.content || "")
        : (s.content && !isHtml(s.content) ? plainTextToHtml(s.content) : (s.content || "")),
    };
    if (s.type !== "table") return base;

    const columns = Array.isArray(s.columns) ? s.columns : [];
    const rows = (Array.isArray(s.rows) ? s.rows : []).map((r) =>
      Array.isArray(r)
        ? r.map((c) => String(c ?? ""))
        : Object.values(r || {}).map((c) => String(c ?? ""))
    );
    return { ...base, columns, rows };
  });

  return initial;
}

const TERMS_TEMPLATES = [
  { label: "Standard", text: "50% advance payment required to begin work, balance due on delivery.\nDelivery timelines are estimates and may shift with scope changes.\nRevisions beyond the agreed scope will be billed separately.\nThis quotation is valid for 15 days from the date of issue." },
  { label: "Project-based", text: "This quotation is valid for 30 days from the date of issue.\nAny additional work outside the agreed scope will be charged separately.\n50% advance payment is required before project commencement.\nFinal deliverables handed over after full payment is received." },
  { label: "Retainer / Service", text: "This agreement covers services rendered on a monthly retainer basis.\nInvoices are due within 15 days of receipt.\nEither party may terminate this agreement with 30 days' written notice.\nUnused hours do not roll over to the following month." },
  {
    label: "Full Legal Agreement",
    text:
      `1. Parties
This Agreement is entered into between the Service Provider and the Client named in this quotation.

2. Project Scope
The Service Provider will design and develop the work as per the agreed project proposal. Any changes to the initial scope may incur additional charges and must be confirmed in writing by both parties.

3. Fees and Payment
The Client agrees to pay all fees as outlined in the approved quotation. Payments shall follow the schedule mentioned in the proposal. All charges are exclusive of applicable taxes, which will be added as required by law.

4. Intellectual Property & Source Code Access
The Client will have full rights to use the final deliverable as delivered. However, the source code and underlying development files will remain with the Service Provider and are not included as part of the project delivery, unless otherwise agreed in writing.

5. Usage Restrictions
The Client agrees to use the deliverables solely for lawful and intended purposes. Any misuse, including unethical, unauthorized, or illegal use, is strictly prohibited.

6. Confidentiality
Both parties agree to treat all shared information as confidential. The Service Provider will not disclose any business, strategic, or proprietary information shared by the Client without prior consent, unless required by law.

7. Warranty and Support
A one-year warranty period is provided from the date of delivery. During this time, any functional bugs or code issues identified will be resolved at no additional cost to the Client.

8. Termination
Either party may terminate this Agreement with written notice if the other party commits a material breach. Upon termination, the Client retains rights to the delivered work as-is. Future updates or support will not be included post-termination unless agreed separately.

9. Governing Law and Jurisdiction
This Agreement shall be governed by applicable local laws. Any disputes arising under this Agreement shall fall under the exclusive jurisdiction of the courts local to the Service Provider.

ACCEPTANCE OF TERMS
By confirming, the Client acknowledges that they have read, understood, and agree to be bound by these terms and conditions. The Client can confirm their acceptance by responding to this quotation.`
  },
  {
    label: "Simple Freelance",
    text:
      `Scope: Work will proceed strictly as described in this quotation. Anything outside this scope will be quoted separately.

Payment: 50% upfront, 50% on completion. Late payments beyond 7 days of the due date may incur a 2% monthly late fee.

Revisions: Up to 2 rounds of revisions are included. Additional revisions are billed at the standard hourly rate.

Ownership: Full ownership of final files transfers to the Client upon receipt of full payment.

Cancellation: If the Client cancels after work has begun, the advance payment is non-refundable and covers work completed to date.

Validity: This quotation is valid for 15 days from the date of issue.`
  },
];

const SCOPE_TEMPLATES = [
  {
    label: "Website Development",
    text: "Responsive Website Design\n5 Website Pages\nContact Form Integration\nMobile Optimization\nBasic SEO Setup",
  },
  {
    label: "App Development",
    text: "Cross-platform Mobile App (iOS & Android)\nUser Authentication\nAPI Integration\nPush Notifications\nApp Store Submission Support",
  },
  {
    label: "Digital Marketing",
    text: "Social Media Strategy & Management\nPaid Ad Campaigns (Google/Meta)\nMonthly Performance Reports\nContent Calendar Planning\nAudience Targeting & Optimization",
  },
  {
    label: "UI/UX Design",
    text: "User Research & Persona Mapping\nWireframes & Prototypes\nHigh-fidelity UI Design\nDesign System / Style Guide\nUsability Testing",
  },
  {
    label: "Branding & Identity",
    text: "Logo Design\nBrand Color Palette & Typography\nBrand Guidelines Document\nBusiness Card & Letterhead Design\nSocial Media Kit",
  },
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

function ToggleSwitch({ checked, onChange, accent, label }) {
  return (
    <label className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
      <span onClick={() => onChange(!checked)} style={{ width: 42, height: 24, borderRadius: 999, position: "relative", backgroundColor: checked ? accent : "#cbd5e1", transition: "background-color 0.18s", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 20, height: 20, borderRadius: "50%", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.18s" }} />
      </span>
      {label && <span style={{ fontWeight: 600, fontSize: 14, color: T.slate, display: "flex", alignItems: "center" }}>{label}</span>}
    </label>
  );
}

function LogoBox({ form, editMode, accent, onUpload, onRemove, onShapeChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
      <label htmlFor={editMode ? "qt-logo-upload" : undefined} style={{
        minWidth: form.logo ? 0 : 88, minHeight: form.logo ? 0 : 60,
        borderRadius: 10, border: form.logo ? "none" : `1.5px dashed ${accent}55`,
        backgroundColor: form.logo ? "transparent" : "#f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: editMode ? "pointer" : "default",
      }}>
        {form.logo
          ? <img src={form.logo} alt="Company logo" style={logoStyle(form.logoShape, 60)} />
          : <span style={{ fontSize: 12, color: T.faint, fontWeight: 600 }}>{editMode ? "+ Logo" : "Logo"}</span>}
      </label>
      {editMode && <input id="qt-logo-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={onUpload} />}
      {editMode && form.logo && (
        <>
          <select className="no-print" value={form.logoShape || "original"} onChange={(e) => onShapeChange(e.target.value)}
            style={{ fontSize: 11, border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 6px", cursor: "pointer" }}>
            <option value="original">Original</option>
            <option value="square">Square</option>
            <option value="circle">Circle</option>
          </select>
          <button onClick={onRemove} className="no-print border-0" style={{ background: "none", color: T.red, fontSize: 11, cursor: "pointer" }}>Remove</button>
        </>
      )}
    </div>
  );
}

function PartyCard({ heading, accent, editMode, compact, name, onNameChange, namePlaceholder, lines, useCompanySelect }) {
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
          useCompanySelect ? (
            <CompanySelectField
              value={name}
              onChange={onNameChange}
              placeholder={namePlaceholder}
              style={{ fontWeight: 700, fontSize: compact ? "11px" : "14px", marginBottom: lineGap + 2 }}
            />
          ) : (
            <input style={{ ...cellInp, fontWeight: 700, fontSize: compact ? "11px" : "14px", marginBottom: lineGap + 2 }} value={name ?? ""} placeholder={namePlaceholder} onChange={(e) => onNameChange(e.target.value)} />
          )
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

function ConfirmEditApprovedModal({ show, onCancel, onConfirm, accent = "#F97316" }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <div style={{
        backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        maxWidth: 400, width: "90%", padding: 32, textAlign: "center",
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%", background: `${accent}18`,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          fontSize: 26, color: accent,
        }}>
          ⚠️
        </div>
        <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 10 }}>Edit approved quotation?</h5>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
          This quotation has already been approved. Editing it will require client approval again.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={{
            border: "none", fontWeight: 600, padding: "10px 20px",
            backgroundColor: "#f1f5f9", color: "#475569", borderRadius: 10, cursor: "pointer", fontSize: 14,
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            border: "none", fontWeight: 600, padding: "10px 20px",
            backgroundColor: accent, color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 14,
          }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// true when the company text is empty or just repeats the contact name
const sameAsName = (company, name) =>
  !String(company || "").trim() ||
  String(company || "").trim().toLowerCase() === String(name || "").trim().toLowerCase();

export default function QuotationDetail({
  quotation, companyInfo, docSettings, customers = [], products = [], isNew, editMode, isNewTemplate,
  onBack, onEdit, onSave, onSend, onCancelEdit,
}) {
  const [form, setForm] = useState(() => normalizeFormQuotation(quotation));
  const [showApprovedEditConfirm, setShowApprovedEditConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState(null); // { icon, title, message, onOk? }
  const closeNotice = () => {
    const cb = notice?.onOk;
    setNotice(null);
    if (cb) setTimeout(cb, 100); // let the modal disappear first (needed for print)
  };

  const draftKeyRef = useRef(
    !isNew && quotation.id ? quotation.id : quotation._draftId || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  );
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!isNew) return;
    setForm((prev) => {
      const issuer = prev.issuerName || companyInfo?.companyName || "your company";
      return {
        ...prev,
        logo: prev.logo || companyInfo?.logo || null,
        issuerName: prev.issuerName || companyInfo?.companyName || "",
        issuerAddress: prev.issuerAddress || companyInfo?.companyAddress || "",
        issuerPhone: prev.issuerPhone || companyInfo?.companyPhone || "",
        issuerEmail: prev.issuerEmail || companyInfo?.companyEmail || "",
      };
    });
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

  // Keeps TinyMCE from jumping the page when edit mode opens. Only needed on the
  // default template (the only one that uses TinyMCE), and it stops as soon as
  // the user scrolls, clicks or touches the page.
  useEffect(() => {
    if (!editMode) return;
    if (form.templateStyle && form.templateStyle !== "default") return;

    const patchIframe = (win) => {
      try {
        if (!win || !win.HTMLElement || win.HTMLElement.prototype.__focusBlocked) return;
        win.HTMLElement.prototype.__focusBlocked = true;
        win.HTMLElement.prototype.focus = function () { }; // no-op inside this iframe
      } catch (e) { /* cross-origin, ignore */ }
    };

    const scanIframes = () => {
      document.querySelectorAll("iframe").forEach((f) => {
        try { patchIframe(f.contentWindow); } catch (e) { }
        f.addEventListener("load", () => { try { patchIframe(f.contentWindow); } catch (e) { } });
      });
    };

    const observer = new MutationObserver(scanIframes);
    observer.observe(document.body, { childList: true, subtree: true });
    scanIframes();

    // The app scrolls inside .main-content as well as the window
    const toTop = () => {
      const mainContent = document.querySelector(".main-content");
      if (mainContent) mainContent.scrollTop = 0;
      window.scrollTo(0, 0);
    };

    toTop();
    const timers = [300, 700, 1200, 2000].map((ms) => setTimeout(toTop, ms));

    const stop = setTimeout(() => observer.disconnect(), 4000);

    // the moment the user interacts, stop pulling the page back to the top
    const cancelAll = () => timers.forEach(clearTimeout);
    const events = ["wheel", "touchstart", "keydown", "mousedown"];
    events.forEach((ev) => window.addEventListener(ev, cancelAll, { passive: true, capture: true }));

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
      clearTimeout(stop);
      events.forEach((ev) => window.removeEventListener(ev, cancelAll, { capture: true }));
    };
  }, [editMode, form.templateStyle]);

  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateSwitcher, setShowTemplateSwitcher] = useState(
    typeof window !== "undefined" ? window.innerWidth > 1300 : false
  );
  const isMobile = useIsMobile(1100);
  const accent = form.accentColor || T.orange;
  const accentBg = form.accentBg || `linear-gradient(135deg, ${accent}, ${shadeColor(accent, -25)})`;
  const accentSoftBg = `${accent}0d`;
  const accentBorder = `${accent}55`;
  const issuerName = form.issuerName || companyInfo?.companyName || "Your Company";
  const defaultGstPercent = docSettings?.gstPercent ?? 18;
  const computeProjectCostFields = (state) => {
    const { total } = computeCostTotals(state, defaultGstPercent);
    return { amount: total };
  };

  const updateField = (field, value) => {
    dirtyRef.current = true;
    const CAP_FIELDS = ["name", "company", "projectTitle", "clientAddress", "issuerAddress"];
    if (CAP_FIELDS.includes(field) && typeof value === "string") {
      value = capitalizeWords(value);
    }
    setForm((prev) => {
      let next = { ...prev, [field]: value };

      // Legacy layouts (Classic/Creative/Bold/Modern/Corporate/Minimal) still use
      // the old boolean `includeGst` toggle via CostCalculatorBar. The newer
      // CostItemsTable / getCostLines / getGstMode logic reads the string
      // `gstMode` instead, and getGstMode() prefers `gstMode` when it's set.
      // Without this sync, switching the old toggle to "No GST" left a stale
      // `gstMode: "with"` in place, so GST kept being added to the total even
      // though the toggle showed off.
      if (field === "includeGst") {
        next = { ...next, gstMode: value ? "with" : "without" };
      }

      if (field === "includeGst" || field === "gstMode" || field === "gstPercent" || field === "costItems") {
        return { ...next, ...computeProjectCostFields(next) };
      }
      return next;
    });
  };

  const handleIssuerSelect = (name, company) => {
    dirtyRef.current = true;
    setForm((prev) => ({
      ...prev,
      issuerName: name,
      ...(company && {
        issuerAddress: company.companyAddress || "",
        issuerPhone: company.companyPhone || "",
        issuerEmail: company.companyEmail || "",
        issuerWebsite: company.website || "",
        logo: company.logo || null,
        logoShape: company.logoShape || "original",
      }),
    }));
  };
  const handleCustomerSelect = (cust) => {
    dirtyRef.current = true;
    setForm((prev) => ({
      ...prev,
      customerId: cust.id,
      company: sameAsName(cust.company, cust.name) ? "" : capitalizeWords(cust.company),
      name: capitalizeWords(cust.name || ""),
      phone: cust.phone || "",
      email: cust.email || "",
      clientAddress: cust.address || "",
    }));
  };

  // Typed a company that isn't a saved customer: keep it as free text
  const handleCustomerManualChange = (typedName) => {
    dirtyRef.current = true;
    setForm((prev) => ({ ...prev, customerId: null, company: capitalizeWords(typedName) }));
  };

  const handleThemeColorChange = (color) => {
    dirtyRef.current = true;
    setForm((prev) => ({ ...prev, accentColor: color, accentBg: `linear-gradient(135deg, ${color}, ${shadeColor(color, -25)})` }));
  };

  const handleTemplateSwitch = (tpl) => {
    dirtyRef.current = true;
    updateField("templateStyle", tpl?.templateStyle || "default");

    const scrollToTop = () => {
      const mainContent = document.querySelector(".main-content");
      if (mainContent) mainContent.scrollTop = 0;
      window.scrollTo(0, 0);
    };

    scrollToTop();
    requestAnimationFrame(scrollToTop);
  };

  const addCustomSection = () => { dirtyRef.current = true; setForm((prev) => ({ ...prev, customSections: [...prev.customSections, { heading: "", content: "" }] })); };
  const updateCustomSection = (i, field, value) => {
    dirtyRef.current = true;
    if (field === "heading" && typeof value === "string") value = capitalizeWords(value);
    const sections = [...form.customSections];
    sections[i] = { ...sections[i], [field]: value };
    setForm((prev) => ({ ...prev, customSections: sections }));
  };
  const updateCustomSectionTable = (i, updated) => {
    dirtyRef.current = true;
    const sections = [...form.customSections];
    sections[i] = { ...sections[i], ...updated };
    setForm((prev) => ({ ...prev, customSections: sections }));
  };
  const removeCustomSection = (i) => { dirtyRef.current = true; setForm((prev) => ({ ...prev, customSections: prev.customSections.filter((_, idx) => idx !== i) })); };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => updateField("logo", reader.result); reader.readAsDataURL(file); }
  };
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateField("signature", reader.result);
      reader.readAsDataURL(file);
    }
  };

  const stockProblem = () => {
    const rows = getCostItems(form);
    for (const it of rows) {
      if (!it.productId) continue;
      const p = products.find(x => x.id === it.productId);
      if (!p || p.type === "Service") continue;
      const total = rows
        .filter(x => x.productId === it.productId)
        .reduce((s, x) => s + (Number(x.qty) || 1), 0);
      if (total > (Number(p.stock_qty) || 0)) {
        return `Not enough stock for ${it.name}. Only ${p.stock_qty} available.`;
      }
    }
    return null;
  };

  const handleSaveClick = () => {
    const stockMsg = stockProblem();
    if (stockMsg) { window.alert(stockMsg); return; }
    const { _draftId, _isNewQuotation, ...cleanForm } = form;

    const wasApproved = !isNew && quotation.status === "Approved";

    let payload = { ...cleanForm, _isNewQuotation: isNew };

    if (wasApproved) {
      const previousVersion = {
        status: quotation.status,
        amount: quotation.amount,
        savedAt: new Date().toISOString(),
        snapshot: { ...quotation },
      };
      payload = {
        ...payload,
        status: "Sent",
        versionHistory: [...(quotation.versionHistory || []), previousVersion],
      };
    }

    onSave(payload);
    removeDraft(draftKeyRef.current);

    if (wasApproved) {
      setNotice({
        icon: "✅",
        title: "Quotation updated",
        message: "Since this quotation was previously approved, its status has been changed to Sent and requires approval again.",
      });
    }
  };
  const handleSendClick = async () => {
    const stockMsg = stockProblem();
    if (stockMsg) { setNotice({ icon: "⚠️", title: "Not enough stock", message: stockMsg }); return; }
    setIsSending(true);
    try {
      const { _draftId, _isNewQuotation, ...cleanForm } = form;
      await onSave({ ...cleanForm, _isNewQuotation: isNew, status: "Draft" });
      await onSend(form.id);
      removeDraft(draftKeyRef.current);
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelClick = () => {
    removeDraft(draftKeyRef.current);
    setForm(normalizeFormQuotation(quotation));
    onCancelEdit();
    onBack();
  };

  const inp = { border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 14, color: T.navy, width: "100%", outline: "none", backgroundColor: T.bgSoft, fontFamily: T.font, lineHeight: 1.75 };
  const headingInp = { ...inp, fontWeight: 700, fontSize: 15, color: T.navy, backgroundColor: accentSoftBg, border: `1px solid ${accentBorder}` };

  // Editable section headings, saved on the quotation as form.sectionHeadings
  const headingText = (key, fallback) => (form.sectionHeadings && form.sectionHeadings[key]) || fallback;
  const updateHeading = (key, value) => {
    dirtyRef.current = true;
    setForm((prev) => ({ ...prev, sectionHeadings: { ...(prev.sectionHeadings || {}), [key]: value } }));
  };
  // Called as a plain function (not a component) so the input keeps focus while typing
  const renderHeading = (key, fallback, isEditable, extraStyle = {}) =>
    isEditable ? (
      <input
        className="no-print"
        value={form.sectionHeadings?.[key] ?? fallback}
        onChange={(e) => updateHeading(key, e.target.value)}
        onBlur={(e) => { if (!e.target.value.trim()) updateHeading(key, fallback); }}
        placeholder={fallback}
        style={{ ...headingInp, maxWidth: 360, marginBottom: 8, ...extraStyle }}
      />
    ) : (
      <div className="qt-heading-avoid" style={{ ...sectionTitle, ...extraStyle }}>{headingText(key, fallback)}</div>
    );
  const sectionTitle = { fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 8, fontFamily: T.font };
  const sectionText = { fontSize: 13.5, color: T.slate, lineHeight: 1.85, fontFamily: T.font, margin: 0 };
  const cellStyle = { border: `1px solid ${T.border}`, padding: "10px 14px", verticalAlign: "top", fontSize: 13.5, color: T.slate };
  const cellLabel = { fontWeight: 700, color: T.navy };
  const cellInput = { border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 13, width: "100%", outline: "none", backgroundColor: T.bgSoft, fontFamily: T.font, marginTop: 4 };

  // Renders read-only HTML content safely.
  const RichView = ({ html, style }) => (
    <div
      className="quotation-rich-text"
      style={{ ...sectionText, ...style }}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html || "") }}
    />
  );

  const printBannerBlock = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
      flexWrap: "wrap",
      borderTop: `4px solid ${accent}`, borderBottom: `4px solid ${accent}`,
      padding: "8px 10px", marginBottom: 10,
    }}>
      <LogoBox form={form} editMode={editMode} accent={accent} onUpload={handleLogoUpload} onRemove={() => updateField("logo", null)} onShapeChange={(s) => updateField("logoShape", s)} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
        {editMode ? (
          <CompanySelectField
            value={form.issuerName}
            onChange={handleIssuerSelect}
            placeholder="Your Company Name"
            style={{ ...inp, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: T.navy, maxWidth: 360, border: `1px solid ${accentBorder}`, backgroundColor: accentSoftBg, textAlign: "center" }}
          />
        ) : (
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: T.navy, textAlign: "center" }}>{form.issuerName || "Your Company Name"}</div>
        )}
        {editMode ? (
          <input value={form.issuerAddress || ""} onChange={(e) => updateField("issuerAddress", e.target.value)} placeholder="Company address"
            style={{ ...inp, fontSize: 12.5, color: T.muted, maxWidth: 360, textAlign: "center" }} />
        ) : (
          form.issuerAddress && <div style={{ fontSize: 12.5, color: T.muted, textAlign: "center" }}>{form.issuerAddress}</div>
        )}
      </div>
    </div>
  );
  const printFooterBlock = (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", height: 6 }}>
        <div style={{ flex: 1, backgroundColor: accent }} />
        <div style={{ flex: 1, backgroundColor: shadeColor(accent, -40) }} />
      </div>
      <div style={{ textAlign: "center", fontSize: 11, color: T.slate, padding: "4px 0" }}>
        {editMode ? (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <input value={form.issuerWebsite || ""} onChange={(e) => updateField("issuerWebsite", e.target.value)} placeholder="Website" style={{ ...cellInput, width: 160, marginTop: 0 }} />
            <input value={form.issuerEmail || ""} onChange={(e) => updateField("issuerEmail", e.target.value)} placeholder="Email" style={{ ...cellInput, width: 200, marginTop: 0 }} />
            <input value={form.issuerPhone || ""} onChange={(e) => updateField("issuerPhone", e.target.value)} placeholder="Mob" style={{ ...cellInput, width: 160, marginTop: 0 }} />
          </div>
        ) : (
          <>
            {form.issuerWebsite && <>Web: {form.issuerWebsite}</>}
            {form.issuerWebsite && (form.issuerEmail || form.issuerPhone) && ",  "}
            {form.issuerEmail && <>Email: {form.issuerEmail}</>}
            {form.issuerEmail && form.issuerPhone && ",  "}
            {form.issuerPhone && <>Mob: {form.issuerPhone}</>}
          </>
        )}
      </div>
    </div>
  );

  const printHeaderBlock = (
    <div style={{ marginBottom: 18 }}>
      <table className="qt-party-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, tableLayout: "fixed" }}>
        <tbody>
          <tr>
            <td style={{ ...cellStyle, width: "50%" }}>
              <span style={cellLabel}>Quotation:</span>{" "}
              {form.quotationNumber
                ? form.quotationNumber
                : <span style={{ color: T.faint, fontStyle: "italic" }}>Draft — number assigned on send</span>}
            </td>
            <td style={{ ...cellStyle, width: "50%" }}>
              <span style={cellLabel}>Date:</span>{" "}
              {editMode ? <input type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} style={{ ...cellInput, display: "inline-block", width: "auto", marginTop: 0 }} /> : form.date}
            </td>
          </tr>
          <tr>
            <td style={cellStyle}>
              <div style={{ ...cellLabel, marginBottom: 4 }}>To:</div>
              {editMode ? (
                <>
                  <CustomerSelectField
                    customers={customers}
                    value={sameAsName(form.company, form.name) ? "" : form.company}
                    onSelect={handleCustomerSelect}
                    onManualChange={handleCustomerManualChange}
                    placeholder="Select or search customer"
                    style={{ ...cellInput, fontWeight: 700 }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      value={form.salutation || ""}
                      onChange={(e) => updateField("salutation", e.target.value)}
                      style={{ ...cellInput, width: 80, flexShrink: 0, cursor: "pointer" }}
                    >
                      <option value="">Title</option>
                      {SALUTATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input value={form.name || ""} onChange={(e) => updateField("name", e.target.value)} placeholder="Client contact name" style={{ ...cellInput, flex: 1, minWidth: 0 }} />
                  </div>
                  <input value={form.clientAddress || ""} onChange={(e) => updateField("clientAddress", e.target.value)} placeholder="Client address" style={cellInput} />
                  <input value={form.phone || ""} onChange={(e) => updateField("phone", e.target.value)} placeholder="Mob / Phone" style={cellInput} />
                  <input value={form.email || ""} onChange={(e) => updateField("email", e.target.value)} placeholder="Email" style={cellInput} />
                </>
              ) : (
                <>
                  {form.name && <div style={{ fontWeight: 600, color: T.navy }}>{[form.salutation, form.name].filter(Boolean).join(" ")}</div>}
                  {!sameAsName(form.company, form.name) && <div style={{ fontWeight: 600, color: T.navy }}>{form.company}</div>}
                  {form.clientAddress && <div><span style={{ fontWeight: 600, color: T.navy }}>Address:</span> {form.clientAddress}</div>}
                  {form.phone && <div><span style={{ fontWeight: 600, color: T.navy }}>Mob:</span> {form.phone}</div>}
                  {form.email && <div><span style={{ fontWeight: 600, color: T.navy }}>Email:</span> {form.email}</div>}
                </>
              )}
            </td>
            <td style={{ ...cellStyle, width: "50%" }}>
              <div style={{ ...cellLabel, marginBottom: 4 }}>From:</div>
              {editMode ? (
                <>
                  <CompanySelectField value={form.issuerName} onChange={handleIssuerSelect} placeholder="Your Company Name" style={cellInput} />
                  <input value={form.issuerAddress || ""} onChange={(e) => updateField("issuerAddress", e.target.value)} placeholder="Company address" style={cellInput} />
                  <input value={form.issuerPhone || ""} onChange={(e) => updateField("issuerPhone", e.target.value)} placeholder="Phone" style={cellInput} />
                  <input value={form.issuerEmail || ""} onChange={(e) => updateField("issuerEmail", e.target.value)} placeholder="Email" style={cellInput} />
                </>
              ) : (
                <>
                  {form.issuerName && <div style={{ fontWeight: 600, color: T.navy }}>{form.issuerName}</div>}
                  {form.issuerAddress && <div><span style={{ fontWeight: 600, color: T.navy }}>Address:</span> {form.issuerAddress}</div>}
                  {form.issuerPhone && <div><span style={{ fontWeight: 600, color: T.navy }}>Mob:</span> {form.issuerPhone}</div>}
                  {form.issuerEmail && <div><span style={{ fontWeight: 600, color: T.navy }}>Email:</span> {form.issuerEmail}</div>}
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 700, color: T.navy, letterSpacing: "-0.5px", marginBottom: 4 }}>QUOTATION</div>

      <div style={{ fontSize: 17, fontWeight: 700, color: accent }}>
        {editMode
          ? <input value={form.projectTitle || ""} onChange={(e) => updateField("projectTitle", e.target.value)} style={{ ...inp, fontSize: 17, fontWeight: 700, color: accent, maxWidth: 340 }} placeholder="Project / Quotation Title" />
          : form.projectTitle}
      </div>
    </div>
  );

  const renderDocContent = (isEditable) => (<div className="bg-white print-doc" style={{ borderRadius: 16, boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.04)", padding: isMobile ? "24px 18px" : "48px 56px", fontFamily: T.font, overflowAnchor: "none" }}>    <style>{`

  @media print {
    @page { size: A4; margin: 0; }
    html, body { margin: 0 !important; padding: 0 !important; }
    .print-doc { padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; font-size: 92% !important; }

    /* Margins that work even when the print dialog is set to "None".
       The empty thead/tfoot rows repeat on every page, so every page gets
       top and bottom space, and the tbody padding gives left and right space. */
    .qt-print-frame { width: 100%; border-collapse: collapse; }
    .qt-print-frame > thead > tr > td,
    .qt-print-frame > tfoot > tr > td { height: 12mm; padding: 0; border: none; }
    .qt-print-frame > thead { display: table-header-group !important; }
    .qt-print-frame > tfoot { display: table-footer-group !important; }
    .qt-print-frame > tbody > tr { break-inside: auto !important; page-break-inside: auto !important; }
    .qt-print-frame > tbody > tr > td { padding: 0 15mm !important; }


    .qt-heading-avoid { break-after: avoid; page-break-after: avoid; }
    .qt-sign-group { break-inside: avoid; page-break-inside: avoid; }
        .print-doc table thead { display: table-header-group; }
    .print-doc table tr { break-inside: avoid; page-break-inside: avoid; }
    .qt-print-body p,
    .qt-print-body li { break-inside: avoid; page-break-inside: avoid; }
  }
`}</style>
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @media print {
      .no-print { display: none !important; }
    }
    .quotation-rich-text p { margin: 0 0 8px; line-height: 1.85; }
    .quotation-rich-text ul,
    .quotation-rich-text ol { padding-left: 20px; margin: 0 0 8px; }
    .quotation-rich-text li { margin-bottom: 4px; }
    .quotation-rich-text strong { color: #0f172a; }
        .quotation-rich-text a { color: inherit; text-decoration: underline; }
   .qt-print-frame { table-layout: fixed; width: 100%; }
.qt-print-frame td { padding: 0; vertical-align: top; min-width: 0; }
.qt-print-body { min-width: 0; max-width: 100%; }
.qt-print-body input,
.qt-print-body select,
.qt-print-body textarea { max-width: 100%; box-sizing: border-box; }

@media screen and (max-width: 640px) {
  .qt-party-table, .qt-party-table tbody, .qt-party-table tr, .qt-party-table td {
    display: block; width: 100% !important; box-sizing: border-box;
  }
  .qt-party-table td + td { border-top: none !important; }
  .qt-print-body td, .qt-print-body th { overflow-wrap: anywhere; }

  /* signature row stacks */
  .qt-sign-row { flex-direction: column !important; gap: 20px !important; }
  .qt-sign-row > div { flex: none !important; width: 100% !important; text-align: left !important; }
  .qt-sign-row .d-flex { align-items: flex-start !important; }

  /* party/banner inputs never exceed the screen */
  .qt-print-body [style*="max-width: 360"] { max-width: 100% !important; }
}
  `}</style>

    <table className="qt-print-frame">
      <thead><tr><td /></tr></thead>
      <tbody><tr><td>
        <div className="qt-print-body">
          {printBannerBlock}
          {printHeaderBlock}

          {/* Project Description */}
          <div style={{ marginBottom: 18 }}>
            {renderHeading("description", "Project Description", isEditable)}

            {isEditable
              ? <TinyMCEEditor
                key={`qt-editor-description-${form.templateStyle}`}
                id="qt-editor-description"
                value={form.description || ""}
                onChange={(html) => updateField("description", html)}
                accent={accent}
                height={200}
                placeholder="Describe the project..."
              />
              : <RichView html={form.description || ""} />}
          </div>

          {/* Scope of Work */}
          {(isEditable || (form.scopeOfWork && form.scopeOfWork.trim())) && (
            <div style={{ marginBottom: 24 }}>
              {renderHeading("scopeOfWork", "Scope of Work", isEditable)}          {isEditable ? (
                <>
                  <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {SCOPE_TEMPLATES.map((tpl) => {
                      const tplHtml = linesToHtmlList(tpl.text);
                      return (
                        <button key={tpl.label} onClick={() => updateField("scopeOfWork", tplHtml)} title={`Use "${tpl.label}" scope template`} style={{
                          border: form.scopeOfWork === tplHtml ? `1.5px solid ${accent}` : `1px solid ${T.border}`, borderRadius: 20, padding: "4px 12px",
                          backgroundColor: form.scopeOfWork === tplHtml ? accentSoftBg : "#fff", color: form.scopeOfWork === tplHtml ? accent : T.muted,
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}>
                          {tpl.label}
                        </button>
                      );
                    })}
                    <button onClick={() => updateField("scopeOfWork", "")} title="Write your own custom scope" style={{
                      border: form.scopeOfWork === "" ? `1.5px dashed ${accent}` : `1px dashed ${T.border}`, borderRadius: 20, padding: "4px 12px",
                      backgroundColor: form.scopeOfWork === "" ? accentSoftBg : "#fff", color: form.scopeOfWork === "" ? accent : T.muted,
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>
                      + Custom
                    </button>
                  </div>
                  <TinyMCEEditor
                    key={`qt-editor-scope-${form.templateStyle}`}
                    id="qt-editor-scope"
                    value={form.scopeOfWork || ""}
                    onChange={(html) => updateField("scopeOfWork", html)}
                    accent={accent}
                    height={220}
                    placeholder="Add scope items (use the bullet list button), or pick a template above..."
                  />
                </>
              ) : (
                <RichView html={form.scopeOfWork} />
              )}
            </div>
          )}

          {/* Deliverables */}
          {(isEditable || (form.deliverables && form.deliverables.trim())) && (
            <div style={{ marginBottom: 24 }}>
              {renderHeading("deliverables", "Deliverables", isEditable)}          {isEditable ? (
                <TinyMCEEditor
                  id="qt-editor-deliverables"
                  value={form.deliverables || ""}
                  onChange={(html) => updateField("deliverables", html)}
                  accent={accent}
                  height={220}
                  placeholder="Add deliverables (use the bullet list button)..."
                />
              ) : (
                <RichView html={form.deliverables} />
              )}
            </div>
          )}

          {/* (Technology Used section removed) */}

          {/* Custom Sections */}
          {form.customSections.map((sec, i) => (
            <div key={i} style={{ marginBottom: 24, paddingTop: 16, borderTop: `1px solid ${T.border}`, position: "relative" }}>
              {isEditable ? (
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
                sec.heading && <div className="qt-heading-avoid" style={sectionTitle}>{sec.heading}</div>
              )}
              {isEditable ? (
                sec.type === "table" ? (
                  <EditableSectionTable
                    section={sec}
                    onChange={(updated) => updateCustomSectionTable(i, updated)}
                    accent={accent}
                  />
                ) : (
                  <TinyMCEEditor
                    key={`qt-editor-custom-${i}-${form.templateStyle}`}
                    id={`qt-editor-custom-${i}`}
                    value={sec.content || ""}
                    onChange={(html) => updateCustomSection(i, "content", html)}
                    accent={accent}
                    height={180}
                    placeholder="Type section content here..."
                  />
                )
              ) : sec.type === "table" ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {(sec.columns || []).map((col, ci) => (
                        <th key={ci} style={{ textAlign: "left", fontSize: 12, fontWeight: 700, color: "#fff", backgroundColor: accent, padding: "8px 12px", border: "none" }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(sec.rows || []).map((row, ri) => (
                      <tr key={ri}>
                        {(Array.isArray(row) ? row : Object.values(row || {})).map((cell, ci) => (
                          <td key={ci} style={{ ...cellStyle, border: "none", borderBottom: `1px solid ${T.border}` }}>{String(cell ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <RichView html={sec.content} />
              )}
            </div>
          ))}

          {isEditable && (
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

          {/* Project Cost */}
          {(isEditable || getCostItems(form).length > 0) && (
            <div style={{ marginBottom: 24 }}>
              {renderHeading("projectCost", "Project Cost", isEditable)}

              {isEditable ? (
                <CostItemsTable
                  items={getCostItems(form)}
                  products={products}
                  onChange={(items) => updateField("costItems", items)}
                  gstMode={form.gstMode || (form.includeGst === true ? "with" : "without")}
                  gstPercent={form.gstPercent}
                  defaultGstPercent={defaultGstPercent}
                  onGstChange={updateField}
                  accent={accent}
                />
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", fontSize: 12, fontWeight: 700, color: "#fff", backgroundColor: accent, padding: "8px 12px", border: "none" }}>
                        Description
                      </th>
                      <th style={{ textAlign: "center", width: 70, fontSize: 12, fontWeight: 700, color: "#fff", backgroundColor: accent, padding: "8px 12px", border: "none" }}>
                        Qty
                      </th>
                      <th style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: "#fff", backgroundColor: accent, padding: "8px 12px", border: "none" }}>
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(getCostLines(form, defaultGstPercent).rows || []).map((row, i) => (
                      <tr key={i}>
                        <td style={{ ...cellStyle, border: "none", borderBottom: `1px solid ${T.border}` }}>{row.label}</td>
                        <td style={{ ...cellStyle, border: "none", borderBottom: `1px solid ${T.border}`, textAlign: "center" }}>{row.qty}</td>
                        <td style={{ ...cellStyle, border: "none", borderBottom: `1px solid ${T.border}`, textAlign: "right" }}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                  {getCostLines(form, defaultGstPercent).grandLine && (() => {
                    const grandLine = getCostLines(form, defaultGstPercent).grandLine;
                    const [label, value] = grandLine.includes(":") ? grandLine.split(/:(.+)/).map((s) => s.trim()) : [grandLine, ""];
                    return (
                      <tfoot>
                        <tr>
                          <td colSpan={2} style={{ padding: "10px 12px", fontSize: 13.5, fontWeight: 700, color: T.navy, borderTop: `2px solid ${T.navy}` }}>{label}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13.5, fontWeight: 700, color: T.navy, borderTop: `2px solid ${T.navy}`, textAlign: "right" }}>{value}</td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              )}
            </div>
          )}

          {/* Project Timeline */}
          {(isEditable || (form.timelineDesc && form.timelineDesc.trim())) && (
            <div style={{ marginBottom: 24 }}>
              {renderHeading("timeline", "Project Timeline", isEditable)}
              {isEditable ? (
                <TinyMCEEditor
                  id="qt-editor-timeline"
                  value={form.timelineDesc || ""}
                  onChange={(html) => updateField("timelineDesc", html)}
                  accent={accent}
                  height={200}
                  placeholder="Describe the project timeline..."
                />
              ) : (
                <RichView html={form.timelineDesc} />
              )}
            </div>
          )}

          {/* Terms & Conditions */}
          {(isEditable || (form.terms && form.terms.trim())) && (
            <div style={{ marginBottom: 24 }}>
              {renderHeading("terms", "Terms & Conditions", isEditable, { marginBottom: 6 })}
              {isEditable && (
                <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {TERMS_TEMPLATES.map((tpl) => {
                    const tplHtml = plainTextToHtml(tpl.text);
                    return (
                      <button
                        key={tpl.label}
                        onClick={() => updateField("terms", tplHtml)}
                        title={`Use "${tpl.label}" terms template`}
                        style={{
                          border: form.terms === tplHtml ? `1.5px solid ${accent}` : `1px solid ${T.border}`,
                          borderRadius: 20, padding: "4px 12px",
                          backgroundColor: form.terms === tplHtml ? accentSoftBg : "#fff",
                          color: form.terms === tplHtml ? accent : T.muted,
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {tpl.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {isEditable ? (
                <TinyMCEEditor
                  id="qt-editor-terms"
                  value={form.terms || ""}
                  onChange={(html) => updateField("terms", html)}
                  accent={accent}
                  height={300}
                  placeholder="Add your terms & conditions here, or pick a template above..."
                />
              ) : (
                <RichView html={form.terms} />
              )}
            </div>
          )}

          {/* Note */}
          {(form.notes || isEditable) && (
            <div style={{ marginBottom: 24, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              {renderHeading("notes", "Note:", isEditable)}

              {isEditable ? (
                <TinyMCEEditor
                  id="qt-editor-notes"
                  value={form.notes || ""}
                  onChange={(html) => updateField("notes", html)}
                  accent={accent}
                  height={160}
                  placeholder="Additional notes..."
                />
              ) : (
                <RichView html={form.notes} />
              )}
            </div>
          )}

          {/* Signatures + footer, kept together on one page */}
          <div className="qt-sign-group">
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 16, marginBottom: 0 }}>
              <div className="qt-sign-row" style={{ display: "flex", gap: 24, flexWrap: "nowrap" }}>
                <div style={{ flex: "1 1 50%", minWidth: 0 }}>
                  <div style={{ height: 60, marginBottom: 8, display: "flex", alignItems: "flex-end" }} />
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, wordBreak: "break-word" }}>{[form.salutation, form.name].filter(Boolean).join(" ") || form.company}</div>
                    <div style={{ fontSize: 12.5, color: T.faint, marginTop: 2 }}>Client Signature</div>
                  </div>
                </div>

                <div style={{ flex: "1 1 50%", minWidth: 0, textAlign: "end" }}>
                  {isEditable ? (
                    <div className={`d-flex flex-column gap-2 mb-2 ${isMobile ? "align-items-start" : "align-items-end"}`}>
                      <div style={{ width: isMobile ? "100%" : 220, maxWidth: 220, height: 90, border: `1px solid ${T.border}`, borderRadius: 8, backgroundColor: T.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {form.signature ? (
                          <img
                            src={form.signature}
                            alt="Signature"
                            style={{
                              maxWidth: "92%",
                              maxHeight: "92%",
                              objectFit: "contain",
                              mixBlendMode: "multiply",
                            }}
                          />
                        ) : <span style={{ fontSize: 10.5, color: T.faint }}>No signature</span>}
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
                    <div style={{ height: 60, display: "flex", justifyContent: isMobile ? "flex-start" : "flex-end", alignItems: "flex-end", marginBottom: 8, overflow: "visible" }}>
                      {form.signature ? (
                        <img
                          src={form.signature}
                          alt="Signature"
                          style={{
                            maxHeight: 60,
                            maxWidth: 240,
                            objectFit: "contain",
                            mixBlendMode: "multiply",
                            transform: "rotate(-1.5deg)",
                            filter: "contrast(1.15)",
                          }}
                        />
                      ) : (
                        <div style={{ width: 180, height: 52 }} />
                      )}
                    </div>
                  )}

                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 6, textAlign: isMobile ? "left" : "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, wordBreak: "break-word" }}>{issuerName}</div>
                    <div style={{ fontSize: 12.5, color: T.faint, marginTop: 2 }}>Authorized Signature</div>
                  </div>
                </div>
              </div>
            </div>
            {printFooterBlock}
          </div>
        </div>
      </td></tr></tbody>
      <tfoot><tr><td /></tr></tfoot>
    </table>
  </div>
  );

  const isCustomTemplate = !form.templateStyle || form.templateStyle === "default";
  const tplCard = (active, color) => ({
    flex: isMobile ? "0 0 130px" : "none",
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", borderRadius: 10, cursor: "pointer",
    border: active ? `2px solid ${color}` : `1.5px solid ${T.border}`,
    backgroundColor: active ? `${color}12` : "#fff",
    transition: "all 0.15s",
  });

  const templatePanel = (
    <div
      className="no-print"
      style={isMobile
        ? { width: "100%", display: "flex", flexDirection: "column", gap: 8 }
        : {
          width: 190, flexShrink: 0, position: "sticky", top: 24,
          maxHeight: "calc(100vh - 48px)", overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 8,
          backgroundColor: "#fff", borderRadius: 16, padding: 12,
          border: "1.5px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: T.navy }}>Templates</span>
        <button onClick={() => setShowTemplateSwitcher(false)} aria-label="Hide templates"
          style={{ border: "none", background: "#f1f5f9", color: T.muted, width: 24, height: 24, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FaTimes size={10} />
        </button>
      </div>

      <div style={isMobile
        ? { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }
        : { display: "flex", flexDirection: "column", gap: 8 }}>
        {templates.map((tpl) => {
          const active = form.templateStyle === tpl.templateStyle;
          return (
            <div key={tpl.id} onClick={() => handleTemplateSwitch(tpl)} style={tplCard(active, tpl.color)}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: tpl.bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {tpl.icon}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.navy, flex: 1, lineHeight: 1.25 }}>
                {STYLE_LABELS[tpl.templateStyle] || tpl.title}
              </span>
              {active && <FaCheck size={10} color={tpl.color} />}
            </div>
          );
        })}

        <div onClick={() => handleTemplateSwitch(null)}
          style={{ ...tplCard(isCustomTemplate, T.green), border: isCustomTemplate ? `2px solid ${T.green}` : "1.5px dashed #cbd5e1" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f1f5f9", color: T.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FaPlus size={11} />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.navy, flex: 1, lineHeight: 1.25 }}>Customize Your Own</span>
          {isCustomTemplate && <FaCheck size={10} color={T.green} />}
        </div>
      </div>
    </div>
  );

  const docContent = renderDocContent(editMode);

  const activeDocument = (form.templateStyle === "default" || !form.templateStyle)
    ? renderDocContent(false)
    : (() => {
      const Layout = QUOTATION_LAYOUTS[form.templateStyle];
      return Layout ? (
        <Layout
          quotation={form}
          companyInfo={companyInfo}
          customers={customers}
          editMode={false}
          onChange={() => { }}
          onCustomSectionChange={() => { }}
          onAddCustomSection={() => { }}
          onRemoveCustomSection={() => { }}
          onLogoUpload={() => { }}
          onRemoveLogo={() => { }}
          onSignatureUpload={() => { }}
          onRemoveSignature={() => { }}
          defaultGstPercent={defaultGstPercent}
        />
      ) : docContent;
    })();

  const PREVIEW_SCALE = 0.42;

  const previewPanel = (
    <div style={isMobile ? { ...styles.previewPanel, width: "100%", position: "static", maxHeight: "80vh" } : styles.previewPanel}>
      <div style={styles.previewHeader}>
        <span style={{ fontWeight: 700, fontSize: 14, color: T.navy }}>Live Preview</span>
        <span style={{ fontSize: 11, color: T.faint, marginLeft: "auto" }}>Updates as you type</span>
      </div>

      <div style={{ padding: 16, overflowY: "auto", flex: 1, backgroundColor: T.bgSoft }}>
        <div style={{
          transform: `scale(${PREVIEW_SCALE})`,
          transformOrigin: "top left",
          width: `${100 / PREVIEW_SCALE}%`,
          pointerEvents: "none",
        }}>
          {activeDocument}
        </div>
        <div style={{ textAlign: "center", padding: "10px 6px 0", fontSize: 10, color: T.faint, fontStyle: "italic" }}>
          Live preview — actual document may paginate differently
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      fontFamily: T.font,
      ...(editMode ? (isMobile ? styles.splitContainerMobile : styles.splitContainer) : { maxWidth: 900 }),
      ...(isMobile ? { paddingBottom: 110 } : {}),
    }}>

      {editMode && showTemplateSwitcher && templatePanel}

      <style>{`
        @media screen and (max-width: 640px) {
          .qt-fluid { width: 100%; max-width: 100%; min-width: 0; overflow-x: hidden; }
          .qt-fluid div, .qt-fluid td, .qt-fluid th, .qt-fluid span { min-width: 0; }
          .qt-fluid input, .qt-fluid select, .qt-fluid textarea {
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .qt-fluid [style*="display: flex"] { flex-wrap: wrap; }
          .qt-fluid img { max-width: 100%; height: auto; }
        }
      `}</style>

      <style>{`
        /* Tighter line height for the 6 template layouts */
        [class^="qd-"] .info-lines div,
        [class^="qd-"] .info-col div { line-height: 1.35 !important; }

        [class^="qd-"] .meta-table td,
        [class^="qd-"] .block p,
        [class^="qd-"] .block ul,
        [class^="qd-"] .terms,
        [class^="qd-"] .terms ul,
        [class^="qd-"] .section-body,
        [class^="qd-"] .section-body p,
        [class^="qd-"] .quotation-rich-text { line-height: 1.5 !important; }

        [class^="qd-"] .block li,
        [class^="qd-"] .terms li { margin-bottom: 2px !important; }

        [class^="qd-"] input { line-height: 1.3 !important; }
        [class^="qd-"] textarea { line-height: 1.45 !important; }
      `}</style>
      <div className="qt-fluid" style={editMode ? (isMobile ? styles.formSideMobile : styles.formSide) : {}}>        <div className="d-flex align-items-center no-print"
        style={{
          flexWrap: "wrap", gap: 6, rowGap: 8,
          backgroundColor: "#fff",
          padding: "8px 12px",
          marginBottom: 8,
          borderBottom: `1px solid ${T.border}`,
        }}>
        <button onClick={onBack} title="Back" aria-label="Back"
          className="d-flex align-items-center justify-content-center border-0 rounded-3"
          style={{ backgroundColor: T.bgSoft, color: T.slate, cursor: "pointer", width: 30, height: 30, padding: 0, flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e2e8f0")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = T.bgSoft)}>
          <FaArrowLeft size={12} />
        </button>

        {!editMode && (
          <button
            onClick={() => {
              if (quotation.status === "Approved") {
                setShowApprovedEditConfirm(true);
                return;
              }
              onEdit();
            }}
            title="Edit" aria-label="Edit"
            className="d-flex align-items-center justify-content-center border-0 rounded-3"
            style={{ backgroundColor: T.bgSoft, color: T.slate, cursor: "pointer", width: 30, height: 30, padding: 0, flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accent; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = T.bgSoft; e.currentTarget.style.color = T.slate; }}>
            <FaEdit size={12} />
          </button>
        )}

        {editMode && (
          <button onClick={handleCancelClick} title="Cancel" aria-label="Cancel"
            className="d-flex align-items-center justify-content-center border-0 rounded-3"
            style={{ backgroundColor: T.bgSoft, color: T.slate, cursor: "pointer", width: 30, height: 30, padding: 0, flexShrink: 0 }}>
            <FaTimes size={12} />
          </button>
        )}

        {!editMode && (
          <button
            onClick={() => {
              const seenKey = "qt_print_tip_seen";
              if (!localStorage.getItem(seenKey)) {
                try { localStorage.setItem(seenKey, "1"); } catch (err) { console.error("Failed to save print tip flag:", err); }
                setNotice({
                  icon: "🖨️",
                  title: "For a clean PDF",
                  message: "In the print dialog, click 'More settings' and turn OFF 'Headers and footers'.\n\nThis removes the URL, date, and page numbers the browser normally adds.",
                  onOk: () => window.print(),
                });
                return;
              }
              window.print();
            }}
            title="In the print dialog, open 'More settings' and turn OFF 'Headers and footers' for a clean PDF"
            aria-label="Print / Download PDF"
            className="d-flex align-items-center justify-content-center border-0 rounded-3"
            style={{ background: accentBg, color: "#fff", cursor: "pointer", height: 30, padding: isMobile ? 0 : "0 14px", width: isMobile ? 34 : "auto", gap: 7, boxShadow: `0 4px 12px ${accent}4d`, flexShrink: 0, fontSize: 13, fontWeight: 600, fontFamily: T.font }}>
            <FaPrint size={12} /> {!isMobile && "Print"}
          </button>
        )}

        {editMode && (
          <button
            onClick={() => setShowTemplateSwitcher((v) => !v)}
            title="Templates" aria-label="Templates"
            className="d-flex align-items-center justify-content-center border-0 rounded-3"
            style={{
              backgroundColor: T.bgSoft, color: T.slate, cursor: "pointer",
              height: 30, padding: isMobile ? 0 : "0 12px", width: isMobile ? 30 : "auto",
              gap: 6, fontSize: 12.5, fontWeight: 600,
              fontFamily: T.font, flexShrink: 0, marginLeft: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accent; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = T.bgSoft; e.currentTarget.style.color = T.slate; }}
          >
            {isMobile ? <FaThLarge size={12} /> : (showTemplateSwitcher ? "Hide Templates" : "Templates")}
          </button>
        )}
        {editMode && (
          <div style={{ marginLeft: 4 }}>
            <ToggleSwitch checked={showPreview} onChange={setShowPreview} accent={accent} label={isMobile ? "" : "Live Preview"} />
          </div>
        )}

        {editMode && form.status === "Draft" && (
          <button onClick={handleSendClick} disabled={isSending} title="Send" aria-label="Send"
            className="d-flex align-items-center justify-content-center border-0 rounded-3"
            style={{ backgroundColor: T.orange, color: "#fff", cursor: "pointer", height: 30, padding: isMobile ? 0 : "0 16px", width: isMobile ? 34 : "auto", gap: 7, fontSize: 13, fontWeight: 600, fontFamily: T.font, flexShrink: 0, marginLeft: "auto" }}>
            <FaCheck size={12} /> {!isMobile && (isSending ? "Sending..." : "Send")}
          </button>
        )}

        {editMode && (
          <button onClick={handleSaveClick} title="Save" aria-label="Save"
            className="d-flex align-items-center justify-content-center border-0 rounded-3"
            style={{ backgroundColor: T.green, color: "#fff", cursor: "pointer", height: 30, padding: isMobile ? 0 : "0 16px", width: isMobile ? 34 : "auto", gap: 7, fontSize: 13, fontWeight: 600, fontFamily: T.font, flexShrink: 0, marginLeft: form.status === "Draft" ? 8 : "auto" }}>
            <FaSave size={12} /> {!isMobile && "Save"}
          </button>
        )}
      </div>

        {(form.templateStyle === "default" || !form.templateStyle) ? docContent : (() => {
          const Layout = QUOTATION_LAYOUTS[form.templateStyle];
          return Layout ? (
            <Layout
              quotation={form}
              companyInfo={companyInfo}
              customers={customers}
              products={products}
              editMode={editMode}
              onChange={updateField}
              onCustomSectionChange={updateCustomSection}
              onAddCustomSection={addCustomSection}
              onRemoveCustomSection={removeCustomSection}
              onLogoUpload={handleLogoUpload}
              onRemoveLogo={() => updateField("logo", null)}
              onSignatureUpload={handleSignatureUpload}
              onRemoveSignature={() => updateField("signature", null)}
              defaultGstPercent={defaultGstPercent}
            />
          ) : docContent;
        })()}

        {/* Activity history: only when viewing a saved quotation */}
        {!editMode && !isNew && (
          <div
            className="no-print"
            style={{
              marginTop: 24, padding: "20px 24px", backgroundColor: "#fff",
              borderRadius: 16, border: `1px solid ${T.border}`,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: T.navy, marginBottom: 14 }}>Activity</div>

            {(form.activityLog || form.activity_log || []).length === 0 ? (
              <div style={{ fontSize: 13, color: T.faint }}>No activity yet.</div>
            ) : (
              <div style={{ borderLeft: `2px solid ${accent}33`, paddingLeft: 16 }}>
                {(form.activityLog || form.activity_log || []).map((a, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: 16 }}>
                    <span style={{
                      position: "absolute", left: -23, top: 4, width: 10, height: 10,
                      borderRadius: "50%", background: accent,
                    }} />
                    <div style={{ fontSize: 12, color: T.faint }}>
                      {new Date(a.date).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
                      })}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.navy }}>{a.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {editMode && showPreview && previewPanel}

      <NoticeModal notice={notice} onClose={closeNotice} accent={accent} />

      <ConfirmEditApprovedModal
        show={showApprovedEditConfirm}
        onCancel={() => setShowApprovedEditConfirm(false)}
        onConfirm={() => { setShowApprovedEditConfirm(false); onEdit(); }}
      />
    </div>
  );
}

function NoticeModal({ notice, onClose, accent = "#F97316" }) {
  if (!notice) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        backgroundColor: "rgba(15,23,42,0.5)", zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxWidth: 420, width: "90%", padding: 32, textAlign: "center",
        }}
      >
        <div style={{
          width: 60, height: 60, borderRadius: "50%", background: `${accent}18`,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          fontSize: 26, color: accent,
        }}>
          {notice.icon || "ℹ️"}
        </div>
        <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 10 }}>{notice.title}</h5>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 22, whiteSpace: "pre-line" }}>{notice.message}</p>
        <button
          autoFocus
          onClick={onClose}
          style={{
            border: "none", fontWeight: 600, padding: "10px 32px",
            backgroundColor: accent, color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 14,
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

function EditableSectionTable({ section, onChange, accent }) {
  const columns = section.columns && section.columns.length ? section.columns : ["Column 1", "Column 2"];
  const rows = (section.rows && section.rows.length ? section.rows : [columns.map(() => "")])
    .map((r) => (Array.isArray(r) ? r : Object.values(r || {})));

  const updateColumn = (ci, value) => {
    const next = [...columns];
    next[ci] = value;
    onChange({ ...section, columns: next });
  };
  const updateCell = (ri, ci, value) => {
    const next = rows.map((r) => [...r]);
    next[ri][ci] = value;
    onChange({ ...section, columns, rows: next });
  };
  const addRow = () => onChange({ ...section, columns, rows: [...rows, columns.map(() => "")] });
  const removeRow = (ri) => onChange({ ...section, columns, rows: rows.filter((_, idx) => idx !== ri) });
  const addColumn = () =>
    onChange({
      ...section,
      columns: [...columns, `Column ${columns.length + 1}`],
      rows: rows.map((r) => [...r, ""]),
    });
  const removeColumn = (ci) => {
    if (columns.length <= 1) return;
    onChange({
      ...section,
      columns: columns.filter((_, idx) => idx !== ci),
      rows: rows.map((r) => r.filter((_, idx) => idx !== ci)),
    });
  };

  const cellInputStyle = { width: "100%", border: "none", background: "transparent", fontSize: 12.5, padding: 4, fontFamily: T.font, outline: "none" };

  return (
    <div className="no-print" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((col, ci) => (
              <th key={ci} style={{ padding: 4, border: `1px solid ${T.border}`, backgroundColor: `${accent}0d`, position: "relative" }}>
                <input
                  value={col}
                  onChange={(e) => updateColumn(ci, e.target.value)}
                  placeholder={`Column ${ci + 1}`}
                  style={{ ...cellInputStyle, fontWeight: 700, paddingRight: 18 }}
                />
                {columns.length > 1 && (
                  <button
                    onClick={() => removeColumn(ci)}
                    title="Remove column"
                    style={{ position: "absolute", top: 4, right: 4, border: "none", background: "transparent", color: T.red, cursor: "pointer" }}
                  >
                    <FaTrash size={9} />
                  </button>
                )}
              </th>
            ))}
            <th style={{ width: 32, border: "none" }}>
              <button onClick={addColumn} title="Add column" style={{ border: "none", background: "transparent", color: accent, cursor: "pointer" }}>
                <FaPlus size={11} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {columns.map((_, ci) => (
                <td key={ci} style={{ padding: 4, border: `1px solid ${T.border}` }}>
                  <input value={row[ci] ?? ""} onChange={(e) => updateCell(ri, ci, e.target.value)} style={cellInputStyle} />
                </td>
              ))}
              <td style={{ border: "none", textAlign: "center" }}>
                <button onClick={() => removeRow(ri)} title="Remove row" style={{ border: "none", background: "transparent", color: T.red, cursor: "pointer" }}>
                  <FaTrash size={11} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={addRow}
        style={{
          marginTop: 8, display: "flex", alignItems: "center", gap: 6,
          border: `1.5px dashed ${accent}`, borderRadius: 8, padding: "6px 12px",
          backgroundColor: `${accent}0d`, color: accent, fontWeight: 600, fontSize: 12.5, cursor: "pointer",
        }}
      >
        <FaPlus size={10} /> Add Row
      </button>
    </div>
  );
}

const styles = {
  splitContainer: { display: "flex", gap: 24, alignItems: "flex-start", width: "100%" },
  splitContainerMobile: { display: "flex", flexDirection: "column", gap: 20, width: "100%" },
  formSide: { flex: "1 1 0", minWidth: 0, maxWidth: 900 },
  formSideMobile: { flex: "none", width: "100%", minWidth: 0, maxWidth: "100%" },
  previewPanel: {
    width: 380, flexShrink: 0, position: "sticky", top: 24, backgroundColor: "#fff", borderRadius: 16,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1.5px solid #f1f5f9", display: "flex", flexDirection: "column",
    maxHeight: "calc(100vh - 48px)", overflow: "hidden",
  },
  previewHeader: { display: "flex", alignItems: "center", gap: 8, padding: "14px 20px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa", borderRadius: "16px 16px 0 0" },
};