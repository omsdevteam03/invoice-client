import { getQuotationView, getCostLines, getCostItems, splitCostLine, htmlToPlainText } from "./quotationLayoutUtils";
import { useState } from "react";
import { EditText, EditArea, LogoEdit, SignatureEdit, CostItemsTable, CustomSectionsEdit, CompanySelect, CustomerSelect, RichOrPlainView } from "./EditableField";
const TERMS_TEMPLATES = [

  { label: "Standard", text: "50% advance payment required to begin work, balance due on delivery.\nDelivery timelines are estimates and may shift with scope changes.\nRevisions beyond the agreed scope will be billed separately.\nThis quotation is valid for 15 days from the date of issue." },
  { label: "Project-based", text: "This quotation is valid for 30 days from the date of issue.\nAny additional work outside the agreed scope will be charged separately.\n50% advance payment is required before project commencement.\nFinal deliverables handed over after full payment is received." },
  { label: "Retainer / Service", text: "This agreement covers services rendered on a monthly retainer basis.\nInvoices are due within 15 days of receipt.\nEither party may terminate this agreement with 30 days' written notice.\nUnused hours do not roll over to the following month." },
];

const SCOPE_TEMPLATES = [
  { label: "Website Development", text: "Responsive Website Design\n5 Website Pages\nContact Form Integration\nMobile Optimization\nBasic SEO Setup" },
  { label: "App Development", text: "Cross-platform Mobile App (iOS & Android)\nUser Authentication\nAPI Integration\nPush Notifications\nApp Store Submission Support" },
  { label: "Digital Marketing", text: "Social Media Strategy & Management\nPaid Ad Campaigns (Google/Meta)\nMonthly Performance Reports\nContent Calendar Planning\nAudience Targeting & Optimization" },
  { label: "UI/UX Design", text: "User Research & Persona Mapping\nWireframes & Prototypes\nHigh-fidelity UI Design\nDesign System / Style Guide\nUsability Testing" },
  { label: "Branding & Identity", text: "Logo Design\nBrand Color Palette & Typography\nBrand Guidelines Document\nBusiness Card & Letterhead Design\nSocial Media Kit" },
];

