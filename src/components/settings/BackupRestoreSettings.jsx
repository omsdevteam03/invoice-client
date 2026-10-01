import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaDatabase, FaCloudDownloadAlt, FaCloudUploadAlt, FaHistory,
  FaDownload, FaUndo, FaTrash, FaCheckCircle, FaTimesCircle,
  FaClock, FaUsers, FaFileInvoice, FaFileInvoiceDollar, FaShieldAlt,
} from 'react-icons/fa';
import axiosInstance from '../../api/axiosInstance';

const TEAL = '#1F6F5C';
const ORANGE = '#f97316';

// ── helpers ──
const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
};

const formatDateTime = (value) => {
  if (!value) return 'Never';
  const d = new Date(value);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const StatusBadge = ({ status }) => {
  const map = {
    success: { bg: '#dcfce7', color: '#15803d', label: 'Success', Icon: FaCheckCircle },
    failed: { bg: '#fee2e2', color: '#b91c1c', label: 'Failed', Icon: FaTimesCircle },
    never: { bg: '#f1f5f9', color: '#64748b', label: 'Never Backed Up', Icon: FaClock },
  };
  const s = map[status] || map.never;
  return (
    <span
      className="badge d-inline-flex align-items-center gap-1 px-2 py-2"
      style={{ backgroundColor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.8rem' }}
    >
      <s.Icon size={12} /> {s.label}
    </span>
  );
};

const StatCard = ({ icon, label, value, sub }) => (
  <div className="col-6 col-lg-2">
    <div className="border rounded-3 h-100 p-3 bg-white">
      <div className="d-flex align-items-center gap-2 text-muted small fw-bold text-uppercase mb-2">
        {icon} <span>{label}</span>
      </div>
      <div className="fs-5 fw-bold" style={{ color: '#1e293b' }}>{value}</div>
      {sub && <div className="small text-muted mt-1">{sub}</div>}
    </div>
  </div>
);

export default function BackupRestoreSettings() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success' | 'danger', message }

  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreStep, setRestoreStep] = useState(''); // uploading | validating | restoring
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmRestoreFile, setConfirmRestoreFile] = useState(null);
  const [confirmRestoreBackupId, setConfirmRestoreBackupId] = useState(null);

  const fileInputRef = useRef(null);
  const busy = backing || restoring;

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadAll = useCallback(async () => {
    try {
      const [statsRes, historyRes, settingsRes] = await Promise.all([
        axiosInstance.get('/settings/backups/stats'),
        axiosInstance.get('/settings/backups'),
        axiosInstance.get('/settings/backups/settings'),
      ]);
      setStats(statsRes.data);
      setHistory(historyRes.data);
      setSettings(settingsRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Create Backup ──
  const handleCreateBackup = async () => {
    setBacking(true);
    try {
      const res = await axiosInstance.post('/settings/backups/create');
      showToast('success', 'Backup created successfully. Starting download…');
      await triggerDownload(res.data.id, res.data.name);
      await loadAll();
    } catch (err) {
      showToast('danger', err.response?.data?.message || 'Backup failed. Please try again.');
    } finally {
      setBacking(false);
    }
  };

  // ── Download (used by both "Create Backup" and history row) ──
  const triggerDownload = async (id, name) => {
    try {
      const res = await axiosInstance.get(`/settings/backups/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${name}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast('danger', 'Could not download this backup file.');
    }
  };

  // ── Restore: file picked ──
  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      showToast('danger', 'Please choose a .zip backup file.');
      return;
    }
    setConfirmRestoreFile(file);
  };

  const runRestore = async (formData) => {
    setRestoring(true);
    setRestoreStep('uploading');
    setUploadProgress(0);
    try {
      await axiosInstance.post('/settings/backups/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.loaded * 100) / (evt.total || evt.loaded));
          setUploadProgress(pct);
          if (pct >= 100) setRestoreStep('restoring');
        },
      });
      showToast('success', 'Restore completed successfully. Your data has been updated.');
      await loadAll();
    } catch (err) {
      showToast('danger', err.response?.data?.message || 'Restore failed. Your existing data was not changed.');
    } finally {
      setRestoring(false);
      setRestoreStep('');
      setUploadProgress(0);
    }
  };

  const confirmUploadRestore = async () => {
    const file = confirmRestoreFile;
    setConfirmRestoreFile(null);
    if (!file) return;
    const formData = new FormData();
    formData.append('backup', file);
    await runRestore(formData);
  };

  // ── Restore directly from history row ──
  const handleRestoreFromHistory = (id) => setConfirmRestoreBackupId(id);

  const confirmHistoryRestore = async () => {
    const id = confirmRestoreBackupId;
    setConfirmRestoreBackupId(null);
    if (!id) return;
    setRestoring(true);
    setRestoreStep('restoring');
    try {
      const fileRes = await axiosInstance.get(`/settings/backups/${id}/download`, { responseType: 'blob' });
      const formData = new FormData();
      formData.append('backup', fileRes.data, 'backup.zip');
      await axiosInstance.post('/settings/backups/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('success', 'Restore completed successfully.');
      await loadAll();
    } catch (err) {
      showToast('danger', err.response?.data?.message || 'Restore failed. Your existing data was not changed.');
    } finally {
      setRestoring(false);
      setRestoreStep('');
    }
  };

  // ── Delete ──
  const handleDelete = (id) => setConfirmDeleteId(id);

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!id) return;
    setDeletingId(id);
    try {
      await axiosInstance.delete(`/settings/backups/${id}`);
      showToast('success', 'Backup deleted.');
      await loadAll();
    } catch (err) {
      showToast('danger', 'Could not delete this backup.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Automatic backup settings ──
  const updateAutoSetting = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      const res = await axiosInstance.put('/settings/backups/settings', {
        autoBackupEnabled: next.autoBackupEnabled,
        frequency: next.frequency,
      });
      setSettings(res.data);
    } catch (err) {
      showToast('danger', 'Could not save automatic backup settings.');
      loadAll();
    }
  };

  if (loading) return <div className="text-muted small">Loading backup information…</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Backup &amp; Restore</h4>
          <p className="text-muted small mb-0">Securely back up and restore all of your CRM data from one place</p>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {toast && (
        <div className={`alert alert-${toast.type} py-2 small d-flex align-items-center gap-2`} role="alert">
          {toast.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />} {toast.message}
        </div>
      )}

      {/* ── Overview stats ── */}
      <div className="row g-3 mb-4">
        <StatCard
          icon={<FaClock size={13} />}
          label="Last Backup"
          value={formatDateTime(stats.lastBackupAt)}
        />
        <StatCard
          icon={<FaShieldAlt size={13} />}
          label="Backup Status"
          value={<StatusBadge status={stats.lastBackupStatus} />}
        />
        <StatCard icon={<FaDatabase size={13} />} label="Database Size" value={formatBytes(stats.dbSizeBytes)} />
        <StatCard icon={<FaUsers size={13} />} label="Total Customers" value={stats.totalCustomers} />
        <StatCard icon={<FaFileInvoice size={13} />} label="Total Quotations" value={stats.totalQuotations} />
        <StatCard icon={<FaFileInvoiceDollar size={13} />} label="Total Invoices" value={stats.totalInvoices} />
      </div>

      {/* ── Primary actions ── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-6">
              <button
                className="btn text-white w-100 py-3 d-flex align-items-center justify-content-center gap-2 fs-6 fw-bold"
                style={{ backgroundColor: TEAL }}
                onClick={handleCreateBackup}
                disabled={busy}
              >
                {backing ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    Creating Backup…
                  </>
                ) : (
                  <>
                    <FaCloudDownloadAlt size={18} /> Create Backup
                  </>
                )}
              </button>
              <div className="form-text text-center">Downloads a full .zip of your customers, quotations, invoices, and settings</div>
            </div>
            <div className="col-md-6">
              <button
                className="btn btn-outline-secondary w-100 py-3 d-flex align-items-center justify-content-center gap-2 fs-6 fw-bold"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                style={{ borderWidth: 2 }}
              >
                {restoring ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    {restoreStep === 'uploading' ? `Uploading… ${uploadProgress}%` : 'Restoring…'}
                  </>
                ) : (
                  <>
                    <FaCloudUploadAlt size={18} /> Restore Backup
                  </>
                )}
              </button>
              <input
                type="file"
                accept=".zip"
                ref={fileInputRef}
                onChange={handleFilePicked}
                className="d-none"
              />
              <div className="form-text text-center">Upload a previously created backup file to restore your data</div>
            </div>
          </div>

          {restoring && (
            <div className="mt-3">
              <div className="progress" style={{ height: 8 }}>
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{
                    width: restoreStep === 'uploading' ? `${uploadProgress}%` : '100%',
                    backgroundColor: TEAL,
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              <div className="small text-muted mt-1">
                {restoreStep === 'uploading' ? 'Uploading backup file…' : 'Validating and restoring your data — please don\u2019t close this page…'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Automatic Backup ── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
            <div>
              <div className="fw-bold mb-1">Automatic Backup</div>
              <p className="text-muted small mb-0">Let the CRM create backups for you on a schedule</p>
            </div>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="autoBackupSwitch"
                style={{ width: '3rem', height: '1.6rem', cursor: 'pointer' }}
                checked={Boolean(settings.autoBackupEnabled)}
                onChange={(e) => updateAutoSetting({ autoBackupEnabled: e.target.checked })}
              />
              <label className="form-check-label small fw-bold ms-2" htmlFor="autoBackupSwitch">
                {settings.autoBackupEnabled ? 'Enabled' : 'Disabled'}
              </label>
            </div>
          </div>

          <div className="row g-2">
            {['daily', 'weekly', 'monthly'].map((freq) => (
              <div className="col-4" key={freq}>
                <button
                  className="btn w-100 py-2 text-capitalize fw-bold"
                  disabled={!settings.autoBackupEnabled}
                  onClick={() => updateAutoSetting({ frequency: freq })}
                  style={{
                    backgroundColor: settings.frequency === freq ? ORANGE : '#f8fafc',
                    color: settings.frequency === freq ? '#fff' : '#475569',
                    border: settings.frequency === freq ? 'none' : '1.5px solid #e2e8f0',
                  }}
                >
                  {freq}
                </button>
              </div>
            ))}
          </div>

          {settings.autoBackupEnabled && (
            <div className="form-text mt-2">
              Next automatic backup: <strong>{formatDateTime(settings.nextRunAt)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── Backup History ── */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <FaHistory style={{ color: TEAL }} />
            <div className="fw-bold">Backup History</div>
          </div>

          {history.length === 0 ? (
            <div className="text-center text-muted py-5">
              <FaDatabase size={28} className="mb-2 opacity-50" />
              <div>No backups yet. Create your first backup above.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr className="text-muted small text-uppercase">
                    <th>Backup Name</th>
                    <th>Date &amp; Time</th>
                    <th>File Size</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((b) => (
                    <tr key={b.id}>
                      <td className="fw-bold">{b.name}</td>
                      <td>{formatDateTime(b.createdAt)}</td>
                      <td>{formatBytes(b.fileSize)}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>
                        <div className="d-flex justify-content-end gap-2">
                          <button
                            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                            title="Download"
                            onClick={() => triggerDownload(b.id, b.name)}
                            disabled={busy}
                          >
                            <FaDownload size={12} /> Download
                          </button>
                          <button
                            className="btn btn-sm d-flex align-items-center gap-1 text-white"
                            style={{ backgroundColor: TEAL }}
                            title="Restore this backup"
                            onClick={() => handleRestoreFromHistory(b.id)}
                            disabled={busy}
                          >
                            <FaUndo size={12} /> Restore
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                            title="Delete"
                            onClick={() => handleDelete(b.id)}
                            disabled={busy || deletingId === b.id}
                          >
                            <FaTrash size={12} /> {deletingId === b.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm: restore from uploaded file ── */}
      {confirmRestoreFile && (
        <ConfirmModal
          title="Restore Backup"
          message="Restoring a backup will overwrite the current data. Do you want to continue?"
          detail={confirmRestoreFile.name}
          confirmLabel="Yes, Restore"
          confirmColor="#dc3545"
          onCancel={() => setConfirmRestoreFile(null)}
          onConfirm={confirmUploadRestore}
        />
      )}

      {/* ── Confirm: restore from history row ── */}
      {confirmRestoreBackupId && (
        <ConfirmModal
          title="Restore Backup"
          message="Restoring a backup will overwrite the current data. Do you want to continue?"
          confirmLabel="Yes, Restore"
          confirmColor="#dc3545"
          onCancel={() => setConfirmRestoreBackupId(null)}
          onConfirm={confirmHistoryRestore}
        />
      )}

      {/* ── Confirm: delete ── */}
      {confirmDeleteId && (
        <ConfirmModal
          title="Delete Backup"
          message="This backup file will be permanently deleted. This cannot be undone."
          confirmLabel="Yes, Delete"
          confirmColor="#dc3545"
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

// ── Simple, accessible confirmation modal (no extra deps) ──
function ConfirmModal({ title, message, detail, confirmLabel, confirmColor, onCancel, onConfirm }) {
  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }}
      onClick={onCancel}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-body p-4">
            <h5 className="fw-bold mb-2">{title}</h5>
            <p className="text-muted mb-1">{message}</p>
            {detail && <p className="small fw-bold mb-3">{detail}</p>}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>
              <button className="btn text-white" style={{ backgroundColor: confirmColor }} onClick={onConfirm}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}