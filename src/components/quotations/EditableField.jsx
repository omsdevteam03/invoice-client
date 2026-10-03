// EditableField.jsx
import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import axiosInstance from "../../api/axiosInstance";
import { htmlToPlainText } from "./quotationLayoutUtils";

const base = {
  font: "inherit",
  color: "inherit",
  background: "rgba(140,140,140,0.10)",
  border: "1px dashed rgba(140,140,140,0.45)",
  borderRadius: 4,
  outline: "none",
  padding: "2px 6px",
  width: "100%",
  boxSizing: "border-box",
};

export function EditText({ editMode, value, onChange, placeholder, style, as = "span", type = "text", viewRender }) {
  if (!editMode) {
    if (!value) return null; // don't leak placeholder text into the saved/view page
    if (viewRender) return viewRender(value);
    const Tag = as;
    return <Tag style={style}>{value}</Tag>;
  }
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...base, ...style }}
    />
  );
}

export function EditArea({ editMode, value, onChange, placeholder, rows = 4, style, viewRender }) {
  if (!editMode) {
    return viewRender ? viewRender(value) : <div style={style}>{value}</div>;
  }
  return (
    <textarea
      rows={rows}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...base, resize: "vertical", ...style }}
    />
  );
}

const HTML_TAG_RE = /<[a-z][\s\S]*>/i;

// Displays a saved field correctly whether it was saved as HTML (from the
// rich-text/TinyMCE editor on the default template) or as legacy plain text
// with newlines (from this layout's own plain textarea). Use this for every
// VIEW-MODE (non-edit) display of scopeOfWork, deliverables, technologyUsed,
// timelineDesc, terms, paymentTerms, notes, and description.
export function RichOrPlainView({ value, as = "list" }) {
  if (!value || !String(value).trim()) return null;
  if (HTML_TAG_RE.test(value)) {
    return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />;
  }
  if (as === "paragraph") {
    return (
      <>
        {String(value).split(/\n{2,}/).map((p, i) => p.trim() && <p key={i} style={{ whiteSpace: "pre-line" }}>{p.trim()}</p>)}
      </>
    );
  }
  const lines = String(value).split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return <ul>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>;
}

export function bulletView(text, style) {
  return (
    <>
      {(text || "").split("\n").filter((l) => l.trim()).map((line, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, ...style }}>
          <span>•</span><span>{line}</span>
        </div>
      ))}
    </>
  );
}

