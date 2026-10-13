import { useState, useEffect, useRef, useMemo } from 'react';
import { FaCamera, FaTrash, FaSave, FaPlus, FaChevronDown, FaCheckCircle, FaRegEdit, FaSearch } from 'react-icons/fa';
import axiosInstance from '../../api/axiosInstance';

const emptyForm = {
  id: null,
  companyName: '', companyEmail: '', companyPhone: '',
  companyAddress: '', gstin: '', website: '', logo: null,
  status: 'draft',
};

const GREEN = '#1F6F5C';
const LAST_SELECTED_KEY = 'companySettings:lastSelectedId';

const rememberSelection = (id) => {
  try {
    if (id == null) window.localStorage.removeItem(LAST_SELECTED_KEY);
    else window.localStorage.setItem(LAST_SELECTED_KEY, String(id));
  } catch {
    // localStorage can be unavailable (private browsing, etc.) — safe to ignore,
    // it just means the selection won't survive a refresh.
  }
};

const getRememberedSelection = () => {
  try {
    return window.localStorage.getItem(LAST_SELECTED_KEY);
  } catch {
    return null;
  }
};
// ── Phone input with country-code picker ─────────────────────────────────
const PHONE_GREEN = "#1F6F5C";
const PHONE_COUNTRIES = [
  { iso: "IN", name: "India", dial: "+91" },
  { iso: "US", name: "United States", dial: "+1" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966" },
  { iso: "QA", name: "Qatar", dial: "+974" },
  { iso: "KW", name: "Kuwait", dial: "+965" },
  { iso: "OM", name: "Oman", dial: "+968" },
  { iso: "BH", name: "Bahrain", dial: "+973" },
  { iso: "SG", name: "Singapore", dial: "+65" },
  { iso: "MY", name: "Malaysia", dial: "+60" },
  { iso: "LK", name: "Sri Lanka", dial: "+94" },
  { iso: "NP", name: "Nepal", dial: "+977" },
  { iso: "BD", name: "Bangladesh", dial: "+880" },
  { iso: "PK", name: "Pakistan", dial: "+92" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "NZ", name: "New Zealand", dial: "+64" },
  { iso: "DE", name: "Germany", dial: "+49" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "IT", name: "Italy", dial: "+39" },
  { iso: "ES", name: "Spain", dial: "+34" },
  { iso: "NL", name: "Netherlands", dial: "+31" },
  { iso: "CH", name: "Switzerland", dial: "+41" },
  { iso: "SE", name: "Sweden", dial: "+46" },
  { iso: "IE", name: "Ireland", dial: "+353" },
  { iso: "RU", name: "Russia", dial: "+7" },
  { iso: "CN", name: "China", dial: "+86" },
  { iso: "JP", name: "Japan", dial: "+81" },
  { iso: "KR", name: "South Korea", dial: "+82" },
  { iso: "HK", name: "Hong Kong", dial: "+852" },
  { iso: "TH", name: "Thailand", dial: "+66" },
  { iso: "ID", name: "Indonesia", dial: "+62" },
  { iso: "PH", name: "Philippines", dial: "+63" },
  { iso: "VN", name: "Vietnam", dial: "+84" },
  { iso: "ZA", name: "South Africa", dial: "+27" },
  { iso: "NG", name: "Nigeria", dial: "+234" },
  { iso: "KE", name: "Kenya", dial: "+254" },
  { iso: "EG", name: "Egypt", dial: "+20" },
  { iso: "TR", name: "Turkey", dial: "+90" },
  { iso: "BR", name: "Brazil", dial: "+55" },
  { iso: "MX", name: "Mexico", dial: "+52" },
];
const PHONE_CUSTOM_KEY = "phone_custom_codes";

function readCustomCodes() {
  try {
    const p = JSON.parse(localStorage.getItem(PHONE_CUSTOM_KEY) || "[]");
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

// "+91 9940895128" -> { country, number }. No "+" prefix => India.
function parsePhone(value, all) {
  const v = String(value || "").trim();
  if (v.startsWith("+")) {
    const m = [...all].sort((a, b) => b.dial.length - a.dial.length).find(c => v.startsWith(c.dial));
    if (m) return { country: m, number: v.slice(m.dial.length).replace(/\D/g, "") };
  }
  return { country: all[0], number: v.replace(/\D/g, "") };
}

function PhoneInput({ value, onChange, placeholder = "9876543210", inputClassName = "", inputStyle = {}, name }) {
  const [customCodes, setCustomCodes] = useState(readCustomCodes);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pickedIso, setPickedIso] = useState(null);
  const wrapRef = useRef(null);

  const all = useMemo(() => [...PHONE_COUNTRIES, ...customCodes], [customCodes]);
  const parsed = parsePhone(value, all);
  const picked = all.find(c => c.iso === pickedIso);
  // keeps US vs Canada (both +1) as the user chose
  const country = picked && picked.dial === parsed.country.dial ? picked : parsed.country;

  const closeMenu = () => { setOpen(false); setQ(""); setAdding(false); setDraft(""); };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) closeMenu(); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const emit = (dial, number) => onChange(number ? `${dial} ${number}` : dial);

  const pickCountry = (c) => { setPickedIso(c.iso); emit(c.dial, parsed.number); closeMenu(); };

  const saveCustom = () => {
    let dial = draft.trim().replace(/[^\d+]/g, "");
    if (!dial) { closeMenu(); return; }
    if (!dial.startsWith("+")) dial = "+" + dial;
    if (dial.length < 2 || dial.length > 6) return;
    const existing = all.find(c => c.dial === dial);
    if (existing) { pickCountry(existing); return; }
    const entry = { iso: `custom-${dial}`, name: "Custom code", dial, custom: true };
    const next = [...customCodes, entry];
    try { localStorage.setItem(PHONE_CUSTOM_KEY, JSON.stringify(next)); } catch { }
    setCustomCodes(next);
    pickCountry(entry);
  };

  const s = q.trim().toLowerCase();
  const list = all.filter(c => !s || c.name.toLowerCase().includes(s) || c.iso.toLowerCase().includes(s) || c.dial.includes(s));

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "flex", gap: 8, width: "100%" }}>
      <button
        type="button"
        onClick={() => (open ? closeMenu() : setOpen(true))}
        style={{
          display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          border: `1px solid ${open ? PHONE_GREEN : "#e2e8f0"}`, borderRadius: 8,
          background: "#fff", padding: "0 10px", cursor: "pointer",
          fontSize: "0.875rem", color: "#0f172a",
        }}
      >
        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8" }}>{country.custom ? "+" : country.iso}</span>
        <span>{country.dial}</span>
        <FaChevronDown size={9} color="#64748b" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      <input
        type="tel"
        name={name}
        autoComplete="tel-national"
        value={parsed.number}
        onChange={e => emit(country.dial, e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder}
        className={inputClassName}
        style={{ flex: 1, minWidth: 0, ...inputStyle }}
      />

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 1000,
          width: 300, maxWidth: "calc(100vw - 32px)", boxSizing: "border-box",
          background: "#fff", border: "1px solid #BFDED2", borderRadius: 14,
          boxShadow: "0 12px 32px rgba(15,23,42,0.18)", padding: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 12px" }}>
            <FaSearch size={12} color="#94a3b8" />
            <input
              autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search country or code"
              style={{ border: "none", outline: "none", width: "100%", fontSize: "0.82rem", background: "transparent" }}
            />
          </div>

          {adding ? (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input
                autoFocus value={draft} maxLength={6} placeholder="e.g. +212"
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); saveCustom(); }
                  if (e.key === "Escape") { e.preventDefault(); closeMenu(); }
                }}
                style={{ flex: 1, minWidth: 0, border: `1.5px solid ${PHONE_GREEN}`, borderRadius: 8, padding: "7px 10px", fontSize: "0.85rem", outline: "none" }}
              />
              <button type="button" onClick={saveCustom}
                style={{ border: "none", borderRadius: 8, padding: "0 14px", background: PHONE_GREEN, color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                Add
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", marginTop: 8,
                padding: "9px 12px", border: `1.5px dashed ${PHONE_GREEN}`, borderRadius: 10,
                background: "#E6F1EC", color: "#175646", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
              }}>
              <FaPlus size={10} /> Add custom code
            </button>
          )}

          <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 8 }}>
            {list.length === 0 && (
              <div style={{ padding: 14, textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>No match</div>
            )}
            {list.map(c => {
              const active = c.iso === country.iso;
              return (
                <div
                  key={c.iso}
                  onClick={() => pickCountry(c)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "9px 12px", borderRadius: 10, cursor: "pointer",
                    background: active ? "#E6F1EC" : "transparent",
                    color: active ? "#175646" : "#0f172a", fontSize: "0.85rem", fontWeight: 600,
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f1f5f9"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span>{c.name}</span>
                  <span style={{ color: active ? PHONE_GREEN : "#64748b" }}>{c.dial}{active ? " ✓" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompanySettings() {
  const [companies, setCompanies] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [mode, setMode] = useState('edit'); // 'edit' | 'add'
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axiosInstance.get('/settings/companies')
      .then((res) => {
        if (cancelled) return;
        const list = res.data || [];
        setCompanies(list);
        const remembered = getRememberedSelection();
        const rememberedCompany = remembered != null
          ? list.find((c) => String(c.id) === remembered)
          : null;
        const toShow = rememberedCompany || list.find((c) => c.status === 'active') || list[0];
        if (toShow) {
          setForm({ ...emptyForm, ...toShow });
          setSelectedId(toShow.id);
          setMode('edit');
        } else {
          setMode('add');
        }
      })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || err.message); })
      .finally(() => { if (!cancelled) setLoadingList(false); });
    return () => { cancelled = true; };
  }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const selectCompany = (company) => {
    setForm({ ...emptyForm, ...company });
    setSelectedId(company.id);
    rememberSelection(company.id);
    setMode('edit');
    setStatus('idle');
    setError(null);
    setPickerOpen(false);
  };

  const startAddCompany = () => {
    setForm(emptyForm);
    setSelectedId(null);
    rememberSelection(null);
    setMode('add');
    setStatus('idle');
    setError(null);
    setPickerOpen(false);
  };

  const cancelAdd = () => {
    const active = companies.find((c) => c.status === 'active') || companies[0];
    if (active) selectCompany(active);
    else { setForm(emptyForm); setMode('add'); }
  };

  const upsertInList = (saved) => {
    setCompanies((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved];
    });
  };

  const saveAsDraft = async () => {
    setStatus('saving');
    setError(null);
    try {
      const payload = { ...form, status: 'draft' };
      const res = form.id
        ? await axiosInstance.put(`/settings/companies/${form.id}`, payload)
        : await axiosInstance.post('/settings/companies', payload);
      const saved = { ...emptyForm, ...res.data };
      upsertInList(saved);
      setForm(saved);
      setSelectedId(saved.id);
      rememberSelection(saved.id);
      setMode('edit');
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setStatus('idle');
    }
  };

  const saveChanges = async () => {
    setStatus('saving');
    setError(null);
    try {
      const payload = { ...form, status: form.status || 'active' };
      const res = await axiosInstance.put(`/settings/companies/${form.id}`, payload);
      const saved = { ...emptyForm, ...res.data };
      upsertInList(saved);
      setForm(saved);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setStatus('idle');
    }
  };

  const activateCompany = async () => {
    setStatus('saving');
    setError(null);
    try {
      const res = await axiosInstance.put(`/settings/companies/${form.id}/activate`);
      const saved = { ...emptyForm, ...res.data };
      // Mark every other company as no longer active in local state
      setCompanies((prev) => prev.map((c) => (
        c.id === saved.id ? saved : (c.status === 'active' ? { ...c, status: 'draft' } : c)
      )));
      setForm(saved);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setStatus('idle');
    }
  };

  const deleteDraft = async (company, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete the draft "${company.companyName || 'Untitled company'}"?`)) return;
    try {
      await axiosInstance.delete(`/settings/companies/${company.id}`);
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      if (getRememberedSelection() === String(company.id)) rememberSelection(null);
      if (selectedId === company.id) {
        const remaining = companies.filter((c) => c.id !== company.id);
        const active = remaining.find((c) => c.status === 'active') || remaining[0];
        if (active) selectCompany(active);
        else startAddCompany();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => update('logo', reader.result);
      reader.readAsDataURL(file);
    }
  };

  const StatusBadge = ({ value }) => (
    <span
      className="badge rounded-pill"
      style={{
        backgroundColor: value === 'active' ? '#e6f4ef' : '#f1f0ef',
        color: value === 'active' ? GREEN : '#6b7280',
        fontWeight: 600,
        fontSize: 11,
        padding: '4px 10px',
      }}
    >
      {value === 'active' ? 'Active' : 'Draft'}
    </span>
  );

  if (loadingList) return <div className="text-muted small">Loading company settings…</div>;

  const currentCompany = companies.find((c) => c.id === selectedId);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h4 className="fw-bold mb-1">Company Profile</h4>
          <p className="text-muted small mb-0">Manage your company preferences</p>
        </div>
        <button
          className="btn btn-sm d-flex align-items-center gap-2 text-white"
          style={{ backgroundColor: GREEN }}
          onClick={startAddCompany}
        >
          <FaPlus size={11} /> Add Company Profile
        </button>
      </div>

      {/* Company selector */}
      {companies.length > 0 && (
        <div className="position-relative mb-4" style={{ maxWidth: 420 }}>
          <button
            type="button"
            className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-between"
            onClick={() => setPickerOpen((o) => !o)}
          >
            <span className="d-flex align-items-center gap-2 text-truncate">
              {mode === 'add'
                ? <span className="fw-semibold">New company profile</span>
                : (
                  <>
                    <span className="fw-semibold text-truncate">{form.companyName || 'Untitled company'}</span>
                    <StatusBadge value={form.status} />
                  </>
                )}
            </span>
            <FaChevronDown size={11} className="text-muted flex-shrink-0" />
          </button>

          {pickerOpen && (
            <div
              className="position-absolute w-100 mt-1 bg-white border rounded-3 shadow-sm"
              style={{ zIndex: 20, maxHeight: 280, overflowY: 'auto' }}
            >
              {companies.map((c) => (
                <div
                  key={c.id}
                  className="d-flex align-items-center justify-content-between px-3 py-2"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: c.id === selectedId && mode === 'edit' ? '#f5fbf9' : 'transparent',
                  }}
                  onClick={() => selectCompany(c)}
                >
                  <div className="d-flex align-items-center gap-2 text-truncate">
                    {c.id === selectedId && mode === 'edit' && <FaCheckCircle size={12} color={GREEN} />}
                    <span className="text-truncate">{c.companyName || 'Untitled company'}</span>
                    <StatusBadge value={c.status} />
                  </div>
                  {c.status === 'draft' && (
                    <button
                      className="btn btn-sm btn-link text-danger p-0"
                      title="Delete draft"
                      onClick={(e) => deleteDraft(c, e)}
                    >
                      <FaTrash size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'add' && (
        <div className="alert alert-light border small mb-4">
          You're creating a new company profile. Save it as a draft and come back to finish it anytime.
        </div>
      )}

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      <div className="mb-2 fw-bold">Logo</div>
      <p className="text-muted small mb-3">Appears on invoices and quotations</p>

      <div className="d-flex align-items-center gap-3 p-3 mb-4 border border-1 rounded-3" style={{ borderStyle: 'dashed', backgroundColor: '#fafafa' }}>
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 64, height: 64, backgroundColor: form.logo ? 'transparent' : GREEN, overflow: 'hidden' }}
        >
          {form.logo
            ? <img src={form.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span className="text-white fw-bold">OMS</span>}
        </div>
        <div>
          <div className="text-muted small mb-2">PNG, JPG up to 2MB · 200×200px recommended</div>
          <div className="d-flex gap-2 flex-wrap">
            <label htmlFor="logo-up" className="btn btn-sm btn-outline-success d-flex align-items-center gap-1" style={{ color: GREEN, borderColor: GREEN }}>
              <FaCamera size={10} /> {form.logo ? 'Change' : 'Upload'}
            </label>
            <input id="logo-up" type="file" accept="image/*" className="d-none" onChange={handleLogoUpload} />
            {form.logo && (
              <button className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1" onClick={() => update('logo', null)}>
                <FaTrash size={9} /> Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <hr />
      <div className="mb-1 fw-bold">Company details</div>
      <p className="text-muted small mb-3">Basic information about your business</p>

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label small fw-bold text-uppercase text-muted">Company name</label>
          <input className="form-control" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-bold text-uppercase text-muted">GSTIN</label>
          <input className="form-control" value={form.gstin} onChange={(e) => update('gstin', e.target.value)} placeholder="33AABCO1234A1ZX" />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-bold text-uppercase text-muted">Email</label>
          <input type="email" className="form-control" value={form.companyEmail} onChange={(e) => update('companyEmail', e.target.value)} />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-bold text-uppercase text-muted">Phone</label>
          <PhoneInput
  inputClassName="form-control"
  value={form.companyPhone}
  onChange={(val) => update('companyPhone', val)}
/>
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-bold text-uppercase text-muted">Website</label>
          <input className="form-control" value={form.website} onChange={(e) => update('website', e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label small fw-bold text-uppercase text-muted">Address</label>
          <textarea className="form-control" rows={3} value={form.companyAddress} onChange={(e) => update('companyAddress', e.target.value)} />
        </div>
      </div>

      <div className="d-flex justify-content-end align-items-center gap-2 mt-4">
        {mode === 'add' && (
          <>
            <button className="btn btn-outline-secondary" onClick={cancelAdd} disabled={status === 'saving'}>
              Cancel
            </button>
            <button
              className="btn text-white d-flex align-items-center gap-2"
              style={{ backgroundColor: status === 'saved' ? '#198754' : GREEN }}
              onClick={saveAsDraft}
              disabled={status === 'saving'}
            >
              <FaSave size={12} /> {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save as Draft'}
            </button>
          </>
        )}

        {mode === 'edit' && form.status === 'draft' && (
          <>
            <button
              className="btn btn-outline-success d-flex align-items-center gap-2"
              style={{ color: GREEN, borderColor: GREEN }}
              onClick={activateCompany}
              disabled={status === 'saving'}
            >
              <FaCheckCircle size={12} /> Set as Active
            </button>
            <button
              className="btn text-white d-flex align-items-center gap-2"
              style={{ backgroundColor: status === 'saved' ? '#198754' : GREEN }}
              onClick={saveAsDraft}
              disabled={status === 'saving'}
            >
              <FaSave size={12} /> {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save Draft'}
            </button>
          </>
        )}

        {mode === 'edit' && form.status === 'active' && (
          <button
            className="btn text-white d-flex align-items-center gap-2"
            style={{ backgroundColor: status === 'saved' ? '#198754' : GREEN }}
            onClick={saveChanges}
            disabled={status === 'saving'}
          >
            <FaSave size={12} /> {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save changes'}
          </button>
        )}
      </div>
    </div>
  );
}