import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  FiHome, FiUsers, FiFileText, FiFile, FiBox,
  FiSettings, FiLogOut, FiZap, FiUserCheck, FiMoreHorizontal
} from "react-icons/fi";
import useAuth from "../../hooks/useAuth";

// Single accent used across the whole menu.
const ACCENT = "#1F6F5C";
const ACCENT_DARK = "#17534A";
const ACCENT_LIGHT = "#E8F5F1";
const ACCENT_SOFT = "#F0F8F5";

const SIDEBAR_WIDTH = 76;         // collapsed rail width (desktop only)
const SIDEBAR_EXPANDED_WIDTH = 216; // expanded width shown on hover (desktop only)

const mainLinks = [
  { to: "/", icon: FiHome, label: "Dashboard" },
    { to: "/products", icon: FiBox, label: "Products" },
  { to: "/customers", icon: FiUsers, label: "Customers" },
  { to: "/quotations", icon: FiFileText, label: "Quotations" },
  { to: "/invoices", icon: FiFile, label: "Invoices" },
  { to: "/users", icon: FiUserCheck, label: "Users" },
  { to: "/ai", icon: FiZap, label: "AI Assistant" },
];

const generalLinks = [
  { to: "/settings", icon: FiSettings, label: "Settings" },
];

const BAR_COUNT = 4; // icons shown in the mobile bottom bar; the rest go under the 3 dots

