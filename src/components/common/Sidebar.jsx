import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt, FaUsers, FaFileAlt,
  FaFileInvoiceDollar, FaCog,
  FaSignOutAlt
} from "react-icons/fa";
import useAuth from "../../hooks/useAuth";

const mainLinks = [
  { to: "/", icon: FaTachometerAlt, label: "Dashboard", accent: "#f97316", light: "#fff7ed" },
  { to: "/customers", icon: FaUsers, label: "Customers", accent: "#8b5cf6", light: "#f5f3ff" },
  { to: "/quotations", icon: FaFileAlt, label: "Quotations", accent: "#3b82f6", light: "#eff6ff" },
  { to: "/invoices", icon: FaFileInvoiceDollar, label: "Invoices", accent: "#10b981", light: "#ecfdf5" },
];

const generalLinks = [
  { to: "/settings", icon: FaCog, label: "Settings", accent: "#64748b", light: "#f8fafc" },
];

function NavItem({ to, icon: Icon, label, accent, light, end }) {
  return (
    <NavLink to={to} end={end} style={{ textDecoration: "none" }}>
      {({ isActive }) => (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 12, marginBottom: 4,
            fontSize: "0.875rem", fontWeight: isActive ? 700 : 500,
            color: isActive ? "#fff" : "#475569",
            background: isActive ? `linear-gradient(135deg, ${accent}, ${accent}bb)` : "transparent",
            boxShadow: isActive ? `0 4px 14px ${accent}40` : "none",
            transition: "all 0.18s ease", cursor: "pointer",
          }}
          onMouseEnter={e => {
            if (!isActive) {
              e.currentTarget.style.background = light;
              e.currentTarget.style.color = accent;
              e.currentTarget.style.transform = "translateX(4px)";
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#475569";
              e.currentTarget.style.transform = "translateX(0)";
            }
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: isActive ? "rgba(255,255,255,0.25)" : light,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, color: isActive ? "#fff" : accent,
          }}>
            <Icon size={15} />
          </div>
          {label}
        </div>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogoutConfirm = () => {
    logout();
    setShowConfirm(false);
    navigate("/login");
  };

  return (
    <>
      <div
        className="no-print"
        style={{
          width: "240px", minWidth: "240px", height: "100%",
          background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 40%, #eff6ff 100%)",
          display: "flex", flexDirection: "column",
          borderRight: "1.5px solid #fed7aa", overflowY: "auto",
        }}
      >
        {/* User Profile */}
        <div style={{
          padding: "20px 16px", borderBottom: "1.5px solid #fde8cc",
          flexShrink: 0, background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
        }}>
          <div className="d-flex align-items-center gap-3">
            <div style={{
              width: 42, height: 42,
              background: "linear-gradient(135deg,#f97316,#ea580c)",
              borderRadius: "12px", display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: 700, color: "#fff",
              fontSize: "1rem", flexShrink: 0,
              boxShadow: "0 4px 12px rgba(249,115,22,0.35)",
            }}>
              A
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ color: "#7c2d12", fontWeight: 700, fontSize: "0.88rem", lineHeight: 1.3 }}>
                Admin User
              </div>
              <div style={{ color: "#c2410c", fontSize: "0.73rem" }}>admin@test.com</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          <div style={{
            fontSize: "0.63rem", fontWeight: 800, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "#f97316",
            padding: "0 12px", marginBottom: 8,
          }}>
            Main Menu
          </div>

          {mainLinks.map(link => (
            <NavItem key={link.to} {...link} end={link.to === "/"} />
          ))}

          <div style={{
            height: 1,
            background: "linear-gradient(90deg, transparent, #fed7aa, transparent)",
            margin: "16px 4px",
          }} />

          <div style={{
            fontSize: "0.63rem", fontWeight: 800, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "#f97316",
            padding: "0 12px", marginBottom: 8,
          }}>
            General
          </div>

          {generalLinks.map(link => (
            <NavItem key={link.to} {...link} />
          ))}
        </div>

        {/* Bottom */}
        <div style={{
          padding: "12px", borderTop: "1.5px solid #fde8cc",
          flexShrink: 0, background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
        }}>
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", padding: "10px 14px",
              borderRadius: 12, border: "none",
              backgroundColor: "rgba(239,68,68,0.08)",
              color: "#ef4444", fontSize: "0.875rem",
              fontWeight: 600, cursor: "pointer", transition: "all 0.18s",
              marginBottom: 10,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.15)"; e.currentTarget.style.transform = "translateX(4px)"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"; e.currentTarget.style.transform = "translateX(0)"; }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              backgroundColor: "rgba(239,68,68,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FaSignOutAlt size={14} color="#ef4444" />
            </div>
            Logout
          </button>

          <div className="d-flex align-items-center justify-content-between px-2">
            <span style={{ color: "#c2410c", fontSize: "0.68rem", fontWeight: 600 }}>InvoicePro v1.0.0</span>
            <span style={{
              display: "flex", alignItems: "center", gap: 4,
              backgroundColor: "rgba(16,185,129,0.12)",
              color: "#059669", fontSize: "0.65rem", fontWeight: 700,
              padding: "3px 8px", borderRadius: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }} />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* ── Logout Confirmation Modal ── */}
      {showConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 20,
              padding: "32px 28px", maxWidth: 360, width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              textAlign: "center",
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
              background: "linear-gradient(135deg,#fef2f2,#fee2e2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FaSignOutAlt size={22} color="#ef4444" />
            </div>

            <h5 style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8, fontSize: "1.1rem" }}>
              Logout?
            </h5>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: 24, lineHeight: 1.6 }}>
             do u want to logout
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10,
                  border: "1.5px solid #e2e8f0", background: "#f8fafc",
                  color: "#475569", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: "#fff", fontWeight: 600, fontSize: "0.88rem",
                  cursor: "pointer", boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
