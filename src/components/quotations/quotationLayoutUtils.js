// Shared helpers for all quotation layout components.

export function toLines(text) {
  if (!text) return [];
  return String(text).split("\n").map(l => l.trim()).filter(Boolean);
}

const HTML_RE = /<[a-z][\s\S]*>/i;
export function isHtml(v) {
  return typeof v === "string" && HTML_RE.test(v);
}

// Returns { isHtml, html, lines } — layouts pick whichever applies.
export function toLinesOrHtml(text) {
  if (!text) return { isHtml: false, lines: [], html: "" };
  if (isHtml(text)) return { isHtml: true, html: text, lines: [] };
  return { isHtml: false, lines: toLines(text), html: "" };
}

export function formatINR(n) {
  const num = Number(n) || 0;
  return `₹${num.toLocaleString("en-IN")}`;
}

export function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function computeTotals(quotation, gstPercent = 18) {
  const items = Array.isArray(quotation?.items) ? quotation.items : [];
  const subtotal = items.reduce((sum, it) => sum + (Number(it.total) || (Number(it.qty) || 0) * (Number(it.rate) || 0)), 0);
  const tax = Math.round(subtotal * (gstPercent / 100));
  const total = subtotal + tax;
  return { subtotal, tax, total, items };
}

export function splitCostLine(line) {
  const idx = line.indexOf(":");
  if (idx === -1) return [line, ""];
  return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
}

export function getCostItems(quotation = {}) {
  return Array.isArray(quotation.costItems) ? quotation.costItems : [];
}

export function getGstMode(quotation = {}) {
  if (quotation.gstMode) return quotation.gstMode;
  return quotation.includeGst === true ? "with" : "without";
}

export function computeCostTotals(quotation, defaultGstPercent = 18) {
  const items = getCostItems(quotation);
  const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const gstPercent = Number(quotation.gstPercent ?? defaultGstPercent) || 0;
  const gstMode = getGstMode(quotation);
  const rate = gstPercent / 100;

  let taxableAmount, gstAmount, total;
  if (gstMode === "with") {
    taxableAmount = subtotal; gstAmount = Math.round(subtotal * rate); total = subtotal + gstAmount;
  } else if (gstMode === "inclusive") {
    total = subtotal; taxableAmount = Math.round(subtotal / (1 + rate)); gstAmount = subtotal - taxableAmount;
  } else {
    taxableAmount = subtotal; gstAmount = 0; total = subtotal;
  }
  const includeGst = gstMode === "with";
  return { items, subtotal, gstPercent, gstMode, includeGst, taxableAmount, gstAmount, total };
}

export function getCostLines(quotation, defaultGstPercent = 18) {
  const { items, gstPercent, gstMode, gstAmount, total } = computeCostTotals(quotation, defaultGstPercent);
  if (items.length === 0) return { lines: [], rows: [], grandLine: null };

  const lines = items.map(it => {
    const qty = Number(it.qty) || 1;
    const label = qty > 1 ? `${it.name} × ${qty}` : it.name;
    return `${label}: ${formatINR(it.amount)}`;
  });

  // Table rows used by every layout: Description | Qty | Line Total
  const rows = items.map(it => ({
    label: it.name || "",
    qty: Number(it.qty) || 1,
    value: formatINR(it.amount),
  }));

  if (gstMode === "with") {
    lines.push(`GST (${gstPercent}%): ${formatINR(gstAmount)}`);
    rows.push({ label: `GST (${gstPercent}%)`, qty: "", value: formatINR(gstAmount) });
  }
  return { lines, rows, grandLine: `Total Project Cost: ${formatINR(total)}` };
}

