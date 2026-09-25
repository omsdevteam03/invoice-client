import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FaTrash, FaUndo, FaTimes, FaExclamationTriangle } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_URL;
const TABS = [
    { key: "customers", label: "Customers", endpoint: "customers" },
    { key: "quotations", label: "Quotations", endpoint: "quotations" },
    { key: "invoices", label: "Invoices", endpoint: "invoices" },
];

const T = {
    navy: "#0F172A",
    slate: "#334155",
    muted: "#64748B",
    border: "#E5E7EB",
    bgSoft: "#F8FAFC",
    green: "#16A34A",
    red: "#DC2626",
    redSoft: "#FEF2F2",
    teal: "#0F766E",
};

function daysLeft(deletedAt) {
    const deletedTime = new Date(deletedAt).getTime();
    const expiresAt = deletedTime + 30 * 24 * 60 * 60 * 1000;
    const msLeft = expiresAt - Date.now();
    return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

function ConfirmPermanentDeleteModal({ show, onCancel, onConfirm, itemLabel }) {
    if (!show) return null;
    return (
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
            <div style={{ backgroundColor: "#fff", borderRadius: 16, maxWidth: 400, width: "90%", padding: 32, textAlign: "center" }}>
                <div style={{
                    width: 56, height: 56, borderRadius: "50%", background: `${T.red}18`,
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: T.red,
                }}>
                    <FaExclamationTriangle size={22} />
                </div>
                <h5 style={{ color: T.navy, fontWeight: 700, marginBottom: 10 }}>Delete forever?</h5>
                <p style={{ color: T.muted, fontSize: 14, marginBottom: 20 }}>
                    {itemLabel} will be permanently removed. This cannot be undone.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                    <button onClick={onCancel} style={{ border: "none", fontWeight: 600, padding: "10px 20px", backgroundColor: T.bgSoft, color: T.slate, borderRadius: 10, cursor: "pointer", fontSize: 14 }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} style={{ border: "none", fontWeight: 600, padding: "10px 20px", backgroundColor: T.red, color: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 14 }}>
                        Delete Forever
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Trash() {
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get("tab") || "customers";
    const [activeTab, setActiveTab] = useState(initialTab);
    const [items, setItems] = useState({ customers: [], quotations: [], invoices: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [confirmTarget, setConfirmTarget] = useState(null); // { endpoint, id, label }
    const [toast, setToast] = useState(null);

    const activeEndpoint = TABS.find((t) => t.key === activeTab)?.endpoint;

    const fetchTrash = async (endpoint) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/${endpoint}/trash`);
            if (!res.ok) throw new Error(`Failed to load trash (${res.status})`);
            const data = await res.json();
            setItems((prev) => ({ ...prev, [endpoint]: data }));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrash(activeEndpoint);
    }, [activeEndpoint]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    };

    const handleRestore = async (endpoint, id, label) => {
        try {
            const res = await fetch(`${API_BASE}/${endpoint}/${id}/restore`, { method: "POST" });
            if (!res.ok) throw new Error("Restore failed");
            setItems((prev) => ({ ...prev, [endpoint]: prev[endpoint].filter((i) => i.id !== id) }));
            showToast(`${label} restored`);
        } catch (err) {
            showToast(`Error: ${err.message}`);
        }
    };

    const handlePermanentDelete = async () => {
        if (!confirmTarget) return;
        const { endpoint, id, label } = confirmTarget;
        try {
            const res = await fetch(`${API_BASE}/${endpoint}/${id}/permanent`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            setItems((prev) => ({ ...prev, [endpoint]: prev[endpoint].filter((i) => i.id !== id) }));
            showToast(`${label} permanently deleted`);
        } catch (err) {
            showToast(`Error: ${err.message}`);
        } finally {
            setConfirmTarget(null);
        }
    };

    const renderItemLabel = (item) => {
        if (activeTab === "customers") return item.name || item.company || item.id;
        if (activeTab === "quotations") return `${item.id} — ${item.company || item.name || "Untitled"}`;
        if (activeTab === "invoices") return `${item.invoiceNo || item.id} — ${item.buyerName || "Untitled"}`;
        return item.id;
    };

    const renderItemSubtext = (item) => {
        if (activeTab === "customers") return item.email || item.company || "";
        if (activeTab === "quotations") return item.amount != null ? `₹${item.amount}` : "";
        if (activeTab === "invoices") return item.total != null ? `₹${item.total}` : "";
        return "";
    };

    const currentItems = items[activeEndpoint] || [];

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <FaTrash color={T.slate} />
                <h2 style={{ fontWeight: 700, color: T.navy, margin: 0 }}>Trash</h2>
            </div>
            <p style={{ color: T.muted, fontSize: 13.5, marginBottom: 20 }}>
                Deleted items stay here for 30 days before being permanently removed.
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 18, borderBottom: `1px solid ${T.border}` }}>
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            border: "none", background: "none", cursor: "pointer",
                            padding: "10px 16px", fontWeight: 600, fontSize: 14,
                            color: activeTab === tab.key ? T.teal : T.muted,
                            borderBottom: activeTab === tab.key ? `2.5px solid ${T.teal}` : "2.5px solid transparent",
                        }}
                    >
                        {tab.label} {items[tab.endpoint]?.length > 0 && `(${items[tab.endpoint].length})`}
                    </button>
                ))}
            </div>

            {loading && <div style={{ color: T.muted, padding: "24px 0", textAlign: "center" }}>Loading trash...</div>}
            {error && <div style={{ color: T.red, padding: "24px 0", textAlign: "center" }}>{error}</div>}

            {!loading && !error && currentItems.length === 0 && (
                <div style={{ color: T.muted, textAlign: "center", padding: "48px 0" }}>
                    <FaTrash size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
                    <div>Trash is empty</div>
                </div>
            )}

            {!loading && !error && currentItems.map((item) => (
                <div key={item.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 10, backgroundColor: "#fff",
                }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: T.navy, fontSize: 14 }}>{renderItemLabel(item)}</div>
                        <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>
                            {renderItemSubtext(item)}
                            {item.deletedAt && (
                                <span> · Deleted {new Date(item.deletedAt).toLocaleDateString()} · {daysLeft(item.deletedAt)} days left</span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button
                            onClick={() => handleRestore(activeEndpoint, item.id, renderItemLabel(item))}
                            title="Restore"
                            style={{
                                display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8,
                                backgroundColor: `${T.green}15`, color: T.green, padding: "6px 12px", fontWeight: 600, fontSize: 12.5, cursor: "pointer",
                            }}
                        >
                            <FaUndo size={11} /> Restore
                        </button>
                        <button
                            onClick={() => setConfirmTarget({ endpoint: activeEndpoint, id: item.id, label: renderItemLabel(item) })}
                            title="Delete Forever"
                            style={{
                                display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8,
                                backgroundColor: T.redSoft, color: T.red, padding: "6px 12px", fontWeight: 600, fontSize: 12.5, cursor: "pointer",
                            }}
                        >
                            <FaTimes size={11} /> Delete
                        </button>
                    </div>
                </div>
            ))}

            <ConfirmPermanentDeleteModal
                show={!!confirmTarget}
                itemLabel={confirmTarget?.label}
                onCancel={() => setConfirmTarget(null)}
                onConfirm={handlePermanentDelete}
            />

            {toast && (
                <div style={{
                    position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
                    backgroundColor: T.navy, color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 13.5, fontWeight: 500, zIndex: 9999,
                }}>
                    {toast}
                </div>
            )}
        </div>
    );
}