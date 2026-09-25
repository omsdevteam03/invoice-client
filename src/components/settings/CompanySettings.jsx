import { useState, useEffect } from 'react';
import { FaCamera, FaTrash, FaSave, FaPlus, FaChevronDown, FaCheckCircle, FaRegEdit } from 'react-icons/fa';
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
          <input className="form-control" value={form.companyPhone} onChange={(e) => update('companyPhone', e.target.value)} />
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