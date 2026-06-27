import { useState, useRef } from "react";
import {
  FaBuilding, FaUser, FaFileInvoiceDollar,
  FaSave, FaCamera, FaTrash, FaEye, FaEyeSlash, FaShieldAlt,
  FaBell, FaCog, FaTimes
} from "react-icons/fa";

const defaultSettings = {
  companyName: "Orange Mega Software",
  companyEmail: "contact@orangemega.com",
  companyPhone: "9876543210",
  companyAddress: "123, Tech Park, Chennai, Tamil Nadu - 600001",
  gstin: "33AABCO1234A1ZX",
  website: "www.orangemega.com",
  logo: null,
  invoicePrefix: "2026-OMS",
  quotationPrefix: "QT",
  gstPercent: 18,
  currency: "INR",
  defaultPaymentTerms: "50% advance, 50% on delivery",
  defaultNotes: "Thank you for your business!",
  adminName: "Admin User",
  adminEmail: "admin@test.com",
  notifyOnInvoice: true,
  notifyOnQuotation: true,
  notifyOnPayment: true,
};

const inp = {
  width: "100%", padding: "9px 13px",
  border: "1.5px solid #e2e8f0", borderRadius: 8,
  fontSize: "0.875rem", color: "#0f172a", outline: "none",
  backgroundColor: "#fff", boxSizing: "border-box",
};

const Label = ({ children }) => (
  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {children}
  </label>
);

const Divider = () => (
  <div style={{ borderTop: "1px solid #f1f5f9", margin: "24px 0" }} />
);

const SectionTitle = ({ children }) => (
  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>{children}</h3>
);

const SectionSubtitle = ({ children }) => (
  <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0 0 20px 0" }}>{children}</p>
);

