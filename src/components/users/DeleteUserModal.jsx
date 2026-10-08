// DeleteUserModal.jsx — NO imports.
export const createDeleteUserModal = () =>
  function DeleteUserModal({ user, onCancel, onConfirm }) {
    if (!user) return null;
    return (
      <div className="usr-overlay" onMouseDown={onCancel}>
        <div className="usr-modal usr-modal-sm" onMouseDown={(e) => e.stopPropagation()}>
          <h2>Delete user?</h2>
          <p>{user.fullName} will lose access to InvoicePro. This can’t be undone.</p>
          <div className="usr-actions">
            <button className="usr-btn usr-btn-ghost" onClick={onCancel}>Cancel</button>
            <button className="usr-btn usr-btn-dangerSolid" onClick={() => onConfirm(user)}>Delete user</button>
          </div>
        </div>
      </div>
    );
  };