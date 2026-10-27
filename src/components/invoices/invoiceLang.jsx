// Labels for the English / Tamil invoice, plus the toggle button.
import { useState, useEffect } from "react";

export const INVOICE_FONT = "Arial, 'Noto Sans Tamil', 'Nirmala UI', Latha, sans-serif";

// ── Tamil translation of free-text fields (item descriptions) ─────────────
// v2: new key so the old bad translations (e.g. "தமிழ் பொருள் அரிசி") are ignored
const TA_CACHE_KEY = "invoice_ta_cache_v2";

function readTaCache() {
  try { return JSON.parse(localStorage.getItem(TA_CACHE_KEY) || "{}"); } catch { return {}; }
}
function writeTaCache(c) {
  try { localStorage.setItem(TA_CACHE_KEY, JSON.stringify(c)); } catch { }
}

export async function translateToTamil(text) {
  const t = (text || "").trim();
  if (!t) return "";
  const key = t.toLowerCase();
  const cache = readTaCache();
  if (cache[key]) return cache[key];

  let out = "";

  // 1) Google Translate (accurate for single words like "rice" -> "அரிசி")
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ta&dt=t&q=${encodeURIComponent(t.slice(0, 500))}`
    );
    const data = await res.json();
    out = (data?.[0] || []).map(part => part?.[0] || "").join("").trim();
  } catch (err) {
    console.error("Google translate failed, trying fallback:", err);
  }

  // 2) Fallback: MyMemory (only if Google failed)
  if (!out) {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t.slice(0, 500))}&langpair=en|ta`
    );
    const data = await res.json();
    out = data?.responseData?.translatedText;
    if (!out || Number(data.responseStatus) !== 200) throw new Error("Translation failed");
  }

  cache[key] = out;
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
const TA_UNITS = {
  Nos: "எண்", Pcs: "துண்டு", Kg: "கிலோ", Gram: "கிராம்", Ton: "டன்",
  Litre: "லிட்டர்", ml: "மி.லி", Meter: "மீட்டர்", "Sq.ft": "சதுர அடி",
  Box: "பெட்டி", Bag: "பை", Set: "செட்", Hour: "மணி", Day: "நாள்", Month: "மாதம்",
};
export const unitLabel = (unit, lang) => (lang === "ta" ? TA_UNITS[unit] || unit : unit);
const TA_ONES = ["", "ஒன்று", "இரண்டு", "மூன்று", "நான்கு", "ஐந்து", "ஆறு", "ஏழு", "எட்டு", "ஒன்பது",
  "பத்து", "பதினொன்று", "பன்னிரண்டு", "பதிமூன்று", "பதினான்கு", "பதினைந்து", "பதினாறு", "பதினேழு", "பதினெட்டு", "பத்தொன்பது"];
const TA_TENS = ["", "", "இருபது", "முப்பது", "நாற்பது", "ஐம்பது", "அறுபது", "எழுபது", "எண்பது", "தொண்ணூறு"];
const TA_TENS_JOIN = ["", "", "இருபத்து", "முப்பத்து", "நாற்பத்து", "ஐம்பத்து", "அறுபத்து", "எழுபத்து", "எண்பத்து", "தொண்ணூற்று"];
const TA_HUNDREDS = ["", "நூறு", "இருநூறு", "முந்நூறு", "நானூறு", "ஐந்நூறு", "அறுநூறு", "எழுநூறு", "எண்ணூறு", "தொள்ளாயிரம்"];
const TA_HUNDREDS_JOIN = ["", "நூற்று", "இருநூற்று", "முந்நூற்று", "நானூற்று", "ஐந்நூற்று", "அறுநூற்று", "எழுநூற்று", "எண்ணூற்று", "தொள்ளாயிரத்து"];

