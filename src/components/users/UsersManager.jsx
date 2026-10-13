// UsersManager.jsx — NO imports. Holds page state + API calls and composes the other components.
// Child components are injected by the page.
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Adjust to match how InvoicePro authenticates (cookie vs bearer token)
const authHeaders = () => {
  const h = { 'Content-Type': 'application/json' };
  const t = typeof localStorage !== 'undefined' && localStorage.getItem('token');
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
};

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders(), ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Something went wrong. Please try again.');
  return body;
}

export const createUsersManager = ({ useState, useEffect }, { UsersTable, UserFormModal, DeleteUserModal }) =>
  function UsersManager() {
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [limit, setLimit] = useState(null); // null = no limit
    const [limitInput, setLimitInput] = useState('');
    const [editingLimit, setEditingLimit] = useState(false);

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [u, c, l] = await Promise.all([api('/users'), api('/users/companies'), api('/users/limit')]);
        setUsers(Array.isArray(u.users) ? u.users : []);
        setCompanies(Array.isArray(c.companies) ? c.companies : []);
        setLimit(l.limit);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => { load(); }, []);

    const limitReached = limit !== null && users.length >= limit;

    const saveLimit = async () => {
      try {
        const val = String(limitInput).trim() === '' ? null : Number(limitInput);
        await api('/users/limit', { method: 'PUT', body: JSON.stringify({ limit: val }) });
        setLimit(val);
        setEditingLimit(false);
        setError('');
      } catch (e) {
        setError(e.message);
      }
    };

    const openAdd = () => { setEditingUser(null); setModalOpen(true); };
    const openEdit = (u) => { setEditingUser(u); setModalOpen(true); };

    // Throws on failure so the modal can show the error inline
    const save = async (payload, id) => {
      await api(id ? `/users/${id}` : '/users', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      setModalOpen(false);
      await load();
    };

    const toggleStatus = async (u) => {
      const next = u.status === 'Active' ? 'Inactive' : 'Active';
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
      try {
        await api(`/users/${u.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      } catch (e) {
        setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)));
        setError(e.message);
      }
    };

    const remove = async (u) => {
      try {
        await api(`/users/${u.id}`, { method: 'DELETE' });
        setUsers((list) => list.filter((x) => x.id !== u.id));
      } catch (e) {
        setError(e.message);
      }
      setDeleteTarget(null);
    };

    return (
      <div className="usr-page">
        <div className="usr-head">
          <div>
            <h1>Users</h1>
            <p>Manage users who can access InvoicePro.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {editingLimit ? (
              <>
                <input className="usr-input" type="number" min="1" style={{ width: 110 }} placeholder="No limit"
                  value={limitInput} onChange={(e) => setLimitInput(e.target.value)} />
                <button className="usr-btn usr-btn-primary" onClick={saveLimit}>Save</button>
                <button className="usr-btn usr-btn-ghost" onClick={() => setEditingLimit(false)}>Cancel</button>
              </>
            ) : (
              <button className="usr-btn usr-btn-ghost" onClick={() => { setLimitInput(limit ?? ''); setEditingLimit(true); }}>
                User limit: {users.length} / {limit ?? '∞'}
              </button>
            )}
            <button className="usr-btn usr-btn-primary" onClick={openAdd} disabled={limitReached}
              title={limitReached ? 'User limit reached' : ''}>+ Add User</button>
          </div>
        </div>

        {error && <div className="usr-alert" role="alert">{error}</div>}

        <UsersTable
          users={users} companies={companies} loading={loading}
          onEdit={openEdit} onDelete={setDeleteTarget} onToggleStatus={toggleStatus}
        />

        <UserFormModal
          open={modalOpen} user={editingUser} companies={companies}
          onClose={() => setModalOpen(false)} onSave={save}
        />
        <DeleteUserModal user={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
      </div>
    );
  };