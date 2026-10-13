// src/components/customers/CustomerForm.jsx
import { useState, useCallback, useEffect, useRef } from "react";
import {
  FaChevronDown, FaCheck,
  FaArrowLeft, FaSave, FaUser, FaBuilding, FaEnvelope,
  FaPhone, FaMapMarkerAlt, FaStickyNote, FaTags,
  FaEye, FaCheckCircle, FaPlus, FaTimes,
  FaHeadset, FaToggleOn, FaToggleOff, FaCircle,
  FaHistory, FaGlobe, FaMobileAlt, FaPaintBrush,
  FaSearch, FaShoppingCart, FaTools, FaWhatsapp,
  FaIdCard, FaBoxes,
} from "react-icons/fa";
// (line deleted — tags are removed from this form)

const BRAND = "#1F6F5C";
const BRAND_DARK = "#175646";
const BRAND_SOFT = "#e8f3f0";
const BRAND_SOFT_BORDER = "#bfe0d6";

const phoneTypes = ["Mobile", "Work", "Home", "Other"];
const emailTypes = ["Personal", "Work", "Other"];
const addressTypes = ["Home", "Office", "Other"];
const customerTypeOptions = ["Business", "Individual", "Government", "Other"];

// Each known tag gets its own color + icon so the suggestion pills don't
// all look like the same flat gray chip. Unknown/custom tags fall back
// to a neutral style automatically (see tagStyleFor below).
const TAG_STYLES = {
  Web: { icon: FaGlobe, bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
  App: { icon: FaMobileAlt, bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  Design: { icon: FaPaintBrush, bg: "#fdf2f8", color: "#db2777", border: "#fbcfe8" },
  SEO: { icon: FaSearch, bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  "E-commerce": { icon: FaShoppingCart, bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  Maintenance: { icon: FaTools, bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
};
const tagStyleFor = (tag) => TAG_STYLES[tag] || { icon: FaTags, bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };

// ── Draft auto-save (localStorage) ──────────────────────────────────────────
// Keeps whatever the user has typed even if they forget to click Save and
// navigate away, close the tab, or refresh the page.
export const DRAFT_PREFIX = "cf_draft_";
const draftKeyFor = (customer, draftId) =>
  customer ? `${DRAFT_PREFIX}edit_${customer.id}` : `${DRAFT_PREFIX}new_${draftId}`;

export function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

let uid = 0;
const nextId = () => `row-${Date.now()}-${++uid}`;

// Capital after start, space, new line, dot or comma
// "arjun.mehta,chennai" -> "Arjun.Mehta,Chennai"
const titleCase = (s) => s.replace(/(?<=^|[\s.,])\S/g, (ch) => ch.toUpperCase());

// Address: same rule as titleCase
const addressCase = (s) => s.replace(/(?<=^|[\s.,])\S/g, (ch) => ch.toUpperCase());

// Notes: capital at the start and after . , ! ? and new lines
// "call him.he is busy" -> "Call him.He is busy"
const noteCase = (s) => s.replace(/(?<=^\s*|[.,!?\n]\s*)\S/g, (ch) => ch.toUpperCase());

const TITLE_FIELDS = ["fullName", "company"];

const EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com", "icloud.com"];

// "arjun@" or "arjun@g" -> ["arjun@gmail.com", ...]
const emailSuggestions = (value) => {
  if (!value.includes("@")) return [];
  const [local, partial = ""] = value.split("@");
  if (!local) return [];
  return EMAIL_DOMAINS.filter(d => d.startsWith(partial.toLowerCase())).map(d => `${local}@${d}`);
};

// ── Country codes for phone / WhatsApp numbers ──────────────────────────────
export const DEFAULT_CODE = "+91";

// iso = 2-letter code (Windows can't render flag emoji, so we show text)
export const COUNTRIES = [
  { iso: "IN", name: "India", code: "+91" },
  { iso: "US", name: "United States", code: "+1" },
  { iso: "CA", name: "Canada", code: "+1" },
  { iso: "GB", name: "United Kingdom", code: "+44" },
  { iso: "AE", name: "United Arab Emirates", code: "+971", alias: "uae dubai abu dhabi sharjah ajman" },
  { iso: "SA", name: "Saudi Arabia", code: "+966" },
  { iso: "QA", name: "Qatar", code: "+974" },
  { iso: "KW", name: "Kuwait", code: "+965" },
  { iso: "OM", name: "Oman", code: "+968" },
  { iso: "BH", name: "Bahrain", code: "+973" },
  { iso: "SG", name: "Singapore", code: "+65" },
  { iso: "MY", name: "Malaysia", code: "+60" },
  { iso: "LK", name: "Sri Lanka", code: "+94" },
  { iso: "NP", name: "Nepal", code: "+977" },
  { iso: "BD", name: "Bangladesh", code: "+880" },
  { iso: "PK", name: "Pakistan", code: "+92" },
  { iso: "AF", name: "Afghanistan", code: "+93" },
  { iso: "MV", name: "Maldives", code: "+960" },
  { iso: "AU", name: "Australia", code: "+61" },
  { iso: "NZ", name: "New Zealand", code: "+64" },
  { iso: "DE", name: "Germany", code: "+49" },
  { iso: "FR", name: "France", code: "+33" },
  { iso: "IT", name: "Italy", code: "+39" },
  { iso: "ES", name: "Spain", code: "+34" },
  { iso: "NL", name: "Netherlands", code: "+31" },
  { iso: "CH", name: "Switzerland", code: "+41" },
  { iso: "SE", name: "Sweden", code: "+46" },
  { iso: "IE", name: "Ireland", code: "+353" },
  { iso: "RU", name: "Russia", code: "+7" },
  { iso: "TR", name: "Turkey", code: "+90" },
  { iso: "CN", name: "China", code: "+86" },
  { iso: "JP", name: "Japan", code: "+81" },
  { iso: "KR", name: "South Korea", code: "+82" },
  { iso: "HK", name: "Hong Kong", code: "+852" },
  { iso: "TH", name: "Thailand", code: "+66" },
  { iso: "ID", name: "Indonesia", code: "+62" },
  { iso: "PH", name: "Philippines", code: "+63" },
  { iso: "VN", name: "Vietnam", code: "+84" },
  { iso: "ZA", name: "South Africa", code: "+27" },
  { iso: "NG", name: "Nigeria", code: "+234" },
  { iso: "KE", name: "Kenya", code: "+254" },
  { iso: "EG", name: "Egypt", code: "+20" },
  { iso: "BR", name: "Brazil", code: "+55" },
  { iso: "MX", name: "Mexico", code: "+52" },
];

// Display form: "+91 9940895128". Numbers already stored with a "+" are left alone.
export function formatPhone(code, value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (v.startsWith("+")) return v;
  return `${code || DEFAULT_CODE} ${v}`;
}

// Digits only, with country code, for tel: and wa.me links → "919940895128"
export function dialDigits(code, value) {
  const v = String(value || "").trim();
  if (v.startsWith("+")) return v.replace(/\D/g, "");
  return `${String(code || DEFAULT_CODE).replace(/\D/g, "")}${v.replace(/\D/g, "")}`;
}
// Splits a stored "+971 501234567" back into { code, value } for the form
export function splitPhone(stored, fallbackCode) {
  const s = String(stored || "").trim();
  const m = /^(\+\d{1,4})\s+(.+)$/.exec(s);
  if (m) return { code: m[1], value: m[2] };
  return { code: fallbackCode || DEFAULT_CODE, value: s };
}

// Searchable dropdown for choosing a country code
function CountryCodeSelect({ value, onChange, width = 104 }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const wrapRef = useRef(null);
  const current = value || DEFAULT_CODE;

  const applyCustom = () => {
    const d = customValue.replace(/\D/g, "");
    if (!d || d.length > 4) return;
    onChange(`+${d}`);
    setOpen(false);
    setQuery("");
    setCustomMode(false);
    setCustomValue("");
  };

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
        setCustomMode(false);
        setCustomValue("");
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const q = query.trim().toLowerCase();
  const list = COUNTRIES.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.code.includes(q) || c.iso.toLowerCase().includes(q) || (c.alias || "").includes(q)
  );

  // Typed digits (e.g. "855" or "+855") that aren't in the list → offer as a custom code
  const digits = query.replace(/\D/g, "");
  const customCode = digits && digits.length <= 4 && /^[+\d\s]+$/.test(query.trim()) ? `+${digits}` : "";
  const showCustom = Boolean(customCode) && !COUNTRIES.some((c) => c.code === customCode);
  const match = COUNTRIES.find((c) => c.code === current);

  return (
    <div ref={wrapRef} style={{ position: "relative", width, flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", boxSizing: "border-box", padding: "8px 10px",
          border: "1.5px solid #e2e8f0", borderRadius: 8, backgroundColor: "#fff",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
          fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", cursor: "pointer",
        }}
      >
        <span>
          {match && <span style={{ color: "#94a3b8", fontSize: "0.68rem", marginRight: 5 }}>{match.iso}</span>}
          {current}
        </span>
        <FaChevronDown size={9} color="#64748b" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 60, width: 270,
          background: "#fff", border: `1px solid ${BRAND_SOFT_BORDER}`, borderRadius: 12,
          boxShadow: "0 10px 28px rgba(15,23,42,0.16)", padding: 6,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginBottom: 6,
            backgroundColor: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8,
          }}>
            <FaSearch size={11} color="#94a3b8" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country, city or type a code"
              style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.82rem", width: "100%" }}
            />
          </div>
          {customMode ? (
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                autoFocus
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCustom(); } }}
                placeholder="e.g. +855"
                style={{
                  flex: 1, minWidth: 0, padding: "7px 10px", fontSize: "0.82rem", outline: "none",
                  border: `1.5px solid ${BRAND}`, borderRadius: 8,
                }}
              />
              <button
                type="button"
                onClick={applyCustom}
                style={{
                  border: "none", borderRadius: 8, padding: "0 14px", cursor: "pointer",
                  background: BRAND, color: "#fff", fontSize: "0.8rem", fontWeight: 700,
                }}
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: 6,
                padding: "8px 10px", border: `1.5px dashed ${BRAND}`, borderRadius: 8,
                background: BRAND_SOFT, color: BRAND_DARK, cursor: "pointer",
                fontSize: "0.83rem", fontWeight: 700, textAlign: "left",
              }}
            >
              <span style={{ fontSize: "1rem", lineHeight: 1 }}>+</span> Add custom code
            </button>
          )}

          <div style={{ maxHeight: 230, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            {showCustom && (
              <button
                type="button"
                onClick={() => { onChange(customCode); setOpen(false); setQuery(""); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  width: "100%", padding: "8px 10px", border: `1.5px dashed ${BRAND}`, borderRadius: 8,
                  background: BRAND_SOFT, cursor: "pointer", color: BRAND_DARK,
                  fontSize: "0.83rem", fontWeight: 700, textAlign: "left", marginBottom: 2,
                }}
              >
                <span>Use custom code</span>
                <span>{customCode}</span>
              </button>
            )}
            {list.length === 0 && !showCustom && (
              <div style={{ padding: "10px 12px", fontSize: "0.8rem", color: "#94a3b8" }}>
                No country found. Type a code like +855 to add it.
              </div>
            )}
            {list.map((c) => {
              const active = c.code === current && c.iso === (match?.iso ?? c.iso);
              return (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => { onChange(c.code); setOpen(false); setQuery(""); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    width: "100%", padding: "8px 10px", border: "none", borderRadius: 8,
                    background: active ? BRAND_SOFT : "transparent", cursor: "pointer",
                    color: active ? BRAND_DARK : "#0f172a", fontSize: "0.83rem", fontWeight: 600, textAlign: "left",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = BRAND_SOFT; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = active ? BRAND_SOFT : "transparent"; }}
                >
                  <span>{c.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b" }}>
                    {c.code}
                    {active && <FaCheck size={10} color={BRAND} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  fullName: "",
  company: "",
  emails: [{ id: nextId(), type: "Personal", value: "" }],
  phones: [{ id: nextId(), type: "Mobile", code: DEFAULT_CODE, value: "" }],
  whatsapps: [{ id: nextId(), type: "Mobile", code: DEFAULT_CODE, value: "" }],
  supportNumber: "",
  addresses: [{ id: nextId(), type: "Home", value: "" }],
  city: "",
  state: "",
  country: "India",
  gstNumber: "",
  customerType: "Business",
  status: "Active",
  tags: [],
  products: [],
  notes: [{ id: nextId(), text: "" }],
};

// Rebuilds phone/WhatsApp rows and restores the country code
const toPhoneRows = (list, single) => {
  const src = list?.length ? list : (single ? [{ type: "Mobile", value: single }] : []);
  const rows = src.map(x => {
    const { code, value } = splitPhone(x.value, x.code);
    return { id: nextId(), type: x.type ?? "Mobile", code, value };
  });
  return rows.length ? rows : [{ id: nextId(), type: "Mobile", code: DEFAULT_CODE, value: "" }];
};

function buildFormFromCustomer(c) {
  if (!c) return EMPTY_FORM;
  return {
    fullName: c.name ?? "",
    company: c.company ?? "",
    emails: c.emails?.length
      ? c.emails.map(e => ({ id: nextId(), type: e.type ?? "Personal", value: e.value ?? "" }))
      : [{ id: nextId(), type: "Personal", value: c.email ?? "" }],
    phones: toPhoneRows(c.phones, c.phone),
    supportNumber: c.supportNumber ?? "",
    whatsapps: toPhoneRows(c.whatsapps, c.whatsapp),
    addresses: c.addresses?.length
      ? c.addresses.map(a => ({ id: nextId(), type: a.type ?? "Home", value: a.value ?? "" }))
      : [{ id: nextId(), type: "Home", value: c.address ?? "" }],
    city: c.city ?? "",
    state: c.state ?? "",
    country: c.country ?? "India",
    gstNumber: c.gstNumber ?? "",
    customerType: c.customerType ?? c.type ?? "Business",
    status: c.status === "Lead" ? "Active" : (c.status ?? "Active"),
    tags: c.tags ?? [],
    products: Array.isArray(c.products) ? c.products : [],
    notes: c.notes
      ? (Array.isArray(c.notes) ? c.notes.map(t => ({ id: nextId(), text: t })) : [{ id: nextId(), text: c.notes }])
      : [{ id: nextId(), text: "" }],
  };
}

function generateId(allCustomers) {
  const max = allCustomers.reduce((m, c) => {
    if (!c.id || !c.id.startsWith("CUST-")) return m;
    const n = parseInt(c.id.slice(5), 10);
    if (Number.isNaN(n)) return m;
    return Math.max(m, n);
  }, 0);
  return `CUST-${String(max + 1).padStart(3, "0")}`;
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={styles.label}>
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// Dense divider-based section head (replaces the old boxy per-section cards)
function SectionRow({ icon, title, children, first }) {
  return (
    <div style={{ ...styles.sectionRow, ...(first ? { borderTop: "none", paddingTop: 4 } : {}) }}>
      <div style={styles.sectionRowHead}>
        <span style={styles.sectionIconSm}>{icon}</span>
        <span style={styles.sectionTitleSm}>{title}</span>
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

// ── Draft restore banner — shown when a leftover, unsaved draft is found ────
function DraftBanner({ draft, onRestore, onDiscard }) {
  if (!draft) return null;
  const who = draft.fullName || draft.company;
  return (
    <div style={styles.draftBanner}>
      <div className="d-flex align-items-center gap-2">
        <span style={styles.draftIcon}><FaHistory size={13} /></span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "#92400e" }}>
            Unsaved draft found
          </div>
          <div style={{ fontSize: "0.74rem", color: "#92400e" }}>
            {who ? `From "${who}" — ` : ""}saved {timeAgo(draft.savedAt)}. Restore it or start fresh.
          </div>
        </div>
      </div>
      <div className="d-flex gap-2 flex-shrink-0">
        <button onClick={onDiscard}
          className="border-0 fw-semibold px-3 py-2 rounded-3"
          style={{ backgroundColor: "#fff", color: "#92400e", border: "1.5px solid #fde68a", cursor: "pointer", fontSize: "0.78rem" }}>
          Discard
        </button>
        <button onClick={onRestore}
          className="border-0 fw-semibold px-3 py-2 rounded-3"
          style={{ backgroundColor: "#92400e", color: "#fff", cursor: "pointer", fontSize: "0.78rem" }}>
          Restore Draft
        </button>
      </div>
    </div>
  );
}


// ── Live Preview — document/table style ─────────────────────────────────────
function CustomerPreview({ form, customerId }) {
  const filledEmails = form.emails.filter(e => e.value.trim());
  const filledPhones = form.phones.filter(p => p.value.trim());
  const filledWhatsapps = form.whatsapps.filter(w => w.value.trim());
  const filledAddresses = form.addresses.filter(a => a.value.trim());
  const filledNotes = form.notes.filter(n => n.text.trim());

  const rows = [
    { label: "Full Name", value: form.fullName },
    { label: "Company", value: form.company },
    ...(filledEmails.length
      ? filledEmails.map(e => ({ label: `Email (${e.type})`, value: e.value }))
      : [{ label: "Email", value: "" }]),
    ...(filledPhones.length
      ? filledPhones.map(p => ({ label: `Phone (${p.type})`, value: formatPhone(p.code, p.value) }))
      : [{ label: "Phone", value: "" }]),
    ...(filledWhatsapps.length
      ? filledWhatsapps.map(w => ({ label: "WhatsApp", value: formatPhone(w.code, w.value) }))
      : [{ label: "WhatsApp", value: "" }]),
    ...(form.supportNumber ? [{ label: "Support Number", value: form.supportNumber }] : []),
    ...(filledAddresses.length
      ? filledAddresses.map(a => ({ label: `Address (${a.type})`, value: a.value }))
      : [{ label: "Address", value: "" }]),
    { label: "City", value: form.city },
    { label: "State", value: form.state },
    { label: "Country", value: form.country },
    { label: "Status", value: form.status },
  ];

  return (
    <div className="cf-preview-panel">
      <div style={styles.previewHeader}>
        <FaEye size={13} color={BRAND} />
        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>Live Preview</span>
        <span style={{ fontSize: "0.68rem", color: "#94a3b8", marginLeft: "auto" }}>Updates as you type</span>
      </div>

      <div style={{ padding: "18px", overflowY: "auto", flex: 1 }}>

        {/* Document heading, Quotebill-style */}
        <div style={styles.docHeading}>
          <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "#0f172a", letterSpacing: "0.01em" }}>
            CUSTOMER
          </div>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
            {customerId ? customerId : "New record"} · {form.status}
          </div>
        </div>

        {/* Document-style field table */}
        <div style={styles.docTable}>
          <div style={styles.docTableHead}>
            <span style={{ flex: "0 0 42%" }}>FIELD</span>
            <span style={{ flex: 1 }}>VALUE</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.label + i} style={{ ...styles.docTableRow, ...(i % 2 === 1 ? { backgroundColor: "#fafcfb" } : {}) }}>
              <span style={styles.docTableLabel}>{r.label}</span>
              <span style={styles.docTableValue}>
                {r.value || <span style={{ color: "#cbd5e1" }}>—</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Products */}
        {form.products.length > 0 && (
          <div style={styles.docBlock}>
            <div style={styles.docBlockLabel}>PRODUCTS & SERVICES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {form.products.map(p => (
                <div key={p.productId} style={{ fontSize: "0.78rem", color: "#0f172a" }}>
                  • {p.name} × {p.qty || 1} — ₹{Number(p.rate).toLocaleString("en-IN")}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes block */}
        {filledNotes.length > 0 && (
          <div style={{ ...styles.docBlock, backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 10 }}>
            <div style={{ ...styles.docBlockLabel, color: "#92400e" }}>NOTES ({filledNotes.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filledNotes.map(n => (
                <div key={n.id} style={{ fontSize: "0.78rem", color: "#78350f", lineHeight: 1.5, whiteSpace: "pre-line" }}>• {n.text}</div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


// ── Main Form ─────────────────────────────────────────────────────────────────
// `prefillProfile`: an optional saved Customer Profile (see
// CustomerProfilesSection) used to seed a brand-new customer's form when the
// user clicks "Use Profile". Ignored when `customer` (edit mode) is set.
export default function CustomerForm({ customer, allCustomers = [], onSave, onBack, draftId }) {
  const isEdit = Boolean(customer);
  const [instanceDraftId] = useState(() => draftId || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const draftKey = draftKeyFor(customer, instanceDraftId);

  const [form, setForm] = useState(() =>
    customer ? buildFormFromCustomer(customer) : EMPTY_FORM
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(
    () => typeof window === "undefined" || window.innerWidth > 900
  );
  const [tagInput, setTagInput] = useState("");

  // Products from the Products page (for the Products & Services section)
  const [productList, setProductList] = useState([]);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/products`)
      .then(r => r.json())
      .then(d => setProductList(Array.isArray(d) ? d : []))
      .catch(err => console.error("Failed to load products:", err));
  }, []);

  const addProduct = (pid) => {
    const p = productList.find(x => x.id === pid);
    if (!p || form.products.some(x => x.productId === pid)) return;
    setForm(f => ({
      ...f,
      products: [...f.products, {
        productId: p.id, name: p.name, type: p.type, unit: p.unit,
        rate: Number(p.sale_rate) || 0, gstType: p.gst_type, gstPercent: p.gst_percent, qty: 1,
      }],
    }));
  };
  const removeProduct = (pid) =>
    setForm(f => ({ ...f, products: f.products.filter(x => x.productId !== pid) }));
  const updateProductQty = (pid, qty) =>
    setForm(f => ({ ...f, products: f.products.map(x => x.productId === pid ? { ...x, qty } : x) }));
  const originalQty = (pid) =>
    Number(customer?.products?.find(x => x.productId === pid)?.qty) || 0;
  // Draft state: while `pendingDraft` is set, we're waiting on the user to
  // choose Restore/Discard, so autosave is paused (we don't want to silently
  // overwrite the very draft we're asking them about).
  const [pendingDraft, setPendingDraft] = useState(null);
  const [draftChecked, setDraftChecked] = useState(false);

  // On mount: look for a leftover draft for this exact form (new, or this
  // specific customer's edit) and surface it instead of applying it blindly.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.form) setPendingDraft(parsed);
      }
    } catch { }
    setDraftChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave — debounced write to localStorage on every change, once the
  // initial draft check is done and there's no pending restore/discard choice.
  useEffect(() => {
    if (!draftChecked || pendingDraft) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          form, savedAt: Date.now(), fullName: form.fullName, company: form.company,
        }));
      } catch { }
    }, 400);
    return () => clearTimeout(timer);
  }, [form, draftChecked, pendingDraft, draftKey]);

  const handleRestoreDraft = () => {
    if (pendingDraft?.form) setForm(pendingDraft.form);
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    try { localStorage.removeItem(draftKey); } catch { }
    setPendingDraft(null);
  };

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch { }
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    const next = TITLE_FIELDS.includes(name) ? titleCase(value) : value;
    setForm((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const addEmail = () => setForm(f => ({ ...f, emails: [...f.emails, { id: nextId(), type: "Personal", value: "" }] }));
  const removeEmail = (id) => setForm(f => ({ ...f, emails: f.emails.filter(e => e.id !== id) }));
  const updateEmail = (id, field, value) =>
    setForm(f => ({ ...f, emails: f.emails.map(e => e.id === id ? { ...e, [field]: value } : e) }));

  const addPhone = () => setForm(f => ({ ...f, phones: [...f.phones, { id: nextId(), type: "Mobile", code: DEFAULT_CODE, value: "" }] }));
  const removePhone = (id) => setForm(f => ({ ...f, phones: f.phones.filter(p => p.id !== id) }));

  const updatePhone = (id, field, value) =>
    setForm(f => ({ ...f, phones: f.phones.map(p => p.id === id ? { ...p, [field]: value } : p) }));

  const addWhatsapp = () => setForm(f => ({ ...f, whatsapps: [...f.whatsapps, { id: nextId(), type: "Mobile", code: DEFAULT_CODE, value: "" }] }));
  const removeWhatsapp = (id) => setForm(f => ({ ...f, whatsapps: f.whatsapps.filter(w => w.id !== id) }));
  const updateWhatsapp = (id, field, value) =>
    setForm(f => ({ ...f, whatsapps: f.whatsapps.map(w => w.id === id ? { ...w, [field]: value } : w) }));

  const addAddress = () => setForm(f => ({ ...f, addresses: [...f.addresses, { id: nextId(), type: "Home", value: "" }] }));
  const removeAddress = (id) => setForm(f => ({ ...f, addresses: f.addresses.filter(a => a.id !== id) }));
  const updateAddress = (id, field, value) =>
    setForm(f => ({ ...f, addresses: f.addresses.map(a => a.id === id ? { ...a, [field]: value } : a) }));

  const addNote = () => setForm(f => ({ ...f, notes: [...f.notes, { id: nextId(), text: "" }] }));
  const removeNote = (id) => setForm(f => ({ ...f, notes: f.notes.filter(n => n.id !== id) }));
  const updateNote = (id, text) =>
    setForm(f => ({ ...f, notes: f.notes.map(n => n.id === id ? { ...n, text } : n) }));

  const addTag = (raw) => {
    const tag = titleCase(raw.trim());
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }));
    }
    setTagInput("");
  };
  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    const badEmail = form.emails.find(em => em.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim()));
    if (badEmail) e.emails = "Enter a valid email address";
    const validNum = (v) => /^\d{6,15}$/.test(v.replace(/[\s-]/g, ""));
    const hasPhone = form.phones.some(p => p.value.trim());
    if (!hasPhone) e.phones = "At least one phone number is required";
    else {
      const badPhone = form.phones.find(p => p.value.trim() && !validNum(p.value));
      if (badPhone) e.phones = "Enter a valid phone number";
    }
    const badWa = form.whatsapps.find(w => w.value.trim() && !validNum(w.value));
    if (badWa) e.whatsapps = "Enter a valid WhatsApp number";
    const tooMany = form.products.find(p => {
      const live = productList.find(x => x.id === p.productId);
      if (!live || live.type === "Service") return false;
      return Number(p.qty) > Number(live.stock_qty) + originalQty(p.productId);
    });
    if (tooMany) e.products = `Not enough stock for ${tooMany.name}`;
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    const filledEmails = form.emails.filter(e => e.value.trim());
    const toStored = (rows) =>
      rows
        .filter(r => r.value.trim())
        .map(r => ({
          id: r.id,
          type: r.type,
          code: r.code || DEFAULT_CODE,
          value: formatPhone(r.code, r.value.trim()), // "+855 123456789"
        }));
    const filledPhones = toStored(form.phones);
    const filledWhatsapps = toStored(form.whatsapps);
    const filledAddresses = form.addresses.filter(a => a.value.trim());
    const filledNotes = form.notes.filter(n => n.text.trim());
    const saved = {
      id: customer?.id ?? generateId(allCustomers),
      isNew: !isEdit,
      name: form.fullName.trim(),
      company: form.company.trim(),
      email: filledEmails[0]?.value ?? "",
      emails: filledEmails,
      phone: filledPhones[0]?.value ?? "",
      phones: filledPhones,
      whatsapp: filledWhatsapps[0]?.value ?? "",
      whatsapps: filledWhatsapps,
      address: filledAddresses[0]?.value ?? "",
      addresses: filledAddresses,
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      gstNumber: form.gstNumber.trim(),
      customerType: form.customerType,
      status: form.status,
      type: form.customerType || customer?.type || "Business",
      since: customer?.since ?? new Date().toISOString().split("T")[0],
      totalBilled: customer?.totalBilled ?? 0,
      notes: filledNotes.map(n => n.text),
      tags: form.tags,
      products: form.products.map(p => ({ ...p, qty: Number(p.qty) || 1 })),
    };
    setTimeout(() => {
      setSaving(false);
      clearDraft(); // saved for real now — the safety-net draft is no longer needed
      onSave(saved);
    }, 300);
  };

  return (
    <>
      <style>{`
        .cf-split {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          width: 100%;
          flex-wrap: wrap;
        }
        /* Default (no preview): form takes the full width, capped so it
           doesn't stretch into an unreadably wide single column. */
        .cf-form-side {
          flex: 1 1 100%;
          min-width: 280px;
          max-width: 100%;
        }
        /* With preview on: form and preview panel share the row 50/50. */
        .cf-form-side.cf-half {
          flex: 1 1 0;
          max-width: calc(50% - 12px);
        }
        .cf-form-panel {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          padding: 8px 22px 22px;
        }
        .cf-preview-panel {
          flex: 1 1 0;
          max-width: calc(50% - 12px);
          width: 100%;
          position: sticky;
          top: 20px;
          background-color: #fff;
          border-radius: 14px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border: 1.5px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 100px);
          overflow: hidden;
        }
        @media (max-width: 900px) {
          .cf-form-side, .cf-form-side.cf-half { max-width: 100%; flex: 1 1 100%; }
          .cf-preview-panel {
            max-width: 100%;
            flex: 1 1 100%;
            position: static;
            max-height: none;
          }
        }
        @media (max-width: 640px) {
          .cf-split { gap: 14px; }
          .cf-form-side, .cf-form-side.cf-half { min-width: 0; }

          /* Row 1: Back + title.  Row 2: Preview toggle + Save, full width */
          .cf-topbar { gap: 10px !important; }
          .cf-title { flex: 1 1 auto; text-align: left; font-size: 1.05rem !important; }
          .cf-actions { width: 100%; flex-wrap: nowrap !important; }
          .cf-actions > button { flex: 1 1 0; justify-content: center; white-space: nowrap; }
          .cf-cancel-btn { display: none !important; } /* Back already does this */

          .cf-form-panel { padding: 4px 14px 16px; border-radius: 12px; }
          .cf-form-panel .d-flex > select { width: 92px !important; }
        }
      `}</style>

      <div className="cf-split">

        {/* ══ LEFT: Form ══ */}
        <div className={`cf-form-side${showPreview ? " cf-half" : ""}`}>
          {/* Top Bar — plain (no sticky bg bar) */}
          <div className="cf-topbar d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <button
              onClick={onBack}
              className="d-flex align-items-center gap-1 border-0 rounded-3 fw-semibold px-2 py-1"
              style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.75rem" }}
            >
              <FaArrowLeft size={10} /> Back
            </button>
            <h4 className="cf-title fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.2rem" }}>
              {isEdit ? "Edit Customer" : "New Customer"}
            </h4>
            <div className="cf-actions d-flex align-items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowPreview(s => !s)}
                className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
                style={{
                  backgroundColor: showPreview ? BRAND_SOFT : "#f1f5f9",
                  color: showPreview ? BRAND_DARK : "#64748b",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  border: showPreview ? `1px solid ${BRAND_SOFT_BORDER}` : "1px solid transparent",
                }}
              >
                {showPreview ? <FaToggleOn size={18} color={BRAND} /> : <FaToggleOff size={18} />}
                {showPreview ? "Preview On" : "Preview Off"}
              </button>

              <button onClick={onBack} className="cf-cancel-btn border-0 rounded-3 fw-semibold px-3 py-2"
                style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.82rem" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
                style={{
                  background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer", fontSize: "0.82rem",
                  boxShadow: `0 4px 12px ${BRAND}4d`,
                }}
              >
                <FaSave size={12} />
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Customer"}
              </button>
            </div>
            </div>

          {/* Draft recovery banner */}
          <DraftBanner draft={pendingDraft} onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />

          {/* Single dense panel — all sections live here, separated by hairlines */}
          <div className="cf-form-panel">

            <SectionRow icon={<FaUser size={12} />} title="Basic Information" first>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <Field label="Full Name" required>
                    <input type="text" name="fullName" value={form.fullName} onChange={handleChange}
                      placeholder="e.g. Arjun Mehta"
                      style={{ ...styles.input, ...(errors.fullName ? styles.inputError : {}) }} autoComplete="off" />
                    {errors.fullName && <div style={styles.errorMsg}>{errors.fullName}</div>}
                  </Field>
                </div>
                <div className="col-12 col-md-6">
                  <Field label="Company">
                    <input type="text" name="company" value={form.company} onChange={handleChange}
                      placeholder="e.g. Mehta Enterprises" style={styles.input} autoComplete="off" />
                  </Field>
                </div>
              </div>
            </SectionRow>

            <SectionRow icon={<FaEnvelope size={12} />} title="Email Addresses">
              <div className="d-flex flex-column gap-2">
                {form.emails.map((em) => (
                  <div key={em.id} className="d-flex align-items-center gap-2">
                    <select value={em.type} onChange={e => updateEmail(em.id, "type", e.target.value)}
                      style={{ ...styles.select, width: 110, flexShrink: 0 }}>
                      {emailTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="email" value={em.value} onChange={e => updateEmail(em.id, "value", e.target.value.toLowerCase())}
                      list={`email-list-${em.id}`}
                      placeholder="client@example.com"
                      style={{ ...styles.input, ...(errors.emails ? styles.inputError : {}) }} autoComplete="off" />
                    <datalist id={`email-list-${em.id}`}>
                      {emailSuggestions(em.value).map(s => <option key={s} value={s} />)}
                    </datalist>
                    {form.emails.length > 1 && (
                      <button onClick={() => removeEmail(em.id)}
                        className="border-0 bg-transparent d-flex align-items-center justify-content-center"
                        style={{ color: "#ef4444", cursor: "pointer", flexShrink: 0, width: 26, height: 26 }}>
                        <FaTimes size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.emails && <div style={styles.errorMsg}>{errors.emails}</div>}
              <button onClick={addEmail}
                className="d-flex align-items-center gap-2 border-0 fw-semibold mt-2"
                style={{ background: "none", color: BRAND, cursor: "pointer", fontSize: "0.78rem", padding: 0 }}>
                <FaPlus size={10} /> Add another email
              </button>
            </SectionRow>

            <SectionRow icon={<FaPhone size={12} />} title="Phone Numbers">
              <div className="d-flex flex-column gap-2">
                {form.phones.map((p) => (
                  <div key={p.id} className="d-flex align-items-center gap-2">
                    <CountryCodeSelect value={p.code} onChange={code => updatePhone(p.id, "code", code)} />
                    <input type="tel" value={p.value} onChange={e => updatePhone(p.id, "value", e.target.value)}
                      placeholder="9876543210" maxLength={15}
                      style={{ ...styles.input, ...(errors.phones ? styles.inputError : {}) }} autoComplete="off" />
                    {form.phones.length > 1 && (
                      <button onClick={() => removePhone(p.id)}
                        className="border-0 bg-transparent d-flex align-items-center justify-content-center"
                        style={{ color: "#ef4444", cursor: "pointer", flexShrink: 0, width: 26, height: 26 }}>
                        <FaTimes size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.phones && <div style={styles.errorMsg}>{errors.phones}</div>}
              <button onClick={addPhone}
                className="d-flex align-items-center gap-2 border-0 fw-semibold mt-2"
                style={{ background: "none", color: BRAND, cursor: "pointer", fontSize: "0.78rem", padding: 0 }}>
                <FaPlus size={10} /> Add another number
              </button>
            </SectionRow>

            <SectionRow icon={<FaWhatsapp size={12} />} title="WhatsApp Numbers">
              <div className="d-flex flex-column gap-2">
                {form.whatsapps.map((w) => (
                  <div key={w.id} className="d-flex align-items-center gap-2">
                    <CountryCodeSelect value={w.code} onChange={code => updateWhatsapp(w.id, "code", code)} />
                    <input type="tel" value={w.value} onChange={e => updateWhatsapp(w.id, "value", e.target.value)}
                      placeholder="9876543210" maxLength={15}
                      style={styles.input} autoComplete="off" />
                    {form.whatsapps.length > 1 && (
                      <button onClick={() => removeWhatsapp(w.id)}
                        className="border-0 bg-transparent d-flex align-items-center justify-content-center"
                        style={{ color: "#ef4444", cursor: "pointer", flexShrink: 0, width: 26, height: 26 }}>
                        <FaTimes size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.whatsapps && <div style={styles.errorMsg}>{errors.whatsapps}</div>}
              <button onClick={addWhatsapp}
                className="d-flex align-items-center gap-2 border-0 fw-semibold mt-2"
                style={{ background: "none", color: BRAND, cursor: "pointer", fontSize: "0.78rem", padding: 0 }}>
                <FaPlus size={10} /> Add another number
              </button>
            </SectionRow>

            <SectionRow icon={<FaHeadset size={12} />} title="Support Number">
              <div style={{ maxWidth: 320 }}>
                <input type="tel" value={form.supportNumber}
                  onChange={e => setForm(f => ({ ...f, supportNumber: e.target.value }))}
                  placeholder="1800-123-4567" style={styles.input} autoComplete="off" />
              </div>
            </SectionRow>

            <SectionRow icon={<FaMapMarkerAlt size={12} />} title="Addresses">
              <div className="d-flex flex-column gap-2">
                {form.addresses.map((a) => (
                  <div key={a.id} className="d-flex align-items-start gap-2">
                    <select value={a.type} onChange={e => updateAddress(a.id, "type", e.target.value)}
                      style={{ ...styles.select, width: 100, flexShrink: 0 }}>
                      {addressTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <textarea value={a.value} onChange={e => updateAddress(a.id, "value", addressCase(e.target.value))}
                      rows={2} placeholder="Street, area"
                      style={{ ...styles.input, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
                    {form.addresses.length > 1 && (
                      <button onClick={() => removeAddress(a.id)}
                        className="border-0 bg-transparent d-flex align-items-center justify-content-center"
                        style={{ color: "#ef4444", cursor: "pointer", flexShrink: 0, width: 26, height: 26 }}>
                        <FaTimes size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addAddress}
                className="d-flex align-items-center gap-2 border-0 fw-semibold mt-2 mb-3"
                style={{ background: "none", color: BRAND, cursor: "pointer", fontSize: "0.78rem", padding: 0 }}>
                <FaPlus size={10} /> Add another address
              </button>

              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <Field label="City">
                    <input type="text" value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: titleCase(e.target.value) }))}
                      placeholder="e.g. Chennai" style={styles.input} autoComplete="off" />
                  </Field>
                </div>
                <div className="col-12 col-md-4">
                  <Field label="State">
                    <input type="text" value={form.state}
                      onChange={e => setForm(f => ({ ...f, state: titleCase(e.target.value) }))}
                      placeholder="e.g. Tamil Nadu" style={styles.input} autoComplete="off" />
                  </Field>
                </div>
                <div className="col-12 col-md-4">
                  <Field label="Country">
                    <input type="text" value={form.country}
                      onChange={e => setForm(f => ({ ...f, country: titleCase(e.target.value) }))}
                      placeholder="e.g. India" style={styles.input} autoComplete="off" />
                  </Field>
                </div>
              </div>
            </SectionRow>

            <SectionRow icon={<FaCircle size={9} />} title="Status">
              <select name="status" value={form.status} onChange={handleChange} style={{ ...styles.select, maxWidth: 200 }}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </SectionRow>

                       <SectionRow icon={<FaBoxes size={12} />} title="Products & Services">
              <select
                value=""
                onChange={e => addProduct(e.target.value)}
                style={styles.select}
              >
                <option value="">+ Add a product or service…</option>
                {productList
                  .filter(p => !form.products.some(x => x.productId === p.id))
                  .map(p => {
                    const out = p.type !== "Service" && Number(p.stock_qty) <= 0;
                    return (
                      <option key={p.id} value={p.id} disabled={out}>
                        {p.name} — ₹{Number(p.sale_rate).toLocaleString("en-IN")}
                        {p.type === "Service" ? " (Service)" : out ? " — Out of stock" : ` — Stock: ${p.stock_qty}`}
                      </option>
                    );
                  })}
              </select>
              {productList.length === 0 && (
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 6 }}>
                  No products yet. Add them on the Products page first.
                </div>
              )}

              {form.products.length > 0 && (
                <div className="d-flex flex-column gap-2 mt-3">
                  {form.products.map(p => {
                    const live = productList.find(x => x.id === p.productId) || {};
                    const isService = (live.type || p.type) === "Service";
                    const stock = Number(live.stock_qty);
                    const available = isService ? 0 : stock + originalQty(p.productId);
                    const low = !isService && available <= 5;
                    const over = !isService && Number(p.qty) > available;
                    const gstText = (live.gst_type || p.gstType) === "Without GST"
                      ? "No GST"
                      : `${live.gst_percent ?? p.gstPercent}% ${live.gst_type || p.gstType || ""}`;
                    return (
                      <div key={p.productId} style={{
                        border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px",
                        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
                      }}>
                        <div style={{ flex: "1 1 150px", minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>{p.name}</div>
                          <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                            {live.type || p.type}{(live.unit || p.unit) ? ` · ${live.unit || p.unit}` : ""}
                          </div>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#334155" }}>
                          <div style={{ fontWeight: 600 }}>₹{Number(live.sale_rate ?? p.rate).toLocaleString("en-IN")}</div>
                          <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{gstText}</div>
                        </div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, minWidth: 64,
                          color: isService ? "#94a3b8" : low ? "#ef4444" : "#059669" }}>
                          {isService
                            ? "Service"
                            : Number.isNaN(available)
                              ? "Stock: —"
                              : `Stock: ${available}${Number(p.qty) > 0 ? ` → ${available - Number(p.qty)} left` : ""}`}
                          {low && !Number.isNaN(available) && <span style={{ fontSize: "0.62rem", marginLeft: 4 }}>LOW</span>}
                        </div>
                        <input
                          type="number" min="1" value={p.qty}
                          onChange={e => updateProductQty(p.productId, e.target.value)}
                          title="Quantity"
                          style={{ ...styles.input, width: 70, flexShrink: 0 }}
                        />
                        <button onClick={() => removeProduct(p.productId)}
                          className="border-0 bg-transparent d-flex align-items-center justify-content-center"
                          style={{ color: "#ef4444", cursor: "pointer", width: 26, height: 26 }}>
                          <FaTimes size={12} />
                        </button>
                        {over && (
                          <div style={{ flexBasis: "100%", fontSize: "0.72rem", color: "#ef4444", fontWeight: 600 }}>
                            Only {available} in stock.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {errors.products && <div style={styles.errorMsg}>{errors.products}</div>}
            </SectionRow>

            <SectionRow icon={<FaStickyNote size={12} />} title="Notes">
              <div className="d-flex flex-column gap-2">
                {form.notes.map((n, i) => (
                  <div key={n.id} style={{ position: "relative" }}>
                    <textarea value={n.text} onChange={e => updateNote(n.id, noteCase(e.target.value))} rows={2}
                      placeholder={`Note ${i + 1} — preferences, follow-ups, special requirements…`}
                      style={{ ...styles.input, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, backgroundColor: "#fffbeb" }} />
                    {form.notes.length > 1 && (
                      <button onClick={() => removeNote(n.id)}
                        className="border-0 bg-transparent d-flex align-items-center justify-content-center"
                        style={{ color: "#ef4444", cursor: "pointer", position: "absolute", top: 6, right: 6 }}>
                        <FaTimes size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addNote}
                className="d-flex align-items-center gap-2 border-0 fw-semibold mt-2"
                style={{ background: "none", color: "#92400e", cursor: "pointer", fontSize: "0.78rem", padding: 0 }}>
                <FaPlus size={10} /> Add another note
              </button>
            </SectionRow>

          </div>

          <div className="mb-4" />
        </div>

        {/* ══ RIGHT: Preview (togglable) ══ */}
        {showPreview && <CustomerPreview form={form} customerId={customer?.id} />}

      </div>
    </>
  );
}

// ── Styles ──
const styles = {
  previewHeader: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "12px 16px", borderBottom: "1px solid #f1f5f9",
    backgroundColor: "#fafafa", borderRadius: "14px 14px 0 0",
  },
  docHeading: {
    borderBottom: `3px solid ${BRAND}`, paddingBottom: 10, marginBottom: 14,
  },
  docTable: {
    border: "1px solid #eef2f0", borderRadius: 8, overflow: "hidden",
  },
  docTableHead: {
    display: "flex", backgroundColor: BRAND, color: "#fff",
    fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.05em",
    padding: "7px 10px", textTransform: "uppercase",
  },
  docTableRow: {
    display: "flex", padding: "7px 10px", fontSize: "0.76rem",
    borderTop: "1px solid #f1f5f9",
  },
  docTableLabel: { flex: "0 0 42%", color: "#64748b", fontWeight: 600 },
  docTableValue: { flex: 1, color: "#0f172a", fontWeight: 500, wordBreak: "break-word", whiteSpace: "pre-line" },
  docBlock: { marginTop: 14 },
  docBlockLabel: { fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.04em" },
  tagChip: {
    padding: "3px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600,
    backgroundColor: BRAND_SOFT, color: BRAND_DARK, border: `1px solid ${BRAND_SOFT_BORDER}`,
  },
  autoNotice: {
    display: "flex", alignItems: "center", gap: 6, marginTop: 16,
    padding: "10px 12px", backgroundColor: "#ecfdf5", borderRadius: 8, border: "1px solid #a7f3d0",
  },
  sectionRow: {
    borderTop: "1px solid #f1f5f9", paddingTop: 16, paddingBottom: 16,
  },
  sectionRowHead: { display: "flex", alignItems: "center", gap: 8 },
  sectionIconSm: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 22, height: 22, borderRadius: 6, background: BRAND_SOFT, color: BRAND_DARK, flexShrink: 0,
  },
  sectionTitleSm: { fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" },
  label: {
    display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8",
    marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em",
  },
  input: {
    width: "100%", boxSizing: "border-box", padding: "8px 11px",
    border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem",
    color: "#0f172a", outline: "none", backgroundColor: "#fff", transition: "border-color 0.15s",
  },
  inputError: { borderColor: "#fca5a5", backgroundColor: "#fef2f2" },
  select: {
    width: "100%", boxSizing: "border-box", padding: "8px 11px",
    border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem",
    color: "#0f172a", outline: "none", backgroundColor: "#fff", cursor: "pointer", appearance: "auto",
  },
  errorMsg: { marginTop: 4, fontSize: "0.72rem", color: "#ef4444", fontWeight: 500 },
  draftBanner: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 12, flexWrap: "wrap",
    backgroundColor: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 12,
    padding: "12px 16px", marginBottom: 16,
  },
  draftIcon: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: 8, background: "#fde68a", color: "#92400e", flexShrink: 0,
  },

};