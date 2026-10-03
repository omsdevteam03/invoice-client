import { getQuotationView, getCostLines, getCostItems,splitCostLine, htmlToPlainText, mobileCss } from "./quotationLayoutUtils";import { useState } from "react";
import { EditText, EditArea, LogoEdit, SignatureEdit, CostItemsTable, CustomSectionsEdit, CompanySelect, CustomerSelect, RichOrPlainView } from "./EditableField";

const styles = `.qd-corporate{
  --navy:#12294d; --blue:#2f5fa8; --paper:#ffffff; --line:#dbe2ec; --ink:#1c2733; --muted:#6b7686;
  background:#eef1f6; font-family:'Segoe UI',Arial,sans-serif; color:var(--ink); padding:40px 20px;
}
.qd-corporate .sheet{ max-width:800px; margin:0 auto; background:var(--paper); box-shadow:0 4px 24px rgba(18,41,77,0.12); }

.qd-corporate .header{
  background:#ffffff; color:var(--ink); padding:0; display:block;
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
.qd-corporate .header-bars{ display:block; width:100%; height:60px; }
.qd-corporate .bar-navy{ fill:var(--navy); }
.qd-corporate .bar-blue{ fill:var(--blue); }
.qd-corporate .header-row{
  display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;
  gap:16px; padding:22px 48px 8px;
}
.qd-corporate .header .brand{ font-size:18px; font-weight:800; color:var(--navy); display:flex; align-items:center; gap:12px; text-align:left; }
.qd-corporate .header .brand img{ height:56px; }
.qd-corporate .header .brand small{ display:block; font-weight:400; font-size:12px; color:var(--muted); margin-top:4px; line-height:1.5; }
.qd-corporate .header .doc{ text-align:left; }
.qd-corporate .header .doc h1{ margin:0; font-size:30px; letter-spacing:3px; font-weight:300; color:var(--navy); }
@media (max-width:600px){
  .qd-corporate .header-row{ padding:18px 20px 8px; }
}

.qd-corporate .body{ padding:40px 48px; }
.qd-corporate .subline{ font-size:14px; font-weight:600; color:var(--navy); margin:0 0 24px; }

.qd-corporate .info-table{ border:1px solid var(--line); margin-bottom:32px; break-inside:avoid; }
.qd-corporate .info-row{ display:flex; }
.qd-corporate .info-row + .info-row{ border-top:1px solid var(--line); }
.qd-corporate .info-cell{ flex:1; padding:14px 20px; font-size:13px; }
.qd-corporate .info-cell + .info-cell{ border-left:1px solid var(--line); }
.qd-corporate .info-cell strong{ display:block; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--blue); margin-bottom:6px; }
.qd-corporate .info-lines div{ font-size:14px; line-height:1.7; }
.qd-corporate .info-lines .who-name{ font-weight:700; }

.qd-corporate table.cost-table{ width:100%; border-collapse:collapse; margin-top:8px; }
.qd-corporate th{ text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:#fff; background:var(--blue); padding:12px 14px; }
.qd-corporate th.num, .qd-corporate td.num{ text-align:right; }
.qd-corporate td{ padding:14px; border-bottom:1px solid var(--line); font-size:14px; vertical-align:top; }

.qd-corporate .totals{ width:280px; margin-left:auto; margin-top:8px; }
.qd-corporate .totals .row{ display:flex; justify-content:space-between; padding:6px 14px; font-size:14px; }
.qd-corporate .totals .grand{ display:flex; justify-content:space-between; padding:10px 14px; margin-top:6px; border-top:1px solid var(--ink); font-size:14px; font-weight:600; color:var(--ink); }

.qd-corporate table.cost-summary{ width:100%; border-collapse:collapse; margin-top:8px; }
.qd-corporate .cost-summary thead th{ background:var(--blue); color:#fff; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.5px; padding:12px 14px; border:none; }
.qd-corporate .cost-summary thead th.num{ text-align:right; }
.qd-corporate .cost-summary tbody td{ padding:14px; font-size:14px; border-bottom:1px solid var(--line); }
.qd-corporate .cost-summary tbody td.num{ text-align:right; }
.qd-corporate .cost-summary tfoot td{ padding:10px 14px; font-size:14px; font-weight:600; border-top:1px solid var(--ink); }
.qd-corporate .cost-summary tfoot td.num{ text-align:right; }
.qd-corporate .terms{ margin-top:36px; padding-top:24px; border-top:1px solid var(--line); }
.qd-corporate .terms h4{ font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--muted); margin:0 0 10px; break-after:avoid; page-break-after:avoid; }
.qd-corporate .block{ margin-top:32px; }
.qd-corporate .block h4{ font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--blue); margin:0 0 10px; break-after:avoid; page-break-after:avoid; }
.qd-corporate .block p{ margin:0; font-size:13px; line-height:1.7; break-inside:avoid; }
.qd-corporate .terms ul{ margin:0; padding-left:18px; font-size:13px; line-height:1.8; }


.qd-corporate .block ul{ margin:0; padding-left:18px; font-size:13px; line-height:1.8; }
.qd-corporate .block li{ break-inside:avoid; }

.qd-corporate .cols2{ display:block; }

.qd-corporate .sign{ display:flex; gap:60px; margin-top:48px; break-inside:avoid; }
.qd-corporate .sign > div{ flex:1; }
.qd-corporate .sig-box{ min-height:52px; display:flex; align-items:flex-end; }
.qd-corporate .sig-box img{ max-height:44px; }
.qd-corporate .sign-line{ border-top:1px solid var(--ink); margin-top:4px; }
.qd-corporate .sign .who{ margin-top:8px; color:var(--ink); font-weight:600; font-size:13px; }
.qd-corporate .sign .label{ font-size:12px; color:var(--muted); margin-top:2px; }

.qd-corporate .footer-bar{ margin-top:24px; padding-top:16px; border-top:1px solid var(--line); display:flex; justify-content:flex-end; flex-wrap:wrap; gap:16px; font-size:12px; color:var(--muted); }

.qd-corporate .page-frame{ width:100%; border-collapse:collapse; }
.qd-corporate .page-frame > thead > tr > td,
.qd-corporate .page-frame > tbody > tr > td,
.qd-corporate .page-frame > tfoot > tr > td{ padding:0; border:none; font-size:inherit; }

@media print {
  @page{ size: A4; margin:0; }
  .qd-corporate{ background:#fff; padding:0; }
  .qd-corporate .sheet{ box-shadow:none; max-width:100%; margin:0; }
  .qd-corporate .body{ padding-top:0; padding-bottom:0; }
  .qd-corporate .sign-footer-group{ break-inside:avoid; page-break-inside:avoid; }
    .qd-corporate .page-frame > thead > tr > td,
  .qd-corporate .page-frame > tfoot > tr > td{ height:12mm; }
  .qd-corporate .page-frame > thead{ display:table-header-group; }
  .qd-corporate .page-frame > tfoot{ display:table-footer-group; }
  .qd-corporate table thead{ display:table-header-group; }
  .qd-corporate table tr{ break-inside:avoid; page-break-inside:avoid; }
  .qd-corporate .page-frame > tbody > tr{ break-inside:auto; page-break-inside:auto; }
}
`;

const SCOPE_TEMPLATES = [
  { label: "Website Development", text: "Responsive Website Design\n5 Website Pages\nContact Form Integration\nMobile Optimization\nBasic SEO Setup" },
  { label: "App Development", text: "Cross-platform Mobile App (iOS & Android)\nUser Authentication\nAPI Integration\nPush Notifications\nApp Store Submission Support" },
  { label: "Digital Marketing", text: "Social Media Strategy & Management\nPaid Ad Campaigns (Google/Meta)\nMonthly Performance Reports\nContent Calendar Planning\nAudience Targeting & Optimization" },
  { label: "UI/UX Design", text: "User Research & Persona Mapping\nWireframes & Prototypes\nHigh-fidelity UI Design\nDesign System / Style Guide\nUsability Testing" },
  { label: "Branding & Identity", text: "Logo Design\nBrand Color Palette & Typography\nBrand Guidelines Document\nBusiness Card & Letterhead Design\nSocial Media Kit" },
];

const TERMS_TEMPLATES = [
  { label: "Standard", text: "50% advance payment required to begin work, balance due on delivery.\nDelivery timelines are estimates and may shift with scope changes.\nRevisions beyond the agreed scope will be billed separately.\nThis quotation is valid for 15 days from the date of issue." },
  { label: "Project-based", text: "This quotation is valid for 30 days from the date of issue.\nAny additional work outside the agreed scope will be charged separately.\n50% advance payment is required before project commencement.\nFinal deliverables handed over after full payment is received." },
  { label: "Retainer / Service", text: "This agreement covers services rendered on a monthly retainer basis.\nInvoices are due within 15 days of receipt.\nEither party may terminate this agreement with 30 days' written notice.\nUnused hours do not roll over to the following month." },
  { label: "Simple Freelance", text: "Scope: Work will proceed strictly as described in this quotation. Anything outside this scope will be quoted separately.\n\nPayment: 50% upfront, 50% on completion. Late payments beyond 7 days of the due date may incur a 2% monthly late fee.\n\nRevisions: Up to 2 rounds of revisions are included. Additional revisions are billed at the standard hourly rate.\n\nOwnership: Full ownership of final files transfers to the Client upon receipt of full payment.\n\nCancellation: If the Client cancels after work has begun, the advance payment is non-refundable and covers work completed to date.\n\nValidity: This quotation is valid for 15 days from the date of issue." },
];

