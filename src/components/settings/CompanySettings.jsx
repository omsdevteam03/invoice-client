import { useState, useEffect } from 'react';
import { FaCamera, FaTrash, FaSave } from 'react-icons/fa';
import axiosInstance from '../../api/axiosInstance';

const emptyForm = {
  companyName: '', companyEmail: '', companyPhone: '',
  companyAddress: '', gstin: '', website: '', logo: null,
};

export default function CompanySettings() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | saving | saved

  useEffect(() => {
    let cancelled = false;
    axiosInstance.get('/settings/company')
      .then((res) => { if (!cancelled) setForm({ ...emptyForm, ...res.data }); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setStatus('saving');
    try {
      const res = await axiosInstance.put('/settings/company', form);
      setForm({ ...emptyForm, ...res.data });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setStatus('idle');
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

  if (loading) return <div className="text-muted small">Loading company settings…</div>;

  return (
    <div>
    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Company</h4>
          <p className="text-muted small mb-0">Manage your company preferences</p>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      <div className="mb-2 fw-bold">Logo</div>
      <p className="text-muted small mb-3">Appears on invoices and quotations</p>

      <div className="d-flex align-items-center gap-3 p-3 mb-4 border border-1 rounded-3" style={{ borderStyle: 'dashed', backgroundColor: '#fafafa' }}>
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 64, height: 64, backgroundColor: form.logo ? 'transparent' : '#1F6F5C', overflow: 'hidden' }}
        >
          {form.logo
            ? <img src={form.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span className="text-white fw-bold">OMS</span>}
        </div>
        <div>
          <div className="text-muted small mb-2">PNG, JPG up to 2MB · 200×200px recommended</div>
          <div className="d-flex gap-2 flex-wrap">
            <label htmlFor="logo-up" className="btn btn-sm btn-outline-success d-flex align-items-center gap-1" style={{ color: '#1F6F5C', borderColor: '#1F6F5C' }}>
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

      <div className="d-flex justify-content-end mt-4">
        <button
          className="btn text-white d-flex align-items-center gap-2"
          style={{ backgroundColor: status === 'saved' ? '#198754' : '#1F6F5C' }}
          onClick={handleSave}
          disabled={status === 'saving'}
        >
          <FaSave size={12} /> {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}