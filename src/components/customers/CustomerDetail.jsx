import { FaArrowLeft, FaEdit, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaBuilding, FaWhatsapp, FaRupeeSign, FaClock } from "react-icons/fa";

const avatarGradients = [
  "linear-gradient(135deg,#f97316,#ea580c)",
  "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#ec4899,#db2777)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
];

const statusConfig = {
  Active: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  Inactive: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  Lead: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
};

function Avatar({ name, size = 72 }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const grad = avatarGradients[name.charCodeAt(0) % avatarGradients.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "20px",
      background: grad, display: "flex", alignItems: "center",
      justifyContent: "center", color: "#fff", fontWeight: 700,
      fontSize: "1.5rem", flexShrink: 0,
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    }}>
      {initials}
    </div>
  );
}

export default function CustomerDetail({ customer: c, onBack, onEdit }) {
  const sc = statusConfig[c.status];
  // ✅ Fix
const monthsKnown = (c.since || c.createdAt)
  ? Math.max(0, Math.floor((Date.now() - new Date(c.since || c.createdAt)) / (1000 * 60 * 60 * 24 * 30)))
  : null;

  const grad = avatarGradients[c.name.charCodeAt(0) % avatarGradients.length];

  return (
    <div style={{ maxWidth: "800px" }}>

      {/* Top Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button onClick={onBack}
          className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-3 py-2"
          style={{ backgroundColor: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "0.85rem" }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "#e2e8f0"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "#f1f5f9"}>
          <FaArrowLeft size={12} /> Back
        </button>
        <button onClick={onEdit}
          className="d-flex align-items-center gap-2 border-0 rounded-3 fw-semibold px-4 py-2"
          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", cursor: "pointer", fontSize: "0.85rem", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }}>
          <FaEdit size={12} /> Edit Customer
        </button>
      </div>

      {/* Profile Banner */}
      <div className="card border-0 mb-3 overflow-hidden" style={{ borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <div style={{ height: 80}} />
        <div className="px-4 pb-4" style={{ marginTop: -48 }}>
          <div className="d-flex align-items-end gap-3 mb-3">
            <Avatar name={c.name} size={72} />
            <div className="pb-1">
              <h5 className="fw-bold mb-1" style={{ color: "#0f172a", fontSize: "1.2rem" }}>{c.name}</h5>
              {c.company && <div style={{ color: "#64748b", fontSize: "0.82rem" }}>🏢 {c.company}</div>}
            </div>
            <div className="ms-auto pb-1 d-flex gap-2">
              <span className="rounded-pill px-3 py-1 fw-semibold"
                style={{ fontSize: "0.75rem", backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                {c.status}
              </span>
              <span className="rounded-pill px-3 py-1 fw-semibold"
                style={{ fontSize: "0.75rem", backgroundColor: c.type === "Business" ? "#f5f3ff" : "#fff7ed", color: c.type === "Business" ? "#8b5cf6" : "#f97316" }}>
                {c.type}
              </span>
            </div>
          </div>

          {/* Tags */}
          {c.tags?.length > 0 && (
            <div className="d-flex gap-2 flex-wrap mb-1">
              {c.tags.map(tag => (
                <span key={tag} className="rounded-pill px-3 py-1"
                  style={{ fontSize: "0.72rem", fontWeight: 600, backgroundColor: "#fff7ed", color: "#f97316", border: "1px solid #fed7aa" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="row g-3 mb-3">
        {[
          { label: "Total Billed", value: c.totalBilled > 0 ? `₹${c.totalBilled.toLocaleString()}` : "—", bg: "linear-gradient(135deg,#f97316,#ea580c)", icon: <FaRupeeSign size={16} /> },
          { label: "Relationship", value: monthsKnown !== null ? `${monthsKnown} months` : "—", bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)", icon: <FaClock size={16} /> },
          { label: "Customer Since", value: c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—", bg: "linear-gradient(135deg,#10b981,#059669)", icon: <FaCalendarAlt size={16} /> },
        ].map(({ label, value, bg, icon }) => (
          <div className="col-4" key={label}>
            <div className="card border-0 p-3 text-center h-100" style={{ borderRadius: "14px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div className="d-flex align-items-center justify-content-center rounded-3 mx-auto mb-2"
                style={{ width: 36, height: 36, background: bg, color: "#fff" }}>{icon}</div>
              <div className="fw-bold" style={{ color: "#0f172a", fontSize: "1rem" }}>{value}</div>
              <div style={{ color: "#94a3b8", fontSize: "0.7rem" }}>{label}</div>
              <div style={{ height: 3, background: bg, margin: "8px -16px -16px" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Contact Info */}
      <div className="card border-0 mb-3 p-4" style={{ borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
        <div className="fw-bold mb-3" style={{ color: "#0f172a", fontSize: "0.9rem" }}>Contact Information</div>
        <div className="d-flex flex-column gap-3">
          {[
            { icon: <FaEnvelope size={15} color="#3b82f6" />, label: "Email", value: c.email, bg: "#eff6ff" },
            { icon: <FaPhone size={15} color="#10b981" />, label: "Phone", value: c.phone, bg: "#ecfdf5" },
            c.address && { icon: <FaMapMarkerAlt size={15} color="#f97316" />, label: "Address", value: c.address, bg: "#fff7ed" },
            c.since && { icon: <FaCalendarAlt size={15} color="#8b5cf6" />, label: "Customer Since", value: new Date(c.since).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }), bg: "#f5f3ff" },
            c.company && { icon: <FaBuilding size={15} color="#64748b" />, label: "Company", value: c.company, bg: "#f8fafc" },
          ].filter(Boolean).map(({ icon, label, value, bg }) => (
            <div key={label} className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ backgroundColor: bg }}>
              <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                style={{ width: 36, height: 36, backgroundColor: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                <div style={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {c.notes && (
        <div className="card border-0 mb-3 p-4" style={{ borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
          <div className="fw-bold mb-2" style={{ color: "#92400e", fontSize: "0.85rem" }}>📝 Notes</div>
          <div style={{ color: "#78350f", fontSize: "0.88rem", lineHeight: 1.7 }}>{c.notes}</div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="row g-3">
        <div className="col-4">
          <a href={`mailto:${c.email}`}
            className="d-flex flex-column align-items-center justify-content-center gap-2 p-3 text-decoration-none rounded-3"
            style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", color: "#fff", borderRadius: "14px", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }}>
            <FaEnvelope size={22} />
            <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Email</span>
          </a>
        </div>
        <div className="col-4">
          <a href={`tel:${c.phone}`}
            className="d-flex flex-column align-items-center justify-content-center gap-2 p-3 text-decoration-none rounded-3"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", borderRadius: "14px", boxShadow: "0 4px 14px rgba(16,185,129,0.35)" }}>
            <FaPhone size={22} />
            <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Call</span>
          </a>
        </div>
        <div className="col-4">
          <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noopener noreferrer"
            className="d-flex flex-column align-items-center justify-content-center gap-2 p-3 text-decoration-none rounded-3"
            style={{ background: "linear-gradient(135deg,#25d366,#128c7e)", color: "#fff", borderRadius: "14px", boxShadow: "0 4px 14px rgba(37,211,102,0.35)" }}>
            <FaWhatsapp size={22} />
            <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>WhatsApp</span>
          </a>
        </div>
      </div>

    </div>
  );
}