const Toggle = ({ checked, onChange, label, description }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f8fafc" }}>
    <div>
      <div style={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 500 }}>{label}</div>
      {description && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>{description}</div>}
    </div>
    <div onClick={onChange} style={{
      width: 42, height: 22, borderRadius: 11, cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
      backgroundColor: checked ? "#f97316" : "#e2e8f0", position: "relative", marginLeft: 16,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff",
        position: "absolute", top: 3, left: checked ? 23 : 3,
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </div>
  </div>
);

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("company");
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const logoRef = useRef();

  const update = (field, value) => setSettings(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => update("logo", reader.result);
      reader.readAsDataURL(file);
    }
  };

  const navItems = [
    { id: "company", label: "Company", icon: <FaBuilding size={14} /> },
    { id: "invoice", label: "Invoice & Quotation", icon: <FaFileInvoiceDollar size={14} /> },
    { id: "profile", label: "Profile", icon: <FaUser size={14} /> },
    { id: "notifications", label: "Notifications", icon: <FaBell size={14} /> },
  ];

  const tabTitles = {
    company: "Company",
    invoice: "Invoice & Quotation",
    profile: "Profile",
    notifications: "Notifications",
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: "#f8fafc", overflow: "hidden" }}>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 220, flexShrink: 0, backgroundColor: "#fff",
        borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column",
        padding: "20px 12px", height: "100%", boxSizing: "border-box",
      }}>
        {/* Close / header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, padding: "0 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#f97316,#ea580c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FaCog size={12} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>Settings</span>
          </div>
          <button style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: 4, borderRadius: 6 }}>
            <FaTimes size={13} />
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(item => {
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  textAlign: "left", fontSize: "0.855rem", fontWeight: active ? 600 : 500,
                  backgroundColor: active ? "#fff7ed" : "transparent",
                  color: active ? "#f97316" : "#475569",
                  transition: "all 0.15s",
                }}>
                <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>

        {/* Page heading */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>{tabTitles[activeTab]}</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>Manage your {tabTitles[activeTab].toLowerCase()} preferences</p>
          </div>
          <button onClick={handleSave}
            style={{
              display: "flex", alignItems: "center", gap: 7, border: "none", borderRadius: 9, fontWeight: 600,
              padding: "9px 20px", cursor: "pointer", fontSize: "0.84rem",
              background: saved ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#f97316,#ea580c)",
              color: "#fff", boxShadow: "0 2px 8px rgba(249,115,22,0.25)", transition: "all 0.3s",
            }}>
            <FaSave size={12} /> {saved ? "Saved!" : "Save changes"}
          </button>
        </div>

        <div style={{ maxWidth: 640 }}>

          {/* ── COMPANY ── */}
          {activeTab === "company" && (
            <>
              <SectionTitle>Logo</SectionTitle>
              <SectionSubtitle>Appears on invoices and quotations</SectionSubtitle>

              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: "16px 20px", borderRadius: 12, border: "1.5px dashed #e2e8f0", backgroundColor: "#fafafa" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 14, overflow: "hidden", flexShrink: 0,
                  backgroundColor: settings.logo ? "transparent" : "#f97316",
                  display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}>
                  {settings.logo
                    ? <img src={settings.logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem" }}>OMS</span>}
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 8 }}>PNG, JPG up to 2MB · 200×200px recommended</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <label htmlFor="logo-up" style={{ fontSize: "0.78rem", fontWeight: 600, color: "#f97316", border: "1.5px solid #f97316", borderRadius: 7, padding: "5px 13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      <FaCamera size={10} /> {settings.logo ? "Change" : "Upload"}
                    </label>
                    <input id="logo-up" type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                    {settings.logo && (
                      <button onClick={() => update("logo", null)} style={{ fontSize: "0.78rem", fontWeight: 600, color: "#ef4444", border: "1.5px solid #fecaca", borderRadius: 7, padding: "5px 13px", background: "#fef2f2", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                        <FaTrash size={9} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <Divider />
              <SectionTitle>Company details</SectionTitle>
              <SectionSubtitle>Basic information about your business</SectionSubtitle>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <Label>Company name</Label>
                  <input value={settings.companyName} onChange={e => update("companyName", e.target.value)} style={inp} />
                </div>
                <div>
                  <Label>GSTIN</Label>
                  <input value={settings.gstin} onChange={e => update("gstin", e.target.value)} style={inp} placeholder="33AABCO1234A1ZX" />
                </div>
                <div>
                  <Label>Email</Label>
                  <input type="email" value={settings.companyEmail} onChange={e => update("companyEmail", e.target.value)} style={inp} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <input value={settings.companyPhone} onChange={e => update("companyPhone", e.target.value)} style={inp} />
                </div>
                <div>
                  <Label>Website</Label>
                  <input value={settings.website} onChange={e => update("website", e.target.value)} style={inp} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Label>Address</Label>
                  <textarea rows={3} value={settings.companyAddress} onChange={e => update("companyAddress", e.target.value)} style={{ ...inp, resize: "vertical" }} />
                </div>
              </div>
            </>
          )}

          {/* ── INVOICE ── */}
          {activeTab === "invoice" && (
            <>
              <SectionTitle>Numbering</SectionTitle>
              <SectionSubtitle>Prefixes used when generating invoice and quotation numbers</SectionSubtitle>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 8 }}>
                <div>
                  <Label>Invoice prefix</Label>
                  <input value={settings.invoicePrefix} onChange={e => update("invoicePrefix", e.target.value)} style={inp} />
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 4 }}>e.g. {settings.invoicePrefix}0001</div>
                </div>
                <div>
                  <Label>Quotation prefix</Label>
                  <input value={settings.quotationPrefix} onChange={e => update("quotationPrefix", e.target.value)} style={inp} />
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 4 }}>e.g. {settings.quotationPrefix}-001</div>
                </div>
                <div>
                  <Label>GST %</Label>
                  <select value={settings.gstPercent} onChange={e => update("gstPercent", Number(e.target.value))} style={{ ...inp, cursor: "pointer" }}>
                    {[0, 5, 12, 18, 28].map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
              </div>

              <Divider />
              <SectionTitle>Defaults</SectionTitle>
              <SectionSubtitle>Pre-filled values when creating new documents</SectionSubtitle>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <Label>Currency</Label>
                  <select value={settings.currency} onChange={e => update("currency", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                  </select>
                </div>
                <div>
                  <Label>Payment terms</Label>
                  <input value={settings.defaultPaymentTerms} onChange={e => update("defaultPaymentTerms", e.target.value)} style={inp} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Label>Default invoice notes</Label>
                  <textarea rows={3} value={settings.defaultNotes} onChange={e => update("defaultNotes", e.target.value)} style={{ ...inp, resize: "vertical" }} />
                </div>
              </div>

              <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 10, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Preview</div>
                <div style={{ fontSize: "0.84rem", color: "#334155" }}>
                  Invoice: <strong>{settings.invoicePrefix}0001</strong> &nbsp;·&nbsp;
                  Quotation: <strong>{settings.quotationPrefix}-001</strong> &nbsp;·&nbsp;
                  GST: <strong>{settings.gstPercent}%</strong>
                </div>
              </div>
            </>
          )}

          {/* ── PROFILE ── */}
          {activeTab === "profile" && (
            <>
              <SectionTitle>Admin profile</SectionTitle>
              <SectionSubtitle>Your personal account details</SectionSubtitle>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <Label>Full name</Label>
                  <input value={settings.adminName} onChange={e => update("adminName", e.target.value)} style={inp} />
                </div>
                <div>
                  <Label>Email address</Label>
                  <input type="email" value={settings.adminEmail} onChange={e => update("adminEmail", e.target.value)} style={inp} />
                </div>
              </div>

              <Divider />
              <SectionTitle>Change password</SectionTitle>
              <SectionSubtitle>Use a strong password at least 6 characters long</SectionSubtitle>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 360 }}>
                {[
                  { label: "Current password", key: "current" },
                  { label: "New password", key: "new" },
                  { label: "Confirm new password", key: "confirm" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={passwords[key]}
                        onChange={e => setPasswords(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ ...inp, paddingRight: 38 }}
                        placeholder="••••••••"
                      />
                      <button onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}>
                        {showPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => {
                  if (passwords.new !== passwords.confirm) { alert("Passwords don't match!"); return; }
                  if (passwords.new.length < 6) { alert("Password must be at least 6 characters."); return; }
                  setPasswords({ current: "", new: "", confirm: "" });
                  alert("Password updated successfully!");
                }} style={{ border: "none", borderRadius: 8, fontWeight: 600, padding: "9px 18px", cursor: "pointer", fontSize: "0.84rem", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", alignSelf: "flex-start" }}>
                  Update password
                </button>
              </div>
            </>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "notifications" && (
            <>
              <SectionTitle>Activity alerts</SectionTitle>
              <SectionSubtitle>Choose which events appear in your dashboard notifications</SectionSubtitle>

              <Toggle
                checked={settings.notifyOnInvoice}
                onChange={() => update("notifyOnInvoice", !settings.notifyOnInvoice)}
                label="New invoice created"
                description="Notify when a new invoice is generated"
              />
              <Toggle
                checked={settings.notifyOnQuotation}
                onChange={() => update("notifyOnQuotation", !settings.notifyOnQuotation)}
                label="New quotation generated"
                description="Notify when a quotation is sent to a client"
              />
              <Toggle
                checked={settings.notifyOnPayment}
                onChange={() => update("notifyOnPayment", !settings.notifyOnPayment)}
                label="Payment received"
                description="Notify when a payment is recorded against an invoice"
              />

              <div style={{ marginTop: 24, padding: "12px 16px", borderRadius: 10, backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                <div style={{ fontSize: "0.78rem", color: "#065f46", fontWeight: 600 }}>
                  💡 Email & WhatsApp notifications — coming soon
                </div>
              </div>
            </>
          )}

        </div>

        {/* Bottom save */}
        <div style={{ maxWidth: 640, marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleSave} style={{
            display: "flex", alignItems: "center", gap: 7, border: "none", borderRadius: 9, fontWeight: 600,
            padding: "9px 24px", cursor: "pointer", fontSize: "0.84rem",
            background: saved ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#f97316,#ea580c)",
            color: "#fff", boxShadow: "0 2px 8px rgba(249,115,22,0.2)", transition: "all 0.3s",
          }}>
            <FaSave size={12} /> {saved ? "Saved!" : "Save changes"}
          </button>
        </div>

      </div>
    </div>
  );
}
