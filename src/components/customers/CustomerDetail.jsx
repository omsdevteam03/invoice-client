import { formatPhone, dialDigits, DEFAULT_CODE } from "./CustomerForm";
import { useState, useRef, useEffect } from "react";
import { FaArrowLeft, FaEdit, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBuilding, FaWhatsapp, FaRupeeSign, FaHeadset, FaStickyNote, FaChevronDown, FaCheck } from "react-icons/fa";

const BRAND = "#1F6F5C";
const BRAND_DARK = "#175646";
const BRAND_SOFT = "#e8f3f0";
const BRAND_SOFT_BORDER = "#bfe0d6";

const statusConfig = {
  Active: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  Inactive: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  Lead: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
};

function Avatar({ name, size = 56 }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "14px",
      background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`,
      display: "flex", alignItems: "center",
      justifyContent: "center", color: "#fff", fontWeight: 700,
      fontSize: "1.1rem", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function normalizeNotes(notes) {
  if (!notes) return [];
  if (Array.isArray(notes)) return notes.filter(Boolean);
  if (typeof notes === "string") {
    const trimmed = notes.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const inner = trimmed.slice(1, -1);
        return inner
          .match(/"(?:[^"\\]|\\.)*"|[^,]+/g)
          ?.map(s => s.trim().replace(/^"|"$/g, "").replace(/\\"/g, '"'))
          .filter(Boolean) ?? [trimmed];
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  return [];
}

function normalizeValues(list, legacySingle) {
  if (Array.isArray(list) && list.length) {
    return list.map(e => e?.value?.trim()).filter(Boolean);
  }
  if (legacySingle) return [legacySingle];
  return [];
}

function normalizeEntries(list, legacySingle) {
  if (Array.isArray(list) && list.length) {
    return list
      .map(e => ({ type: e?.type || "Other", value: e?.value?.trim() }))
      .filter(e => e.value);
  }
  if (legacySingle) return [{ type: "Other", value: legacySingle }];
  return [];
}

// Single contact row — no boxed icon background, just an outlined circle
function ContactRow({ icon, label, children, last }) {
  return (
    <div className="d-flex align-items-center gap-3 py-3"
      style={{ borderBottom: last ? "none" : "1px solid #f1f5f9" }}>
      <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
        style={{ width: 34, height: 34, color: BRAND, border: `1.5px solid ${BRAND_SOFT_BORDER}` }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        {children}
      </div>
    </div>
  );
}

// Quick-action button (Email / Call / WhatsApp) with a styled dropdown for
// choosing which email / number to use. Menu opens upward.
function ActionCombo({ href, icon, label, entries, selectedIdx, onSelect, renderOption, external }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const multi = entries.length > 1;

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div className={`cd-action-combo${multi ? "" : " cd-solo"}`}>
        <a
          href={href}
          className="cd-action-main"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {icon} {label}
        </a>
        {multi && (
          <button
            type="button"
            className="cd-action-chev-wrap"
            onClick={() => setOpen((o) => !o)}
            aria-label={`Choose ${label.toLowerCase()} option`}
          >
            <FaChevronDown size={9} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
        )}
      </div>

      {multi && open && (
        <div className="cd-menu">
          {entries.map((e, i) => (
            <button
              key={i}
              type="button"
              className={`cd-menu-item${i === selectedIdx ? " active" : ""}`}
              onClick={() => { onSelect(i); setOpen(false); }}
            >
              <span>{renderOption(e)}</span>
              {i === selectedIdx && <FaCheck size={10} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Inline dropdown used inside the contact rows (Email / Phone / WhatsApp).
// Menu opens downward.
function RowSelect({ entries, selectedIdx, onSelect, renderOption }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button type="button" className="cd-row-trigger" onClick={() => setOpen((o) => !o)}>
        <span>{renderOption(entries[selectedIdx] ?? entries[0])}</span>
        <FaChevronDown size={9} color="#64748b" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div className="cd-menu cd-menu-down">
          {entries.map((e, i) => (
            <button
              key={i}
              type="button"
              className={`cd-menu-item${i === selectedIdx ? " active" : ""}`}
              onClick={() => { onSelect(i); setOpen(false); }}
            >
              <span>{renderOption(e)}</span>
              {i === selectedIdx && <FaCheck size={10} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CustomerDetail({ customer: c, onBack, onEdit, quotations = [], invoices = [] }) {
  const sc = statusConfig[c.status] || statusConfig.Active;

  // Match by customerId first (most reliable), falling back to name/company
  // for older records saved before customerId linking existed.
  const belongsToCustomer = (rec) => {
    if (rec.customerId && c.id) return rec.customerId === c.id;
    const recName = (rec.buyerName || rec.name || "").toLowerCase().trim();
    const recCompany = (rec.company || "").toLowerCase().trim();
    const custName = (c.name || "").toLowerCase().trim();
    const custCompany = (c.company || "").toLowerCase().trim();
    return (recName && recName === custName) || (recCompany && custCompany && recCompany === custCompany);
  };

  const isProformaInvoice = (i) => i.invoiceType === "Proforma" || (i.invoiceNo || "").startsWith("PI-");

  const customerQuotations = quotations.filter(q => !q.isTemplate && belongsToCustomer(q));
  const customerInvoices = invoices.filter(inv => !isProformaInvoice(inv) && belongsToCustomer(inv));

  const invoiceTotal = (inv) => {
    const subtotal = (inv.items || []).reduce((a, b) => a + Number(b.amount || 0), 0);
    const gstPercent = Number(inv.gstPercent || 18);
    const tax = inv.gstType === "With GST" ? Math.round(subtotal * (gstPercent / 100)) : 0;
    return inv.gstType === "With GST" ? subtotal + tax : subtotal;
  };

  const totalInvoiceValue = customerInvoices.reduce((sum, inv) => sum + invoiceTotal(inv), 0);

  // Only invoices actually marked Paid count as money received — an Unpaid
  // or Overdue invoice has been billed, but not yet collected.
  const totalReceivedValue = customerInvoices
    .filter(inv => inv.status === "Paid")
    .reduce((sum, inv) => sum + invoiceTotal(inv), 0);

  const emailEntries = normalizeEntries(c.emails, c.email);
  const emailValues = emailEntries.map(e => e.value);
  const phoneEntries = normalizeEntries(c.phones, c.phone);
  const phoneNumbers = phoneEntries.map(e => e.value);
  const whatsappEntries = normalizeEntries(c.whatsapps, c.whatsapp);
  const whatsappNumbers = whatsappEntries.map(e => e.value);

  const addressValues = normalizeValues(c.addresses, c.address);
  const notes = normalizeNotes(c.notes);

  // Merge quotations + invoices into a single "recent activity" feed, newest first.
  const recentActivity = [
    ...customerQuotations.map(q => ({
      type: "Quotation",
      // Drafts have no official number yet, so fall back to the project title
      number: q.quotationNumber || q.projectTitle || "Draft",
      date: q.date,
      amount: Number(q.amount || 0),
    })),
    ...customerInvoices.map(inv => ({
      type: "Invoice",
      number: inv.invoiceNo || "—",
      date: inv.date || inv.createdAt || inv.issueDate || null,
      amount: invoiceTotal(inv),
    })),
  ]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 6);

  const [selectedEmailIdx, setSelectedEmailIdx] = useState(0);
  const activeEmail = emailValues[selectedEmailIdx] ?? emailValues[0] ?? "";
  const [selectedPhoneIdx, setSelectedPhoneIdx] = useState(0);
  const activePhone = phoneNumbers[selectedPhoneIdx] ?? phoneNumbers[0] ?? "";
  const [selectedWhatsappIdx, setSelectedWhatsappIdx] = useState(0);
  const activeWhatsapp = whatsappNumbers[selectedWhatsappIdx] ?? whatsappNumbers[0] ?? activePhone;

  const valueStyle = { fontSize: "0.86rem", color: "#0f172a", fontWeight: 600 };

  // Ordered list of rows to render, so "last" (no border) is easy to compute
  const rows = [
    emailValues.length > 0 && {
      key: "email", icon: <FaEnvelope size={13} />, label: "Email",
      content: emailEntries.length > 1 ? (
        <RowSelect
          entries={emailEntries}
          selectedIdx={selectedEmailIdx}
          onSelect={setSelectedEmailIdx}
          renderOption={(e) => `${e.type}: ${e.value}`}
        />
      ) : (
        <div style={valueStyle}>{emailEntries[0].type}: {emailEntries[0].value}</div>
      ),
    },
    phoneNumbers.length > 0 && {
      key: "phone", icon: <FaPhone size={13} />, label: "Phone",
      content: phoneEntries.length > 1 ? (
        <RowSelect
          entries={phoneEntries}
          selectedIdx={selectedPhoneIdx}
          onSelect={setSelectedPhoneIdx}
          renderOption={(e) => e.value}
        />
      ) : (
        <div style={valueStyle}>{phoneEntries[0].value}</div>
      ),
    },
    whatsappNumbers.length > 0 && {
      key: "whatsapp", icon: <FaWhatsapp size={13} />, label: "WhatsApp",
      content: whatsappEntries.length > 1 ? (
        <RowSelect
          entries={whatsappEntries}
          selectedIdx={selectedWhatsappIdx}
          onSelect={setSelectedWhatsappIdx}
          renderOption={(e) => e.value}
        />
      ) : (
        <div style={valueStyle}>{whatsappEntries[0].value}</div>
      ),
    },
    c.supportNumber && {
      key: "support", icon: <FaHeadset size={13} />, label: "Support Number",
      content: <div style={valueStyle}>{c.supportNumber}</div>,
    },
 ...addressValues.map((addr, i) => ({
  key: `addr-${i}`, icon: <FaMapMarkerAlt size={13} />,
  label: addressValues.length > 1 ? `Address ${i + 1}` : "Address",
  content: <div style={{ ...valueStyle, whiteSpace: "pre-line" }}>{addr}</div>,
})),
    (c.city || c.state || c.country) && {
      key: "location", icon: <FaMapMarkerAlt size={13} />, label: "City / State / Country",
      content: <div style={valueStyle}>{[c.city, c.state, c.country].filter(Boolean).join(", ")}</div>,
    },
    c.website && {
      key: "website", icon: <FaBuilding size={13} />, label: "Website",
      content: <div style={valueStyle}>{c.website}</div>,
    },
  ].filter(Boolean);

  return (
    <div style={{
      maxWidth: "1280px",
      width: "100%",
      display: "flex",
      gap: "20px",
      alignItems: "stretch",
      flexWrap: "wrap",
      minHeight: "calc(100vh - 140px)",
    }}>
      <div style={{ flex: "1 1 480px", minWidth: 320, display: "flex", flexDirection: "column" }}>
        <style>{`
          .cd-topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            flex-wrap: wrap;
            gap: 10px;
          }
          .cd-action-combo {
            position: relative;
            display: flex;
            align-items: stretch;
            border-radius: 10px;
            background: ${BRAND_SOFT};
            border: 1px solid ${BRAND_SOFT_BORDER};
            overflow: hidden;
            transition: background-color 0.15s;
          }
          .cd-action-combo:hover { background: #dcefe9; }
          .cd-action-main {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 6px;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
            color: ${BRAND_DARK};
            min-width: 0;
          }
          .cd-action-combo.cd-solo .cd-action-main { padding: 12px; }
          .cd-action-chev-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            flex-shrink: 0;
            padding: 0;
            border: none;
            border-left: 1px solid ${BRAND_SOFT_BORDER};
            background: transparent;
            color: ${BRAND_DARK};
            cursor: pointer;
          }
          .cd-menu {
            position: absolute;
            bottom: calc(100% + 6px);
            right: 0;
            min-width: 100%;
            width: max-content;
            max-width: 260px;
            background: #fff;
            border: 1px solid ${BRAND_SOFT_BORDER};
            border-radius: 12px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
            padding: 6px;
            z-index: 30;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .cd-menu.cd-menu-down {
            bottom: auto;
            top: calc(100% + 6px);
            left: 0;
            right: auto;
          }
          .cd-menu-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
            padding: 9px 12px;
            border: none;
            border-radius: 8px;
            background: transparent;
            color: #0f172a;
            font-size: 0.85rem;
            font-weight: 600;
            text-align: left;
            cursor: pointer;
          }
          .cd-menu-item:hover { background: ${BRAND_SOFT}; }
          .cd-menu-item.active { background: ${BRAND_SOFT}; color: ${BRAND_DARK}; }
          .cd-row-trigger {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 0;
            border: none;
            background: transparent;
            font-size: 0.86rem;
            font-weight: 600;
            color: #0f172a;
            cursor: pointer;
          }
        `}</style>

        {/* Top Bar */}
        <div className="cd-topbar">
          <button onClick={onBack}
            className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
            style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}>
            <FaArrowLeft size={12} /> Back
          </button>
          <button onClick={onEdit}
            className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-4 py-2"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, color: "#fff", cursor: "pointer", fontSize: "0.85rem" }}>
            <FaEdit size={12} /> Edit Customer
          </button>
        </div>

        {/* One continuous page — hairline section dividers */}
        <div style={{ backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #eef2f0", flex: 1, display: "flex", flexDirection: "column" }}>

          {/* Header: identity + company + status */}
          <div className="d-flex align-items-center gap-3 flex-wrap p-4">
            <Avatar name={c.name} size={56} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <h5 className="fw-bold mb-0" style={{ color: "#0f172a", fontSize: "1.05rem" }}>{c.name}</h5>
              {c.company && (
                <div className="d-flex align-items-center gap-1" style={{ color: "#64748b", fontSize: "0.8rem" }}>
                  <FaBuilding size={10} /> {c.company}
                </div>
              )}
            </div>
            <span className="rounded-pill px-3 py-1 fw-semibold"
              style={{ fontSize: "0.75rem", backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
              {c.status}
            </span>
            {c.totalBilled > 0 && (
              <div className="d-flex align-items-center gap-1" style={{ fontSize: "0.82rem", color: BRAND_DARK, fontWeight: 700 }}>
                <FaRupeeSign size={11} />{c.totalBilled.toLocaleString()}
              </div>
            )}
          </div>

          {c.tags?.length > 0 && (
            <div className="d-flex gap-2 flex-wrap px-4 pb-4">
              {c.tags.map(tag => (
                <span key={tag} className="rounded-pill px-3 py-1"
                  style={{ fontSize: "0.72rem", fontWeight: 600, backgroundColor: BRAND_SOFT, color: BRAND_DARK, border: `1px solid ${BRAND_SOFT_BORDER}` }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid #f1f5f9" }} />

          {/* Contact rows */}
          <div className="px-4">
            {rows.map((row, i) => (
              <ContactRow key={row.key} icon={row.icon} label={row.label} last={i === rows.length - 1}>
                {row.content}
              </ContactRow>
            ))}
          </div>

          {/* Notes */}
          {notes.length > 0 && (
            <div className="mx-4 mb-4 p-3" style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10 }}>
              <div className="fw-bold mb-2 d-flex align-items-center gap-2" style={{ color: "#92400e", fontSize: "0.82rem" }}>
                <FaStickyNote size={12} /> Notes {notes.length > 1 && `(${notes.length})`}
              </div>
              <div className="d-flex flex-column gap-1">
                {notes.map((note, i) => (
                  <div key={i} style={{ color: "#78350f", fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-line" }}>• {note}</div>

                ))}
              </div>
            </div>
          )}

          {/* Spacer pushes quick actions to the bottom of the card */}
          <div style={{ flex: 1 }} />

          {/* Quick Actions */}
          <div className="row g-2 px-4 pb-4">
            <div className="col-4">
              <ActionCombo
                href={`mailto:${activeEmail}`}
                icon={<FaEnvelope size={15} />}
                label="Email"
                entries={emailEntries}
                selectedIdx={selectedEmailIdx}
                onSelect={setSelectedEmailIdx}
                renderOption={(e) => `${e.type}: ${e.value}`}
              />
            </div>
            <div className="col-4">
              <ActionCombo
                href={`tel:+${dialDigits(DEFAULT_CODE, activePhone)}`}
                icon={<FaPhone size={15} />}
                label="Call"
                entries={phoneEntries}
                selectedIdx={selectedPhoneIdx}
                onSelect={setSelectedPhoneIdx}
                renderOption={(e) => e.value}
              />
            </div>
            <div className="col-4">
              <ActionCombo
                href={`https://wa.me/${dialDigits(DEFAULT_CODE, activeWhatsapp)}`}
                external
                icon={<FaWhatsapp size={15} />}
                label="WhatsApp"
                entries={whatsappEntries}
                selectedIdx={selectedWhatsappIdx}
                onSelect={setSelectedWhatsappIdx}
                renderOption={(e) => e.value}
              />
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT: Activity summary — quotations & invoices linked to this customer */}
      <div style={{ flex: "1 1 340px", minWidth: 300, display: "flex", flexDirection: "column" }}>
        <div style={{ backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #eef2f0", padding: "20px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="fw-bold mb-3" style={{ color: "#0f172a", fontSize: "0.95rem" }}>Activity Summary</div>

          <div className="d-flex flex-column gap-3">
            <div className="d-flex align-items-center justify-content-between p-3" style={{ backgroundColor: "#f5f3ff", borderRadius: 10, border: "1px solid #ddd6fe" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#7c3aed", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Quotations</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>{customerQuotations.length}</div>
              </div>
              <div className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: 40, height: 40, backgroundColor: "#ede9fe", color: "#7c3aed" }}>
                <FaStickyNote size={16} />
              </div>
            </div>

            <div className="d-flex align-items-center justify-content-between p-3" style={{ backgroundColor: BRAND_SOFT, borderRadius: 10, border: `1px solid ${BRAND_SOFT_BORDER}` }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: BRAND_DARK, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Invoices</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>{customerInvoices.length}</div>
              </div>
              <div className="d-flex align-items-center justify-content-center rounded-3"
                style={{ width: 40, height: 40, backgroundColor: "#d7ebe3", color: BRAND_DARK }}>
                <FaRupeeSign size={16} />
              </div>
            </div>

            {customerInvoices.length > 0 && (
              <div className="d-flex align-items-center justify-content-between pt-2" style={{ borderTop: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Total Invoiced</span>
                <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 700 }}>₹{totalInvoiceValue.toLocaleString()}</span>
              </div>
            )}

            {customerInvoices.length > 0 && (
              <div className="d-flex align-items-center justify-content-between pt-1">
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Total Received</span>
                <span style={{ fontSize: "0.95rem", color: "#059669", fontWeight: 700 }}>₹{totalReceivedValue.toLocaleString()}</span>
              </div>
            )}

            {customerQuotations.length === 0 && customerInvoices.length === 0 && (
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", padding: "8px 0" }}>
                No quotations or invoices yet for this customer.
              </div>
            )}
          </div>

          {/* Recent Activity feed */}
          {recentActivity.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "10px" }}>
                Recent Activity
              </div>
              <div className="d-flex flex-column">
                {recentActivity.map((item, i) => (
                  <div key={i} className="d-flex align-items-center justify-content-between py-2"
                    style={{ borderBottom: i === recentActivity.length - 1 ? "none" : "1px solid #f1f5f9" }}>
                    <div className="d-flex align-items-center gap-2">
                      <span className="rounded-pill px-2 py-1"
                        style={{
                          fontSize: "0.65rem", fontWeight: 700,
                          backgroundColor: item.type === "Invoice" ? BRAND_SOFT : "#f5f3ff",
                          color: item.type === "Invoice" ? BRAND_DARK : "#7c3aed",
                          border: `1px solid ${item.type === "Invoice" ? BRAND_SOFT_BORDER : "#ddd6fe"}`,
                        }}>
                        {item.type}
                      </span>
                      <div>
                        <div style={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600 }}>{item.number}</div>
                        {item.date && (
                          <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                            {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                      ₹{item.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spacer fills leftover space so the card matches the left column's height */}
          <div style={{ flex: 1 }} />
        </div>
      </div>

    </div>
  );
}