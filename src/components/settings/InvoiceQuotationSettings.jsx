import { useState, useEffect } from 'react';
import { FaSave, FaUndo } from 'react-icons/fa';
import axiosInstance from '../../api/axiosInstance';

const emptyForm = {
  invoicePrefix: '', quotationPrefix: '', proformaPrefix: '', gstPercent: 18,
  defaultNotes: '',
  quotationNumberLength: 4,
  quotationYearlyReset: true,
  quotationCurrentSequence: 0,
  quotationCurrentYear: new Date().getFullYear(),
};

const GST_PRESETS = [0, 5, 12, 18, 28];
const ADD_CUSTOM_GST_VALUE = '__add_custom_gst__';

function buildPreview(settings) {
  const prefix = (settings.quotationPrefix || 'QT').trim().replace(/-+$/, '');
  const len = Math.max(1, Number(settings.quotationNumberLength) || 4);
  const nextSeq = (Number(settings.quotationCurrentSequence) || 0) + 1;
  const seqStr = String(nextSeq).padStart(len, '0');
  if (settings.quotationYearlyReset) {
    const year = settings.quotationCurrentYear || new Date().getFullYear();
    return `${prefix}-${year}-${seqStr}`;
  }
  return `${prefix}-${seqStr}`;
}

export default function InvoiceQuotationSettings() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle');
  const [addingCustomGst, setAddingCustomGst] = useState(false);
  const [customGstDraft, setCustomGstDraft] = useState('');
  const [quotationCount, setQuotationCount] = useState(null); // null = still loading
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // How many real quotations exist (reset is only allowed when this is 0)
  useEffect(() => {
    axiosInstance.get('/quotations')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setQuotationCount(list.filter((q) => !q.isTemplate).length);
      })
      .catch(() => setQuotationCount(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    axiosInstance.get('/settings/invoice')
      .then((res) => { if (!cancelled) setForm({ ...emptyForm, ...res.data }); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const confirmCustomGst = () => {
    const val = Number(customGstDraft);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      update('gstPercent', val);
    }
    setAddingCustomGst(false);
    setCustomGstDraft('');
  };
  const cancelCustomGst = () => {
    setAddingCustomGst(false);
    setCustomGstDraft('');
  };

  const handleSave = async () => {
    setStatus('saving');
    try {
      const payload = {
        invoicePrefix: form.invoicePrefix,
        quotationPrefix: form.quotationPrefix,
        proformaPrefix: form.proformaPrefix,
        gstPercent: form.gstPercent,
        defaultNotes: form.defaultNotes,
        quotationNumberLength: Number(form.quotationNumberLength) || 4,
        quotationYearlyReset: Boolean(form.quotationYearlyReset),
      };
      const res = await axiosInstance.put('/settings/invoice', payload);
      setForm({ ...emptyForm, ...res.data });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setStatus('idle');
    }
  };

  const handleResetNumbering = async () => {
    setResetting(true);
    try {
      await axiosInstance.post('/settings/invoice/reset-quotation-numbering');
      const res = await axiosInstance.get('/settings/invoice');
      setForm({ ...emptyForm, ...res.data });
      setShowResetConfirm(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setShowResetConfirm(false);
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="text-muted small">Loading invoice settings…</div>;

  const preview = buildPreview(form);

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
          <div className="form-text">e.g. {preview}</div>
        </div>
        <div className="col-md-3">
          <label className="form-label small fw-bold text-uppercase text-muted">Proforma invoice prefix</label>
          <input className="form-control" value={form.proformaPrefix} onChange={(e) => update('proformaPrefix', e.target.value)} />
          <div className="form-text">e.g. {form.proformaPrefix}001</div>
        </div>
        <div className="col-md-3">
          <label className="form-label small fw-bold text-uppercase text-muted">GST %</label>
          {addingCustomGst ? (
            <div className="d-flex gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                autoFocus
                className="form-control"
                value={customGstDraft}
                onChange={(e) => setCustomGstDraft(e.target.value)}
                placeholder="Enter GST %"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); confirmCustomGst(); }
                  if (e.key === 'Escape') { e.preventDefault(); cancelCustomGst(); }
                }}
              />
              <button type="button" className="btn btn-success btn-sm" onClick={confirmCustomGst}>Save</button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cancelCustomGst}>Cancel</button>
            </div>
          ) : (
            <select
              className="form-select"
              value={form.gstPercent}
              onChange={(e) => {
                if (e.target.value === ADD_CUSTOM_GST_VALUE) { setAddingCustomGst(true); setCustomGstDraft(''); return; }
                update('gstPercent', Number(e.target.value));
              }}
            >
              {[...GST_PRESETS, ...(GST_PRESETS.includes(Number(form.gstPercent)) ? [] : [Number(form.gstPercent)])]
                .sort((a, b) => a - b)
                .map((v) => <option key={v} value={v}>{v}%</option>)}
              <option value={ADD_CUSTOM_GST_VALUE}>+ Add Custom GST %</option>
            </select>
          )}
        </div>
      </div>

      <hr />

      <div className="mb-1 fw-bold">Quotation Numbering</div>
      <p className="text-muted small mb-3">
        Quotation numbers are generated automatically and assigned by the
        server when a quotation is saved, so they're always unique — even
        with multiple people creating quotations at the same time.
      </p>

      <div className="row g-3 align-items-end mb-3">
        <div className="col-md-3">
          <label className="form-label small fw-bold text-uppercase text-muted">Number length</label>
          <input
            type="number"
            min={1}
            max={10}
            className="form-control"
            value={form.quotationNumberLength}
            onChange={(e) => update('quotationNumberLength', e.target.value)}
          />
          <div className="form-text">Digits in the sequence, e.g. 4 → 0001</div>
        </div>

        <div className="col-md-4">
          <label className="form-label small fw-bold text-uppercase text-muted d-block">
            Yearly reset
          </label>
          <div className="form-check form-switch mt-1">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="yearlyResetSwitch"
              checked={form.quotationYearlyReset}
              onChange={(e) => update('quotationYearlyReset', e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="yearlyResetSwitch">
              {form.quotationYearlyReset ? 'On — resets to 0001 every new year' : 'Off — sequence never resets'}
            </label>
          </div>
        </div>

        <div className="col-md-5">
          <label className="form-label small fw-bold text-uppercase text-muted">Next quotation number</label>
          <input className="form-control" value={preview} disabled />
          <div className="form-text">Preview only — confirmed by the server when saved</div>
        </div>
      </div>

      <div className="row g-3 mb-2">
        <div className="col-md-4">
          <label className="form-label small fw-bold text-uppercase text-muted">Current sequence</label>
          <input className="form-control" value={form.quotationCurrentSequence} disabled />
          <div className="form-text">Read-only — last number issued by the server</div>
        </div>
        {form.quotationYearlyReset && (
          <div className="col-md-4">
            <label className="form-label small fw-bold text-uppercase text-muted">Current year</label>
            <input className="form-control" value={form.quotationCurrentYear} disabled />
          </div>
        )}
      </div>

      <div className="d-flex align-items-center flex-wrap gap-3 mb-2">
        <button
          type="button"
          className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2"
          disabled={quotationCount !== 0}
          onClick={() => setShowResetConfirm(true)}
        >
          <FaUndo size={11} /> Reset Numbering
        </button>
        <span className="text-muted small">
          {quotationCount === null
            ? 'Checking quotations…'
            : quotationCount === 0
              ? 'Resets the next quotation number back to 1.'
              : `Only available when there are zero quotations (you have ${quotationCount}).`}
        </span>
      </div>

      <hr />
      <div className="mb-1 fw-bold">Defaults</div>
      <p className="text-muted small mb-3">Pre-filled values when creating new documents</p>

      <div className="row g-3">
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

      {showResetConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => !resetting && setShowResetConfirm(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FaUndo size={22} color="#dc2626" />
            </div>
            <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Reset quotation numbering?</h5>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 24 }}>
              This will reset the next quotation number back to 0001. This cannot be undone.
            </p>
            <div className="d-flex gap-3 justify-content-center">
              <button className="btn btn-light fw-semibold px-4" disabled={resetting} onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger fw-semibold px-4" disabled={resetting} onClick={handleResetNumbering}>
                {resetting ? 'Resetting…' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}