const CORPORATE_MOBILE = `
  & .header-bars{ height:36px !important; }
  & .header-row{ padding:14px 16px 6px !important; gap:10px !important; }
  & .header .doc h1{ font-size:22px !important; letter-spacing:2px !important; }
  & .header .brand{ gap:10px !important; }
  & .header .brand img{ height:44px !important; }
  & .body{ padding:20px 16px 28px !important; }
`;

export default function CorporateLayout({ quotation, companyInfo, customers = [], editMode = false, onChange = () => { }, onCustomSectionChange = () => { }, onAddCustomSection = () => { }, onRemoveCustomSection = () => { },
  onLogoUpload = () => { }, onRemoveLogo = () => { },
  onSignatureUpload = () => { }, onRemoveSignature = () => { },
  onApplyCost = () => { }, defaultGstPercent = 18,
}) {
  const v = getQuotationView(quotation, companyInfo);
  const costLines = getCostLines(quotation);
  const accent = quotation.accentColor || "#2f5fa8";
  const [showAddItem, setShowAddItem] = useState(false);

  const handleCustomerSelect = (cust) => {
    onChange("customerId", cust.id);
    onChange("company", cust.company || "");
    onChange("name", cust.name || "");
    onChange("phone", cust.phone || "");
    onChange("email", cust.email || "");
    onChange("clientAddress", cust.address || "");
  };

  const handleCustomerManualChange = (typedName) => {
    onChange("customerId", null);
    onChange("company", typedName);
  };

return (
  <div className="qd-corporate">
    <style>{styles}{mobileCss(".qd-corporate", CORPORATE_MOBILE)}</style>
    <div className="sheet">
      <div className="header">
        <svg className="header-bars" viewBox="0 0 800 60" preserveAspectRatio="none" aria-hidden="true">
          <polygon className="bar-blue" points="0,20 118,20 102,42 0,42" />
          <polygon className="bar-navy" points="100,48 132,0 160,0 128,48" />
          <polygon className="bar-blue" points="138,48 170,0 184,0 152,48" />
          <polygon className="bar-navy" points="182,8 800,8 800,22 174,22" />
        </svg>
        <div className="header-row">
          <div className="doc"><h1>QUOTATION</h1></div>
          <div className="brand">
            <LogoEdit
              editMode={editMode} logo={quotation.logo} onUpload={onLogoUpload} onRemove={onRemoveLogo}
              inputId="corp-logo" boxStyle={{ height: 56, width: 70 }}
shape={quotation.logoShape} onShapeChange={(s) => onChange("logoShape", s)} fallback={null}
            />
            <div>
              <CompanySelect editMode={editMode} value={quotation.issuerName} onChange={(val) => onChange("issuerName", val)} placeholder="Your Company Name" style={{ fontWeight: 700 }} />
              {(editMode || v.issuerAddress) && (
                <small><EditText editMode={editMode} value={quotation.issuerAddress} onChange={(val) => onChange("issuerAddress", val)} placeholder="Company address" /></small>
              )}
            </div>
          </div>
        </div>
      </div>

      <table className="page-frame">
        <thead><tr><td /></tr></thead>
        <tbody><tr><td>
      <div className="body">
                  <div className="subline">
                    <EditText editMode={editMode} value={quotation.projectTitle} onChange={(val) => onChange("projectTitle", val)} placeholder="Project / Quotation Title" />
                  </div>

                  <div className="info-table">
                    <div className="info-row">
                                        <div className="info-cell">
                        <strong>Quotation</strong>
                        {quotation.quotationNumber
                          ? quotation.quotationNumber
                          : <span style={{ opacity: 0.6, fontStyle: "italic" }}>Draft — number assigned on send</span>}
                      </div>
                      <div className="info-cell">
                        <strong>Date</strong>
                        <EditText editMode={editMode} type="date" value={quotation.date} onChange={(val) => onChange("date", val)} />
                      </div>
                    </div>
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
                  <EditArea editMode={editMode} rows={4} value={htmlToPlainText(quotation.description) || `This proposal outlines the scope of work agreed upon between ${v.issuerName || "your company"} and ${v.clientCompany || "the client"}.`} onChange={(val) => onChange("description", val)}
placeholder="Describe the project..." viewRender={(val) => <RichOrPlainView value={val} as="paragraph" />} />
                  </div>

                  {(editMode || (quotation.scopeOfWork && quotation.scopeOfWork.trim()) || (quotation.deliverables && quotation.deliverables.trim())) && (
                    <div className="cols2">
                      {(editMode || (quotation.scopeOfWork && quotation.scopeOfWork.trim())) && (
                        <div className="block">
                          <h4>Scope of Work</h4>
                          {editMode ? (
                            <>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                                {SCOPE_TEMPLATES.map((tpl) => (
                                  <button
                                    key={tpl.label} type="button" onClick={() => onChange("scopeOfWork", tpl.text)}
                                    title={`Use "${tpl.label}" scope template`}
                                    style={{
                                      border: quotation.scopeOfWork === tpl.text ? `1.5px solid ${accent}` : "1px solid var(--line)",
                                      borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                      backgroundColor: quotation.scopeOfWork === tpl.text ? `${accent}22` : "#fff",
                                      color: quotation.scopeOfWork === tpl.text ? accent : "var(--muted)",
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
                                    backgroundColor: "transparent", color: accent,
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
        <thead><tr>{(s.columns || []).map((col, ci) => <th key={ci}>{col}</th>)}</tr></thead>
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
gstMode={quotation.gstMode || (quotation.includeGst === true ? "with" : "without")}  gstPercent={quotation.gstPercent}
  defaultGstPercent={defaultGstPercent}
  onGstChange={onChange}
  accent={accent}
/>
                      ) : (
                        <table className="cost-summary">
                          <thead><tr><th>Description</th><th className="num">Line Total</th></tr></thead>
                          <tbody>
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {TERMS_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label} type="button" onClick={() => onChange("terms", tpl.text)}
              title={`Use "${tpl.label}" terms template`}
              style={{
                border: quotation.terms === tpl.text ? `1.5px solid ${accent}` : "1px solid var(--line)",
                borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                backgroundColor: quotation.terms === tpl.text ? `${accent}22` : "#fff",
                color: quotation.terms === tpl.text ? accent : "var(--muted)",
              }}
            >
              {tpl.label}
            </button>
          ))}
          <button
            type="button" onClick={() => onChange("terms", "")}
            title="Write your own custom terms"
            style={{
              border: `1.5px dashed ${accent}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              backgroundColor: "transparent", color: accent,
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
                      <div className="label">Client Signature</div>
                    </div>
                    <div>
                      <div className="sig-box">
                        <SignatureEdit editMode={editMode} signature={quotation.signature} onUpload={onSignatureUpload} onRemove={onRemoveSignature}
                          inputId="corp-sig" boxStyle={{ maxHeight: 44, width: editMode ? 150 : "auto", height: editMode ? 44 : "auto" }} />
                      </div>
                      <div className="sign-line"></div>
                      <div className="who">{quotation.issuerName}</div>
                      <div className="label">Authorized Signature</div>
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
        </td></tr></tbody>
        <tfoot><tr><td /></tr></tfoot>
      </table>
    </div>
  </div>
  );
}