const styles = `
.qd-creative{
--coral:#ff6f59; --teal:#2a9d8f; --cream:#ffffff; --ink:#33302c; --muted:#8a8378; --card:#ffffff; --lineclr:#33302c;
  background:#ffffff; font-family:'Poppins','Segoe UI',Arial,sans-serif; color:var(--ink); padding:0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  color-adjust: exact;
}
.qd-creative .sheet{ position:relative; max-width:780px; margin:0 auto; background:var(--cream); border-radius:0; overflow:hidden; box-shadow:none; }.qd-creative .page-frame{ width:100%; border-collapse:collapse; }
.qd-creative .page-frame > thead > tr > td,
.qd-creative .page-frame > tbody > tr > td{ padding:0; }
.qd-creative .inner{ padding:28px 48px 44px; }
.qd-creative .header{
  position:relative; overflow:hidden;
  display:flex; justify-content:flex-start; align-items:center;
  flex-wrap:wrap; gap:20px;
  padding:34px 48px;
  min-height:150px;
  background:#ffffff;
}
.qd-creative .header-deco{ position:absolute; top:0; right:0; width:300px; height:150px; pointer-events:none; }
.qd-creative .d-accent{ fill:var(--accent); }
.qd-creative .d-light{ fill:var(--accent); opacity:.5; }
.qd-creative .d-gray{ fill:#c9ccd1; }
.qd-creative .d-dark{ fill:#2b2f36; }
.qd-creative .header-brand{ position:relative; z-index:1; max-width:calc(100% - 260px); }
@media (max-width:600px){
  .qd-creative .header-brand{ max-width:100%; }
  .qd-creative .header-deco{ opacity:.25; }
}
.qd-creative .header-title h1{ font-size:34px; font-weight:800; margin:0; color:var(--coral); letter-spacing:2px; text-transform:uppercase; }
.qd-creative .header-title .subline{ font-size:16px; font-weight:600; color:#b8481f; margin:16px 0 4px; text-align:center; }
.qd-creative .header-title .quote-meta{ font-size:12.5px; color:var(--muted); text-align:center; margin:0 0 12px; }
.qd-creative .header-brand{ display:flex; align-items:center; gap:12px; }
.qd-creative .header-brand .brand-text{ text-align:left; }.qd-creative .header-brand .brand-label{ display:none; }
.qd-creative .header-brand h3{ margin:0; font-size:22px; font-weight:700; color:#1f2937; }
.qd-creative .header-brand span{ color:#6b7280; font-size:13px; }

.qd-creative .header-brand .logo{ min-width:72px; height:72px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; flex-shrink:0; }.qd-creative .header-brand .logo.no-logo{ background:var(--coral); border-radius:10px; }

.qd-creative .info-table{ background:transparent; border-radius:0; box-shadow:none; margin-bottom:24px; break-inside:avoid; overflow:hidden; }.qd-creative .info-row{ display:flex; }
.qd-creative .info-row + .info-row{ border-top:1px solid var(--lineclr); }
.qd-creative .info-cell{ flex:1; padding:16px 20px; font-size:13px; }
.qd-creative .info-cell + .info-cell{ border-left:1px solid var(--lineclr); }
.qd-creative .info-cell strong{ display:block; font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:#000000; font-weight:700; margin-bottom:6px; }.qd-creative .info-lines div{ font-size:14px; line-height:1.7; }
.qd-creative .info-lines .who-name{ font-weight:700; }

.qd-creative .items{ background:var(--card); border-radius:16px; padding:8px 20px; box-shadow:0 4px 14px rgba(0,0,0,0.04); }
.qd-creative table.cost-table{ width:100%; border-collapse:collapse; }
.qd-creative th{ text-align:left; font-size:11px; text-transform:uppercase; color:var(--muted); padding:14px 6px; border-bottom:2px solid var(--lineclr); }
.qd-creative th.num, .qd-creative td.num{ text-align:right; }
.qd-creative td{ padding:14px 6px; border-bottom:1px solid var(--lineclr); font-size:14px; }

.qd-creative .totals{ width:280px; margin-left:auto; margin-top:20px; }
.qd-creative .totals .row{ display:flex; justify-content:space-between; padding:6px 10px; font-size:14px; color:var(--ink); }.qd-creative .totals .grand{ display:flex; justify-content:space-between; padding:10px 10px; margin-top:6px; border-top:1px solid var(--lineclr); font-size:14px; font-weight:600; color:var(--ink); }
.qd-creative table.cost-summary{ width:100%; border-collapse:collapse; margin-top:8px; border:1px solid var(--ink); }
.qd-creative .cost-summary thead th{ background:#fff; color:var(--ink); text-align:left; font-size:12px; font-weight:700; text-transform:none; padding:8px 12px; border:1px solid var(--ink); }
.qd-creative .cost-summary thead th.num{ text-align:right; }
.qd-creative .cost-summary tbody td{ padding:8px 12px; font-size:13px; border:1px solid var(--ink); height:28px; }
.qd-creative .cost-summary tbody td.num{ text-align:right; }
.qd-creative .cost-summary tfoot td{ padding:8px 12px; font-size:13px; font-weight:700; border:1px solid var(--ink); }
.qd-creative .cost-summary tfoot td.num{ text-align:right; }

.qd-creative .terms{ margin-top:32px; background:transparent; border-radius:0; padding:18px 0; box-shadow:none; font-size:13px; line-height:1.9; }
.qd-creative .terms h4{ margin:0 0 8px; color:#000000; font-weight:700; font-size:12px; text-transform:uppercase; break-after:avoid; page-break-after:avoid; }
.qd-creative .terms ul{ margin:0; padding-left:18px; }
.qd-creative .terms-tpl-row{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
.qd-creative .terms-tpl-row button{ font-family:inherit; }

.qd-creative .terms-tpl-row{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
.qd-creative .terms-tpl-row button{ font-family:inherit; }

.qd-creative .block{ margin-top:24px; background:transparent; border-radius:0; padding:0; box-shadow:none; }
.qd-creative .block h4{ margin:0 0 8px; color:#000000; font-weight:700; font-size:12px; text-transform:uppercase; break-after:avoid; page-break-after:avoid; }
.qd-creative .block p{ margin:0; font-size:13px; line-height:1.8; break-inside:avoid; }
.qd-creative .block li{ break-inside:avoid; }
.qd-creative .cols2{ display:block; margin-top:24px; }
.qd-creative .cols2 .block{ margin-top:16px; }
.qd-creative .cols2 .block:first-child{ margin-top:0; }
.qd-creative .sign{ display:flex; gap:40px; margin-top:40px; font-size:12px; color:var(--muted); flex-wrap:wrap; break-inside:avoid; }
.qd-creative .sign > div{ flex:1; min-width:200px; }
.qd-creative .sig-box{ min-height:48px; display:flex; align-items:flex-end; }
.qd-creative .sig-box img{ max-height:40px; }
.qd-creative .sign-line{ border-top:2px dashed #e3c9b8; margin-top:4px; }
.qd-creative .sign .who{ color:var(--ink); font-weight:600; margin-top:8px; }
.qd-creative .sign .label{ margin-top:2px; }

.qd-creative .footer-bar{ margin-top:20px; display:flex; justify-content:flex-end; flex-wrap:wrap; gap:16px; font-size:12px; color:var(--muted); }

.qd-creative .page-frame > thead > tr > td,
.qd-creative .page-frame > tbody > tr > td,
.qd-creative .page-frame > tfoot > tr > td{ padding:0; border:none; }

@media print {
  @page{ size: A4; margin: 0; }
  .qd-creative .page-frame > tbody{ display:table-row-group; }
  .qd-creative .page-frame > thead > tr > td{ height:8mm; }
  .qd-creative .page-frame > tfoot > tr > td{ height:12mm; }
  .qd-creative .page-frame > thead{ display:table-header-group; }
  .qd-creative .page-frame > tfoot{ display:table-footer-group; }
  .qd-creative .sign{ margin-top:20px !important; }
  .qd-creative .sign-footer-group{ page-break-inside:avoid; break-inside:avoid; }
  .qd-creative .info-table{ page-break-inside: avoid; }
  .qd-creative table thead{ display:table-header-group; }
  .qd-creative table tr{ break-inside:avoid; page-break-inside:avoid; }
  .qd-creative .page-frame > tbody > tr{ break-inside:auto; page-break-inside:auto; }
}
`;
export default function CreativeLayout({
  quotation, companyInfo, customers = [], editMode = false, onChange = () => { },
  onCustomSectionChange = () => { }, onAddCustomSection = () => { }, onRemoveCustomSection = () => { },
  onLogoUpload = () => { }, onRemoveLogo = () => { },
  onSignatureUpload = () => { }, onRemoveSignature = () => { },
  onApplyCost = () => { }, defaultGstPercent = 18,
}) {
  const v = getQuotationView(quotation, companyInfo);
  const costLines = getCostLines(quotation, defaultGstPercent); const accent = quotation.accentColor || "#ff6f59";
  const [showAddItem, setShowAddItem] = useState(false);
  const defaultDescription = `This proposal outlines the scope of work agreed upon between ${v.issuerName || "Your Company"} and ${v.clientCompany || "the client"}.`;
  const descriptionValue = quotation.description || defaultDescription;

  const handleCustomerSelect = (cust) => {
    onChange("customerId", cust.id);
    onChange("company", cust.company || "");
    onChange("name", cust.name || "");
    onChange("phone", cust.phone || "");
    onChange("email", cust.email || "");
    onChange("clientAddress", cust.address || "");
  };

  // Typed a company name that isn't in the saved Customer list — set it
  // as free text and clear customerId, since it isn't linked to a saved
  // customer record. The rest of the "To" fields stay editable as normal
  // text inputs below, so name/phone/email/address can still be filled in.
  const handleCustomerManualChange = (typedName) => {
    onChange("customerId", null);
    onChange("company", typedName);
  };

  return (
    <div className="qd-creative" style={{ "--accent": accent }}>
      <style>{styles}</style>
      <div className="sheet">
        <div className="header">
          <svg className="header-deco" viewBox="0 0 300 150" aria-hidden="true">
            <polygon className="d-gray" points="95,0 185,0 95,90" />
            <polygon className="d-dark" points="50,0 140,0 95,48" />
            <polygon className="d-accent" points="150,0 300,0 300,120" />
            <polygon className="d-light" points="175,45 175,150 265,150" />
          </svg>
          <div className="header-brand">
            <div className={`logo ${quotation.logo ? "has-logo" : (editMode ? "no-logo" : "")}`}>
              <LogoEdit
                editMode={editMode} logo={quotation.logo} onUpload={onLogoUpload} onRemove={onRemoveLogo}
                inputId="creative-logo" boxStyle={{ width: 72, height: 72 }}
shape={quotation.logoShape} onShapeChange={(s) => onChange("logoShape", s)} fallback={null} />
            </div>
            <div className="brand-text" style={{ textAlign: "left" }}>
              <div className="brand-label">Quotation by</div>
              <h3><CompanySelect editMode={editMode} value={quotation.issuerName} onChange={(val) => onChange("issuerName", val)} placeholder="Your Company Name" /></h3>
              {(editMode || v.issuerAddress) && (
                <span><EditText editMode={editMode} value={quotation.issuerAddress} onChange={(val) => onChange("issuerAddress", val)} placeholder="Company address" /></span>
              )}
            </div>
          </div>
        </div>
        <table className="page-frame">
          <thead><tr><td /></tr></thead>
          <tbody>
            <tr>
              <td>
                <div className="header-title" style={{ textAlign: "center" }}>
                  <div className="subline">
                    <EditText editMode={editMode} value={quotation.projectTitle} onChange={(val) => onChange("projectTitle", val)} placeholder="Project / Quotation Title" />
                  </div>
                                  <div className="quote-meta">
                    {editMode ? (
                      <>
                        <span>
                          {quotation.quotationNumber
                            ? quotation.quotationNumber
                            : <span style={{ fontStyle: "italic" }}>Draft — number assigned on send</span>}
                        </span>
                        <span> &middot; </span>
                        <EditText editMode type="date" value={quotation.date} onChange={(val) => onChange("date", val)} style={{ display: "inline-block", width: "auto" }} />
                      </>
                    ) : (
                      <>
                        Quotation No: {quotation.quotationNumber
                          ? quotation.quotationNumber
                          : <span style={{ fontStyle: "italic" }}>Draft — number assigned on send</span>} &middot; Date: {quotation.date}
                      </>
                    )}
                  </div>
                </div>
                <div className="inner">
                  <div className="info-table">
                    <div className="info-row">
                      <div className="info-cell">
                        <strong>To</strong>
                        <div className="info-lines">
                          {editMode ? (
                            <>
                              <CustomerSelect editMode as="div" style={{ fontWeight: 700, marginBottom: 4 }} customers={customers} value={quotation.company} onSelect={handleCustomerSelect} onManualChange={handleCustomerManualChange} placeholder="Select or search customer" />
                              <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.name} onChange={(val) => onChange("name", val)} placeholder="Contact name" />
                              <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.clientAddress} onChange={(val) => onChange("clientAddress", val)} placeholder="Client address" />
                              <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.phone} onChange={(val) => onChange("phone", val)} placeholder="Phone" />
                              <EditText editMode as="div" value={quotation.email} onChange={(val) => onChange("email", val)} placeholder="Email" />
                            </>
                          ) : (
                            <>
                              {v.clientCompany && <div className="who-name">Company: {v.clientCompany}</div>}
                              <div>Name: {v.clientName}</div>
                              {v.clientAddress && <div>Address: {v.clientAddress}</div>}
                              {v.clientPhone && <div>Mob: {v.clientPhone}</div>}
                              {v.clientEmail && <div>Email: {v.clientEmail}</div>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="info-cell">
                        <strong>From</strong>
                        <div className="info-lines">
                          {editMode ? (
                            <>
                              <CompanySelect editMode as="div" style={{ fontWeight: 700, marginBottom: 4 }} value={quotation.issuerName} onChange={(val) => onChange("issuerName", val)} placeholder="Your Company Name" />
                              <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.issuerAddress} onChange={(val) => onChange("issuerAddress", val)} placeholder="Company address" />
                              <EditText editMode as="div" style={{ marginBottom: 4 }} value={quotation.issuerPhone} onChange={(val) => onChange("issuerPhone", val)} placeholder="Phone" />
                              <EditText editMode as="div" value={quotation.issuerEmail} onChange={(val) => onChange("issuerEmail", val)} placeholder="Email" />
                            </>
                          ) : (
                            <>
                              <div className="who-name">Company: {v.issuerName}</div>
                              {v.issuerAddress && <div>Address: {v.issuerAddress}</div>}
                              {v.issuerPhone && <div>Mob: {v.issuerPhone}</div>}
                              {v.issuerEmail && <div>Email: {v.issuerEmail}</div>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="block">
                    <h4>Project Description</h4>
                    <EditArea editMode={editMode} rows={4} value={htmlToPlainText(descriptionValue)} onChange={(val) => onChange("description", val)}
                      placeholder="Describe the project..." viewRender={(val) => <RichOrPlainView value={val} as="paragraph" />} />                  </div>

                  {(editMode || (quotation.scopeOfWork && quotation.scopeOfWork.trim()) || (quotation.deliverables && quotation.deliverables.trim())) && (
                    <div className="cols2" style={{ marginBottom: 16 }}>
                      {(editMode || (quotation.scopeOfWork && quotation.scopeOfWork.trim())) && (
                        <div className="block">
                          <h4>Scope of Work</h4>
                          {editMode ? (
                            <>
                              <div className="terms-tpl-row">
                                {SCOPE_TEMPLATES.map((tpl) => (
                                  <button
                                    key={tpl.label} type="button" onClick={() => onChange("scopeOfWork", tpl.text)}
                                    title={`Use "${tpl.label}" scope template`}
                                    style={{
                                      border: quotation.scopeOfWork === tpl.text ? `1.5px solid ${accent}` : "1px solid #f1e6da",
                                      borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                      backgroundColor: quotation.scopeOfWork === tpl.text ? `${accent}22` : "#fff",
                                      color: quotation.scopeOfWork === tpl.text ? accent : "#8a8378",
                                    }}
                                  >
                                    {tpl.label}
                                  </button>
                                ))}
                                <button
                                  type="button" onClick={() => onChange("scopeOfWork", "")}
                                  title="Write your own custom scope"
                                  style={{
                                    border: `1.5px dashed ${accent}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                    backgroundColor: "transparent", color: accent, display: "flex", alignItems: "center", gap: 4,
                                  }}
                                >
                                  + Custom
                                </button>
                              </div>
                              <EditArea editMode rows={4} value={htmlToPlainText(quotation.scopeOfWork)} onChange={(val) => onChange("scopeOfWork", val)} placeholder="One item per line, or pick a template above..." />
                            </>
                          ) : (
                            <RichOrPlainView value={quotation.scopeOfWork} />
                          )}
                        </div>
                      )}
                      {(editMode || (quotation.deliverables && quotation.deliverables.trim())) && (
                        <div className="block">
                          <h4>Deliverables</h4>
                          {editMode ? (
                            <EditArea editMode rows={4} value={htmlToPlainText(quotation.deliverables)} onChange={(val) => onChange("deliverables", val)} placeholder="One item per line..." />
                          ) : (
                            <RichOrPlainView value={quotation.deliverables} />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {(editMode || (quotation.technologyUsed && quotation.technologyUsed.trim())) && (
                    <div className="block">
                      <h4>Technology Used</h4>
                      {editMode ? (
                        <EditArea editMode rows={3} value={htmlToPlainText(quotation.technologyUsed)} onChange={(val) => onChange("technologyUsed", val)} placeholder="One item per line..." />
                      ) : (
                        <RichOrPlainView value={quotation.technologyUsed} />
                      )}
                    </div>
                  )}

                  {!editMode && v.customSections.map((s, i) => (
                    <div className="block" key={i}>
                      <h4>{s.title}</h4>
                      {s.type === "table" ? (
                        <table className="cost-summary">
                          <thead>
                            <tr>{(s.columns || []).map((col, ci) => <th key={ci}>{col}</th>)}</tr>
                          </thead>
                          <tbody>
                            {(s.rows || []).map((row, ri) => (
                              <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                            ))}
                          </tbody>
                        </table>
                      ) : Array.isArray(s.lines) ? (
                        <ul>{s.lines.map((l, j) => <li key={j}>{l}</li>)}</ul>
                      ) : (
                        <RichOrPlainView value={s.content} as="paragraph" />
                      )}
                    </div>
                  ))}
                  {editMode && (
                    <div className="block">
                      <h4>Custom Sections</h4>
                      <CustomSectionsEdit sections={quotation.customSections || []} accent={accent} onChange={onCustomSectionChange} onAdd={onAddCustomSection} onRemove={onRemoveCustomSection} />
                    </div>
                  )}

                  {(editMode || costLines.lines.length > 0) && (
                    <div className="block">
                      <h4>Project Cost</h4>
                      {editMode ? (
                        <CostItemsTable
                          items={getCostItems(quotation)}
                          onChange={(items) => onChange("costItems", items)}
                          gstMode={quotation.gstMode || (quotation.includeGst === true ? "with" : "without")} gstPercent={quotation.gstPercent}
                          defaultGstPercent={defaultGstPercent}
                          onGstChange={onChange}
                          accent={accent}
                        />
                      ) : (
                        <table className="cost-summary">
                          <thead><tr><th>Description of Work</th><th className="num">Total</th></tr></thead>                          <tbody>
                            {costLines.lines.map((line, i) => {
                              const [label, value] = splitCostLine(line);
                              return <tr key={i}><td>{label}</td><td className="num">{value}</td></tr>;
                            })}
                          </tbody>
                          {costLines.grandLine && (() => {
                            const [label, value] = splitCostLine(costLines.grandLine);
                            return <tfoot><tr><td>{label}</td><td className="num">{value}</td></tr></tfoot>;
                          })()}
                        </table>
                      )}
                    </div>
                  )}

                  {(editMode || (quotation.timelineDesc && quotation.timelineDesc.trim())) && (
                    <div className="block">
                      <h4>Project Timeline</h4>
                      {editMode ? (
                        <EditArea editMode rows={4} value={htmlToPlainText(quotation.timelineDesc)} onChange={(val) => onChange("timelineDesc", val)} placeholder="One item per line..." />
                      ) : (
                        <RichOrPlainView value={quotation.timelineDesc} />
                      )}
                    </div>
                  )}
                  {(editMode || (quotation.paymentTerms && quotation.paymentTerms.trim())) && (
                    <div className="block">
                      <h4>Payment Terms</h4>
                      {editMode ? (
                        <EditArea editMode rows={3} value={htmlToPlainText(quotation.paymentTerms)} onChange={(val) => onChange("paymentTerms", val)} placeholder="Payment terms..." />
                      ) : (
                        <RichOrPlainView value={quotation.paymentTerms} />
                      )}
                    </div>
                  )}

                  {(editMode || (quotation.terms && quotation.terms.trim())) && (
                    <div className="terms">
                      <h4>Terms &amp; Conditions</h4>
                      {editMode ? (
                        <>
                          <div className="terms-tpl-row">
                            {TERMS_TEMPLATES.map((tpl) => (
                              <button
                                key={tpl.label} type="button" onClick={() => onChange("terms", tpl.text)}
                                title={`Use "${tpl.label}" terms template`}
                                style={{
                                  border: quotation.terms === tpl.text ? `1.5px solid ${accent}` : "1px solid #f1e6da",
                                  borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                  backgroundColor: quotation.terms === tpl.text ? `${accent}22` : "#fff",
                                  color: quotation.terms === tpl.text ? accent : "#8a8378",
                                }}
                              >
                                {tpl.label}
                              </button>
                            ))}
                            <button
                              type="button" onClick={() => onChange("terms", "")}
                              title="Start a blank custom terms template"
                              style={{
                                border: `1.5px dashed ${accent}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                backgroundColor: "transparent", color: accent, display: "flex", alignItems: "center", gap: 4,
                              }}
                            >
                              + Custom
                            </button>
                          </div>
                          <EditArea editMode rows={6} value={htmlToPlainText(quotation.terms)} onChange={(val) => onChange("terms", val)} placeholder="One term per line, or pick a template above..." />
                        </>
                      ) : (
                        <ul className="terms-list">
                          {htmlToPlainText(quotation.terms).split("\n").map((line) => line.trim()).filter(Boolean).map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {(editMode || quotation.notes?.trim()) && (
                    <div className="block">
                      <h4>Note</h4>
                      <EditArea editMode={editMode} rows={2} value={htmlToPlainText(quotation.notes)} onChange={(val) => onChange("notes", val)}
                        placeholder="Additional notes..." viewRender={(val) => <RichOrPlainView value={val} as="paragraph" />} />
                    </div>
                  )}

                  <div className="sign-footer-group">
                    <div className="sign">
                      <div>
                        <div className="sig-box"></div>
                        <div className="sign-line"></div>
                        <div className="who">{quotation.name}</div>
                      </div>
                      <div>
                        <div className="sig-box">
                          <SignatureEdit editMode={editMode} signature={quotation.signature} onUpload={onSignatureUpload} onRemove={onRemoveSignature}
                            inputId="creative-sig" boxStyle={{ maxHeight: 40, width: editMode ? 150 : "auto", height: editMode ? 40 : "auto" }} />
                        </div>
                        <div className="sign-line"></div>
                        <div className="who">{quotation.issuerName}</div>
                      </div>
                    </div>

                    <div className="footer-bar">
                      {editMode ? (
                        <EditText editMode value={quotation.issuerEmail} onChange={(val) => onChange("issuerEmail", val)} placeholder="Email" />
                      ) : (
                        v.issuerEmail && <span>Email: {v.issuerEmail}</span>
                      )}
                      {editMode ? (
                        <EditText editMode value={quotation.issuerPhone} onChange={(val) => onChange("issuerPhone", val)} placeholder="Phone" />
                      ) : (
                        v.issuerPhone && (
                          <span>
                            Phone: {v.issuerPhone.trim().startsWith("+") ? v.issuerPhone : `+91 ${v.issuerPhone}`}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                    </div>
                  </td>
            </tr>
          </tbody>
          <tfoot><tr><td /></tr></tfoot>
               </table>
      </div>
    </div>
  );
}