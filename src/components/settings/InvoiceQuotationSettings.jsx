import { useState, useEffect } from 'react';
import { FaSave } from 'react-icons/fa';
import axiosInstance from '../../api/axiosInstance';

const emptyForm = {
  invoicePrefix: '', quotationPrefix: '', proformaPrefix: '', gstPercent: 18,
  currency: 'INR', defaultPaymentTerms: '', defaultNotes: '',
};

export default function InvoiceQuotationSettings() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    let cancelled = false;
    axiosInstance.get('/settings/invoice')
      .then((res) => { if (!cancelled) setForm({ ...emptyForm, ...res.data }); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setStatus('saving');
    try {
      const res = await axiosInstance.put('/settings/invoice', form);
      setForm({ ...emptyForm, ...res.data });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setStatus('idle');
    }
  };

  if (loading) return <div className="text-muted small">Loading invoice settings…</div>;

  return (
    <div>
    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Invoice & Quotation</h4>
          <p className="text-muted small mb-0">Manage your invoice & quotation preferences</p>
        </div>
      </div>
      
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      <div className="mb-1 fw-bold">Numbering</div>
      <p className="text-muted small mb-3">Prefixes used when generating invoice and quotation numbers</p>

      <div className="row g-3 mb-2">
       <div className="col-md-3">
          <label className="form-label small fw-bold text-uppercase text-muted">Invoice prefix</label>
          <input className="form-control" value={form.invoicePrefix} onChange={(e) => update('invoicePrefix', e.target.value)} />
          <div className="form-text">e.g. {form.invoicePrefix}001</div>
        </div>
        <div className="col-md-3">
          <label className="form-label small fw-bold text-uppercase text-muted">Quotation prefix</label>
          <input className="form-control" value={form.quotationPrefix} onChange={(e) => update('quotationPrefix', e.target.value)} />
          <div className="form-text">e.g. {form.quotationPrefix}001</div>
        </div>
        <div className="col-md-3">
          <label className="form-label small fw-bold text-uppercase text-muted">Proforma invoice prefix</label>
          <input className="form-control" value={form.proformaPrefix} onChange={(e) => update('proformaPrefix', e.target.value)} />
          <div className="form-text">e.g. {form.proformaPrefix}001</div>
        </div>
        <div className="col-md-3">
          <label className="form-label small fw-bold text-uppercase text-muted">GST %</label>
          <select className="form-select" value={form.gstPercent} onChange={(e) => update('gstPercent', Number(e.target.value))}>
            {[0, 5, 12, 18, 28].map((v) => <option key={v} value={v}>{v}%</option>)}
          </select>
        </div>
      </div>

      <hr />
      <div className="mb-1 fw-bold">Defaults</div>
      <p className="text-muted small mb-3">Pre-filled values when creating new documents</p>

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label small fw-bold text-uppercase text-muted">Currency</label>
          <select className="form-select" value={form.currency} onChange={(e) => update('currency', e.target.value)}>
            <option value="INR">INR — Indian Rupee (₹)</option>
            <option value="USD">USD — US Dollar ($)</option>
            <option value="EUR">EUR — Euro (€)</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-bold text-uppercase text-muted">Payment terms</label>
          <input className="form-control" value={form.defaultPaymentTerms} onChange={(e) => update('defaultPaymentTerms', e.target.value)} />
        </div>
       <div className="col-12">
          <label className="form-label small fw-bold text-uppercase text-muted">Default invoice notes</label>
          <textarea className="form-control" rows={3} value={form.defaultNotes} onChange={(e) => update('defaultNotes', e.target.value)} />
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