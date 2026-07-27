import { useState } from "react";
import { FaArrowLeft, FaEdit, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBuilding, FaWhatsapp, FaRupeeSign, FaHeadset, FaStickyNote, FaChevronDown } from "react-icons/fa";

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


export default function CustomerDetail({ customer: c, onBack, onEdit, quotations = [], invoices = [] }) {
  const sc = statusConfig[c.status];

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
  const totalInvoiceValue = customerInvoices.reduce((sum, inv) => {
    const subtotal = (inv.items || []).reduce((a, b) => a + Number(b.amount || 0), 0);
    const gstPercent = Number(inv.gstPercent || 18);
    const tax = inv.gstType === "With GST" ? Math.round(subtotal * (gstPercent / 100)) : 0;
    return sum + (inv.gstType === "With GST" ? subtotal + tax : subtotal);
  }, 0);

  // Only invoices actually marked Paid count as money received — an Unpaid
  // or Overdue invoice has been billed, but not yet collected.
  const totalReceivedValue = customerInvoices
    .filter(inv => inv.status === "Paid")
    .reduce((sum, inv) => {
      const subtotal = (inv.items || []).reduce((a, b) => a + Number(b.amount || 0), 0);
      const gstPercent = Number(inv.gstPercent || 18);
      const tax = inv.gstType === "With GST" ? Math.round(subtotal * (gstPercent / 100)) : 0;
      return sum + (inv.gstType === "With GST" ? subtotal + tax : subtotal);
    }, 0);

  const phoneNumbers = normalizeValues(c.phones, c.phone);
  const addressValues = normalizeValues(c.addresses, c.address);
  const notes = normalizeNotes(c.notes);

  // Merge quotations + invoices into a single "recent activity" feed, newest first.
  const recentActivity = [
    ...customerQuotations.map(q => ({
      type: "Quotation",
      number: q.id,
      date: q.date,
      amount: Number(q.amount || 0),
    })),
    ...customerInvoices.map(inv => {
      const subtotal = (inv.items || []).reduce((a, b) => a + Number(b.amount || 0), 0);
      const gstPercent = Number(inv.gstPercent || 18);
      const tax = inv.gstType === "With GST" ? Math.round(subtotal * (gstPercent / 100)) : 0;
      return {
        type: "Invoice",
        number: inv.invoiceNo || "—",
        date: inv.date || inv.createdAt || inv.issueDate || null,
        amount: inv.gstType === "With GST" ? subtotal + tax : subtotal,
      };
    }),
  ]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 6);

  const [selectedPhoneIdx, setSelectedPhoneIdx] = useState(0);
  const activePhone = phoneNumbers[selectedPhoneIdx] ?? phoneNumbers[0] ?? "";

  // Build the ordered list of rows to render, so "last" (no border) is easy to compute
  const rows = [
    c.email && { key: "email", icon: <FaEnvelope size={13} />, label: "Email", content: <div style={{ fontSize: "0.86rem", color: "#0f172a", fontWeight: 600 }}>{c.email}</div> },
    phoneNumbers.length > 0 && {
      key: "phone", icon: <FaPhone size={13} />, label: "Phone",
      content: phoneNumbers.length > 1 ? (
        <div className="d-flex align-items-center gap-1">
          <select className="cd-phone-select" value={selectedPhoneIdx} onChange={e => setSelectedPhoneIdx(Number(e.target.value))}>
            {phoneNumbers.map((num, i) => <option key={i} value={i}>{num}</option>)}
          </select>
          <FaChevronDown size={9} color="#64748b" style={{ marginLeft: -14, pointerEvents: "none" }} />
        </div>
      ) : (
        <div style={{ fontSize: "0.86rem", color: "#0f172a", fontWeight: 600 }}>{phoneNumbers[0]}</div>
      ),
    },
    c.supportNumber && { key: "support", icon: <FaHeadset size={13} />, label: "Support Number", content: <div style={{ fontSize: "0.86rem", color: "#0f172a", fontWeight: 600 }}>{c.supportNumber}</div> },
    ...addressValues.map((addr, i) => ({
      key: `addr-${i}`, icon: <FaMapMarkerAlt size={13} />,
      label: addressValues.length > 1 ? `Address ${i + 1}` : "Address",
      content: <div style={{ fontSize: "0.86rem", color: "#0f172a", fontWeight: 600 }}>{addr}</div>,
    })),
    // These only appear if your customer record actually has the field — safe to keep even if unused.
    c.gstNumber && { key: "gst", icon: <FaBuilding size={13} />, label: "GSTIN", content: <div style={{ fontSize: "0.86rem", color: "#0f172a", fontWeight: 600 }}>{c.gstNumber}</div> },
    c.website && { key: "website", icon: <FaBuilding size={13} />, label: "Website", content: <div style={{ fontSize: "0.86rem", color: "#0f172a", fontWeight: 600 }}>{c.website}</div> },
    (c.createdAt || c.customerSince) && {
      key: "since", icon: <FaBuilding size={13} />, label: "Customer Since",
      content: <div style={{ fontSize: "0.86rem", color: "#0f172a", fontWeight: 600 }}>
        {new Date(c.createdAt || c.customerSince).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </div>,
    },
  ].filter(Boolean);


 return (
    <div style={{
      maxWidth: "1280px",
      width: "100%",
      display: "flex",
      gap: "20px",
      alignItems: "stretch",       // <-- was "flex-start"; now both columns stretch to the tallest one
      flexWrap: "wrap",
      minHeight: "calc(100vh - 140px)", // fills the remaining viewport height under your topbar
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
        .cd-phone-select {
          appearance: none;
          -webkit-appearance: none;
          background: transparent;
          border: none;
          outline: none;
          font-size: 0.86rem;
          color: #0f172a;
          font-weight: 600;
          cursor: pointer;
          padding-right: 18px;
        }
        .cd-action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
          color: ${BRAND_DARK};
          background: ${BRAND_SOFT};
          border: 1px solid ${BRAND_SOFT_BORDER};
          transition: background-color 0.15s;
        }
        .cd-action:hover { background: #dcefe9; color: ${BRAND_DARK}; }
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

      {/* One continuous page — no stacked shadow boxes, just hairline section dividers */}
      <div style={{ backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #eef2f0", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header: identity + company + status all on one line, no separate card */}
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

        {/* Contact rows — plain list, no per-row card/shadow, Company removed (shown above already) */}
        <div className="px-4">
          {rows.map((row, i) => (
            <ContactRow key={row.key} icon={row.icon} label={row.label} last={i === rows.length - 1}>
              {row.content}
            </ContactRow>
          ))}
        </div>

        {/* Notes — still visually distinct (yellow) since it's a callout, but flows inline */}
        {notes.length > 0 && (
          <div className="mx-4 mb-4 p-3" style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10 }}>
            <div className="fw-bold mb-2 d-flex align-items-center gap-2" style={{ color: "#92400e", fontSize: "0.82rem" }}>
              <FaStickyNote size={12} /> Notes {notes.length > 1 && `(${notes.length})`}
            </div>
            <div className="d-flex flex-column gap-1">
              {notes.map((note, i) => (
                <div key={i} style={{ color: "#78350f", fontSize: "0.85rem", lineHeight: 1.6 }}>• {note}</div>
              ))}
            </div>
          </div>
        )}

        {/* Spacer pushes quick actions to the bottom of the card so the card fills available height */}
        <div style={{ flex: 1 }} />

        {/* Quick Actions — soft brand tint, not full solid blocks */}
          <div className="row g-2 px-4 pb-4">
          <div className="col-4">
            <a href={`mailto:${c.email}`} className="cd-action"><FaEnvelope size={15} /> Email</a>
          </div>
          <div className="col-4">
            <a href={`tel:${activePhone}`} className="cd-action"><FaPhone size={15} /> Call</a>
          </div>
          <div className="col-4">
            <a href={`https://wa.me/91${activePhone}`} target="_blank" rel="noopener noreferrer" className="cd-action">
              <FaWhatsapp size={15} /> WhatsApp
            </a>
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

        {/* Recent Activity feed — fills the remaining space with something actually useful */}
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

        {/* Spacer fills any leftover space so the card still matches the left column's height */}
        <div style={{ flex: 1 }} />
      </div>
    </div>

  </div>
  );
}