// Labels for the English / Tamil invoice, plus the toggle button.

export const INVOICE_FONT = "Arial, 'Noto Sans Tamil', 'Nirmala UI', Latha, sans-serif";

export const INVOICE_LABELS = {
  en: {
    proforma: "PROFORMA INVOICE",
    gstNumber: "GST Number (GSTIN)",
    invoiceNo: "Invoice No.",
    dated: "Dated",
    buyer: "Buyer (Bill to)",
    name: "Name",
    company: "Company",
    mobile: "Mobile",
    sl: "Sl. No.",
    description: "Description of Services",
    qty: "Qty",
    rate: "Rate (₹)",
    amount: "Amount (₹)",
    subTotal: "Sub Total",
    gst: "GST",
    included: "Included",
    total: "Total Invoice Value",
    paid: "Amount Paid",
    due: "Amount Due",
    inWords: "Amount Chargeable (In words)",
    dueDate: "Due Date",
    declaration: "Declaration:",
    declarationText:
      "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
    note: "Note",
    forCompany: (c) => `For ${c}`,
    signatory: "Authorized Signatory",
  },
  ta: {
    proforma: "ப்ரோஃபார்மா பில்",
    gstNumber: "ஜிஎஸ்டி எண் (GSTIN)",
    invoiceNo: "பில் எண்",
    dated: "தேதி",
    buyer: "பில் பெறுபவர்",
    name: "பெயர்",
    company: "நிறுவனம்",
    mobile: "மொபைல்",
    sl: "வ.எண்",
    description: "பொருள் / சேவை விவரம்",
    qty: "எண்ணிக்கை",
    rate: "விலை (₹)",
    amount: "மொத்த தொகை (₹)",
    subTotal: "துணை மொத்தம்",
    gst: "ஜிஎஸ்டி",
    included: "உள்ளடக்கியது",
    total: "மொத்த பில் தொகை",
    paid: "செலுத்திய தொகை",
    due: "நிலுவைத் தொகை",
    inWords: "தொகை (எழுத்தில்)",
    dueDate: "செலுத்த வேண்டிய தேதி",
    declaration: "உறுதிமொழி:",
    declarationText:
      "இந்த பில்லில் குறிப்பிடப்பட்டுள்ள விலை மற்றும் அனைத்து விவரங்களும் உண்மையானவை மற்றும் சரியானவை என்று உறுதி அளிக்கிறோம்.",
    note: "குறிப்பு",
    forCompany: (c) => `${c} சார்பாக`,
    signatory: "அங்கீகரிக்கப்பட்ட கையொப்பம்",
  },
};

export function InvoiceLangToggle({ lang, onChange }) {
  const options = [
    { key: "en", label: "English Invoice" },
    { key: "ta", label: "Tamil Invoice" },
  ];
  return (
    <div
      className="no-print d-flex"
      style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden", backgroundColor: "#fff" }}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className="border-0 fw-semibold"
          style={{
            padding: "8px 12px",
            fontSize: "0.8rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
            backgroundColor: lang === o.key ? "#1F6F5C" : "transparent",
            color: lang === o.key ? "#fff" : "#475569",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}