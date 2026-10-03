// Labels for the English / Tamil invoice, plus the toggle button.
import { useState, useEffect } from "react";

export const INVOICE_FONT = "Arial, 'Noto Sans Tamil', 'Nirmala UI', Latha, sans-serif";

// ── Tamil translation of free-text fields (item descriptions) ─────────────
const TA_CACHE_KEY = "invoice_ta_cache";

function readTaCache() {
  try { return JSON.parse(localStorage.getItem(TA_CACHE_KEY) || "{}"); } catch { return {}; }
}
function writeTaCache(c) {
  try { localStorage.setItem(TA_CACHE_KEY, JSON.stringify(c)); } catch { }
}

export async function translateToTamil(text) {
  const t = (text || "").trim();
  if (!t) return "";
  const cache = readTaCache();
  if (cache[t]) return cache[t];

  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t.slice(0, 500))}&langpair=en|ta`
  );
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  if (!out || Number(data.responseStatus) !== 200) throw new Error("Translation failed");

  cache[t] = out;
  writeTaCache(cache);
  return out;
}

// Returns a function: tDesc(item) -> description in the selected language.
// English: returns the original text. Tamil: returns the translation
// (or the original text until the translation arrives / if it fails).
export function useTamilDescriptions(items = [], lang) {
  const [map, setMap] = useState({});
  const key = lang === "ta" ? items.map(i => i.description || "").join("\u0000") : "";

  useEffect(() => {
    if (lang !== "ta") return;
    let cancelled = false;
    const texts = [...new Set(items.map(i => (i.description || "").trim()).filter(Boolean))];

    // Small delay so we don't translate on every keystroke in the form preview
    const timer = setTimeout(async () => {
      for (const t of texts) {
        try {
          const out = await translateToTamil(t);
          if (!cancelled) setMap(prev => (prev[t] === out ? prev : { ...prev, [t]: out }));
        } catch (err) {
          console.error("Tamil translation failed for:", t, err);
        }
      }
    }, 600);

    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lang]);

  return (item) => {
    if (lang !== "ta") return item.description;
    const t = (item.description || "").trim();
    return item.descriptionTa || map[t] || readTaCache()[t] || item.description;
  };
}

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