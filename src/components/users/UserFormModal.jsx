// UserFormModal.jsx — NO imports. Hooks are injected by the page.
const ROLES = ['Admin', 'Manager', 'Sales', 'Accountant', 'Viewer'];
const EMPTY = { fullName: '', email: '', password: '', role: 'Sales', companyIds: [], status: 'Active' };

// Random password; skips look-alike characters (0/O, 1/l/I)
const generatePassword = (length = 12) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

export const createUserFormModal = ({ useState, useEffect }) =>
  function UserFormModal({ open, user, companies, onClose, onSave }) {
    const editing = Boolean(user);
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    // Reset the form each time the modal opens
    useEffect(() => {
      if (!open) return;
      setError('');
      setShowPassword(false);
      setCopied(false);

      setForm(user ? { ...EMPTY, ...user, password: '', companyIds: user.companyIds || [] } : EMPTY);
    }, [open, user]);

    if (!open) return null;

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const handleGenerate = () => {
      set('password', generatePassword());
      setShowPassword(true);   // show it so the admin can read and copy it
      setCopied(false);
    };

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(form.password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setError('Could not copy automatically. Select the password and copy it manually.');
      }
    };

    const toggleCompany = (id) =>
      set('companyIds', form.companyIds.includes(id) ? form.companyIds.filter((x) => x !== id) : [...form.companyIds, id]);

    const validate = () => {
      if (!form.fullName.trim()) return 'Enter the user’s full name.';
      if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email address.';
      if (!editing && form.password.length < 8) return 'Password must be at least 8 characters.';
      if (editing && form.password && form.password.length < 8) return 'New password must be at least 8 characters.';
      if (form.companyIds.length === 0) return 'Assign at least one company.';
      return '';
    };

    const submit = async (e) => {
      e.preventDefault();
      const msg = validate();
      if (msg) return setError(msg);
      setSaving(true);
      setError('');
      try {
        const payload = { ...form };
        if (editing && !payload.password) delete payload.password;
        await onSave(payload, user?.id);
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="usr-overlay" onMouseDown={() => !saving && onClose()}>
        <form className="usr-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
          <h2>{editing ? 'Edit User' : 'Add User'}</h2>

          <label className="usr-field">Full Name
            <input className="usr-input" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
          </label>
          <label className="usr-field">Email
            <input className="usr-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </label>
          <label className="usr-field">{editing ? 'New Password' : 'Password'}
            <input
              className="usr-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              placeholder={editing ? 'Leave blank to keep current password' : 'At least 8 characters'}
              value={form.password} onChange={(e) => set('password', e.target.value)}
            />
          </label>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '-4px 0 12px' }}>
            <button type="button" className="usr-btn usr-btn-ghost" onClick={handleGenerate}>
              {editing ? 'Reset password' : 'Generate password'}
            </button>
            {form.password && (
              <>
                <button type="button" className="usr-btn usr-btn-ghost" onClick={() => setShowPassword((s) => !s)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
                <button type="button" className="usr-btn usr-btn-ghost" onClick={handleCopy}>
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </>
            )}
          </div>
          {editing && form.password && (
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '-6px 0 12px' }}>
              Copy this password now. It is saved when you click Save changes and is not shown again.
            </p>
          )}

          <div className="usr-row">
            <label className="usr-field">Role
              <select className="usr-input" value={form.role} onChange={(e) => set('role', e.target.value)}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="usr-field">Status
              <select className="usr-input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
          </div>

          <fieldset className="usr-field usr-companies">
            <legend>Companies</legend>
            {companies.map((co) => (
              <label key={co.id} className="usr-check">
                <input type="checkbox" checked={form.companyIds.includes(co.id)} onChange={() => toggleCompany(co.id)} />
                {co.name}
              </label>
            ))}
          </fieldset>

          {error && <div className="usr-alert" role="alert">{error}</div>}

          <div className="usr-actions">
            <button type="button" className="usr-btn usr-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="usr-btn usr-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    );
  };