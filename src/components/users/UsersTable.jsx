// UsersTable.jsx — NO imports. Hooks are injected by the page.
export const createUsersTable = ({ useState, useMemo }) =>
  function UsersTable({ users, companies, loading, onEdit, onDelete, onToggleStatus }) {
    const [search, setSearch] = useState('');

    const companyName = (id) => companies.find((c) => c.id === id)?.name || 'Unknown company';
    const initials = (name) =>
      (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

    const rows = useMemo(() => {
      const q = search.trim().toLowerCase();
      if (!q) return users;
      return users.filter((u) => [u.fullName, u.email, u.role].some((v) => (v || '').toLowerCase().includes(q)));
    }, [users, search]);

    return (
      <div className="usr-card">
        <div className="usr-toolbar">
          <input
            className="usr-input usr-search"
            placeholder="Search by name, email or role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="usr-scroll">
          <table className="usr-table">
            <thead>
              <tr>
                <th>User</th><th>Email</th><th>Role</th><th>Companies</th><th>Status</th>
                <th className="usr-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="usr-empty">Loading users…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="usr-empty">No users found. Select “+ Add User” to add your first user.</td></tr>
              )}
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="usr-person">
                      {u.avatarUrl
                        ? <img className="usr-avatar" src={u.avatarUrl} alt="" />
                        : <span className="usr-avatar">{initials(u.fullName)}</span>}
                      <strong>{u.fullName}</strong>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td><span className="usr-role">{u.role}</span></td>
                  <td>
                    <div className="usr-chips">
                      {(u.companyIds || []).map((id) => <span key={id} className="usr-chip">{companyName(id)}</span>)}
                    </div>
                  </td>
                  <td>
                    <button
                      className={`usr-status ${u.status === 'Active' ? 'is-active' : 'is-inactive'}`}
                      onClick={() => onToggleStatus(u)}
                      title={u.status === 'Active' ? 'Deactivate user' : 'Activate user'}
                    >
                      {u.status}
                    </button>
                  </td>
                  <td className="usr-right">
                    <button className="usr-btn usr-btn-ghost" onClick={() => onEdit(u)}>Edit</button>
                    <button className="usr-btn usr-btn-danger" onClick={() => onDelete(u)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };