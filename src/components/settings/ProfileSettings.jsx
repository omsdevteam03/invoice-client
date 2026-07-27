import { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaSave } from 'react-icons/fa';
import axiosInstance from '../../api/axiosInstance';

const emptyForm = { adminName: '', adminEmail: '' };

export default function ProfileSettings() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle');

  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [pwMessage, setPwMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    axiosInstance.get('/settings/profile')
      .then((res) => { if (!cancelled) setForm({ ...emptyForm, ...res.data }); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setStatus('saving');
    try {
      const res = await axiosInstance.put('/settings/profile', form);
      setForm({ ...emptyForm, ...res.data });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setStatus('idle');
    }
  };

  const handleUpdatePassword = async () => {
    setPwMessage(null);
    if (passwords.new !== passwords.confirm) {
      setPwMessage({ type: 'error', text: "New passwords don't match." });
      return;
    }
    if (passwords.new.length < 6) {
      setPwMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    try {
      await axiosInstance.post('/settings/profile/password', {
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });
      setPasswords({ current: '', new: '', confirm: '' });
      setPwMessage({ type: 'success', text: 'Password updated successfully!' });
    } catch (err) {
      setPwMessage({ type: 'error', text: err.response?.data?.message || err.message });
    }
  };

  if (loading) return <div className="text-muted small">Loading profile…</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Profile</h4>
          <p className="text-muted small mb-0">Manage your profile preferences</p>
        </div>
        <button
          className="btn text-white d-flex align-items-center gap-2"
          style={{ backgroundColor: status === 'saved' ? '#198754' : '#f97316' }}
          onClick={handleSave}
          disabled={status === 'saving'}
        >
          <FaSave size={12} /> {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save changes'}
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      <div className="mb-1 fw-bold">Admin profile</div>
      <p className="text-muted small mb-3">Your personal account details</p>

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label small fw-bold text-uppercase text-muted">Full name</label>
          <input className="form-control" value={form.adminName} onChange={(e) => update('adminName', e.target.value)} />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-bold text-uppercase text-muted">Email address</label>
          <input type="email" className="form-control" value={form.adminEmail} onChange={(e) => update('adminEmail', e.target.value)} />
        </div>
      </div>

      <hr />
      <div className="mb-1 fw-bold">Change password</div>
      <p className="text-muted small mb-3">Use a strong password at least 6 characters long</p>

      <div style={{ maxWidth: 360 }}>
        {[
          { label: 'Current password', key: 'current' },
          { label: 'New password', key: 'new' },
          { label: 'Confirm new password', key: 'confirm' },
        ].map(({ label, key }) => (
          <div className="mb-3" key={key}>
            <label className="form-label small fw-bold text-uppercase text-muted">{label}</label>
            <div className="input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                value={passwords[key]}
                onChange={(e) => setPasswords((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="••••••••"
              />
              <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
              </button>
            </div>
          </div>
        ))}

        {pwMessage && (
          <div className={`alert py-2 small ${pwMessage.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
            {pwMessage.text}
          </div>
        )}

        <button className="btn btn-danger" onClick={handleUpdatePassword}>
          Update password
        </button>
      </div>
    </div>
  );
}