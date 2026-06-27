import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function ProtectedRoute() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

      {/* Sticky Navbar */}
      <Navbar onMenuClick={() => setSidebarOpen(prev => !prev)} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-lg-none"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 99 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className="position-fixed top-0 start-0 h-100 d-lg-none"
          style={{
            zIndex: 100,
            paddingTop: "62px",
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          }}
          onClick={() => setSidebarOpen(false)} // link click பண்ணா close
        >
          <Sidebar />
        </div>

        {/* Desktop Sidebar */}
        <div className="d-none d-lg-block flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: "28px 32px",
            backgroundColor: "#f1f5f9",
            overflowY: "auto",
          }}
        >
          <Outlet />
        </main>

      </div>
    </div>
  );
}