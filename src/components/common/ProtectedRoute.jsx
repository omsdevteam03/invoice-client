import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function ProtectedRoute() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: "100vw", overflow: "hidden" }}>

      {/* Sticky Navbar */}
      <Navbar />

      <div style={{ display: "flex", flex: 1, minWidth: 0, overflow: "hidden" }}>

        {/* Sidebar — a left icon rail on desktop, a fixed bottom tab bar on
            mobile. Rendered once; the split is handled entirely by Sidebar's
            own responsive CSS, so there's no separate drawer/overlay to manage here. */}
        <Sidebar />

        {/* Main Content.
            minWidth: 0 is the key fix — without it, a flex item refuses to
            shrink below its content's natural width, so any page with a
            wide table/card silently pushes this whole row (and the sticky
            navbar above it) wider than the viewport, causing the page to
            scroll sideways. overflowX: hidden is a second line of defense
            so an overly-wide page clips instead of leaking out. */}
        <main
          className="main-content"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "28px 32px",
            backgroundColor: "#f1f5f9",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <Outlet />
        </main>

      </div>

      {/* Leave room at the bottom of the content on mobile so the floating
          pill nav never covers the last bit of the page. */}
      <style>{`
        @media (max-width: 760px) {
          .main-content {
            padding: 16px 16px calc(60px + 14px + env(safe-area-inset-bottom, 0px) + 16px) !important;
          }
        }
      `}</style>
    </div>
  );
}