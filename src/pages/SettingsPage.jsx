import { useState } from 'react';
import { FaBuilding, FaUser, FaFileInvoiceDollar, FaDatabase } from 'react-icons/fa';
import CompanySettings from '../components/settings/CompanySettings';
import InvoiceQuotationSettings from '../components/settings/InvoiceQuotationSettings';
import ProfileSettings from '../components/settings/ProfileSettings';
import BackupRestoreSettings from '../components/settings/BackupRestoreSettings';

const navItems = [
  { id: 'company', label: 'Company', icon: <FaBuilding size={14} />, Component: CompanySettings },
  { id: 'invoice', label: 'Invoice & Quotation', icon: <FaFileInvoiceDollar size={14} />, Component: InvoiceQuotationSettings },
  { id: 'profile', label: 'Profile', icon: <FaUser size={14} />, Component: ProfileSettings },
  { id: 'backup', label: 'Backup & Restore', icon: <FaDatabase size={14} />, Component: BackupRestoreSettings },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const ActiveComponent = navItems.find((item) => item.id === activeTab).Component;

  return (
    <div className="container-fluid py-4">
      <div className="row">
        {/* ── Desktop sidebar ── */}
        <div className="col-md-3 col-lg-2 d-none d-md-block">
          <div className="nav flex-column nav-pills gap-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className="nav-link d-flex align-items-center gap-2 text-start"
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    backgroundColor: active ? '#fff7ed' : 'transparent',
                    color: active ? '#f97316' : '#475569',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {item.icon} {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Mobile tab strip ── */}
        <div className="col-12 d-md-none mb-3">
          <div className="d-flex gap-2 overflow-auto pb-2">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className="btn btn-sm rounded-pill d-flex align-items-center gap-2 flex-shrink-0"
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    backgroundColor: active ? '#fff7ed' : '#f8fafc',
                    color: active ? '#f97316' : '#64748b',
                    border: active ? '1.5px solid #fed7aa' : '1.5px solid transparent',
                  }}
                >
                  {item.icon} {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="col-md-9 col-lg-10">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}