export function getQuotationView(quotation = {}, companyInfo = {}) {
  const fields = {
    scopeOfWork: toLinesOrHtml(quotation.scopeOfWork),
    deliverables: toLinesOrHtml(quotation.deliverables),
    technologyUsed: toLinesOrHtml(quotation.technologyUsed),
    timelineDesc: toLinesOrHtml(quotation.timelineDesc),
    paymentTerms: toLinesOrHtml(quotation.paymentTerms),
    terms: toLinesOrHtml(quotation.terms),
  };

  return {
    id: quotation.id || "—",
    date: formatDate(quotation.date),
    validUntil: formatDate(quotation.validUntil),
    projectTitle: quotation.projectTitle || "Project Quotation",
    description: quotation.description || "",
    clientName: [quotation.salutation, quotation.name].filter(Boolean).join(" ") || "Client",
    clientCompany: quotation.company || "",
    clientEmail: quotation.email || "",
    clientPhone: quotation.phone || "",
    clientAddress: quotation.clientAddress || "",
    issuerName: quotation.issuerName || companyInfo.companyName || "Your Company",
    issuerAddress: quotation.issuerAddress || companyInfo.companyAddress || "",
    issuerPhone: quotation.issuerPhone || companyInfo.companyPhone || "",
    issuerEmail: quotation.issuerEmail || companyInfo.companyEmail || "",
    logo: quotation.logo || companyInfo.logo || null,
    signature: quotation.signature || null,
    timeline: quotation.timeline || "",

    // Legacy array fields (still filled when the value was plain text)
    scopeOfWork: fields.scopeOfWork.lines,
    deliverables: fields.deliverables.lines,
    technologyUsed: fields.technologyUsed.lines,
    timelineDesc: fields.timelineDesc.lines,
    paymentTerms: fields.paymentTerms.lines,
    terms: fields.terms.lines,

    // Raw HTML (empty string when the field was plain text)
    scopeOfWorkHtml: fields.scopeOfWork.html,
    deliverablesHtml: fields.deliverables.html,
    technologyUsedHtml: fields.technologyUsed.html,
    timelineDescHtml: fields.timelineDesc.html,
    paymentTermsHtml: fields.paymentTerms.html,
    termsHtml: fields.terms.html,

    // Flags
    scopeOfWorkIsHtml: fields.scopeOfWork.isHtml,
    deliverablesIsHtml: fields.deliverables.isHtml,
    technologyUsedIsHtml: fields.technologyUsed.isHtml,
    timelineDescIsHtml: fields.timelineDesc.isHtml,
    paymentTermsIsHtml: fields.paymentTerms.isHtml,
    termsIsHtml: fields.terms.isHtml,

    descriptionHtml: quotation.description || "",
    notesHtml: quotation.notes || "",
    notes: quotation.notes || "",
    customSections: Array.isArray(quotation.customSections) ? quotation.customSections.map(s => ({
      ...s,
      title: s.heading || s.title || "",
      contentHtml: s.content || "",
    })) : [],
  };
}
// Strips HTML tags back to clean, editable plain text — used so legacy
// textarea-based layouts (Classic, Corporate, Creative, Modern, Minimal,
// Bold) don't show raw <p>/<ul><li> tags when a field was created/edited
// via the rich-text (TinyMCE) editor elsewhere.
export function htmlToPlainText(html) {
  if (!html) return "";
  if (!isHtml(html)) return html; // already plain text — leave as-is
  return html
    .replace(/<\/(p|li|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

// Phone rules shared by every quotation layout.
// Applies only on screens <= 640px, only inside the `.qt-fluid` wrapper
// (the real document, not the scaled live preview), and never when printing.
// In `extra`, "&" stands for the layout's own root selector.
export const mobileCss = (root, extra = "") => {
  const R = `.qt-fluid ${root}`;
  return `
@media screen and (max-width: 640px) {
  ${R}{ padding:0 !important; }
  ${R} .sheet{ max-width:100% !important; border-radius:0 !important; overflow-x:hidden !important; }

  /* the print-margin table must not grow wider than the screen */
  ${R} .page-frame{ table-layout:fixed !important; width:100% !important; }
  ${R} .page-frame > tbody > tr > td,
  ${R} .page-frame > thead > tr > td,
  ${R} .page-frame > tfoot > tr > td{ min-width:0 !important; max-width:100% !important; }
  ${R} .header, ${R} .masthead, ${R} .header-row{ min-width:0 !important; max-width:100% !important; }

  /* To / From stack instead of sitting side by side */
  ${R} .info-row{ flex-direction:column !important; }
  ${R} .info-cell{ padding:12px 14px !important; min-width:0; }
  ${R} .info-cell + .info-cell{ border-left:none !important; border-top:1px solid rgba(128,128,128,.35) !important; }
  ${R} .info-lines div{ overflow-wrap:anywhere; }

  /* signatures stack */
  ${R} .sign{ display:flex !important; flex-direction:column !important; gap:26px !important; margin-top:28px !important; }
  ${R} .sign > div{ display:block !important; width:100% !important; min-width:0 !important; flex:none !important; padding-right:0 !important; text-align:left !important; }
  ${R} .sign .space{ justify-content:flex-start !important; }

  /* contact line at the bottom stacks */
  ${R} .footer-bar{ flex-direction:column !important; align-items:flex-start !important; gap:4px !important; }

  /* tables: tighter cells, long text wraps */
  ${R} table.cost-summary th, ${R} table.cost-summary td,
  ${R} table.cost-table th, ${R} table.cost-table td{ padding:7px 8px !important; font-size:12px !important; overflow-wrap:anywhere; }

  /* long words / emails never push the page wider */
  ${R} .block, ${R} .terms{ overflow-wrap:anywhere; }
  ${R} img{ max-width:100%; }

  ${R} input, ${R} select, ${R} textarea{ max-width:100% !important; min-width:0 !important; box-sizing:border-box !important; }
  ${R} .info-cell *{ min-width:0 !important; }

  ${extra.replace(/&/g, R)}
}`;
};