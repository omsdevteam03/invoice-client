import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

// ── Validation rules (shared with InvoicesPage) ─────────────────────────
export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const MOBILE_REGEX = /^[6-9]\d{9}$/;
export const PINCODE_REGEX = /\b[1-9]\d{5}\b/;
export const HSN_REGEX = /^(\d{4}|\d{6}|\d{8})$/;
export const VEHICLE_REGEX = /^[A-Z]{2}\d{2}[A-Z]{0,3}\d{4}$/;

export const EWB_MIN_VALUE = 50000; // set to 0 to switch the value check off
// Returns [{ group, label, ok, hint }]
export function getEwayBillChecklist(inv = {}) {
  const list = [];
  const add = (group, label, ok, hint = "") => list.push({ group, label, ok: Boolean(ok), hint });

  const items = inv.items || [];
  const failing = (test) => {
    const rows = items.map((it, i) => (test(it) ? null : i + 1)).filter(Boolean);
    return rows.length ? `Check item ${rows.join(", ")}` : "";
  };

  // Seller
  add("Seller", "Company GSTIN is valid (15 characters)",
    GSTIN_REGEX.test((inv.companyGSTIN || "").trim().toUpperCase()),
    "Edit invoice → Company GSTIN");

  // Buyer
  add("Buyer", "Buyer name is filled", (inv.buyerName || "").trim(), "Edit invoice → Buyer Name");

  const address = (inv.buyerAddress || "").trim();
  add("Buyer", "Buyer address is at least 10 characters", address.length >= 10, "Edit invoice → Address");
  add("Buyer", "Buyer address includes a 6-digit pincode", PINCODE_REGEX.test(address), "Add pincode in the address");

  const mobile = (inv.buyerMobile || "").replace(/^\+?91/, "").replace(/\D/g, "");
  add("Buyer", "Buyer mobile is a valid 10-digit number", MOBILE_REGEX.test(mobile), "Edit invoice → Mobile Number");

  const bg = (inv.buyerGSTIN || "").trim().toUpperCase();
  add("Buyer", "Buyer GSTIN is valid (optional — blank is OK)", !bg || GSTIN_REGEX.test(bg), "Fix or clear the Buyer GSTIN");

  // Items
  add("Items", "At least one item added", items.length > 0, "Add an item");
  if (items.length) {
    const t1 = (it) => (it.description || "").trim();
    const t2 = (it) => HSN_REGEX.test(String(it.hsnCode || ""));
    const t3 = (it) => Number(it.qty) > 0;
    const t4 = (it) => Number(it.rate) > 0;
    const t5 = (it) => it.unit;
    add("Items", "Every item has a description", !failing(t1), failing(t1));
    add("Items", "Every item has HSN code (4, 6 or 8 digits)", !failing(t2), failing(t2));
    add("Items", "Every item has quantity > 0", !failing(t3), failing(t3));
    add("Items", "Every item has rate > 0", !failing(t4), failing(t4));
    add("Items", "Every item has a unit", !failing(t5), failing(t5));
  }

    // Consignment checks
  if (items.length) {
    // Services use SAC codes that start with 99; goods use HSN codes
    const isGoods = (it) => !String(it.hsnCode || "").startsWith("99");
    add("Consignment", "Items are goods, not services (SAC codes start with 99)",
      !failing(isGoods), failing(isGoods));
  }

  const rawSum = items.reduce((a, it) => a + Number(it.amount || 0), 0);
  const gstPct = Number(inv.gstPercent || 18);
  const invoiceValue = inv.gstType === "With GST"
    ? rawSum + Math.round(rawSum * (gstPct / 100))
    : rawSum;
  add("Consignment", `Invoice value is above ₹${EWB_MIN_VALUE.toLocaleString("en-IN")}`,
    invoiceValue > EWB_MIN_VALUE,
    `Current value is ₹${invoiceValue.toLocaleString("en-IN")}`);

  return list;
}

export const isEwayBillReady = (inv) => getEwayBillChecklist(inv).every((c) => c.ok);

// Array of error strings (empty = valid) — used by InvoicesPage as a safety check
export const validateForEwayBill = (inv) =>
  getEwayBillChecklist(inv)
    .filter((c) => !c.ok)
    .map((c) => (c.hint && c.hint.startsWith("Check item") ? `${c.label} (${c.hint})` : c.label));

// ── Side panel shown to the right of the invoice. Not printed. ──────────
export default function EwayBillChecklist({ invoice }) {
  const checks = getEwayBillChecklist(invoice);
  const done = checks.filter((c) => c.ok).length;
  const ready = done === checks.length;
  const groups = [...new Set(checks.map((c) => c.group))];

  return (
    <aside
      className="no-print"
      style={{
        flex: "0 0 290px", width: 290, maxWidth: "100%", position: "sticky", top: 20,
        background: "#fff", borderRadius: 14, border: "1.5px solid #f1f5f9",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)", overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px", background: ready ? "#ecfdf5" : "#fffbeb", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>E-Way Bill Checklist</div>
        <div style={{ fontSize: "0.74rem", fontWeight: 600, color: ready ? "#059669" : "#b45309", marginTop: 2 }}>
          {invoice.ewayBillNo
            ? `Generated: ${invoice.ewayBillNo}`
            : ready ? "All set — you can generate now" : `${done} of ${checks.length} completed`}
        </div>
        <div style={{ height: 5, background: "#e2e8f0", borderRadius: 99, marginTop: 8 }}>
          <div style={{ height: "100%", width: `${(done / checks.length) * 100}%`, background: ready ? "#10b981" : "#f59e0b", borderRadius: 99, transition: "width .2s" }} />
        </div>
      </div>

      <div style={{ padding: "6px 14px 12px" }}>
        {groups.map((g) => (
          <div key={g}>
            <div style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.06em", color: "#94a3b8", margin: "10px 0 4px" }}>
              {g.toUpperCase()}
            </div>
            {checks.filter((c) => c.group === g).map((c) => (
              <div key={c.label} style={{ display: "flex", gap: 8, padding: "4px 0", alignItems: "flex-start" }}>
                {c.ok
                  ? <FaCheckCircle size={14} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
                  : <FaTimesCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />}
                <div>
                  <div style={{ fontSize: "0.78rem", color: c.ok ? "#334155" : "#0f172a", fontWeight: c.ok ? 400 : 600 }}>{c.label}</div>
                  {!c.ok && c.hint && <div style={{ fontSize: "0.7rem", color: "#ef4444" }}>{c.hint}</div>}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 10 }}>
          Vehicle number and transporter ID are asked when you click Generate.
        </div>
      </div>
    </aside>
  );
}