import { FaTimes, FaChevronRight } from "react-icons/fa";

export default function QuotationTemplate({ templates, onClose, onSelect }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(15,23,42,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "#fff", borderRadius: "20px", width: "100%", maxWidth: "900px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="d-flex justify-content-between align-items-center px-4 py-3"
          style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <div className="fw-bold" style={{ color: "#0f172a", fontSize: "1.1rem" }}>Choose a Template</div>
            <div className="small" style={{ color: "#94a3b8" }}>All fields editable after selection</div>
          </div>
          <button onClick={onClose}
            className="border-0 rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 36, height: 36, backgroundColor: "#f1f5f9", color: "#64748b", cursor: "pointer" }}>
            <FaTimes size={13} />
          </button>
        </div>

        {/* Template Grid */}
        <div style={{ overflowY: "auto", padding: "20px" }}>
          <div className="row g-3">
            {templates.map((tpl) => (
              <div className="col-12 col-md-6 col-lg-4" key={tpl.id}>
                <div
                  style={{ border: "1.5px solid #e2e8f0", borderRadius: "14px", cursor: "pointer", transition: "all 0.18s", overflow: "hidden" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(249,115,22,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                  onClick={() => onSelect(tpl)}
                >
                  <div style={{ height: 3, background: tpl.bg }} />
                  <div className="p-3">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                        style={{ width: 40, height: 40, background: tpl.bg, color: "#fff" }}>
                        {tpl.icon}
                      </div>
                      <div>
                        <div className="fw-bold" style={{ color: "#0f172a", fontSize: "0.88rem" }}>{tpl.title}</div>
                        <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{tpl.subtitle}</div>
                      </div>
                    </div>
                    <div style={{ height: 1, backgroundColor: "#f1f5f9", marginBottom: 10 }} />
                    <div className="d-flex flex-column gap-1">
                      <div className="d-flex justify-content-between">
                        <span style={{ fontSize: "0.73rem", color: "#94a3b8" }}>Timeline</span>
                        <span style={{ fontSize: "0.73rem", color: "#475569", fontWeight: 600 }}>{tpl.timeline}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span style={{ fontSize: "0.73rem", color: "#94a3b8" }}>Starting at</span>
                        <span style={{ fontSize: "0.73rem", fontWeight: 700, color: tpl.color }}>₹{tpl.amount.toLocaleString()}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span style={{ fontSize: "0.73rem", color: "#94a3b8" }}>Tech</span>
                        <span style={{ fontSize: "0.73rem", color: "#475569" }}>{tpl.tech}</span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-center gap-1 mt-3 py-2 rounded-3 fw-semibold"
                      style={{ backgroundColor: "#f8fafc", color: "#475569", fontSize: "0.75rem", border: "1px solid #e2e8f0" }}>
                      Use Template <FaChevronRight size={9} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}