function taBelowThousand(n) {
  if (n < 20) return TA_ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    return o ? `${TA_TENS_JOIN[t]} ${TA_ONES[o]}` : TA_TENS[t];
  }
  const h = Math.floor(n / 100), r = n % 100;
  return r ? `${TA_HUNDREDS_JOIN[h]} ${taBelowThousand(r)}` : TA_HUNDREDS[h];
}

export function numberToWordsTamil(value) {
  let num = Math.round(Number(value));
  if (!Number.isFinite(num) || num <= 0) return "பூஜ்யம்";

  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const rest = num;

  const segments = [
    [crore, "கோடி", "கோடியே", "ஒரு"],
    [lakh, "இலட்சம்", "இலட்சத்து", "ஒரு"],
    [thousand, "ஆயிரம்", "ஆயிரத்து", ""],
  ];
  const out = [];
  segments.forEach(([val, whole, joined, one], i) => {
    if (!val) return;
    const hasMore = segments.slice(i + 1).some(s => s[0]) || rest > 0;
    const prefix = val === 1 ? one : taBelowThousand(val);
    out.push(`${prefix} ${hasMore ? joined : whole}`.trim());
  });
  if (rest) out.push(taBelowThousand(rest));
  return out.join(" ");
}
export const INVOICE_LABELS = {
  en: {
    proforma: "PROFORMA INVOICE",
    gstNumber: "GST Number (GSTIN)",
    invoiceNo: "Invoice No.",
    dated: "Dated",
to: "To:",
    from: "From:",
    company: "Company",
    address: "Address",
    wordsPrefix: "INR – Indian Rupees",
    wordsSuffix: "Only",
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
  to: "பெறுநர்:",
    from: "அனுப்புநர்:",
    company: "நிறுவனம்",
    address: "முகவரி",
    wordsPrefix: "இந்திய ரூபாய்",
    wordsSuffix: "மட்டும்",
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

export function InvoiceLangToggle({ lang, onChange, compact = false }) {
  const options = [
    { key: "en", label: "English Invoice" },
    { key: "ta", label: "Tamil Invoice" },
  ];
  return (
    <div
      className="no-print d-flex"
      style={{ border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden", backgroundColor: "#fff" }}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className="border-0 fw-semibold"
          style={{
            padding: "4px 10px",
            fontSize: "0.74rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
            backgroundColor: lang === o.key ? "#1F6F5C" : "transparent",
            color: lang === o.key ? "#fff" : "#475569",
          }}
        >
          {compact ? (o.key === "en" ? "EN" : "தமிழ்") : o.label}
        </button>
      ))}
    </div>
  );
}

// ── GST split: same state = CGST + SGST, different state = IGST ──
export const stateCode = (gstin) => String(gstin || "").trim().slice(0, 2);

export function splitGst(tax, gstPercent, sellerGSTIN, buyerGSTIN) {
  const from = stateCode(sellerGSTIN);
  const to = stateCode(buyerGSTIN);
  const interState = from.length === 2 && to.length === 2 && from !== to;

  if (interState) {
    return { interState, rate: gstPercent, cgst: 0, sgst: 0, igst: tax };
  }
  const cgst = Math.round((tax / 2) * 100) / 100;
  const sgst = Math.round((tax - cgst) * 100) / 100;
  return { interState, rate: gstPercent, cgst, sgst, igst: 0 };
}

// Rows to display (1 row for IGST, 2 rows for CGST + SGST)
export function gstRows(s) {
  return s.interState
    ? [{ label: `IGST @ ${s.rate}%`, value: s.igst }]
    : [
        { label: `CGST @ ${s.rate / 2}%`, value: s.cgst },
        { label: `SGST @ ${s.rate / 2}%`, value: s.sgst },
      ];
}

// E-Way Bill is only for goods. SAC codes for services start with "99".
export const isServiceItem = (it) =>
  it.itemType === "Service" || String(it.hsnCode || "").trim().startsWith("99");
export const invoiceHasGoods = (invoice) =>
  (invoice.items || []).some((it) => !isServiceItem(it));