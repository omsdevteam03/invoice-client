import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaFileInvoiceDollar, FaSignInAlt, FaUser, FaCog, FaSignOutAlt, FaChevronDown } from "react-icons/fa";import useAuth from "../../hooks/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notifCount] = useState(3);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <nav
        className="no-print d-flex justify-content-between align-items-center px-3 px-md-4 flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #1F6F5C, #2d8a73)",
          height: "62px",
          zIndex: 101,
          boxShadow: "0 2px 12px rgba(31,111,92,0.3)",
          position: "sticky",
          top: 0,
        }}
      >
        {/* Left: Logo */}
        <div className="d-flex align-items-center gap-3">
          <Link
            to="/"
            className="text-white fw-bold text-decoration-none d-flex align-items-center gap-2"
            style={{ fontSize: "1.15rem", letterSpacing: "-0.3px" }}
          >
            <FaFileInvoiceDollar size={22} />
            <span className="d-none d-sm-inline">InvoicePro</span>
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="d-flex align-items-center gap-2">

         

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.3)", margin: "0 4px" }} />

          {/* User Dropdown */}
          {user ? (
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowDropdown(prev => !prev)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  border: "1.5px solid rgba(255,255,255,0.35)",
                  borderRadius: 999, padding: "4px 12px 4px 5px",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  backgroundColor: "#fff", color: "#1F6F5C",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: "0.75rem", flexShrink: 0,
                }}>
                  {user?.name?.charAt(0).toUpperCase() || "A"}
                </div>
                <span style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 600 }}
                  className="d-none d-sm-inline">
                  {user?.name || "Admin User"}
                </span>
                <FaChevronDown size={10} color="#fff" style={{
                  transition: "transform 0.2s",
                  transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)"
                }} />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 10px)",
                  backgroundColor: "#fff", borderRadius: 14,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                  minWidth: 220, zIndex: 999,
                  border: "1px solid #f1f5f9",
                  overflow: "hidden",
                }}>
                  {/* Profile Info */}
                  <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#eaf5f2" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: "linear-gradient(135deg,#1F6F5C,#17534A)",
                        color: "#fff", display: "flex", alignItems: "center",
                        justifyContent: "center", fontWeight: 800, fontSize: "1rem",
                      }}>
                        {user?.name?.charAt(0).toUpperCase() || "A"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                          {user?.name || "Admin User"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          {user?.email || "admin@test.com"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div style={{ padding: "8px" }}>
                    <button
                      onClick={() => { setShowDropdown(false); setShowProfile(true); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", border: "none", borderRadius: 8,
                        backgroundColor: "transparent", cursor: "pointer",
                        fontSize: "0.85rem", color: "#334155", fontWeight: 500,
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <FaUser size={13} color="#1F6F5C" /> My Profile
                    </button>

                    <button
                      onClick={() => { setShowDropdown(false); navigate("/settings"); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", border: "none", borderRadius: 8,
                        backgroundColor: "transparent", cursor: "pointer",
                        fontSize: "0.85rem", color: "#334155", fontWeight: 500,
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <FaCog size={13} color="#1F6F5C" /> Settings
                    </button>

                    <div style={{ height: 1, backgroundColor: "#f1f5f9", margin: "6px 0" }} />

                    <button
                      onClick={() => { setShowDropdown(false); setShowLogoutConfirm(true); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", border: "none", borderRadius: 8,
                        backgroundColor: "transparent", cursor: "pointer",
                        fontSize: "0.85rem", color: "#ef4444", fontWeight: 500,
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#fef2f2"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <FaSignOutAlt size={13} color="#ef4444" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="btn fw-semibold rounded-pill px-3 d-flex align-items-center gap-2"
              style={{ backgroundColor: "#fff", color: "#1F6F5C", fontSize: "0.85rem" }}
            >
              <FaSignInAlt size={12} /> Login
            </Link>
          )}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          backgroundColor: "rgba(15,23,42,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            backgroundColor: "#fff", borderRadius: 16,
            padding: "32px", maxWidth: 360, width: "90%",
            boxShadow: "0 24px 64px rgba(0,0,0,0.2)", textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              backgroundColor: "#fef2f2", margin: "0 auto 16px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FaSignOutAlt size={22} color="#ef4444" />
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a", marginBottom: 8 }}>
              Do you want to logout?
            </div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: 24 }}>
              You will be redirected to the login page.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: "10px", border: "1.5px solid #e2e8f0",
                  borderRadius: 8, backgroundColor: "#fff", cursor: "pointer",
                  fontSize: "0.88rem", fontWeight: 600, color: "#475569",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                style={{
                  flex: 1, padding: "10px", border: "none",
                  borderRadius: 8, backgroundColor: "#ef4444", cursor: "pointer",
                  fontSize: "0.88rem", fontWeight: 600, color: "#fff",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          backgroundColor: "rgba(15,23,42,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onClick={() => setShowProfile(false)}
        >
          <div style={{
            backgroundColor: "#fff", borderRadius: 20,
            padding: "32px", maxWidth: 400, width: "90%",
            boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg,#1F6F5C,#17534A)",
                color: "#fff", display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 800, fontSize: "1.8rem",
                margin: "0 auto 12px",
              }}>
                {user?.name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>
                {user?.name || "Admin User"}
              </div>
              <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                {user?.email || "admin@test.com"}
              </div>
            </div>

            <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              {[
                { label: "Name", value: user?.name || "Admin User" },
                { label: "Email", value: user?.email || "admin@test.com" },
                { label: "Role", value: "Administrator" },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: "1px solid #e2e8f0",
                }}>
                  <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{label}</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0f172a" }}>{value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowProfile(false)}
              style={{
                width: "100%", padding: "10px", border: "none",
                borderRadius: 8, background: "linear-gradient(135deg,#1F6F5C,#17534A)",
                color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}