// All layout that must flip between "vertical icon rail" and "bottom tab bar"
// lives here, driven purely by a media query so no JS resize-listener is needed.
// The hover-to-expand behaviour is also pure CSS (:hover), so there's no
// re-render / flicker cost and it stays perfectly in sync with the mouse.
const SidebarStyles = () => (
  <style>{`
    .sidebar-rail {
      width: ${SIDEBAR_WIDTH}px; min-width: ${SIDEBAR_WIDTH}px; height: 100%;
      background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(250,252,251,0.92));
      backdrop-filter: blur(14px) saturate(140%);
      -webkit-backdrop-filter: blur(14px) saturate(140%);
      display: flex; flex-direction: column; align-items: stretch;
      border-right: 1px solid rgba(15,23,42,0.05);
      box-shadow: 4px 0 24px rgba(15,23,42,0.035);
      overflow-y: auto; overflow-x: hidden;
      box-sizing: border-box;
      transition: width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1);
      position: relative; z-index: 40;
    }
    .sidebar-rail:hover {
      width: ${SIDEBAR_EXPANDED_WIDTH}px; min-width: ${SIDEBAR_EXPANDED_WIDTH}px;
      box-shadow: 10px 0 40px rgba(15,23,42,0.09), 2px 0 8px rgba(15,23,42,0.04);
    }

    .sidebar-top {
      padding: 22px 0 18px; border-bottom: 1px solid rgba(15,23,42,0.05);
      flex-shrink: 0; width: 100%; display: flex; justify-content: center;
    }
    .sidebar-nav {
      flex: 1; padding: 18px 12px; display: flex; flex-direction: column;
      align-items: stretch; width: 100%; gap: 6px; box-sizing: border-box;
    }
    .sidebar-divider {
      height: 1px; margin: 10px 16px 14px;
      background: linear-gradient(90deg, transparent, rgba(15,23,42,0.08) 30%, rgba(15,23,42,0.08) 70%, transparent);
    }
    .sidebar-bottom {
      padding: 16px 0; border-top: 1px solid rgba(15,23,42,0.05);
      flex-shrink: 0; width: 100%; display: flex; flex-direction: column;
      align-items: center; gap: 10px;
    }

    /* Each row: fixed-size icon + label that grows in on hover */
    .nav-item-wrap {
      display: flex; align-items: center; width: 100%;
      border-radius: 14px; overflow: hidden;
      transition: background 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
      position: relative;
    }
    .nav-item-wrap.is-active {
      background: linear-gradient(135deg, ${ACCENT_LIGHT}, ${ACCENT_SOFT});
      box-shadow: inset 0 0 0 1px rgba(31,111,92,0.12), 0 1px 3px rgba(31,111,92,0.08);
    }
    .nav-item-wrap.is-active::before {
      content: ""; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px;
      border-radius: 0 3px 3px 0;
      background: linear-gradient(180deg, ${ACCENT}, ${ACCENT_DARK});
    }
    .nav-item-wrap.is-hover:not(.is-active) {
      background: rgba(15,23,42,0.035);
    }
    .nav-label {
      font-size: 0.86rem; font-weight: 600; letter-spacing: 0.01em; white-space: nowrap;
      max-width: 0; opacity: 0; margin-left: 0;
      transition: max-width 0.2s ease, opacity 0.15s ease, margin-left 0.2s ease;
      overflow: hidden;
    }
    .sidebar-rail:hover .nav-label {
      max-width: 160px; opacity: 1; margin-left: 12px;
    }

    .logo-mark {
      width: 42px; height: 42px; border-radius: 13px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; color: #fff; font-size: 0.95rem; flex-shrink: 0; cursor: pointer;
      background: linear-gradient(140deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%);
      box-shadow: 0 6px 16px rgba(31,111,92,0.32), inset 0 1px 0 rgba(255,255,255,0.25);
      transition: transform 0.16s ease, box-shadow 0.16s ease;
    }
    .logo-mark:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(31,111,92,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
    }

    .live-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 4px rgba(16,185,129,0.14), 0 0 8px rgba(16,185,129,0.5);
      animation: pulse-glow 2.4s ease-in-out infinite;
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 0 4px rgba(16,185,129,0.14), 0 0 8px rgba(16,185,129,0.5); }
      50% { box-shadow: 0 0 0 6px rgba(16,185,129,0.08), 0 0 12px rgba(16,185,129,0.65); }
    }

    @media (max-width: 760px) {
      .sidebar-rail {
        width: auto; min-width: 0; height: 62px;
        flex-direction: row; align-items: center; justify-content: space-between;
        border-right: none; border-top: none;
        position: fixed; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom, 0px));
        transform: translateX(-50%);
        max-width: calc(100% - 28px);
        border-radius: 32px;
        background: rgba(255,255,255,0.85);
        backdrop-filter: blur(18px) saturate(160%);
        -webkit-backdrop-filter: blur(18px) saturate(160%);
        box-shadow: 0 14px 32px rgba(15,23,42,0.16), 0 2px 8px rgba(15,23,42,0.06);
        border: 1px solid rgba(255,255,255,0.6);
        z-index: 9998;
        overflow: hidden;
        padding: 0 8px;
      }
      .sidebar-rail:hover {
        width: auto; min-width: 0; box-shadow: 0 14px 32px rgba(15,23,42,0.16), 0 2px 8px rgba(15,23,42,0.06);
      }
      .sidebar-top { display: none; }

      .sidebar-nav {
        flex: 1 1 auto; min-width: 0; padding: 0; flex-direction: row;
        justify-content: space-between; align-items: center; width: auto; gap: 0;
      }
      .sidebar-divider { display: none; }
      .sidebar-bottom { display: none; }
      .logout-item { display: none; }

      .nav-item-wrap {
        margin: 0 2px; flex-direction: column; align-items: center;
        gap: 3px; padding: 8px 6px; flex-shrink: 1; width: auto; border-radius: 16px;
      }
      .nav-item-wrap.is-active::before { display: none; }
      .nav-label { display: none; }

      /* items that don't fit move into the 3-dots menu */
      .nav-extra { display: none; }
      .more-btn {
        margin: 0 2px; display: flex; flex-direction: column; align-items: center;
        padding: 8px 6px; border: none; background: transparent;
        border-radius: 16px; cursor: pointer; flex-shrink: 1;
      }
      .more-btn.is-active {
        background: linear-gradient(135deg, ${ACCENT_LIGHT}, ${ACCENT_SOFT});
        box-shadow: inset 0 0 0 1px rgba(31,111,92,0.12), 0 1px 3px rgba(31,111,92,0.08);
      }
    }

    /* 3-dots button and menu: phones only */
    @media (min-width: 761px) {
      .more-btn, .more-sheet, .more-backdrop { display: none !important; }
    }
    .more-backdrop {
      position: fixed; inset: 0; z-index: 9997;
      background: rgba(15,23,42,0.35);
      backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
    }
    .more-sheet {
      position: fixed; left: 50%; transform: translateX(-50%);
      bottom: calc(14px + 62px + 12px + env(safe-area-inset-bottom, 0px));
      width: calc(100% - 28px); max-width: 360px; z-index: 9999;
      background: rgba(255,255,255,0.98); border-radius: 22px; padding: 8px;
      box-shadow: 0 18px 40px rgba(15,23,42,0.22), 0 2px 8px rgba(15,23,42,0.06);
      max-height: 60vh; overflow-y: auto;
      animation: more-pop 0.16s ease-out;
    }
    @keyframes more-pop {
      from { opacity: 0; transform: translateX(-50%) translateY(8px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .more-item {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 4px 10px; border: none; background: transparent; box-sizing: border-box;
      border-radius: 14px; text-decoration: none; cursor: pointer;
      color: #475569; font-size: 0.9rem; font-weight: 600; text-align: left;
    }
    .more-item:hover { background: rgba(15,23,42,0.04); }
    .more-item.active {
      background: linear-gradient(135deg, ${ACCENT_LIGHT}, ${ACCENT_SOFT});
      color: ${ACCENT_DARK};
    }
  `}</style>
);

function IconButton({ icon: Icon, active, danger }) {
  return (
    <div
      style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: danger ? "#ef4444" : (active ? ACCENT : "#8a97a3"),
        transition: "color 0.16s ease",
      }}
    >
      <Icon size={19} strokeWidth={active ? 2 : 1.75} />
    </div>
  );
}