export function LogoEdit({ editMode, logo, onUpload, onRemove, boxStyle, inputId, fallback, shape = "original", onShapeChange }) {
  // size = the height each layout already gives in boxStyle
  const size = typeof boxStyle?.height === "number" ? boxStyle.height : 60;
  const { width, height, borderRadius, ...boxRest } = boxStyle || {};

  const imgStyle =
    shape === "circle" ? { width: size, height: size, borderRadius: "50%", objectFit: "cover" }
    : shape === "square" ? { width: size, height: size, borderRadius: 8, objectFit: "contain" }
    : { height: size, width: "auto", maxWidth: size * 3, objectFit: "contain" }; // original

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <label htmlFor={editMode ? inputId : undefined}
        style={{ cursor: editMode ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", ...(logo ? boxRest : boxStyle) }}>
        {logo ? <img src={logo} alt="" style={{ display: "block", flexShrink: 0, ...imgStyle }} /> : (editMode ? <span style={{ fontSize: 10, opacity: 0.6 }}>+ Logo</span> : fallback)}
      </label>
      {editMode && <input id={inputId} type="file" accept="image/*" style={{ display: "none" }} onChange={onUpload} />}
      {editMode && logo && onShapeChange && (
        <select className="no-print" value={shape} onChange={(e) => onShapeChange(e.target.value)}
          style={{ fontSize: 10, padding: "1px 4px", cursor: "pointer" }}>
          <option value="original">Original</option>
          <option value="square">Square</option>
          <option value="circle">Circle</option>
        </select>
      )}
      {editMode && logo && (
        <button type="button" onClick={onRemove} style={{ background: "none", border: "none", color: "#d7263d", fontSize: 10, cursor: "pointer" }}>Remove</button>
      )}
    </div>
  );
}

export function SignatureEdit({ editMode, signature, onUpload, onRemove, boxStyle, inputId }) {
  if (!editMode) {
    return signature ? (
      <img
        src={signature}
        alt="Signature"
        style={{
          ...boxStyle,
          mixBlendMode: "multiply",   // removes the white box, looks like ink on paper
          transform: "rotate(-1.5deg)",
          filter: "contrast(1.15)",   // makes faint strokes read clearly when printed
        }}
      />
    ) : null;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
      <div style={{ ...boxStyle, border: "1px dashed rgba(140,140,140,0.45)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {signature ? <img src={signature} alt="Signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 10, opacity: 0.6 }}>No signature</span>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <label htmlFor={inputId} style={{ fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>{signature ? "Change" : "Upload signature"}</label>
        <input id={inputId} type="file" accept="image/*" style={{ display: "none" }} onChange={onUpload} />
        {signature && <button type="button" onClick={onRemove} style={{ background: "none", border: "none", color: "#d7263d", fontSize: 11, cursor: "pointer" }}>Remove</button>}
      </div>
    </div>
  );
}

export function CostCalculatorBar({ includeGst, gstPercent, defaultGstPercent, onChange, accent = "#000" }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 10,
      padding: "8px 10px", borderRadius: 8, background: "rgba(140,140,140,0.08)", border: "1px dashed rgba(140,140,140,0.4)",
    }}>
      <div>
        <label style={{ display: "block", fontSize: 10, opacity: 0.7, marginBottom: 3 }}>GST Type</label>
        <select value={includeGst !== false ? "with" : "without"} onChange={(e) => onChange("includeGst", e.target.value === "with")} style={{ fontSize: 12, padding: "3px 6px" }}>
          <option value="with">With GST</option>
          <option value="without">Without GST</option>
        </select>
      </div>
      {includeGst !== false && (
        <div>
          <label style={{ display: "block", fontSize: 10, opacity: 0.7, marginBottom: 3 }}>GST %</label>
          <select value={gstPercent ?? defaultGstPercent} onChange={(e) => onChange("gstPercent", Number(e.target.value))} style={{ fontSize: 12, padding: "3px 6px" }}>
            {[0, 5, 12, 18, 28].map((v) => <option key={v} value={v}>{v}%</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

// Table for entering cost items — name + amount per row, with
// "+ Add Item" adding a blank row directly (replaces the old popup modal).
export function CostItemsTable({ items = [], onChange, gstMode = "with", gstPercent, defaultGstPercent = 18, onGstChange, accent = "#1F6F5C" }) {
  const addItem = () => onChange([...items, { id: `item-${Date.now()}`, name: "", amount: 0 }]);
  const updateItem = (id, field, value) =>
    onChange(items.map(it => it.id === id ? { ...it, [field]: field === "amount" ? Number(value) || 0 : value } : it));
  const removeItem = (id) => onChange(items.filter(it => it.id !== id));

  return (
    <div style={{ marginBottom: 10 }}>
      <style>{`
        .qd-no-spinner::-webkit-outer-spin-button,
        .qd-no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .qd-no-spinner { -moz-appearance: textfield; }
      `}</style>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 10,
        padding: "8px 10px", borderRadius: 8, background: "rgba(140,140,140,0.08)", border: "1px dashed rgba(140,140,140,0.4)",
      }}>
        <div>
          <label style={{ display: "block", fontSize: 10, opacity: 0.7, marginBottom: 3 }}>GST Type</label>
          <select value={gstMode} onChange={(e) => onGstChange("gstMode", e.target.value)} style={{ fontSize: 12, padding: "3px 6px" }}>
            <option value="with">With GST</option>
            <option value="without">Without GST</option>
            <option value="inclusive">GST Included</option>
          </select>
        </div>
        {gstMode !== "without" && (
          <div>
            <label style={{ display: "block", fontSize: 10, opacity: 0.7, marginBottom: 3 }}>GST %</label>
            <select value={gstPercent ?? defaultGstPercent} onChange={(e) => onGstChange("gstPercent", Number(e.target.value))} style={{ fontSize: 12, padding: "3px 6px" }}>
              {[0, 5, 12, 18, 28].map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ border: "1px solid rgba(140,140,140,0.3)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 32px", background: accent, color: "#fff", fontSize: 11, fontWeight: 700 }}>
          <div style={{ padding: "8px 10px" }}>Service / Item</div>
          <div style={{ padding: "8px 10px", textAlign: "right" }}>Amount (₹)</div>
          <div />
        </div>
        {items.map((it, idx) => (
          <div key={it.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 32px", borderTop: "1px solid rgba(140,140,140,0.2)", background: idx % 2 ? "rgba(140,140,140,0.04)" : "transparent" }}>
            <input value={it.name} onChange={(e) => updateItem(it.id, "name", e.target.value)} placeholder="e.g. SEO Service"
              style={{ border: "none", background: "transparent", padding: "8px 10px", fontSize: 13, outline: "none" }} />
            <input
              type="number"
              className="qd-no-spinner"
              value={it.amount === 0 ? "" : it.amount}
              onChange={(e) => updateItem(it.id, "amount", e.target.value)}
              placeholder="0"
              style={{ border: "none", background: "transparent", padding: "8px 10px", fontSize: 13, textAlign: "right", outline: "none" }}
            />
            <button type="button" onClick={() => removeItem(it.id)} title="Remove item"
              style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer" }}>✕</button>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ padding: 14, fontSize: 12, opacity: 0.6, textAlign: "center" }}>No items yet. Click "Add Item" below.</div>
        )}
      </div>

      <button type="button" onClick={addItem} style={{
        marginTop: 8, border: `1.5px dashed ${accent}`, borderRadius: 8, padding: "6px 14px",
        fontSize: 12.5, fontWeight: 600, color: accent, backgroundColor: "transparent", cursor: "pointer",
      }}>
        + Add Item
      </button>

      {/* Live total — updates automatically as items/GST change, no button needed */}
      {items.length > 0 && (() => {
        const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
        const pct = Number(gstPercent ?? defaultGstPercent) || 0;
        const rate = pct / 100;

        let taxableAmount, gstAmount, total;
        if (gstMode === "with") {
          taxableAmount = subtotal; gstAmount = Math.round(subtotal * rate); total = subtotal + gstAmount;
        } else if (gstMode === "inclusive") {
          total = subtotal; taxableAmount = Math.round(subtotal / (1 + rate)); gstAmount = subtotal - taxableAmount;
        } else {
          taxableAmount = subtotal; gstAmount = 0; total = subtotal;
        }

        const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
        return (
          <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(140,140,140,0.06)", border: "1px solid rgba(140,140,140,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            {gstMode === "with" && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                <span>GST ({pct}%)</span><span>{fmt(gstAmount)}</span>
              </div>
            )}
            {gstMode === "inclusive" && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", color: "#8a8378" }}>
                <span>Taxable value (GST {pct}% included)</span><span>{fmt(taxableAmount)} + {fmt(gstAmount)} GST</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, padding: "6px 0 0", marginTop: 4, borderTop: "1px solid rgba(140,140,140,0.25)", color: accent }}>
              <span>Total Project Cost</span><span>{fmt(total)}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Renders a table-type custom section (heading arrives separately) as a
// real editable grid — add/remove rows and columns, edit any cell or
// column header. `onChange` receives just the changed fields (columns
// and/or rows); the caller is responsible for merging them into the
// section object.
export function EditableSectionTable({ section, accent, onChange }) {
  const columns = section.columns && section.columns.length ? section.columns : ["Column 1", "Column 2"];
  const rows = section.rows && section.rows.length ? section.rows : [columns.map(() => "")];

  const emit = (patch) => onChange({ columns, rows, ...patch });

  const updateColumn = (ci, value) => {
    const next = [...columns]; next[ci] = value;
    emit({ columns: next });
  };
  const updateCell = (ri, ci, value) => {
    const next = rows.map((r) => [...r]);
    next[ri][ci] = value;
    emit({ rows: next });
  };
  const addRow = () => emit({ rows: [...rows, columns.map(() => "")] });
  const removeRow = (ri) => emit({ rows: rows.filter((_, idx) => idx !== ri) });
  const addColumn = () => emit({ columns: [...columns, `Column ${columns.length + 1}`], rows: rows.map((r) => [...r, ""]) });
  const removeColumn = (ci) => {
    if (columns.length <= 1) return;
    emit({
      columns: columns.filter((_, idx) => idx !== ci),
      rows: rows.map((r) => r.filter((_, idx) => idx !== ci)),
    });
  };

  const cellInputStyle = { width: "100%", border: "none", background: "transparent", fontSize: 12.5, padding: 4, outline: "none", fontFamily: "inherit" };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((col, ci) => (
              <th key={ci} style={{ padding: 4, border: "1px solid rgba(140,140,140,0.3)", background: `${accent}18`, position: "relative" }}>
                <input value={col} onChange={(e) => updateColumn(ci, e.target.value)} placeholder={`Column ${ci + 1}`} style={{ ...cellInputStyle, fontWeight: 700, paddingRight: 18 }} />
                {columns.length > 1 && (
                  <button type="button" onClick={() => removeColumn(ci)} title="Remove column" style={{ position: "absolute", top: 4, right: 4, border: "none", background: "transparent", color: "#dc2626", cursor: "pointer" }}>✕</button>
                )}
              </th>
            ))}
            <th style={{ width: 32, border: "none" }}>
              <button type="button" onClick={addColumn} title="Add column" style={{ border: "none", background: "transparent", color: accent, cursor: "pointer", fontWeight: 700 }}>+</button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {columns.map((_, ci) => (
                <td key={ci} style={{ padding: 4, border: "1px solid rgba(140,140,140,0.3)" }}>
                  <input value={row[ci] ?? ""} onChange={(e) => updateCell(ri, ci, e.target.value)} style={cellInputStyle} />
                </td>
              ))}
              <td style={{ border: "none", textAlign: "center" }}>
                <button type="button" onClick={() => removeRow(ri)} title="Remove row" style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer" }}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addRow} style={{ marginTop: 8, border: `1.5px dashed ${accent}`, borderRadius: 8, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, color: accent, background: "transparent", cursor: "pointer" }}>
        + Add Row
      </button>
    </div>
  );
}

export function CustomSectionsEdit({ sections, accent, onChange, onAdd, onRemove }) {
  return (
    <>
      {sections.map((s, i) => (
        <div key={i} style={{ marginTop: 20, border: "1px dashed rgba(140,140,140,0.4)", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={s.heading || ""} onChange={(e) => onChange(i, "heading", e.target.value)} placeholder="Section Heading" style={{ ...base, fontWeight: 700 }} />
            <button type="button" onClick={() => onRemove(i)} style={{ border: "none", borderRadius: 6, background: "#fee2e2", color: "#dc2626", padding: "0 10px", cursor: "pointer" }}>✕</button>
          </div>
          {/* AI-generated sections (e.g. "Customer-Facing Features") arrive as
              type: "table" with columns/rows instead of plain `content` — the
              old plain textarea below never displayed or saved that data. */}
          {s.type === "table" ? (
            <EditableSectionTable
              section={s}
              accent={accent}
              onChange={(patch) => onChange(i, "__patch", patch)}
            />
          ) : (
            <textarea rows={4} value={htmlToPlainText(s.content || "")} onChange={(e) => onChange(i, "content", e.target.value)} placeholder="Section content..." style={{ ...base, resize: "vertical" }} />
          )}
        </div>
      ))}
      <button type="button" onClick={onAdd} style={{
        marginTop: 16, width: "100%", padding: "10px", border: `2px dashed ${accent}`, borderRadius: 8,
        background: "transparent", color: accent, fontWeight: 600, cursor: "pointer",
      }}>+ Add Custom Section</button>
    </>
  );
}

// Popup used by the "+ Add Item" button in every layout's Project Cost
// section. Same card style as the delete-confirmation dialog on the
// Quotations/Customers list pages.
export function AddItemModal({ show, onCancel, onConfirm, accent = "#1F6F5C" }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (show) { setLabel(""); setAmount(""); }
  }, [show]);

  if (!show) return null;

  const handleAdd = () => {
    if (!label.trim()) return;
    const numericAmount = Number(amount.replace(/[^\d.]/g, "")) || 0;
    onConfirm(label.trim(), numericAmount);
  };

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
          fontSize: 26, color: accent, fontWeight: 700,
        }}>
          +
        </div>
        <h5 style={{ color: "#0f172a", fontWeight: 700, marginBottom: 16 }}>Add Cost Item</h5>

        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Item name (e.g. Domain & Hosting)"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8, marginBottom: 10,
            border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box",
          }}
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (e.g. 2000)"
          inputMode="numeric"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8, marginBottom: 20,
            border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box",
          }}
        />

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={{
            border: "none", fontWeight: 600, padding: "10px 20px",
            backgroundColor: "#f1f5f9", color: "#475569", borderRadius: 10, cursor: "pointer", fontSize: 14,
          }}>
            Cancel
          </button>
          <button onClick={handleAdd} style={{
            border: "none", fontWeight: 600, padding: "10px 20px",
            backgroundColor: accent, color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 14,
          }}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Company Name dropdown
 * Used anywhere the *issuing* company's name is entered. Options come
 * from the company profiles saved in Settings → Company.
 * ──────────────────────────────────────────────────────────────────── */

// Share one request when several dropdowns mount at the same time.
let inFlightRequest = null;
function fetchCompanyProfiles() {
  if (!inFlightRequest) {
    inFlightRequest = axiosInstance
      .get("/settings/companies")
      .then((res) => (Array.isArray(res.data) ? res.data : []))
      .finally(() => { inFlightRequest = null; });
  }
  return inFlightRequest;
}

export function useCompanyProfiles() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCompanyProfiles()
      .then((list) => { if (!cancelled) setCompanies(list); })
      .catch((err) => console.error("Failed to load company profiles:", err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Active profile first, then the rest; skip profiles with no name.
  const sorted = companies
    .filter((c) => (c.companyName || "").trim())
    .sort((a, b) => (a.status === "active" ? -1 : 0) - (b.status === "active" ? -1 : 0));

  return { companies: sorted, loading };
}

// `onChange(name, company)` — the second argument is the full profile, so a
// caller can also fill address / phone / email / logo. Callers that only use
// the first argument keep working.
export function CompanySelectField({ value, onChange, placeholder = "Select company", style, excludeValue }) {
  const { companies, loading } = useCompanyProfiles();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = companies.filter(
    (c) => !excludeValue || c.companyName.trim().toLowerCase() !== excludeValue.trim().toLowerCase()
  );

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ ...base, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", ...style }}
      >
        <span style={{ color: value ? "inherit" : "#8a8378" }}>{value || placeholder}</span>
        <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 6 }}>▾</span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "#fff", border: "1px solid rgba(140,140,140,0.45)", borderRadius: 6,
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)", maxHeight: 260, overflowY: "auto",
          color: "#1f2937",
        }}>
          {loading && <div style={{ padding: "10px 12px", fontSize: 12.5, color: "#8a8378" }}>Loading…</div>}

          {!loading && options.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 12.5, color: "#8a8378" }}>No company profiles yet.</div>
          )}

          {options.map((c) => (
            <div
              key={c.id}
              onClick={() => { onChange(c.companyName, c); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                padding: "8px 12px", fontSize: 13, cursor: "pointer",
                background: value === c.companyName ? "rgba(140,140,140,0.18)" : "transparent",
              }}
              onMouseEnter={(e) => { if (value !== c.companyName) e.currentTarget.style.background = "rgba(140,140,140,0.08)"; }}
              onMouseLeave={(e) => { if (value !== c.companyName) e.currentTarget.style.background = "transparent"; }}
            >
              <span>{c.companyName}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, flexShrink: 0,
                background: c.status === "active" ? "#e6f4ef" : "#f1f0ef",
                color: c.status === "active" ? "#1F6F5C" : "#6b7280",
              }}>
                {c.status === "active" ? "Active" : "Draft"}
              </span>
            </div>
          ))}

          <a
            href="/settings"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block", padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#16A34A",
              textDecoration: "none", borderTop: "1px solid rgba(140,140,140,0.2)",
            }}
          >
            + Manage company profiles in Settings
          </a>
        </div>
      )}
    </div>
  );
}

