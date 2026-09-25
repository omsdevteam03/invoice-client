import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import QuotationsPage from "./pages/QuotationsPage";
import InvoicesPage from "./pages/InvoicesPage";
import SettingsPage from "./pages/SettingsPage";
import AiPage from "./pages/AiPage";
import Trash from "./pages/trash";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    // Reset the window itself...
    window.scrollTo(0, 0);

    // ...AND reset every element on the page that is actually scrollable,
    // in case the real scroll container is an inner <div> (common in
    // sidebar layouts) rather than the window. Cheap to run since it only
    // touches elements whose content overflows their box.
    const scrollableSelector = "*";
    document.querySelectorAll(scrollableSelector).forEach((el) => {
      const style = window.getComputedStyle(el);
      const canScrollY = /(auto|scroll)/.test(style.overflowY);
      if (canScrollY && el.scrollTop > 0) {
        el.scrollTop = 0;
      }
    });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <div style={{ margin: 0, padding: 0, width: "100vw", overflowX: "hidden" }}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />

              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/new" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomersPage />} />
              <Route path="/customers/:id/edit" element={<CustomersPage />} />

              <Route path="/quotations" element={<QuotationsPage />} />
              <Route path="/quotations/new" element={<QuotationsPage />} />
              <Route path="/quotations/:id" element={<QuotationsPage />} />
              <Route path="/quotations/:id/edit" element={<QuotationsPage />} />

              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/invoices/new" element={<InvoicesPage />} />
              <Route path="/invoices/:id" element={<InvoicesPage />} />
              <Route path="/invoices/:id/edit" element={<InvoicesPage />} />

              <Route path="/settings" element={<SettingsPage />} />

              <Route path="/ai" element={<AiPage />} />

              <Route path="/trash" element={<Trash />} />
            </Route>

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}