function NavItem({ to, icon, label, end, extra }) {
  const [hovered, setHovered] = useState(false);

  return (
    <NavLink to={to} end={end} className={extra ? "nav-extra" : undefined} style={{ textDecoration: "none" }}>
      {({ isActive }) => (
        <div
          className={`nav-item-wrap ${isActive ? "is-active" : ""} ${hovered ? "is-hover" : ""}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <IconButton icon={icon} active={isActive} />
          <span
            className="nav-label"
            style={{ color: isActive ? ACCENT_DARK : "#475569" }}
          >
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const visibleLinks = mainLinks.filter(
    (link) => link.to !== "/users" || user?.role === "Admin"
  );
  const settingsLinks = generalLinks.filter(
    (link) => link.to !== "/settings" || user?.role === "Admin"
  );
  const allLinks = [...visibleLinks, ...settingsLinks];
  const extraLinks = allLinks.slice(BAR_COUNT); // hidden from the mobile bar
  const { pathname } = useLocation();
  const [showMore, setShowMore] = useState(false);
  const moreActive = extraLinks.some((l) => pathname.startsWith(l.to));
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
      <SidebarStyles />

      <div className="no-print sidebar-rail">
        {/* Logo mark — hidden on mobile, already shown in the app top bar */}
        <div className="sidebar-top">
        <div className="logo-mark" title={`${user?.name || ""} · ${user?.email || ""}`}>
  {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
</div>
        </div>

        {/* Nav */}
        <div className="sidebar-nav">
          {visibleLinks.map((link, i) => (
            <NavItem key={link.to} {...link} end={link.to === "/"} extra={i >= BAR_COUNT} />
          ))}

          <div className="sidebar-divider" />

          {settingsLinks.map(link => (
            <NavItem key={link.to} {...link} extra />
          ))}

          {/* 3-dots button (mobile only) */}
          <button
            type="button"
            className={`more-btn${moreActive || showMore ? " is-active" : ""}`}
            onClick={() => setShowMore((s) => !s)}
            aria-label="More"
            aria-expanded={showMore}
          >
            <IconButton icon={FiMoreHorizontal} active={moreActive || showMore} />
          </button>

          {/* Logout — kept on desktop, hidden on mobile where it's already
              reachable from the navbar's profile dropdown */}
          <div
            className={`nav-item-wrap logout-item ${logoutHovered ? "is-hover" : ""}`}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
            style={{
              backgroundColor: logoutHovered ? "rgba(239,68,68,0.06)" : "transparent",
            }}
          >
            <button
              onClick={() => setShowConfirm(true)}
              style={{
                border: "none", background: "transparent", padding: 0,
                display: "flex", alignItems: "center", width: "100%", cursor: "pointer",
              }}
            >
              <IconButton icon={FiLogOut} danger />
              <span className="nav-label" style={{ color: "#ef4444" }}>
                Logout
              </span>
            </button>
          </div>
        </div>

        {/* Bottom — desktop only strip with the live indicator */}
        <div className="sidebar-bottom">
          <span className="live-dot" title="Live" />
        </div>
      </div>

      {showMore && (
        <>
          <div className="more-backdrop" onClick={() => setShowMore(false)} />
          <div className="more-sheet" role="menu">
            {allLinks.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setShowMore(false)}
                className={({ isActive }) => `more-item${isActive ? " active" : ""}`}
              >
                {({ isActive }) => (
                  <>
                    <IconButton icon={Icon} active={isActive} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button
              type="button"
              className="more-item"
              style={{ color: "#ef4444" }}
              onClick={() => { setShowMore(false); setShowConfirm(true); }}
            >
              <IconButton icon={FiLogOut} danger />
              <span>Logout</span>
            </button>
          </div>
        </>
      )}

      {/* ── Logout Confirmation Modal ── */}
      {showConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            backgroundColor: "rgba(15,23,42,0.45)",
            backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "linear-gradient(180deg, #ffffff, #fbfcfc)",
              borderRadius: 22,
              padding: "34px 28px", maxWidth: 360, width: "90%",
              boxShadow: "0 24px 70px rgba(15,23,42,0.25), inset 0 1px 0 rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.5)",
              textAlign: "center",
            }}
          >
            <div style={{
              width: 58, height: 58, borderRadius: 17, margin: "0 auto 16px",
              background: "linear-gradient(135deg,#fef2f2,#fee2e2)",
              boxShadow: "0 6px 16px rgba(239,68,68,0.16)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <FiLogOut size={22} color="#ef4444" />
            </div>

            <h5 style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8, fontSize: "1.1rem" }}>
              Logout?
            </h5>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: 24, lineHeight: 1.6 }}>
              Do u want to logout
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 11,
                  border: "1.5px solid #e2e8f0", background: "#f8fafc",
                  color: "#475569", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 11, border: "none",
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: "#fff", fontWeight: 600, fontSize: "0.88rem",
                  cursor: "pointer", boxShadow: "0 6px 16px rgba(239,68,68,0.35)",
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