// Full drop-in replacement for EditText when the field is a company name:
// same editMode/view-mode contract as EditText (view mode renders nothing
// when empty), but edit mode renders the dropdown instead of a text input.
export function CompanySelect({ editMode, value, onChange, placeholder = "Select company", style, as = "span", excludeValue }) {
  if (!editMode) {
    if (!value) return null;
    const Tag = as;
    return <Tag style={style}>{value}</Tag>;
  }
  return <CompanySelectField value={value} onChange={onChange} placeholder={placeholder} style={style} excludeValue={excludeValue} />;
}

/* ────────────────────────────────────────────────────────────────────────
 * Customer selector
 * Used in the "To" section of every quotation layout. Unlike
 * CompanySelectField, this one is purely a search/select UI over whatever
 * `customers` array is passed in — the actual customer data always comes
 * from the real Customers page/API via props, never duplicated or
 * hardcoded here.
 * ──────────────────────────────────────────────────────────────────── */

function matchesCustomerSearch(cust, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    (cust.company || "").toLowerCase().includes(needle) ||
    (cust.name || "").toLowerCase().includes(needle) ||
    (cust.phone || "").toLowerCase().includes(needle) ||
    (cust.email || "").toLowerCase().includes(needle)
  );
}

// Edit-mode-only searchable dropdown. `onSelect` receives the full customer
// record so the layout can populate company/name/phone/email/address in
// one go. Renders the same "dashed input" look as every other editable
// field so it fits visually wherever it's dropped in.
export function CustomerSelectField({ customers = [], value, onSelect, onManualChange, placeholder = "Select or search customer", style }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = customers.filter((c) => matchesCustomerSearch(c, query));
  const trimmedQuery = query.trim();
  // Only offer "use as typed" when the query doesn't already exactly match
  // an existing customer's company name — avoids a redundant duplicate row.
  const exactMatch = customers.some((c) => (c.company || "").toLowerCase() === trimmedQuery.toLowerCase());

  const useTyped = () => {
    if (!trimmedQuery) return;
    onManualChange ? onManualChange(trimmedQuery) : onSelect({ company: trimmedQuery });
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ ...base, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", ...style }}
      >
        <span style={{ color: value ? "inherit" : "#8a8378" }}>{value || placeholder}</span>
        <span style={{ fontSize: 10, opacity: 0.6, position: "absolute", right: 10 }}>▾</span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "#fff", border: "1px solid rgba(140,140,140,0.45)", borderRadius: 6,
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)", maxHeight: 320, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type a new customer/company..."
            onKeyDown={(e) => { if (e.key === "Enter" && filtered.length === 0) { e.preventDefault(); useTyped(); } }}
            style={{ ...base, cursor: "text", border: "none", borderBottom: "1px solid rgba(140,140,140,0.25)", borderRadius: 0 }}
          />
          <div style={{ overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "10px 12px", fontSize: 12.5, color: "#8a8378" }}>No matching customers</div>
            )}
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => { onSelect(c); setOpen(false); setQuery(""); }}
                style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(140,140,140,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ fontWeight: 600 }}>{c.company || c.name}</div>
                <div style={{ fontSize: 11, color: "#8a8378" }}>
                  {[c.name, c.phone, c.email].filter(Boolean).join(" · ")}
                </div>
              </div>
            ))}
          </div>
          {trimmedQuery && !exactMatch && (
            <div
              onClick={useTyped}
              style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", color: "#16A34A", fontWeight: 600, borderTop: "1px solid rgba(140,140,140,0.2)" }}
            >
              Use "{trimmedQuery}" without a saved customer
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Full drop-in replacement for the plain "Client Company Name" EditText:
// same editMode/view-mode contract (view mode renders nothing when empty),
// edit mode renders the searchable customer dropdown instead of a text input.
export function CustomerSelect({ editMode, customers = [], value, onSelect, onManualChange, placeholder = "Select or search customer", style, as = "span" }) {
  if (!editMode) {
    if (!value) return null;
    const Tag = as;
    return <Tag style={style}>{value}</Tag>;
  }
  return <CustomerSelectField customers={customers} value={value} onSelect={onSelect} onManualChange={onManualChange} placeholder={placeholder} style={style} />;
}