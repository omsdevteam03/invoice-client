import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaTachometerAlt, FaUsers, FaFileAlt,
  FaFileInvoiceDollar, FaCog,
  FaSignOutAlt, FaMoneyBillWave
} from "react-icons/fa";
import useAuth from "../../hooks/useAuth";

const SIDEBAR_WIDTH = 72; // change this single value to resize the rail

const mainLinks = [
  { to: "/", icon: FaTachometerAlt, label: "Dashboard", accent: "#f97316", light: "#fff7ed" },
  { to: "/customers", icon: FaUsers, label: "Customers", accent: "#8b5cf6", light: "#f5f3ff" },
  { to: "/quotations", icon: FaFileAlt, label: "Quotations", accent: "#3b82f6", light: "#eff6ff" },
  { to: "/invoices", icon: FaFileInvoiceDollar, label: "Invoices", accent: "#10b981", light: "#ecfdf5" },
  // { to: "/expenses", icon: FaMoneyBillWave, label: "Expenses", accent: "#ef4444", light: "#fef2f2" },
];

const generalLinks = [
  { to: "/settings", icon: FaCog, label: "Settings", accent: "#64748b", light: "#f8fafc" },
];

function NavItem({ to, icon: Icon, label, accent, light, end }) {
  const [hovered, setHovered] = useState(false);

  return (
    <NavLink to={to} end={end} style={{ textDecoration: "none" }}>
      {({ isActive }) => (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: 10 }}
        >
          <div
            style={{
              width: 42, height: 42, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
              background: isActive
                ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
                : (hovered ? light : "transparent"),
              color: isActive ? "#fff" : (hovered ? accent : "#64748b"),
              boxShadow: isActive ? `0 4px 14px ${accent}40` : "none",
              transition: "all 0.18s ease",
            }}
          >
            <Icon size={16} />
          </div>

          {/* Tooltip */}
          {hovered && (
            <div
              style={{
                position: "absolute", left: "100%", top: "50%",
                transform: "translateY(-50%)", marginLeft: 10,
                background: "#0f172a", color: "#fff",
                fontSize: "0.75rem", fontWeight: 600,
                padding: "6px 10px", borderRadius: 8,
                whiteSpace: "nowrap", zIndex: 10000,
                boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                pointerEvents: "none",
              }}
            >
              {label}
            </div>
          )}
        </div>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [logoutHovered, setLogoutHovered] = useState(false);

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
          width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH, height: "100%",
          background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 40%, #eff6ff 100%)",
          display: "flex", flexDirection: "column", alignItems: "center",
          borderRight: "1.5px solid #fed7aa", overflowY: "auto", overflowX: "visible",
        }}
      >
        {/* User Profile (avatar only) */}
        <div style={{
          padding: "20px 0", borderBottom: "1.5px solid #fde8cc",
          flexShrink: 0, width: "100%", display: "flex", justifyContent: "center",
          background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
        }}>
          <div
            title="Admin User · admin@test.com"
            style={{
              width: 40, height: 40,
              background: "linear-gradient(135deg,#f97316,#ea580c)",
              borderRadius: "12px", display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: 700, color: "#fff",
              fontSize: "0.95rem", flexShrink: 0, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(249,115,22,0.35)",
            }}
          >
            A
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: "16px 8px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          {mainLinks.map(link => (
            <NavItem key={link.to} {...link} end={link.to === "/"} />
          ))}

          <div style={{
            width: "70%", height: 1,
            background: "linear-gradient(90deg, transparent, #fed7aa, transparent)",
            margin: "8px 0 14px",
          }} />

          {generalLinks.map(link => (
            <NavItem key={link.to} {...link} />
          ))}
        </div>

        {/* Bottom */}
        <div style={{
          padding: "12px 0", borderTop: "1.5px solid #fde8cc",
          flexShrink: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
        }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowConfirm(true)}
              onMouseEnter={() => setLogoutHovered(true)}
              onMouseLeave={() => setLogoutHovered(false)}
              style={{
                width: 40, height: 40, borderRadius: 10, border: "none",
                backgroundColor: logoutHovered ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)",
                color: "#ef4444", cursor: "pointer", transition: "all 0.18s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <FaSignOutAlt size={15} color="#ef4444" />
            </button>

            {logoutHovered && (
              <div
                style={{
                  position: "absolute", left: "100%", top: "50%",
                  transform: "translateY(-50%)", marginLeft: 10,
                  background: "#0f172a", color: "#fff",
                  fontSize: "0.75rem", fontWeight: 600,
                  padding: "6px 10px", borderRadius: 8,
                  whiteSpace: "nowrap", zIndex: 10000,
                  boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                  pointerEvents: "none",
                }}
              >
                Logout
              </div>
            )}
          </div>

          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            backgroundColor: "#10b981", display: "inline-block",
          }} title="Live" />
        </div>
      </div>

      {/* ── Logout Confirmation Modal (unchanged) ── */}
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