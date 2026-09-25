import { useState } from "react";
import { FaTimes, FaCheck } from "react-icons/fa";

const STYLE_LABELS = {
  classic: "Classic Formal",
  creative: "Warm Friendly",
  bold: "Bold Editorial",
  modern: "Dark Tech",
  corporate: "Corporate Blue",
  minimal: "Minimal",
};

export default function QuotationTemplate({ templates, onClose, onSelect, onCustom, currentTemplateStyle }) {
  const [selectedId, setSelectedId] = useState(() => {
    if (!currentTemplateStyle) return null;
    const match = templates.find((t) => t.templateStyle === currentTemplateStyle);
    return match ? match.id : (currentTemplateStyle === "default" ? "custom" : null);
  });
  const handleSelect = (tpl) => {
    setSelectedId(tpl.id);
    onSelect(tpl);
  };

  const handleCustom = () => {
    setSelectedId("custom");
    onCustom ? onCustom() : onSelect(null);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(15,23,42,0.8)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
              style={{
          backgroundColor: "#fff", borderRadius: "20px", width: "100%", maxWidth: "760px",
          maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="d-flex justify-content-between align-items-center px-4 py-3"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          <div>
            <div className="fw-bold" style={{ color: "#0f172a", fontSize: "1.1rem" }}>
              Choose a Template
            </div>
            <div className="small" style={{ color: "#94a3b8" }}>
              Pick a look — you can edit everything after
            </div>
          </div>
          <button
            onClick={onClose}
            className="border-0 rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 36, height: 36, backgroundColor: "#f1f5f9", color: "#64748b", cursor: "pointer" }}
          >
            <FaTimes size={13} />
          </button>
        </div>

        {/* Template Grid */}
        <div style={{ padding: "24px" }}>
          <div className="row g-3">
            {templates.map((tpl) => {
              const isSelected = selectedId === tpl.id;
              return (
                <div className="col-6 col-md-4" key={tpl.id}>
                  <div
                    onClick={() => handleSelect(tpl)}
                    style={{
                      position: "relative",
                      border: isSelected ? `2px solid ${tpl.color}` : "1.5px solid #e2e8f0",
                      borderRadius: "16px",
                      cursor: "pointer",
                      transition: "all 0.18s",
                      overflow: "hidden",
                      backgroundColor: "#fff",
                      boxShadow: isSelected ? `0 6px 20px ${tpl.color}33` : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = tpl.color;
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = `0 6px 20px ${tpl.color}22`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          position: "absolute", top: 10, right: 10, width: 22, height: 22,
                          borderRadius: "50%", backgroundColor: tpl.color, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <FaCheck size={10} />
                      </div>
                    )}

                    <div style={{ height: 56, background: tpl.bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                      {tpl.icon}
                    </div>

                    <div className="p-3 text-center">
                      <div className="fw-bold" style={{ color: "#0f172a", fontSize: "1rem", marginBottom: 12 }}>
                        {STYLE_LABELS[tpl.templateStyle] || tpl.title}
                      </div>

                      <div
                        className="d-flex align-items-center justify-content-center gap-1 py-2 rounded-3 fw-semibold"
                        style={{
                          backgroundColor: isSelected ? tpl.color : "#f8fafc",
                          color: isSelected ? "#fff" : "#475569",
                          fontSize: "0.75rem",
                          border: isSelected ? "none" : "1px solid #e2e8f0",
                        }}
                      >
                        {isSelected ? "Selected" : "Use Template"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Custom / blank template card */}
            <div className="col-6 col-md-4">
              <div
                onClick={handleCustom}
                style={{
                  border: selectedId === "custom" ? "2px solid #1F6F5C" : "1.5px dashed #cbd5e1",
                  borderRadius: "16px", cursor: "pointer", transition: "all 0.18s", overflow: "hidden",
                  height: "100%", display: "flex", flexDirection: "column",
                  boxShadow: selectedId === "custom" ? "0 6px 20px rgba(31,111,92,0.18)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (selectedId !== "custom") {
                    e.currentTarget.style.borderColor = "#1F6F5C";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(31,111,92,0.12)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedId !== "custom") {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                <div className="p-3 d-flex flex-column align-items-center justify-content-center text-center flex-fill" style={{ minHeight: 158 }}>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-3 mb-2"
                    style={{ width: 40, height: 40, background: "#f1f5f9", color: "#1F6F5C", fontSize: "1.3rem", fontWeight: 700 }}
                  >
                    +
                  </div>
                  <div className="fw-bold mb-1" style={{ color: "#0f172a", fontSize: "0.9rem" }}>
                    Customize Your Own
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Start blank</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}